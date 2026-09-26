import json
import urllib.request
import urllib.parse
import sys

BASE_URL = "http://127.0.0.1:8000"

def get(path):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))

def post(path, data=None):
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode("utf-8") if data else b""
    headers = {"Content-Type": "application/json"} if data else {}
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("🎃 [1/6] Testing /health...")
    health = get("/health")
    print("   Health response:", health)
    assert health["status"] == "ok"

    print("🎃 [2/6] Creating session...")
    created = post("/api/game/create-session?theme=haunted_house")
    session_code = created["session_code"]
    print(f"   Session created: code={session_code}, theme={created['theme']}")

    print("🎃 [3/6] Joining session...")
    player = post(f"/api/game/join-session/{session_code}?player_name=SurvivorOne")
    player_id = player["player_id"]
    print(f"   Player joined: id={player_id}, name={player['player_name']}")

    print("🎃 [4/6] Querying session state...")
    session_info = get(f"/api/game/session/{session_code}")
    print(f"   Active players: {len(session_info['active_players'])}, Status: {session_info['status']}")
    assert len(session_info["active_players"]) >= 1

    print("🎃 [5/6] Generating initial scenario (Question 1)...")
    scenario = get(f"/api/game/scenario/{session_code}/1?player_id={player_id}")
    print(f"   Scenario Title: '{scenario.get('title')}'")
    print(f"   Description preview: {scenario.get('description', '')[:80]}...")
    assert "description" in scenario

    print("🎃 [6/6] Submitting survival answer (Async OpenAI check)...")
    ans_payload = {
        "session_code": session_code,
        "player_id": player_id,
        "question_number": 1,
        "answer_text": "I barricade the heavy oak door and search quietly for emergency flares."
    }
    ans_res = post("/api/game/submit-answer", data=ans_payload)
    print(f"   Survival Score: {ans_res.get('score')}")
    print(f"   AI Story Progression: {ans_res.get('story_progression', '')[:100]}...")
    print(f"   Classification: {ans_res.get('choice_classification')}")
    print(f"   Better Alternatives: {ans_res.get('better_alternatives')}")

    print("\n✅ ALL END-TO-END INTEGRATION TESTS PASSED!")

if __name__ == "__main__":
    main()
