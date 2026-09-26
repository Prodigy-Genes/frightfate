import asyncio
import json
from app.services.ai_service import ai_service
from app.core.config import get_settings

async def main():
    print("====================================================")
    print("🎃 FRIGHTFATE CONTEXTUAL GAME MASTER PROMPT TEST")
    print("====================================================")
    
    # 1. Round 1: Opening Scenario
    print("\n[Step 1] Generating Round 1 Opening Scenario...")
    r1_scenario = await ai_service.generate_initial_scenario("haunted_house")
    print(f"Title: {r1_scenario.get('title')}")
    print(f"Description:\n{r1_scenario.get('description')}\n")
    
    # 2. Round 1: Player Choice & Analysis
    player_choice_1 = "I carefully inspect the fireplace for an iron poker to use as a crowbar, moving with extreme silence."
    print(f"[Step 2] Evaluating Player Round 1 Action:\n\"{player_choice_1}\"")
    r1_eval = await ai_service.analyze_answer_with_death_check(r1_scenario, player_choice_1, [])
    print(f"-> Survival Score: {r1_eval.get('survival_score')}/100")
    print(f"-> Classification: {r1_eval.get('choice_classification')}")
    print(f"-> Tactical Analysis: {r1_eval.get('analysis')}")
    print(f"-> Immediate Story Progression: {r1_eval.get('story_progression')}")
    
    # 3. Round 2: Generating Next Scenario with Continuity
    print("\n[Step 3] Generating Round 2 Scenario (Testing Narrative Continuity)...")
    player_history = [
        {
            "question_number": 1,
            "answer_text": player_choice_1,
            "score": r1_eval.get("survival_score", 75),
            "story_context": r1_eval.get("story_progression", "Retrieved iron poker."),
            "choice_classification": r1_eval.get("choice_classification", "cautious")
        }
    ]
    r2_scenario = await ai_service.generate_next_scenario(
        "haunted_house",
        2,
        [r1_scenario],
        player_history,
        r1_eval.get("story_progression", "")
    )
    print(f"Round 2 Title: {r2_scenario.get('title')}")
    print(f"Round 2 Description:\n{r2_scenario.get('description')}\n")
    print(f"Continuity Consequences:\n{r2_scenario.get('narrative_consequences')}\n")
    
    # 4. Round 2: Player Reckless Action Analysis
    player_choice_2 = "I scream at the top of my lungs to intimidate whatever is upstairs and smash the nearest vase against the wall."
    print(f"[Step 4] Evaluating Player Round 2 (Reckless) Action:\n\"{player_choice_2}\"")
    r2_eval = await ai_service.analyze_answer_with_death_check(r2_scenario, player_choice_2, player_history)
    print(f"-> Survival Score: {r2_eval.get('survival_score')}/100")
    print(f"-> Classification: {r2_eval.get('choice_classification')}")
    print(f"-> Instant Death: {r2_eval.get('instant_death')}")
    print(f"-> Tactical Analysis: {r2_eval.get('analysis')}")
    print(f"-> Story Progression: {r2_eval.get('story_progression')}")

    print("\n✅ MULTI-ROUND CONTEXTUAL TEST COMPLETE!")

if __name__ == "__main__":
    asyncio.run(main())
