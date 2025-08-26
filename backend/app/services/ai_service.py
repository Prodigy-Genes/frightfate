from openai import OpenAI
import json
import re
import os
from typing import List, Dict, Any, Optional
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
    
    async def generate_initial_scenario(self, theme: str) -> Dict[str, Any]:
        """Generate the first scenario that establishes the story"""
        
        theme_prompts = {
            "haunted_house": "a cursed Victorian mansion with supernatural entities, moving objects, and dark family secrets",
            "zombie_outbreak": "a post-apocalyptic world overrun by zombies where survivors must make tough choices",
            "slasher_movie": "a classic 80s horror movie scenario with a masked killer stalking victims",
            "alien_invasion": "an extraterrestrial invasion where humanity fights for survival",
            "deep_sea_terror": "a deep ocean research facility where something ancient has awakened"
        }
        
        theme_description = theme_prompts.get(theme, "a generic horror scenario")
        
        prompt = f"""You are a master horror writer creating the opening scenario for "FrightFate: Who Dies First?" - a multiplayer horror game with branching narratives.

Create the FIRST scenario for the theme: {theme_description}

Requirements:
- This is the story opening that establishes the setting and initial danger
- Multiple solution paths that will lead to different story branches
- Test survival skills: logical thinking, caution, quick decisions
- 150-300 words ending with "What do you do?"
- Create dramatic tension but leave room for story progression

Return ONLY valid JSON in this exact format:
{{
    "question_number": 1,
    "title": "Story Opening Title",
    "description": "Detailed scenario description ending with 'What do you do?'",
    "survival_factors": ["logical_thinking", "caution", "investigation"],
    "story_context": "Brief context about the current situation",
    "branching_paths": [
        {{"action_type": "cautious", "description": "Careful, methodical approach"}},
        {{"action_type": "aggressive", "description": "Direct, confrontational approach"}},
        {{"action_type": "escape", "description": "Avoidance or retreat approach"}}
    ]
}}"""

        try:
            response = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a master horror writer creating branching narrative scenarios. Return only valid JSON without any markdown formatting."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model=self.model,
                **self.default_config
            )
            
            response_text = response.choices[0].message.content.strip()
            response_text = self._clean_json_response(response_text)
            
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_text = json_match.group()
                scenario = json.loads(json_text)
                return scenario
            
            raise Exception("No valid JSON found in response")
            
        except Exception as e:
            print(f"❌ Error generating initial scenario: {e}")
            return self._get_fallback_initial_scenario(theme)
    
    async def generate_next_scenario(self, theme: str, question_number: int, previous_scenarios: List[Dict], 
                                   player_choices: List[Dict], story_context: str) -> Optional[Dict[str, Any]]:
        """Generate the next scenario based on player's previous choices"""
        
        # Analyze the player's choice pattern
        choice_pattern = self._analyze_choice_pattern(player_choices)
        
        prompt = f"""You are a master horror writer creating the next scenario in a branching narrative for "FrightFate: Who Dies First?".

THEME: {theme}
CURRENT QUESTION: {question_number}
STORY CONTEXT: {story_context}

PLAYER'S PREVIOUS CHOICES:
{json.dumps(player_choices, indent=2)}

PLAYER'S CHOICE PATTERN: {choice_pattern}

PREVIOUS SCENARIOS:
{json.dumps(previous_scenarios, indent=2)}

Create the next scenario that:
1. Directly follows from the consequences of their previous actions
2. References specific choices they made earlier
3. Escalates tension based on their decision-making pattern
4. May lead to instant death if they've made consistently poor choices
5. Continues the narrative thread logically

If the player has made 2+ critically bad decisions (score < 30), make this a potential death scenario.
If they've been consistently reckless, put them in immediate mortal danger.
If they've been cautious, reward them with a manageable but tense situation.

Return ONLY valid JSON:
{{
    "question_number": {question_number},
    "title": "Scenario Title That References Previous Actions",
    "description": "Detailed scenario (150-300 words) that shows consequences of previous choices, ending with 'What do you do?'",
    "survival_factors": ["relevant", "survival", "skills"],
    "story_context": "Updated story context based on their journey",
    "death_risk_level": "low|medium|high|instant",
    "narrative_consequences": "How their previous choices led to this moment",
    "branching_paths": [
        {{"action_type": "survival_focused", "description": "Action that prioritizes staying alive"}},
        {{"action_type": "story_progression", "description": "Action that moves plot forward"}},
        {{"action_type": "high_risk", "description": "Dangerous but potentially rewarding action"}}
    ]
}}"""

        try:
            response = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a master horror writer creating connected narrative scenarios. Return only valid JSON without any markdown formatting."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model=self.model,
                **self.default_config
            )
            
            response_text = response.choices[0].message.content.strip()
            response_text = self._clean_json_response(response_text)
            
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_text = json_match.group()
                scenario = json.loads(json_text)
                return scenario
            
            return None
            
        except Exception as e:
            print(f"❌ Error generating next scenario: {e}")
            return None
    
    async def analyze_answer_with_death_check(self, scenario: Dict, player_answer: str, 
                                            player_history: List[Dict]) -> Dict[str, Any]:
        """Analyze player answer and determine if they should die instantly"""
        
        death_risk = scenario.get("death_risk_level", "medium")
        previous_poor_choices = sum(1 for choice in player_history if choice.get("score", 50) < 30)
        
        prompt = f"""You are an expert survival analyst for a horror survival game with branching narratives.

CURRENT SCENARIO: {scenario.get("title", "")}
SCENARIO DESCRIPTION: {scenario.get("description", "")[:400]}...
DEATH RISK LEVEL: {death_risk}
PLAYER'S PREVIOUS POOR CHOICES: {previous_poor_choices}

PLAYER RESPONSE: {player_answer}

SURVIVAL FACTORS BEING TESTED: {', '.join(scenario.get("survival_factors", []))}

PLAYER'S CHOICE HISTORY:
{json.dumps(player_history[-3:], indent=2) if player_history else "No previous choices"}

Analyze their survival chances considering:
1. Does their response show they learned from previous mistakes?
2. Is their choice appropriate for the current danger level?
3. Do they show logical thinking vs impulsive behavior?
4. Given their history of poor choices, is this the final straw?
5. Would this action realistically result in immediate death?

DEATH CRITERIA:
- If death_risk_level is "instant" and they make any poor choice: instant death
- If they have 2+ previous poor choices AND make another bad choice: high chance of death
- If death_risk_level is "high" and they're reckless: possible instant death

Return ONLY valid JSON:
{{
  "survival_score": 75,
  "instant_death": false,
  "death_reason": null,
  "analysis": "Detailed explanation of their decision-making and consequences",
  "story_progression": "How this choice affects the ongoing narrative",
  "choice_classification": "cautious|neutral|reckless|deadly",
  "narrative_consequence": "What happens as a direct result of this action"
}}

Score scale:
- 0-20: Certain death or extremely poor choices
- 21-40: Very likely to die, bad decisions  
- 41-60: Average survival chance, mixed decisions
- 61-80: Good survival chance, smart choices
- 81-100: Excellent survival chance, brilliant decisions

Set instant_death to true if they should die immediately."""

        try:
            analysis_config = {
                "temperature": 0.3,
                "max_tokens": 512,
                "top_p": 0.8,
            }
            
            response = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert survival analyst for branching horror narratives. Return only valid JSON without any markdown formatting."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model=self.model,
                **analysis_config
            )
            
            response_text = response.choices[0].message.content.strip()
            response_text = self._clean_json_response(response_text)
            
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_text = json_match.group()
                analysis = json.loads(json_text)
                
                # Validate and ensure required fields
                analysis["survival_score"] = max(0, min(100, analysis.get("survival_score", 50)))
                analysis["instant_death"] = analysis.get("instant_death", False)
                analysis["choice_classification"] = analysis.get("choice_classification", "neutral")
                
                return analysis
            
            raise Exception("Invalid JSON format")
            
        except Exception as e:
            print(f"❌ Error analyzing answer: {e}")
            return self._fallback_death_analysis(player_answer, death_risk, previous_poor_choices)
    
    async def generate_death_narrative(self, player_data: Dict, death_reason: str) -> Dict[str, Any]:
        """Generate a dramatic death narrative for eliminated players"""
        
        prompt = f"""You are a horror novelist creating a dramatic death scene for an eliminated player in "FrightFate: Who Dies First?".

PLAYER: {player_data.get("player_name", "Unknown")}
CAUSE OF DEATH: {death_reason}
TOTAL SCORE: {player_data.get("total_score", 0)}
CHOICES MADE: {player_data.get("answer_count", 0)}

Create a cinematic death narrative that:
1. References their specific poor decisions
2. Shows the consequences of their choices
3. Is dramatic but not gratuitously graphic
4. Explains why they died (recklessness, poor judgment, etc.)

Return ONLY valid JSON:
{{
    "player_name": "{player_data.get('player_name', 'Unknown')}",
    "eliminated": true,
    "death_narrative": "Dramatic 2-3 sentence story of their demise",
    "death_analysis": "1-2 sentences explaining why their choices led to death",
    "fate_title": "💀 ELIMINATED",
    "elimination_reason": "Brief reason for elimination"
}}"""

        try:
            response = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a horror novelist creating elimination narratives. Return only valid JSON without any markdown formatting."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model=self.model,
                **self.default_config
            )
            
            response_text = response.choices[0].message.content.strip()
            response_text = self._clean_json_response(response_text)
            
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_text = json_match.group()
                return json.loads(json_text)
            
            return self._fallback_death_narrative(player_data, death_reason)
            
        except Exception as e:
            print(f"❌ Error generating death narrative: {e}")
            return self._fallback_death_narrative(player_data, death_reason)
    
    def _analyze_choice_pattern(self, player_choices: List[Dict]) -> str:
        """Analyze player's decision-making pattern"""
        if not player_choices:
            return "new_player"
        
        avg_score = sum(choice.get("score", 50) for choice in player_choices) / len(player_choices)
        poor_choices = sum(1 for choice in player_choices if choice.get("score", 50) < 30)
        
        if poor_choices >= 2:
            return "consistently_reckless"
        elif avg_score >= 70:
            return "cautious_survivor"
        elif avg_score >= 50:
            return "mixed_decisions"
        else:
            return "poor_judgment"
    
    def _fallback_death_analysis(self, answer: str, death_risk: str, previous_poor_choices: int) -> Dict[str, Any]:
        """Fallback analysis when AI fails"""
        answer_lower = answer.lower()
        
        reckless_keywords = ["run", "charge", "attack", "rush", "fast", "immediately", "grab", "fight", "scream", "panic"]
        cautious_keywords = ["carefully", "slowly", "quietly", "observe", "listen", "plan", "strategy", "safe", "caution"]
        
        reckless_score = sum(10 for word in reckless_keywords if word in answer_lower)
        cautious_score = sum(10 for word in cautious_keywords if word in answer_lower)
        
        base_score = 50 + cautious_score - reckless_score
        base_score = max(0, min(100, base_score))
        
        # Determine instant death
        instant_death = False
        if death_risk == "instant" and base_score < 40:
            instant_death = True
        elif death_risk == "high" and previous_poor_choices >= 2 and base_score < 30:
            instant_death = True
        elif previous_poor_choices >= 3 and base_score < 25:
            instant_death = True
        
        choice_type = "deadly" if instant_death else ("reckless" if base_score < 40 else ("cautious" if base_score >= 60 else "neutral"))
        
        return {
            "survival_score": base_score,
            "instant_death": instant_death,
            "death_reason": "Reckless decision-making led to immediate danger" if instant_death else None,
            "analysis": "Your impulsive actions have caught up with you" if instant_death else "Mixed decision-making with room for improvement",
            "story_progression": "Your choice has significant consequences for the story",
            "choice_classification": choice_type,
            "narrative_consequence": "The situation escalates dramatically based on your actions"
        }
    
    def _fallback_death_narrative(self, player_data: Dict, death_reason: str) -> Dict[str, Any]:
        """Fallback death narrative"""
        return {
            "player_name": player_data.get("player_name", "Unknown"),
            "eliminated": True,
            "death_narrative": f"Poor decision-making caught up with {player_data.get('player_name', 'the player')}, leading to their untimely demise. Their reckless choices throughout the ordeal finally sealed their fate.",
            "death_analysis": "Consistently poor judgment and failure to adapt to dangerous situations resulted in elimination.",
            "fate_title": "💀 ELIMINATED",
            "elimination_reason": death_reason or "Poor survival instincts"
        }
    
    async def generate_final_results(self, players_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate final results using GitHub Models"""
        
        sorted_players = sorted(players_data, key=lambda x: x.get('total_score', 0), reverse=True)
        
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
    
    def _fallback_results(self, sorted_players: List[Dict]) -> List[Dict[str, Any]]:
        """Generate high-quality fallback results"""
        results = []
        
        for i, player in enumerate(sorted_players):
            rank = i + 1
            survived = i == 0
            
            if survived:
                narrative = "Your strategic thinking and careful decision-making kept you alive when others perished. Every choice you made showed wisdom and survival instinct."
                fate_title = "🎉 SOLE SURVIVOR"
                survival_analysis = f"With a total score of {player.get('total_score', 0)}, you demonstrated exceptional survival instincts and logical decision-making under pressure."
            else:
                if rank == 2:
                    narrative = f"You came close to survival, but a few critical mistakes cost you dearly. Your decision-making showed promise but lacked consistency when it mattered most."
                else:
                    narrative = f"Your impulsive decisions and poor risk assessment led to an early demise. In horror scenarios, hesitation and planning often mean the difference between life and death."
                
                fate_title = f"💀 VICTIM #{rank}"
                survival_analysis = f"Your total score of {player.get('total_score', 0)} indicates {['poor', 'below average', 'average'][min(2, max(0, player.get('total_score', 0) // 30))]} decision-making under pressure."
            
            results.append({
                "player_name": player.get("player_name", "Unknown"),
                "rank": rank,
                "survived": survived,
                "fate_title": fate_title,
                "narrative": narrative,
                "survival_analysis": survival_analysis
            })
        
        return results
    
    def _get_fallback_initial_scenario(self, theme: str) -> Dict[str, Any]:
        """Fallback initial scenario"""
        scenarios = {
            "haunted_house": {
                "question_number": 1,
                "title": "The Inheritance",
                "description": "You've inherited your great aunt's Victorian mansion. As you step inside for the first time, the heavy door slams shut behind you. The key that worked moments ago now refuses to turn. Through dusty windows, you see your car, but the door won't budge. The house feels unnaturally cold, and you hear slow footsteps on the wooden floors above, though you came here alone. What do you do?",
                "survival_factors": ["logical_thinking", "caution", "investigation"],
                "story_context": "Trapped in an inherited haunted mansion",
                "branching_paths": [
                    {"action_type": "cautious", "description": "Carefully investigate your surroundings"},
                    {"action_type": "aggressive", "description": "Force your way out immediately"},
                    {"action_type": "escape", "description": "Look for alternative exits"}
                ]
            }
        }
        
        return scenarios.get(theme, scenarios["haunted_house"])
    
    # Keep existing methods for backwards compatibility
    def _clean_json_response(self, response_text: str) -> str:
        """Clean markdown and other formatting from JSON response"""
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        elif response_text.startswith('```'):
            response_text = response_text[3:]
        
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        return response_text.strip()

# Global AI service instance
ai_service = AIService()