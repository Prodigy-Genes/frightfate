from openai import OpenAI
import json
import re
import os
from typing import List, Dict, Any
from app.core.config import get_settings

settings = get_settings()

class AIService:
    def __init__(self):
        # Initialize OpenAI client for GitHub Models
        self.client = OpenAI(
            base_url="https://models.github.ai/inference",
            api_key=settings.github_token,
        )
        self.model = settings.openai_model
        
        # Default generation settings
        self.default_config = {
            "temperature": 0.7,
            "max_tokens": 2048,
            "top_p": 0.8,
        }
    
    async def generate_scenarios(self, theme: str, count: int = 5) -> List[Dict[str, Any]]:
        """Generate horror scenarios using GitHub Models"""
        
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
            response = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a master horror writer creating survival scenarios. Return only valid JSON arrays without any markdown formatting."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model=self.model,
                **self.default_config
            )
            
            # Get response text
            response_text = response.choices[0].message.content.strip()
            print(f"✅ GitHub Models response received: {len(response_text)} characters")
            
            # Clean and parse the response
            response_text = self._clean_json_response(response_text)
            
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
            print(f"❌ Error generating scenarios with GitHub Models: {e}")
            return self._get_fallback_scenarios(theme, count)
    
    async def analyze_answer(self, scenario_description: str, player_answer: str, survival_factors: List[str]) -> Dict[str, Any]:
        """Analyze player answer using GitHub Models"""
        
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
            analysis_config = {
                "temperature": 0.3,
                "max_tokens": 512,
                "top_p": 0.8,
            }
            
            response = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert survival analyst. Return only valid JSON without any markdown formatting."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model=self.model,
                **analysis_config
            )
            
            # Clean and parse response
            response_text = response.choices[0].message.content.strip()
            print(f"✅ Analysis response: {response_text[:100]}...")
            
            response_text = self._clean_json_response(response_text)
            
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
            print(f"❌ Error analyzing answer with GitHub Models: {e}")
            return self._fallback_analysis(player_answer, survival_factors)
    
    async def generate_final_results(self, players_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate final results using GitHub Models"""
        
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

    IMPORTANT: Always include ALL required fields: player_name, rank, survived, fate_title, narrative, survival_analysis

    Make narratives:
    - Cinematic and dramatic
    - Specific to their performance (high scores = smart decisions, low scores = poor choices)
    - Horror-themed but not gratuitously graphic
    - Personalized, not generic

    Order by rank (survivor first, then deaths in order)."""

        try:
            # Results-specific config
            results_config = {
                "temperature": 0.8,
                "max_tokens": 1500,
                "top_p": 0.9,
            }
            
            response = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a horror novelist creating final results. Return only valid JSON arrays without any markdown formatting. Always include ALL required fields."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model=self.model,
                **results_config
            )
            
            # Clean and parse response
            response_text = response.choices[0].message.content.strip()
            print(f"✅ Results response: {len(response_text)} characters")
            
            response_text = self._clean_json_response(response_text)
            
            # Find JSON array
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                json_text = json_match.group()
                results = json.loads(json_text)
                
                # Validate and ensure we have all required fields
                validated_results = []
                for result in results:
                    # Ensure all required fields exist
                    validated_result = {
                        "player_name": result.get("player_name", "Unknown"),
                        "rank": result.get("rank", 1),
                        "survived": result.get("survived", False),
                        "fate_title": result.get("fate_title", "Unknown Fate"),
                        "narrative": result.get("narrative", "No story available"),
                        "survival_analysis": result.get("survival_analysis", "No analysis available")
                    }
                    validated_results.append(validated_result)
                
                if len(validated_results) >= len(sorted_players):
                    print(f"✅ Generated AI results for {len(validated_results)} players")
                    return validated_results[:len(sorted_players)]
            
            raise Exception("Invalid results format")
            
        except Exception as e:
            print(f"❌ Error generating results with GitHub Models: {e}")
            return self._fallback_results(sorted_players)
    
    
    def _clean_json_response(self, response_text: str) -> str:
        """Clean markdown and other formatting from JSON response"""
        # Remove markdown code blocks
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        elif response_text.startswith('```'):
            response_text = response_text[3:]
        
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        return response_text.strip()
    
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
        """Sophisticated fallback analysis when AI fails"""
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
                survival_analysis = f"With a total score of {player['total_score']}, you demonstrated exceptional survival instincts and logical decision-making under pressure."
            else:
                if rank == 2:
                    narrative = f"You came close to survival, but a few critical mistakes cost you dearly. Your decision-making showed promise but lacked consistency when it mattered most."
                else:
                    narrative = f"Your impulsive decisions and poor risk assessment led to an early demise. In horror scenarios, hesitation and planning often mean the difference between life and death."
                
                fate_title = f"💀 VICTIM #{rank}"
                survival_analysis = f"Your total score of {player['total_score']} indicates {['poor', 'below average', 'average'][min(2, max(0, player['total_score'] // 30))]} decision-making under pressure."
            
            results.append({
                "player_name": player["player_name"],
                "rank": rank,
                "survived": survived,
                "fate_title": fate_title,
                "narrative": narrative,
                "survival_analysis": survival_analysis
            })
        
        return results
    
    def _get_fallback_scenarios(self, theme: str, count: int) -> List[Dict[str, Any]]:
        """High-quality fallback scenarios - 5 total"""
        scenarios_db = {
            "haunted_house": [
                {
                    "question_number": 1,
                    "title": "The Locked Door",
                    "description": "You've inherited your great aunt's Victorian mansion. As you step inside for the first time, the heavy wooden door slams shut behind you with a resounding BANG. The antique key that worked moments ago now refuses to turn in the lock. Through the dusty windows, you see your car in the driveway, but the door won't budge no matter how hard you push. The house feels unnaturally cold, and you hear what sounds like slow, deliberate footsteps creaking on the wooden floors somewhere above you, though you know you came here completely alone. What do you do?",
                    "survival_factors": ["logical_thinking", "caution", "resourcefulness"]
                },
                {
                    "question_number": 2,
                    "title": "Whispers in the Walls",
                    "description": "As you explore the mansion's grand foyer, you hear faint whispers coming from within the walls themselves. The voices seem to be having a conversation, but you can't make out the words. The whispers grow louder as you approach the ornate staircase leading to the second floor. Suddenly, you hear your name being called from upstairs in a voice that sounds exactly like your deceased great aunt, but you know that's impossible. The temperature drops noticeably, and your breath becomes visible in the suddenly frigid air. What do you do?",
                    "survival_factors": ["caution", "investigation", "self_preservation"]
                },
                {
                    "question_number": 3,
                    "title": "The Moving Portrait",
                    "description": "In the dimly lit hallway, you notice a large oil painting of a stern-looking man whose eyes seem to follow your every movement. As you study it closer, you realize the man's expression has changed from when you first looked at it - his mouth has curved into a sinister smile. Suddenly, the painting begins to bleed real blood from the frame, dripping onto the antique carpet below. Behind you, all the doors in the hallway begin slamming shut one by one, working their way toward you. The man's laughter echoes from the painting itself. What do you do?",
                    "survival_factors": ["quick_thinking", "courage", "escape_planning"]
                },
                {
                    "question_number": 4,
                    "title": "The Possessed Mirror",
                    "description": "You find yourself in what appears to be the master bedroom, dominated by an enormous antique mirror with an ornate silver frame. Your reflection looks normal at first, but then you notice it's moving independently - it waves at you when you're standing still, and smiles when your face is neutral. The reflection mouth the words 'Let me out' repeatedly. The room's temperature plummets, and frost begins forming on the mirror's surface. Your reflection suddenly places its hands against the glass from the inside, and hairline cracks begin to spread across the mirror. Whatever is trying to get out is almost free. What do you do?",
                    "survival_factors": ["decisive_action", "supernatural_awareness", "survival_instinct"]
                },
                {
                    "question_number": 5,
                    "title": "The Final Confrontation",
                    "description": "You've reached the mansion's cellar, the only place left unexplored. The walls are covered in strange symbols carved deep into the stone, and the air reeks of decay and something far worse. In the center of the room stands an ancient ritual circle, and within it, a shadowy figure that seems to absorb light itself. The entity speaks your name in a voice like grinding glass, and you realize this is what has been hunting you throughout the house. All the doors have vanished - there's no escape route. The entity begins to move toward you, and you feel your life force being drained with each step it takes. This is your final stand. What do you do?",
                    "survival_factors": ["combat", "desperation", "final_gambit"]
                }
            ],
            "zombie_outbreak": [
                {
                    "question_number": 1,
                    "title": "The First Bite",
                    "description": "You wake up to screaming outside your apartment. Looking out the window, you see your neighbor being attacked by what looks like another resident, but something is horribly wrong - the attacker's movements are jerky and unnatural, and there's blood everywhere. The 'attacker' turns toward your window, and you see its face is pale gray with completely white eyes. More figures are shambling down the street. Your phone has no signal, and the emergency broadcast on TV just shows a test pattern. You hear scratching at your front door. What do you do?",
                    "survival_factors": ["logical_thinking", "resource_gathering", "caution"]
                }
                # Add 4 more zombie scenarios following the same pattern...
            ]
        }
        
        theme_scenarios = scenarios_db.get(theme, [])
        
        # If we don't have enough scenarios for this theme, create generic ones
        while len(theme_scenarios) < count:
            q_num = len(theme_scenarios) + 1
            theme_scenarios.append({
                "question_number": q_num,
                "title": f"Survival Challenge {q_num}",
                "description": f"You face escalating danger in this {theme.replace('_', ' ')} scenario. The situation grows more desperate with each passing moment. What do you do?",
                "survival_factors": ["logical_thinking", "survival_instinct"]
            })
        
        return theme_scenarios[:count]

# Global AI service instance
ai_service = AIService()