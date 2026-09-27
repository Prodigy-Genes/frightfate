"""Regression tests for the game flow fixes: fallback transparency, session
recovery, rate limiting and the create/join happy paths."""

import time

import pytest

from tests.conftest import create_and_join


# ---------------------------------------------------------------------------
# Session create / join
# ---------------------------------------------------------------------------


def test_create_and_join_session(client):
    code, player_id = create_and_join(client, theme="zombie_outbreak", player_name="Sam")

    session = client.get(f"/api/game/session/{code}")
    assert session.status_code == 200
    body = session.json()
    assert body["theme"] == "zombie_outbreak"
    assert body["total_players"] == 1
    assert body["active_players"][0]["name"] == "Sam"


def test_duplicate_player_name_rejected(client):
    code, _ = create_and_join(client, player_name="Sam")
    duplicate = client.post(f"/api/game/join-session/{code}?player_name=Sam")
    assert duplicate.status_code == 400
    assert "already taken" in duplicate.json()["detail"]


def test_join_unknown_session_404(client):
    missing = client.post("/api/game/join-session/XXXXXX?player_name=Sam")
    assert missing.status_code == 404


# ---------------------------------------------------------------------------
# Session recovery (rejoin after refresh)
# ---------------------------------------------------------------------------


def test_rejoin_returns_player_identity(client):
    code, player_id = create_and_join(client, player_name="Returner")

    rejoin = client.get(f"/api/game/rejoin/{code}/{player_id}")
    assert rejoin.status_code == 200
    body = rejoin.json()
    assert body["player_name"] == "Returner"
    assert body["player_id"] == player_id
    assert body["session_code"] == code
    assert body["is_eliminated"] is False


def test_rejoin_unknown_player_404(client):
    code, _ = create_and_join(client, player_name="Sam")
    ghost = client.get(f"/api/game/rejoin/{code}/99999")
    assert ghost.status_code == 404


def test_rejoin_unknown_session_404(client):
    ghost = client.get("/api/game/rejoin/XXXXXX/1")
    assert ghost.status_code == 404


# ---------------------------------------------------------------------------
# Scenario endpoint: AI path and fallback transparency
# ---------------------------------------------------------------------------


def test_scenario_ai_path_has_no_fallback_reason(client, ai_stub):
    ai_stub.engine_to_return = "ai"
    code, player_id = create_and_join(client, theme="slasher_movie")

    response = client.get(f"/api/game/scenario/{code}/1?player_id={player_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["engine"] == "ai"
    assert body.get("fallback_reason") is None
    assert body["title"] == "Stubbed Danger"


def test_scenario_fallback_carries_reason(client, ai_stub):
    """The silent-fallback regression: a scripted response must say why."""
    ai_stub.engine_to_return = "fallback"
    code, player_id = create_and_join(client, theme="slasher_movie")

    response = client.get(f"/api/game/scenario/{code}/1?player_id={player_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["engine"] == "fallback"
    assert body.get("fallback_reason") == "stubbed failure"


# ---------------------------------------------------------------------------
# Submit answer: AI verdict and fallback transparency
# ---------------------------------------------------------------------------


def test_submit_answer_ai_verdict(client, ai_stub):
    ai_stub.engine_to_return = "ai"
    code, player_id = create_and_join(client)

    response = client.post(
        "/api/game/submit-answer",
        json={
            "session_code": code,
            "player_id": player_id,
            "question_number": 1,
            "answer_text": "I quietly block the door with the bookshelf.",
            "scenario_title": "Stubbed Danger",
            "scenario_description": "A test scenario.",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["engine"] == "ai"
    assert body["fallback_reason"] is None
    assert body["score"] == 77


def test_submit_answer_fallback_carries_reason(client, ai_stub):
    ai_stub.engine_to_return = "fallback"
    code, player_id = create_and_join(client)

    response = client.post(
        "/api/game/submit-answer",
        json={
            "session_code": code,
            "player_id": player_id,
            "question_number": 1,
            "answer_text": "I quietly block the door with the bookshelf.",
            "scenario_title": "Stubbed Danger",
            "scenario_description": "A test scenario.",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["engine"] == "fallback"
    assert body["fallback_reason"] == "stubbed failure"


# ---------------------------------------------------------------------------
# Warm cache
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_take_warm_scenario_pops_and_refills():
    from app.services.ai_service import AIService

    svc = AIService.__new__(AIService)
    svc.client = None  # refill task no-ops without a client
    svc._warm_cache = {}
    svc._warming = set()

    assert svc._take_warm_scenario("slasher_movie") is None

    cached = {"title": "Cached", "engine": "ai"}
    svc._warm_cache["slasher_movie"] = cached
    taken = svc._take_warm_scenario("slasher_movie")
    assert taken == cached
    # Popped: a second take misses (and schedules an async refill, which
    # no-ops because client is None).
    assert svc._take_warm_scenario("slasher_movie") is None
    # Give the scheduled refill task a tick to run and discard.
    import asyncio

    await asyncio.sleep(0)


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------


def test_create_session_rate_limited(client, monkeypatch):
    """Burst past 10/minute and the 11th create must be rejected with 429."""
    codes = []
    for _ in range(10):
        response = client.post("/api/game/create-session", json={"theme": "haunted_house"})
        assert response.status_code == 200
        codes.append(response.json()["session_code"])

    overflow = client.post("/api/game/create-session", json={"theme": "haunted_house"})
    assert overflow.status_code == 429


# ---------------------------------------------------------------------------
# Purge hygiene
# ---------------------------------------------------------------------------


def test_purge_keeps_fresh_sessions(client):
    """Creating sessions repeatedly must not disturb recent ones."""
    code1, _ = create_and_join(client, player_name="Early")
    code2, _ = create_and_join(client, player_name="Later")

    # Both sessions must still exist (they are seconds old).
    assert client.get(f"/api/game/session/{code1}").status_code == 200
    assert client.get(f"/api/game/session/{code2}").status_code == 200
