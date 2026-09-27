"""FastAPI test configuration: isolated SQLite DB per test, no network AI.

Every test gets a fresh in-memory database via dependency override, and the
AI service is replaced with a stub so tests never hit Groq (fast, free,
deterministic). Network-dependent tests assert the *fallback* paths instead —
which is exactly the behaviour we want to lock in after the silent-fallback
outage.
"""

import os

# Must be set before app modules import config/settings.
os.environ["DATABASE_URL"] = "sqlite:///./test_frightfate.db"
os.environ.setdefault("OPENAI_API_KEY", "test-key-not-real")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.services import ai_service as ai_service_module

# Reference captured BEFORE any test patches ai_service_module.ai_service —
# the stub delegates its fallback builders to the real service, and going
# through the (patched) module attribute would recurse into itself.
_REAL_AI_SERVICE = ai_service_module.ai_service

TEST_DB_URL = "sqlite:///./test_frightfate.db"

engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class StubAIService:
    """Deterministic stand-in for AIService.

    `engine_to_return` lets each test choose whether the stub behaves like a
    healthy model ("ai") or a failing one ("fallback"), so both paths of the
    real service can be exercised without network calls.
    """

    def __init__(self, engine_to_return: str = "ai"):
        self.engine_to_return = engine_to_return
        self.calls: list[tuple] = []
        self.client = object()  # truthy, like a configured client
        self.model = "stub-model"
        self._warm_cache = {}
        self._warming = set()

    # --- scenario generation -------------------------------------------------
    async def generate_initial_scenario(self, theme: str):
        self.calls.append(("generate_initial_scenario", theme))
        if self.engine_to_return == "ai":
            return {
                "question_number": 1,
                "title": "Stubbed Danger",
                "description": "A test scenario. What do you do?",
                "survival_factors": ["stub"],
                "story_context": "Stubbed opening",
                "death_risk_level": "medium",
                "engine": "ai",
            }
        return ai_service_module.ai_service._get_fallback_initial_scenario(
            theme, "stubbed failure"
        )

    async def generate_next_scenario(
        self, theme, question_number, previous_scenarios, player_choices, story_context, previous_state=None
    ):
        self.calls.append(("generate_next_scenario", question_number))
        if self.engine_to_return == "ai":
            return {
                "question_number": question_number,
                "title": "Stubbed Escalation",
                "description": "A later test scenario. What do you do?",
                "survival_factors": ["stub"],
                "story_context": story_context or "Stubbed continuation",
                "death_risk_level": "high",
                "engine": "ai",
            }
        return None

    # --- answer analysis ------------------------------------------------------
    async def analyze_answer_with_death_check(self, scenario, player_answer, player_history, theme="haunted_house"):
        self.calls.append(("analyze_answer", player_answer))
        if self.engine_to_return == "ai":
            return {
                "survival_score": 77,
                "instant_death": False,
                "death_reason": None,
                "analysis": "Stub analysis",
                "story_progression": "Stub progression",
                "choice_classification": "cautious",
                "narrative_consequence": "Stub consequence",
                "host_verdict": "Stub verdict",
                "death_epitaph": None,
                "better_alternatives": ["Stub alternative"],
                "engine": "ai",
            }
        return ai_service_module.ai_service._fallback_death_analysis(
            player_answer, scenario.get("death_risk_level", "medium"), 0, theme, "stubbed failure"
        )

    # --- narratives / results --------------------------------------------------
    async def generate_death_narrative(self, player_data, death_reason, theme="haunted_house"):
        self.calls.append(("death_narrative", player_data.get("player_name")))
        return {
            "player_name": player_data.get("player_name", "Unknown"),
            "eliminated": True,
            "death_narrative": "Stub narrative.",
            "death_analysis": "Stub analysis.",
            "host_verdict": "Stub verdict",
            "death_epitaph": "Stub epitaph",
            "fate_title": "💀 ELIMINATED",
            "elimination_reason": death_reason,
            "engine": "ai",
        }

    async def generate_final_results(self, players_data, theme="haunted_house"):
        self.calls.append(("final_results", len(players_data)))
        results = []
        for i, player in enumerate(sorted(players_data, key=lambda p: p.get("total_score", 0), reverse=True)):
            results.append({
                "player_name": player.get("player_name", "Unknown"),
                "rank": i + 1,
                "survived": i == 0,
                "fate_title": "🎉 SOLE SURVIVOR" if i == 0 else "💀 VICTIM",
                "narrative": "Stub narrative.",
                "survival_analysis": "Stub analysis.",
                "host_verdict": "Stub verdict",
                "engine": self.engine_to_return,
            })
        return results

    # --- warm cache (no-op in the stub) --------------------------------------
    async def warm_scenario_cache(self, themes=None):
        pass

    def _take_warm_scenario(self, theme):
        return None

    # --- fallback builders (delegated to the real service) --------------------
    def _get_fallback_initial_scenario(self, theme, fallback_reason: str = ""):
        return _REAL_AI_SERVICE._get_fallback_initial_scenario(theme, fallback_reason)

    def _fallback_death_analysis(self, answer, death_risk, previous_poor_choices, theme="haunted_house", fallback_reason: str = ""):
        return _REAL_AI_SERVICE._fallback_death_analysis(
            answer, death_risk, previous_poor_choices, theme, fallback_reason
        )

    def _fallback_death_narrative(self, player_data, death_reason, theme="haunted_house", fallback_reason: str = ""):
        return _REAL_AI_SERVICE._fallback_death_narrative(
            player_data, death_reason, theme, fallback_reason
        )

    def _fallback_results(self, sorted_players, theme="haunted_house", fallback_reason: str = ""):
        return _REAL_AI_SERVICE._fallback_results(sorted_players, theme, fallback_reason)


@pytest.fixture()
def ai_stub():
    """Stub the AI service for the duration of a test."""
    stub = StubAIService()
    original = ai_service_module.ai_service
    ai_service_module.ai_service = stub
    # routes/game.py holds a direct reference; patch it too.
    from app.routes import game as game_module
    original_route_ref = game_module.ai_service
    game_module.ai_service = stub
    yield stub
    ai_service_module.ai_service = original
    game_module.ai_service = original_route_ref


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Give every test a clean per-IP rate-limit budget.

    The limiter keys on the testclient's IP, so without this a burst test
    would starve every later test in the run.
    """
    from app.core.limiter import limiter

    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture()
def client(ai_stub):
    """TestClient with a fresh database per test."""
    Base.metadata.create_all(bind=engine)
    try:
        def override_get_db():
            db = TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        with TestClient(app) as test_client:
            yield test_client
        app.dependency_overrides.clear()
    finally:
        Base.metadata.drop_all(bind=engine)


def create_and_join(client, theme="haunted_house", player_name="Tester"):
    """Helper: create a session and join one player. Returns (code, player_id)."""
    created = client.post("/api/game/create-session", json={"theme": theme})
    assert created.status_code == 200, created.text
    code = created.json()["session_code"]
    joined = client.post(f"/api/game/join-session/{code}?player_name={player_name}")
    assert joined.status_code == 200, joined.text
    return code, joined.json()["player_id"]
