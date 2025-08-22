from google import genai
from google.genai import types
import json
import re
import os
from typing import List, Dict, Any
from app.core.config import get_settings

settings = get_settings()

class AIService:
    def __init__(self):
        # Set environment variable for automatic pickup
        os.environ['GEMINI_API_KEY'] = settings.gemini_api_key
        
        # Initialize the new client
        self.client = genai.Client()
        self.model = settings.gemini_model
        
        # Configure generation settings (disable thinking for speed)
        self.generation_config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_budget=0),  # Disable thinking for speed
            temperature=0.7,
            top_p=0.8,
            top_k=40,
            max_output_tokens=2048,
        )
    
    async def generate_scenarios(self, theme: str, count: int = 10) -> List[Dict[str, Any]]:
        """Generate horror scenarios using new Gemini SDK"""
        
        theme_prompts = {
            "haunted_house": "a cursed Victorian mansion with supernatural entities, moving objects, and dark family secrets",
            "zombie_outbreak": "a post-apocalyptic world overrun by zombies where survivors must make tough choices",
            "slasher_movie": "a classic 80s horror movie scenario with a masked killer stalking victims",
            "alien_invasion": "an extraterrestrial invasion where humanity fights for survival",
            "deep_sea_terror": "a deep ocean research facility where something ancient has awakened"
        }
        
        theme_description = theme_prompts.get(theme, "a generic horror scenario")
        
        prompt = f"""You are a master horror writer creating survival scenarios for "FrightFate: Who Dies First?" - a multiplayer horror game.

Create {count} escalating horror scenarios for the theme: {theme_description}

Requirements:
- Each scenario should be a life-or-death situation
- Test different survival skills: logical thinking, caution, quick decisions, leadership, combat, resourcefulness
- Start with scenarios having multiple solutions, end with nearly impossible situations
- Each description should be 150-300 words and end with "What do you do?"
- Make them atmospheric, visceral, and genuinely challenging

Return ONLY valid JSON in this exact format:
[
  {{
    "question_number": 1,
    "title": "The Creaking Door",
    "description": "Detailed scenario description ending with 'What do you do?'",
    "survival_factors": ["logical_thinking", "caution", "creativity"]
  }},
  {{
    "question_number": 2,
    "title": "Next Scenario",
    "description": "Another scenario...",
    "survival_factors": ["caution", "investigation", "self_preservation"]
  }}
]

Create all {count} scenarios now."""

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=self.generation_config
            )
            
            # Clean and parse the response
            response_text = response.text.strip()
            print(f"✅ Gemini response received: {len(response_text)} characters")
            
            # Remove markdown code blocks if present
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            # Find JSON array
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                json_text = json_match.group()
                scenarios = json.loads(json_text)
                
                # Validate and fix scenarios
                valid_scenarios = []
                for i, scenario in enumerate(scenarios):
                    if self._validate_scenario(scenario):
                        scenario["question_number"] = i + 1
                        valid_scenarios.append(scenario)
                
                print(f"✅ Generated {len(valid_scenarios)} valid AI scenarios")
                
                if len(valid_scenarios) >= count:
                    return valid_scenarios[:count]
                else:
                    fallbacks = self._get_fallback_scenarios(theme, count - len(valid_scenarios))
                    return valid_scenarios + fallbacks
            
            raise Exception("No valid JSON found in response")
            
        except Exception as e:
            print(f"❌ Error generating scenarios with Gemini: {e}")
            return self._get_fallback_scenarios(theme, count)
    
    async def analyze_answer(self, scenario_description: str, player_answer: str, survival_factors: List[str]) -> Dict[str, Any]:
        """Analyze player answer using new Gemini SDK"""
        
        prompt = f"""You are an expert survival analyst for a horror survival game. Analyze this player's response harshly but fairly.

SCENARIO: {scenario_description[:400]}...

PLAYER RESPONSE: {player_answer}

SURVIVAL FACTORS BEING TESTED: {', '.join(survival_factors)}

Analyze their survival chances considering:
1. Does their response address the immediate danger effectively?
2. Do they show logical thinking vs impulsive behavior?
3. Are they taking appropriate precautions for the situation?
4. Would their actions realistically help them survive?
5. How well do they demonstrate the tested survival factors?

Be realistic and harsh - this is a horror game where most people should die due to poor decisions.

Return ONLY valid JSON:
{{
  "survival_score": 75,
  "analysis": "Detailed explanation of why this score was given (50-100 words explaining their decision-making)",
  "key_factors": ["logical_thinking", "caution"],
  "death_likelihood": 25
}}

Score scale:
- 0-20: Certain death, extremely poor choices
- 21-40: Very likely to die, bad decisions  
- 41-60: Average survival chance, mixed decisions
- 61-80: Good survival chance, smart choices
- 81-100: Excellent survival chance, brilliant decisions"""

        try:
            # Analysis-specific config
            analysis_config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0),
                temperature=0.3,
                top_p=0.8,
                max_output_tokens=512,
            )
            
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=analysis_config
            )
            
            # Clean and parse response
            response_text = response.text.strip()
            print(f"✅ Analysis response: {response_text[:100]}...")
            
            # Remove markdown if present
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            # Find JSON object
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_text = json_match.group()
                analysis = json.loads(json_text)
                
                # Validate required fields
                required_fields = ["survival_score", "analysis", "death_likelihood"]
                if all(field in analysis for field in required_fields):
                    # Ensure score is in valid range
                    analysis["survival_score"] = max(0, min(100, analysis["survival_score"]))
                    analysis["death_likelihood"] = max(0, min(100, analysis["death_likelihood"]))
                    
                    # Ensure key_factors exists
                    if "key_factors" not in analysis:
                        analysis["key_factors"] = survival_factors[:2]
                    
                    print(f"✅ AI analysis complete: score {analysis['survival_score']}")
                    return analysis
            
            raise Exception("Invalid JSON format")
            
        except Exception as e:
            print(f"❌ Error analyzing answer with Gemini: {e}")
            return self._fallback_analysis(player_answer, survival_factors)
    
    async def generate_final_results(self, players_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate final results using new Gemini SDK"""
        
        sorted_players = sorted(players_data, key=lambda x: x['total_score'], reverse=True)
        
        prompt = f"""You are a horror novelist creating the final results for "FrightFate: Who Dies First?" - a horror survival game.

Players and their performance:
{json.dumps(sorted_players, indent=2)}

Rules:
- Highest total_score survives (rank 1)
- Others die in reverse score order (rank 2, 3, 4...)
- Create dramatic, personalized narratives based on their decision-making patterns

Return ONLY valid JSON array:
[
  {{
    "player_name": "PlayerName",
    "rank": 1,
    "survived": true,
    "fate_title": "🎉 SOLE SURVIVOR",
    "narrative": "Personalized 2-3 sentence story of how they survived/died based on their total score and decision patterns",
    "survival_analysis": "1-2 sentences explaining WHY they survived/died based on their score"
  }}
]

Make narratives:
- Cinematic and dramatic
- Specific to their performance (high scores = smart decisions, low scores = poor choices)
- Horror-themed but not gratuitously graphic
- Personalized, not generic

Order by rank (survivor first, then deaths in order)."""

        try:
            # Results-specific config
            results_config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0),
                temperature=0.8,
                top_p=0.9,
                max_output_tokens=1500,
            )
            
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=results_config
            )
            
            # Clean and parse response
            response_text = response.text.strip()
            print(f"✅ Results response: {len(response_text)} characters")
            
            # Remove markdown if present
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            # Find JSON array
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                json_text = json_match.group()
                results = json.loads(json_text)
                
                # Validate and ensure we have results for all players
                if len(results) >= len(sorted_players):
                    print(f"✅ Generated AI results for {len(results)} players")
                    return results[:len(sorted_players)]
            
            raise Exception("Invalid results format")
            
        except Exception as e:
            print(f"❌ Error generating results with Gemini: {e}")
            return self._fallback_results(sorted_players)
    
    def _validate_scenario(self, scenario: Dict) -> bool:
        """Validate scenario has required fields"""
        required_fields = ["title", "description", "survival_factors"]
        if not all(field in scenario for field in required_fields):
            return False
        
        if len(scenario.get("title", "")) < 3:
            return False
        if len(scenario.get("description", "")) < 50:
            return False
        if not isinstance(scenario.get("survival_factors"), list):
            return False
            
        return True
    
    def _fallback_analysis(self, answer: str, factors: List[str]) -> Dict[str, Any]:
        """Sophisticated fallback analysis when Gemini fails"""
        answer_lower = answer.lower()
        
        excellent_keywords = ["carefully", "slowly", "quietly", "observe", "listen", "plan", "strategy", "safe", "caution", "think"]
        good_keywords = ["check", "look", "examine", "search", "prepare", "ready", "escape", "help", "consider"]
        bad_keywords = ["run", "charge", "attack", "rush", "fast", "immediately", "grab", "fight"]
        terrible_keywords = ["scream", "panic", "freeze", "give up", "surrender", "ignore"]
        
        score = 50
        score += sum(15 for word in excellent_keywords if word in answer_lower)
        score += sum(10 for word in good_keywords if word in answer_lower)
        score -= sum(10 for word in bad_keywords if word in answer_lower)
        score -= sum(20 for word in terrible_keywords if word in answer_lower)
        
        # Length and detail bonus
        if len(answer) > 100:
            score += 5
        elif len(answer) < 20:
            score -= 10
        
        score += min(answer.count("?") * 3, 9)
        score = max(0, min(100, score))
        
        if score >= 80:
            analysis = "Excellent survival instincts! Your cautious and methodical approach shows strong decision-making under pressure."
        elif score >= 60:
            analysis = "Good survival thinking. You show awareness of danger and make mostly sensible choices."
        elif score >= 40:
            analysis = "Mixed survival decisions. Some good instincts but also some questionable choices that could be dangerous."
        else:
            analysis = "Poor survival instincts. Your impulsive or reckless decisions would likely lead to trouble in a real scenario."
        
        return {
            "survival_score": score,
            "analysis": analysis,
            "key_factors": factors[:2],
            "death_likelihood": 100 - score
        }
    
    def _fallback_results(self, sorted_players: List[Dict]) -> List[Dict[str, Any]]:
        """Generate high-quality fallback results"""
        results = []
        
        for i, player in enumerate(sorted_players):
            rank = i + 1
            survived = i == 0
            
            if survived:
                narrative = "Your strategic thinking and careful decision-making kept you alive when others perished. Every choice you made showed wisdom and survival instinct."
                fate_title = "🎉 SOLE SURVIVOR"
            else:
                narrative = f"Your decision-making patterns led to your demise. While some choices showed promise, critical errors sealed your fate."
                fate_title = f"💀 DIED #{rank}"
            
            results.append({
                "player_name": player["player_name"],
                "rank": rank,
                "survived": survived,
                "fate_title": fate_title,
                "narrative": narrative,
                "survival_analysis": f"Your total score of {player['total_score']} reflects your decision-making under pressure."
            })
        
        return results
    
    def _get_fallback_scenarios(self, theme: str, count: int) -> List[Dict[str, Any]]:
        """High-quality fallback scenarios"""
        scenarios_db = {
            "haunted_house": [
                {
                    "question_number": 1,
                    "title": "The Locked Door",
                    "description": "You've inherited your great aunt's Victorian mansion. As you step inside for the first time, the heavy wooden door slams shut behind you with a resounding BANG. The antique key that worked moments ago now refuses to turn in the lock. Through the dusty windows, you see your car in the driveway, but the door won't budge no matter how hard you push. The house feels unnaturally cold, and you hear what sounds like slow, deliberate footsteps creaking on the wooden floors somewhere above you, though you know you came here completely alone. What do you do?",
                    "survival_factors": ["logical_thinking", "caution", "resourcefulness"]
                }
            ]
        }
        
        theme_scenarios = scenarios_db.get(theme, [])
        while len(theme_scenarios) < count:
            q_num = len(theme_scenarios) + 1
            theme_scenarios.append({
                "question_number": q_num,
                "title": f"Challenge {q_num}",
                "description": f"You face escalating danger in this {theme.replace('_', ' ')} scenario. What do you do?",
                "survival_factors": ["logical_thinking", "caution"]
            })
        
        return theme_scenarios[:count]

# Global AI service instance
ai_service = AIService()