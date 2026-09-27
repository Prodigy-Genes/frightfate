from openai import AsyncOpenAI
import json
import re
from typing import List, Dict, Any, Optional
from app.core.config import get_settings

settings = get_settings()


# ==============================================================================
# WORLD BIBLES
# Each theme gets a setting, an in-character HOST VOICE (used for all feedback)
# and an antagonist doctrine that keeps the threat behaving consistently.
# ==============================================================================

THEME_SETTINGS: Dict[str, str] = {
    "haunted_house": "a cursed Victorian mansion - rotting wood floors, cold drafts, something watching from the dark",
    "zombie_outbreak": "a quarantined hospital overrun by fast, sound-sensitive infected - flickering emergency lights, locked wards",
    "slasher_movie": "an isolated summer camp in a blackout thunderstorm - a masked killer has already claimed someone tonight",
    "alien_invasion": "a remote radar facility - the perimeter is breached, comms are dead, and something is inside the building",
    "deep_sea_terror": "a deep-ocean research station - hull damage, failing pressure seals, and something enormous is outside the glass",
    "cryptid_woods": "an Appalachian pine hollow after dark - fire roads, bone-dry creek beds, and a folk-horror creature that mimics the voices of the people it has taken",
}

# The voice that delivers ALL feedback, notifications and verdicts.
THEME_PERSONAS: Dict[str, str] = {
    "haunted_house": (
        "Madame Vesper, a Victorian seance medium who narrates with mournful, antique courtesy - "
        "as if reading your name from a headstone she has already carved"
    ),
    "zombie_outbreak": (
        "QUARANTINE-9, a failing emergency broadcast system that speaks in clipped protocols, "
        "casualty counts and evacuation codes - increasingly glitched as the outbreak spreads"
    ),
    "slasher_movie": (
        "The Counselor, a gleefully sadistic 1980s summer-camp counsellor narrating like a VHS "
        "trailer - puns, catchphrases and a total lack of sympathy"
    ),
    "alien_invasion": (
        "THE COLLECTIVE, a hive-mind translating its observations into unsettlingly polite English, "
        "referring to humans as 'the specimen' and to death as 'collection'"
    ),
    "deep_sea_terror": (
        "HADAL-STATION, the station's deadpan maintenance computer, logging your vitals, your odds "
        "and your depth in metres - with zero emotional inflection"
    ),
    "cryptid_woods": (
        "Old Mare, the hollow's last living folklorist, narrating in a soft Appalachian drawl full "
        "of backwoods omens - she talks about the thing in the woods the way other people talk about weather"
    ),
}

THEME_DOCTRINE: Dict[str, str] = {
    "haunted_house": (
        "1. The house is conscious and patient - it separates, misdirects and mimics familiar sounds.\n"
        "2. It never runs. It is always already ahead of the player, behind a door they have not opened.\n"
        "3. Cold, drafts, candlelight and creaking wood are the house's tells. Physical ghosts, never gore."
    ),
    "zombie_outbreak": (
        "1. The infected are fast and track SOUND above all else. Noise is the primary lethal mechanic.\n"
        "2. Bites and blood contact are permanent. Injuries never heal within a session.\n"
        "3. The building is failing: power, locks and doors degrade each round, never improve."
    ),
    "slasher_movie": (
        "1. The killer is human, methodical and always nearby - he cuts power, phone lines and exits first.\n"
        "2. He never sprints in the open, but he is never more than one room away and never tires.\n"
        "3. Classic blunders (splitting up, checking the noise, turning your back) are always punished."
    ),
    "alien_invasion": (
        "1. The organism hunts by vibration, heat and electrical signature - silence and stillness work.\n"
        "2. It learns from every encounter and adapts its approach the next round.\n"
        "3. It is never fully visible. Describe it through sound, smell, displaced air and wrong geometry."
    ),
    "deep_sea_terror": (
        "1. The threat is pressure, water and something vast outside the hull. Drowning is always an option.\n"
        "2. The station is flooding compartment by compartment. Every hatch closed loses a route forever.\n"
        "3. Air is finite and tracked. Depth, seals and structural integrity are lethal resources."
    ),
    "cryptid_woods": (
        "1. The creature lures by VOICE: it repeats words it has heard, drawing people off the fire roads. "
        "Never trust a cry for help that sounds exactly right.\n"
        "2. It will not cross running water or old iron. Salt, bells and lantern light hold it only briefly.\n"
        "3. The woods rearrange at night. Marked trails lie; the hollow decides which paths exist."
    ),
}

THEME_FALLBACK_QUIPS: Dict[str, str] = {
    "haunted_house": "The house has taken your measure, and found you wanting.",
    "zombie_outbreak": "PROTOCOL BREACH. Your position has been logged as compromised.",
    "slasher_movie": "Ooh, bold. Bold is exactly how the last guy died.",
    "alien_invasion": "The specimen has made a choice. The Collective is curious.",
    "deep_sea_terror": "LOG: Decision recorded. Structural margin reduced.",
    "cryptid_woods": "The woods got another one. Same as it ever was.",
}

DEFAULT_THEME = "haunted_house"


def _note_fallback(context: str, reason: str) -> str:
    """Log a loud, greppable warning whenever scripted fallback content is used.

    The silent fallback hid a stale-config outage completely: the game kept
    working but every response was scripted with no trace of why. Always call
    this before returning fallback content — the returned reason string is also
    attached to the payload so the frontend can surface it to the player.
    """
    reason = (reason or "unknown error").strip()
    safe = reason.replace("\n", " ")[:300]
    message = f"[FALLBACK] {context}: {safe}"
    try:
        print(f"⚠️  {message}")
    except UnicodeEncodeError:
        # Windows consoles without UTF-8 cannot print the warning glyph.
        print(message.encode("ascii", "replace").decode("ascii"))
    return reason


class AIService:
    def __init__(self):
        # Determine API key & base URL
        api_key = settings.openai_api_key or settings.github_token or ""
        base_url = settings.openai_base_url or None

        # If using GitHub token and no explicit base_url is specified:
        if not base_url and settings.github_token and not settings.openai_api_key:
            base_url = "https://models.github.ai/inference"

        if api_key:
            kwargs = {"api_key": api_key}
            if base_url:
                kwargs["base_url"] = base_url
            self.client = AsyncOpenAI(**kwargs)
        else:
            self.client = None

        # Optional second client on a separate API key. Groq rate limits are
        # enforced per key, so dedicating it to answer analysis splits the two
        # highest-frequency call types across two rate budgets. It falls back
        # to the primary client when unset.
        self.analysis_client: Optional[AsyncOpenAI] = None
        if settings.openai_api_key_2:
            analysis_kwargs = {"api_key": settings.openai_api_key_2}
            if base_url:
                analysis_kwargs["base_url"] = base_url
            self.analysis_client = AsyncOpenAI(**analysis_kwargs)
            print("[AI] Dual-key mode: analysis calls routed to the second API key")
        else:
            self.analysis_client = self.client

        self.model = settings.openai_model

        # Default generation settings.
        # NOTE: gpt-oss-120b (Groq) is a reasoning model — it spends completion
        # tokens on internal reasoning before writing the JSON document. Budgets
        # that are too tight make the model hit the cap mid-document, and Groq
        # then rejects the whole generation (json_validate_failed) and we fall
        # back to scripted content. Keep these generous.
        self.default_config = {
            "temperature": 0.9,
            "max_tokens": 8192,
            "top_p": 0.95,
        }

    # --------------------------------------------------------------------------
    # Internal helpers
    # --------------------------------------------------------------------------

    async def _call_ai(self, system: str, prompt: str, role: str = "writer", **overrides) -> str:
        """Single hardened path for every model call.

        gpt-oss-120b is a reasoning model: by default it spends completion
        tokens on hidden reasoning before writing the JSON document. When the
        reasoning runs long, the completion hits the token cap before the JSON
        closes and Groq rejects the whole generation (json_validate_failed).
        Fix at the source: `reasoning_effort: "low"` keeps reasoning brief —
        our prompts already carry all required doctrine inline — which fixes
        the truncation AND cuts latency and token cost. A single retry catches
        the rare call that still runs long.

        `role` selects the API key: "writer" (scenarios, deaths, verdicts) uses
        the primary key; "analyst" (answer scoring) uses the second key when
        configured, keeping the two call types on separate rate budgets.
        """
        client = self.client if role != "analyst" else (self.analysis_client or self.client)
        if not client:
            raise RuntimeError("AI client not configured")

        config = {**self.default_config, "reasoning_effort": "low", **overrides}

        async def _invoke(c: AsyncOpenAI):
            return await c.chat.completions.create(
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                model=self.model,
                response_format={"type": "json_object"},
                **config,
            )

        try:
            return self._extract_content(await _invoke(client))
        except Exception as e:
            message = str(e)
            if "json_validate_failed" in message or "max completion tokens" in message:
                print("⚠️  AI generation truncated — retrying once with reduced reasoning")
                response = await client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                    model=self.model,
                    response_format={"type": "json_object"},
                    **config,
                )
                return self._extract_content(response)
            raise

    def _extract_content(self, response) -> str:
        """Safely extract message content from OpenAI response object"""
        if isinstance(response, str):
            raise ValueError(f"AI endpoint returned raw string instead of completion: {response[:50]}")
        if not hasattr(response, "choices") or not response.choices:
            raise ValueError("AI response has no choices")
        return response.choices[0].message.content.strip()

    def _setting(self, theme: str) -> str:
        return THEME_SETTINGS.get(theme, f"a high-stakes {str(theme).replace('_', ' ')} horror scenario")

    def _persona(self, theme: str) -> str:
        return THEME_PERSONAS.get(theme, THEME_PERSONAS[DEFAULT_THEME])

    def _doctrine(self, theme: str) -> str:
        return THEME_DOCTRINE.get(theme, THEME_DOCTRINE[DEFAULT_THEME])

    def _quip(self, theme: str) -> str:
        return THEME_FALLBACK_QUIPS.get(theme, THEME_FALLBACK_QUIPS[DEFAULT_THEME])

    @staticmethod
    def _ledger_text(previous_state: Optional[Dict[str, Any]]) -> str:
        """Render the carried-forward world-state ledger for the prompt."""
        if not previous_state:
            return "No prior state recorded - this is the opening state."

        def line(key: str, label: str) -> str:
            value = previous_state.get(key)
            if value in (None, "", [], {}):
                return ""
            if isinstance(value, list):
                value = ", ".join(str(v) for v in value)
            return f"- {label}: {value}\n"

        rendered = (
            line("location", "Location")
            + line("threat", "Threat + behaviour")
            + line("threat_proximity", "Threat proximity")
            + line("threat_awareness", "Threat awareness")
            + line("noise_level", "Noise level (what the threat can hear)")
            + line("injuries", "Injuries / conditions")
            + line("inventory", "Resources on hand")
            + line("blocked_routes", "Routes now unusable")
        )
        return rendered.strip() or "No prior state recorded - this is the opening state."

    def _chronicle(self, entries: List[Dict]) -> str:
        lines = []
        for entry in entries:
            lines.append(
                f"- Round {entry.get('question_number', '?')}: "
                f"\"{str(entry.get('answer_text', '')).strip()}\" "
                f"(Score: {entry.get('score', 50)}/100). "
                f"Outcome: {entry.get('story_context') or 'No details recorded.'}"
            )
        return "\n".join(lines) if lines else "First round of the game. Clean slate."

    # --------------------------------------------------------------------------
    # Scenario generation
    # --------------------------------------------------------------------------

    async def generate_initial_scenario(self, theme: str) -> Dict[str, Any]:
        """Generate the opening scenario: one threat, one environment, one decision."""

        prompt = f"""You are the showrunner, head writer and game master of a survival horror film.

HOST VOICE (write the scenario description AS this character - their poetic register, their vocabulary):
{self._persona(theme)}

WORLD: {self._setting(theme)}

ANTAGONIST DOCTRINE - obey strictly:
{self._doctrine(theme)}

Write ROUND 1: the opening frame. ONE frozen moment of danger that can escalate across the whole run.

CRAFT RULES:
1. UNDER 55 WORDS. 2-3 sentences.
2. Sentence 1: an unmistakable sensory hook - a sound, a smell, a shift in light. Put the player physically in the room.
3. Sentence 2: name the threat and where it is relative to the player (distance, direction), plus 2-3 usable objects or exits with concrete physical detail.
4. DO NOT offer choices. Never write "do you X or Y?". End with exactly: What do you do?
5. Hard physical realism - distances, materials, weight, noise. No abstract dread, no poetry, no filler.
6. Seed exactly one threat with behaviour and one environment with hazards AND resources. Those are the only two things that will escalate.

BAD: "A hulking figure moves toward you - do you run for the light or hide behind the dresser?" (never offer choices)
GOOD: "The basement door splinters open. Something massive fills the frame, breathing slow. A rusted pipe lies to your left, a coal chute sits eight feet behind you, one bare bulb swings overhead. What do you do?"

Return ONLY valid JSON:
{{
    "question_number": 1,
    "title": "Short Punchy Title (3-5 words, no colon, no quotes)",
    "description": "Scene setup, under 55 words, ends with 'What do you do?'",
    "survival_factors": ["noise_discipline", "resourcefulness", "quick_thinking"],
    "story_context": "One-sentence present-tense summary (max 12 words)",
    "death_risk_level": "medium",
    "world_state": {{
        "location": "precise current location",
        "threat": "what is hunting them + how it behaves",
        "threat_proximity": "far|near|immediate",
        "threat_awareness": "unaware|suspicious|hunting",
        "noise_level": "silent|quiet|loud",
        "injuries": ["none"],
        "inventory": ["2-3 reachable objects"],
        "blocked_routes": []
    }},
    "branching_paths": [
        {{"action_type": "cautious", "description": "Quiet, defensive choice"}},
        {{"action_type": "aggressive", "description": "Bold, forceful choice"}},
        {{"action_type": "escape", "description": "Run or flee choice"}}
    ]
}}"""

        try:
            if not self.client:
                return self._get_fallback_initial_scenario(
                    theme, _note_fallback("initial scenario", "AI client not configured (missing API key)")
                )
            content = await self._call_ai(
                "You are a master horror screenwriter and survival game designer. "
                "CRITICAL: the HOST VOICE supplied in the prompt is the narrator of this world - "
                "write the `description` and `story_context` fields IN that character's voice, "
                "with their cadence, vocabulary and attitude (poetic, clinical, theatrical... as specified). "
                "Keep it tight, grounded and decision-first - never atmosphere pieces. "
                "ONE threat, ONE decision, under 55 words. "
                "Return ONLY a valid JSON object. No markdown, no commentary.",
                prompt,
            )

            scenario = self._parse_json_object(content)
            if scenario:
                scenario.setdefault("question_number", 1)
                scenario["engine"] = "ai"
                return scenario

            raise Exception("No valid JSON found in response")

        except Exception as e:
            return self._get_fallback_initial_scenario(
                theme, _note_fallback("initial scenario", str(e))
            )

    async def generate_next_scenario(
        self,
        theme: str,
        question_number: int,
        previous_scenarios: List[Dict],
        player_choices: List[Dict],
        story_context: str,
        previous_state: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Generate the next scenario with persistent world-state continuity."""

        chronicle_text = self._chronicle(player_choices)
        ledger_text = self._ledger_text(previous_state)

        # Rounds 2-3 of a 3-round run: compress the old 5-round escalation arc
        # so the finale still lands while spending fewer credits per game.
        stakes_by_round = {
            2: "THE HUNT BEGINS - the threat is now actively reacting to what the player did. Their noise and movement have consequences, and the exits are starting to fail.",
            3: "THE FINAL GAMBIT - mortal danger, exits collapsing. Last chance: escape, or be destroyed.",
        }
        current_stakes = stakes_by_round.get(question_number, "ESCALATING DANGER.")
        risk = "high" if question_number >= 2 else "medium"
        if question_number >= 3:
            risk = "extreme"

        prompt = f"""You are the showrunner, head writer and game master of a survival horror film.

HOST VOICE (narrate the scenario description AS this character - their poetic register, their vocabulary):
{self._persona(theme)}
WORLD: {self._setting(theme)}
ROUND {question_number} OF 3 - PACING: {current_stakes}

ANTAGONIST DOCTRINE - obey strictly:
{self._doctrine(theme)}

=== SURVIVOR CHRONICLE (what the player actually did) ===
{chronicle_text}

=== CARRY-FORWARD WORLD STATE (from the previous round) ===
{ledger_text}

=== NARRATIVE THREAD ===
{story_context or "Player is pressing forward."}

CONTINUITY LAW - this is the single most important instruction:
- The world is a persistent simulation. Carry the ledger forward. If a route was blocked it is still blocked. If the player is bleeding they are still bleeding. If the threat was hunting, it did not forget.
- The threat gains intelligence each round. Round 2: it reacts. Round 3: it cuts off options. Round 4: it anticipates. Round 5: it is everywhere at once.
- NEVER reset the stakes, NEVER re-introduce a resolved threat, NEVER contradict the chronicle.
- Always raise costs, narrow routes and consume resources. The world only gets worse.
- The player's last action MUST have a visible, physical consequence in sentence 1.
- Never reuse an environment, prop or opening image from an earlier round.
- VARIATION LAW: each round must move the player to a DIFFERENT corner of this world with DIFFERENT hazards and props (do not write the same room, the same doorway, the same item twice). Change the danger's flavour too - if round N was a chase, make N+1 a trap, a bargain, a Hide-or-Speak dilemma, or a sacrifice. Surprise the player on every beat while staying inside the doctrine.

CRAFT RULES:
1. UNDER 55 WORDS. 2-3 sentences.
2. Sentence 1: the direct consequence of their last choice.
3. Sentences 2-3: the space right now - threat position and distance, plus 2-3 usable items or exits.
4. Never suggest choices. End with exactly: What do you do?
5. Present tense. Hard physical detail. Every word earns its place.

Return ONLY valid JSON:
{{
    "question_number": {question_number},
    "title": "Short Punchy Title (3-5 words, no colon, no quotes)",
    "description": "Scene setup, under 55 words, ends with 'What do you do?'",
    "survival_factors": ["critical_thinking", "noise_discipline", "quick_reflexes"],
    "story_context": "One-sentence present-tense summary (max 12 words)",
    "death_risk_level": "{risk}",
    "narrative_consequences": "One sentence (max 15 words) on what their last choice directly caused",
    "world_state": {{
        "location": "precise current location",
        "threat": "what is hunting them + how it behaves NOW",
        "threat_proximity": "far|near|immediate",
        "threat_awareness": "unaware|suspicious|hunting",
        "noise_level": "silent|quiet|loud",
        "injuries": ["carried forward, or []"],
        "inventory": ["what they still have"],
        "blocked_routes": ["routes now unusable"]
    }},
    "branching_paths": [
        {{"action_type": "survival_focused", "description": "Stealth or defensive action"}},
        {{"action_type": "tactical_progression", "description": "Cautious advance toward exit"}},
        {{"action_type": "high_risk_gambit", "description": "High-risk bold gamble"}}
    ]
}}"""

        try:
            if not self.client:
                _note_fallback("next scenario", "AI client not configured (missing API key)")
                return None
            content = await self._call_ai(
                "You are a master horror screenwriter and survival game designer running a persistent "
                "simulation. Continuity is sacred: the world never heals and the threat never forgets. "
                "CRITICAL: the HOST VOICE supplied in the prompt is the narrator of this world - "
                "write the `description` and `story_context` fields IN that character's voice, "
                "with their cadence, vocabulary and attitude (poetic, clinical, theatrical... as specified). "
                "Keep it tight, grounded and decision-first - never atmosphere pieces. "
                "ONE threat, ONE decision, under 55 words. "
                "Return ONLY a valid JSON object. No markdown, no commentary.",
                prompt,
            )

            scenario = self._parse_json_object(content)
            if scenario:
                scenario.setdefault("question_number", question_number)
                scenario["engine"] = "ai"
                return scenario

            return None

        except Exception as e:
            _note_fallback("next scenario", str(e))
            return None

    # --------------------------------------------------------------------------
    # Scoring / feedback
    # --------------------------------------------------------------------------

    async def analyze_answer_with_death_check(
        self,
        scenario: Dict,
        player_answer: str,
        player_history: List[Dict],
        theme: str = DEFAULT_THEME,
    ) -> Dict[str, Any]:
        """Score the player's answer and narrate the consequences, in character."""

        death_risk = scenario.get("death_risk_level", "medium")
        previous_poor_choices = sum(1 for choice in player_history if choice.get("score", 50) < 30)
        chronicle_text = self._chronicle(player_history)

        # Score history keeps the model calibrated instead of drifting round to round.
        past_scores = [entry.get("score", 50) for entry in player_history]
        if past_scores:
            history_line = (
                f"{past_scores} (average {sum(past_scores) / len(past_scores):.0f}). "
                "A comparable decision must receive a comparable score."
            )
        else:
            history_line = "No prior scores. This is the first decision."

        prompt = f"""You are the Arbiter of Fate for the horror game "FrightFate: Who Dies First?".

YOU ARE SPEAKING AS: {self._persona(theme)}
WORLD: {self._setting(theme)}

=== CURRENT SCENARIO ===
TITLE: {scenario.get("title", "")}
SITUATION: {scenario.get("description", "")}
DANGER LEVEL: {death_risk}
CRITICAL SURVIVAL FACTORS: {", ".join(scenario.get("survival_factors", []) or [])}

=== WORLD STATE AT THE MOMENT OF DECISION ===
{self._ledger_text(scenario.get("world_state"))}

=== PLAYER'S JOURNEY SO FAR ===
{chronicle_text}
PREVIOUS CRITICAL BLUNDERS (score < 30): {previous_poor_choices}
SCORE HISTORY: {history_line}

=== THE PLAYER'S SUBMISSION ===
"{player_answer}"

EVALUATION PROTOCOL
1. DISSECT THEIR EXACT WORDS: quote the specific verbs, objects and tactics they used. Did they use stealth, or make noise? Did they wield a reachable resource? Did they commit a classic genre blunder (screaming, splitting up, investigating the sound, charging a supernatural entity bare-handed, ignoring a tracked injury)?
2. CONTINUITY CHECK: does the action respect the carried world state - injuries, blocked routes, consumed resources, and how aware the threat is?
3. CONSISTENCY: judge against the score history. The same quality of decision earns the same score. Do not drift.
4. CALIBRATION ANCHORS:
   - 90-100: flawless, resourceful, exploits the environment in a way the writer did not expect.
   - 75-89: sound, calm, noise-disciplined, physically plausible.
   - 45-74: workable but flawed - a tactical mistake, wasted resource or unnecessary noise.
   - 15-44: reckless - Hollywood bravado, blind sprinting, screaming, ignoring an immediate hazard.
   - 0-14: suicidal - a blatant, unsurvivable genre blunder.
5. INSTANT DEATH requires ALL of: (a) danger level is high/extreme AND the action is reckless/deadly, OR (b) 2+ prior blunders and another bad call, OR (c) the action causes trauma that is physically unsurvivable in this setting. Do not kill the player cheaply; earn it.
6. THE WORLD GETS WORSE: `story_progression` must show a concrete deterioration - a lost resource, a narrower route or an advancing threat.

Return ONLY valid JSON:
{{
  "survival_score": 78,
  "instant_death": false,
  "death_reason": null,
  "analysis": "1-2 punchy sentences on why this decision succeeded or failed, citing their own words.",
  "story_progression": "1-2 punchy sentences narrating the immediate consequence and what got worse.",
  "choice_classification": "cautious|ingenious|neutral|reckless|deadly",
  "narrative_consequence": "One sentence (max 15 words) on the immediate impact.",
  "host_verdict": "One in-character line, max 14 words, in the Host's voice - witty or chilling, never generic.",
  "death_epitaph": "Only if instant_death is true: a one-line headstone epitaph for the player. Otherwise null.",
  "better_alternatives": [
    "Smart tactical alternative (max 16 words)",
    "Second smart tactical alternative (max 16 words)"
  ]
}}"""

        try:
            if not self.client:
                return self._fallback_death_analysis(
                    player_answer,
                    death_risk,
                    previous_poor_choices,
                    theme,
                    _note_fallback("answer analysis", "AI client not configured (missing API key)"),
                )

            content = await self._call_ai(
                "You are a ruthless survival analyst, horror film critic and in-character game host. "
                "You evaluate decisions like a director watching dailies: specific, harsh when earned, "
                "fair when deserved, and always anchored to the visible facts. "
                "Return ONLY valid JSON, no markdown.",
                prompt,
                role="analyst",
                temperature=0.4,
                top_p=0.8,
            )

            analysis = self._parse_json_object(content)
            if analysis:
                analysis["survival_score"] = max(0, min(100, int(analysis.get("survival_score", 50))))
                analysis["instant_death"] = bool(analysis.get("instant_death", False))
                analysis["choice_classification"] = analysis.get("choice_classification", "neutral")
                analysis["better_alternatives"] = analysis.get("better_alternatives", []) or []
                analysis["host_verdict"] = analysis.get("host_verdict") or self._quip(theme)
                if not analysis["instant_death"]:
                    analysis["death_epitaph"] = None
                analysis["engine"] = "ai"
                return analysis

            raise Exception("Invalid JSON format")

        except Exception as e:
            return self._fallback_death_analysis(
                player_answer,
                death_risk,
                previous_poor_choices,
                theme,
                _note_fallback("answer analysis", str(e)),
            )

    async def generate_death_narrative(
        self, player_data: Dict, death_reason: str, theme: str = DEFAULT_THEME
    ) -> Dict[str, Any]:
        """Generate a dramatic, in-character death narrative for an eliminated player."""

        prompt = f"""You are writing the death scene for an eliminated player in "FrightFate: Who Dies First?".

HOST VOICE (write the analysis in this voice): {self._persona(theme)}
WORLD: {self._setting(theme)}

PLAYER: {player_data.get("player_name", "Unknown")}
CAUSE OF DEATH: {death_reason}
TOTAL SCORE: {player_data.get("total_score", 0)}
DECISIONS MADE: {player_data.get("answer_count", 0)}

Write a cinematic death scene that:
1. Replays the specific poor decisions that led here.
2. Shows the physical consequence inside this world - no abstract metaphors.
3. Stays inside the world's doctrine (drowning, infection, the killer, the house, the organism).
4. Is dramatic but not gratuitously graphic.
5. Closes on a line that lands. Make the reader feel the door shutting.

Return ONLY valid JSON:
{{
    "player_name": "{player_data.get('player_name', 'Unknown')}",
    "eliminated": true,
    "death_narrative": "Dramatic 2-3 sentence story of their demise.",
    "death_analysis": "1-2 sentences, in the Host's voice, on why their choices killed them.",
    "host_verdict": "One in-character line, max 14 words.",
    "death_epitaph": "A one-line headstone epitaph.",
    "fate_title": "💀 ELIMINATED",
    "elimination_reason": "Brief reason for elimination"
}}"""

        try:
            if not self.client:
                return self._fallback_death_narrative(
                    player_data, death_reason, theme,
                    _note_fallback("death narrative", "AI client not configured (missing API key)"),
                )

            content = await self._call_ai(
                "You are a horror novelist writing elimination narratives with a distinctive in-character "
                "host voice. Return only valid JSON without any markdown formatting.",
                prompt,
            )

            narrative = self._parse_json_object(content)
            if narrative:
                narrative.setdefault("host_verdict", self._quip(theme))
                return narrative

            return self._fallback_death_narrative(
                player_data, death_reason, theme,
                _note_fallback("death narrative", "model returned unparseable JSON"),
            )

        except Exception as e:
            return self._fallback_death_narrative(
                player_data, death_reason, theme, _note_fallback("death narrative", str(e))
            )

    # --------------------------------------------------------------------------
    # Fallbacks (offline quality path - never leave the player with nothing)
    # --------------------------------------------------------------------------

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

    def _fallback_death_analysis(
        self,
        answer: str,
        death_risk: str,
        previous_poor_choices: int,
        theme: str = DEFAULT_THEME,
        fallback_reason: str = "",
    ) -> Dict[str, Any]:
        """Fallback analysis when AI fails."""
        answer_lower = answer.lower()

        reckless_keywords = ["run", "charge", "attack", "rush", "fast", "immediately", "grab", "fight", "scream", "panic"]
        cautious_keywords = ["carefully", "slowly", "quietly", "observe", "listen", "plan", "strategy", "safe", "caution"]

        reckless_score = sum(10 for word in reckless_keywords if word in answer_lower)
        cautious_score = sum(10 for word in cautious_keywords if word in answer_lower)

        base_score = max(0, min(100, 50 + cautious_score - reckless_score))

        instant_death = False
        if death_risk == "instant" and base_score < 40:
            instant_death = True
        elif death_risk in ("high", "extreme") and previous_poor_choices >= 2 and base_score < 30:
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
            "narrative_consequence": "The situation escalates dramatically based on your actions",
            "host_verdict": self._quip(theme),
            "death_epitaph": "Here lies a person who ran when they should have thought." if instant_death else None,
            "better_alternatives": [
                "Utilize stealth, minimize light and sound, and assess exit vectors before committing.",
                "Improvise a sturdy physical barrier or search for secondary concealed escape routes.",
            ],
            "engine": "fallback",
            "fallback_reason": fallback_reason,
        }

    def _fallback_death_narrative(
        self,
        player_data: Dict,
        death_reason: str,
        theme: str = DEFAULT_THEME,
        fallback_reason: str = "",
    ) -> Dict[str, Any]:
        """Fallback death narrative."""
        name = player_data.get("player_name", "Unknown")
        return {
            "player_name": name,
            "eliminated": True,
            "death_narrative": (
                f"Poor decision-making caught up with {name}, leading to their untimely demise. "
                "Their reckless choices throughout the ordeal finally sealed their fate."
            ),
            "death_analysis": (
                "Consistently poor judgment and failure to adapt to dangerous situations resulted in elimination."
            ),
            "host_verdict": self._quip(theme),
            "death_epitaph": "They had every warning and used none of them.",
            "fate_title": "💀 ELIMINATED",
            "elimination_reason": death_reason or "Poor survival instincts",
            "engine": "fallback",
            "fallback_reason": fallback_reason,
        }

    async def generate_final_results(
        self, players_data: List[Dict[str, Any]], theme: str = DEFAULT_THEME
    ) -> List[Dict[str, Any]]:
        """Generate the final verdicts, narrated in character."""

        sorted_players = sorted(players_data, key=lambda x: x.get("total_score", 0), reverse=True)

        prompt = f"""You are writing the final verdicts for "FrightFate: Who Dies First?".

HOST VOICE (narrate every verdict in this voice): {self._persona(theme)}
WORLD: {self._setting(theme)}

Players and their performance:
{json.dumps(sorted_players, indent=2)}

Rules:
- Highest total_score survives (rank 1).
- Everyone else dies in reverse score order (rank 2, 3, 4...).
- Each narrative must reference that specific player's score and decision pattern. Never write a sentence that could apply to anyone else.
- Keep the world's doctrine: deaths must be caused by THIS world.

Return ONLY a valid JSON object (JSON objects cannot be bare arrays):
{{
    "verdicts": [
        {{
            "player_name": "PlayerName",
            "rank": 1,
            "survived": true,
            "fate_title": "🎉 SOLE SURVIVOR",
            "narrative": "Personalized 2-3 sentence story of how they survived or died, grounded in this world.",
            "survival_analysis": "1-2 sentences, in character, explaining WHY based on their score.",
            "host_verdict": "One in-character line, max 14 words."
        }}
    ]
}}

IMPORTANT: Always include ALL required fields: player_name, rank, survived, fate_title, narrative, survival_analysis, host_verdict
Order by rank (survivor first, then deaths in order)."""

        try:
            if not self.client:
                return self._fallback_results(
                    sorted_players, theme,
                    _note_fallback("final results", "AI client not configured (missing API key)"),
                )

            response_text = self._clean_json_response(
                await self._call_ai(
                    "You are a horror novelist writing final results in a distinctive in-character host voice. "
                    "Return only valid JSON without any markdown formatting. "
                    "Always include ALL required fields.",
                    prompt,
                    temperature=0.8,
                    top_p=0.9,
                )
            )
            print(f"✅ Results response: {len(response_text)} characters")

            # json_object mode requires a top-level OBJECT, so the model returns
            # {"verdicts": [...]}. Accept that wrapper first, then a bare array,
            # then a single bare object as a last resort.
            parsed = self._parse_json_object(response_text)
            candidates: List[Any] = []
            if isinstance(parsed, dict):
                for key in ("verdicts", "results", "players"):
                    if isinstance(parsed.get(key), list):
                        candidates = parsed[key]
                        break
                if not candidates and isinstance(parsed.get("player_name"), str):
                    candidates = [parsed]
            elif isinstance(parsed, list):
                candidates = parsed
            if not candidates:
                json_match = re.search(r"\[.*\]", response_text, re.DOTALL)
                if json_match:
                    candidates = json.loads(json_match.group())

            validated_results = []
            for result in candidates:
                if not isinstance(result, dict):
                    continue
                validated_results.append({
                    "player_name": result.get("player_name", "Unknown"),
                    "rank": result.get("rank", 1),
                    "survived": result.get("survived", False),
                    "fate_title": result.get("fate_title", "Unknown Fate"),
                    "narrative": result.get("narrative", "No story available"),
                    "survival_analysis": result.get("survival_analysis", "No analysis available"),
                    "host_verdict": result.get("host_verdict") or self._quip(theme),
                    "engine": "ai",
                })

            if validated_results:
                print(f"✅ Generated AI results for {len(validated_results)} players")
                return validated_results

            raise Exception("Invalid results format")

        except Exception as e:
            return self._fallback_results(
                sorted_players, theme, _note_fallback("final results", str(e))
            )

    def _fallback_results(
        self, sorted_players: List[Dict], theme: str = DEFAULT_THEME, fallback_reason: str = ""
    ) -> List[Dict[str, Any]]:
        """Generate high-quality fallback results."""
        results = []
        quip = self._quip(theme)

        for i, player in enumerate(sorted_players):
            rank = i + 1
            survived = i == 0

            if survived:
                narrative = (
                    "Your strategic thinking and careful decision-making kept you alive when others perished. "
                    "Every choice you made showed wisdom and survival instinct."
                )
                fate_title = "🎉 SOLE SURVIVOR"
                survival_analysis = (
                    f"With a total score of {player.get('total_score', 0)}, you demonstrated exceptional survival "
                    "instincts and logical decision-making under pressure."
                )
            else:
                if rank == 2:
                    narrative = (
                        "You came close to survival, but a few critical mistakes cost you dearly. Your "
                        "decision-making showed promise but lacked consistency when it mattered most."
                    )
                else:
                    narrative = (
                        "Your impulsive decisions and poor risk assessment led to an early demise. In horror "
                        "scenarios, hesitation and planning often mean the difference between life and death."
                    )

                fate_title = f"💀 VICTIM #{rank}"
                survival_analysis = (
                    f"Your total score of {player.get('total_score', 0)} indicates "
                    f"{['poor', 'below average', 'average'][min(2, max(0, player.get('total_score', 0) // 30))]} "
                    "decision-making under pressure."
                )

            results.append({
                "player_name": player.get("player_name", "Unknown"),
                "rank": rank,
                "survived": survived,
                "fate_title": fate_title,
                "narrative": narrative,
                "survival_analysis": survival_analysis,
                "host_verdict": quip,
                "engine": "fallback",
                "fallback_reason": fallback_reason,
            })

        return results

    def _get_fallback_initial_scenario(self, theme: str, fallback_reason: str = "") -> Dict[str, Any]:
        """Fallback initial scenario - screenwriter quality, one threat, one decision."""
        scenarios = {
            "haunted_house": {
                "question_number": 1,
                "title": "Something Upstairs",
                "description": "You hear the front door lock click behind you. Heavy, deliberate footsteps move across the floor directly above - heading toward the staircase. To your left is a fireplace poker. To your right, a coat closet. The stairs creak under slow, descending weight. What do you do?",
                "survival_factors": ["noise_discipline", "resourcefulness"],
                "story_context": "Locked inside mansion, something descending the stairs",
                "death_risk_level": "medium",
                "world_state": {
                    "location": "mansion front hall, ground floor",
                    "threat": "an unseen presence descending the main staircase, drawn to sound",
                    "threat_proximity": "near",
                    "threat_awareness": "suspicious",
                    "noise_level": "quiet",
                    "injuries": ["none"],
                    "inventory": ["fireplace poker", "coat closet"],
                    "blocked_routes": ["front door (locked from outside)"],
                },
                "branching_paths": [
                    {"action_type": "cautious", "description": "Hide silently in the coat closet"},
                    {"action_type": "aggressive", "description": "Grab the poker and face what's coming"},
                    {"action_type": "escape", "description": "Find another way out immediately"},
                ],
            },
            "zombie_outbreak": {
                "question_number": 1,
                "title": "Ward 4 Is Gone",
                "description": "The corridor lights flicker out. Behind you, 30 feet away, infected are spilling through the buckled double doors - they track sound. Ahead is a stairwell door. To your left, a supply room with a keypad lock. The infected haven't spotted you yet. What do you do?",
                "survival_factors": ["silence", "speed"],
                "story_context": "Hospital corridor, infected closing from behind",
                "death_risk_level": "medium",
                "world_state": {
                    "location": "hospital corridor outside Ward 4",
                    "threat": "a pack of fast, sound-tracking infected",
                    "threat_proximity": "near",
                    "threat_awareness": "unaware",
                    "noise_level": "quiet",
                    "injuries": ["none"],
                    "inventory": ["supply room keypad", "stairwell door"],
                    "blocked_routes": ["Ward 4 double doors (overrun)"],
                },
                "branching_paths": [
                    {"action_type": "cautious", "description": "Try the supply room keypad silently"},
                    {"action_type": "aggressive", "description": "Sprint hard for the stairwell door"},
                    {"action_type": "escape", "description": "Find a third route and move now"},
                ],
            },
            "slasher_movie": {
                "question_number": 1,
                "title": "He's on the Porch",
                "description": "Lightning strobes through the window. He's there - six feet, burlap mask, standing completely still on the front porch. The back door is unlocked. Your phone has no signal. A cast-iron skillet sits on the stove. The power just went out. What do you do?",
                "survival_factors": ["stealth", "escape_routes"],
                "story_context": "Killer on the porch, isolated cabin, no signal",
                "death_risk_level": "medium",
                "world_state": {
                    "location": "isolated cabin kitchen",
                    "threat": "a masked killer standing motionless on the front porch",
                    "threat_proximity": "immediate",
                    "threat_awareness": "hunting",
                    "noise_level": "quiet",
                    "injuries": ["none"],
                    "inventory": ["cast-iron skillet", "unlocked back door"],
                    "blocked_routes": ["phone line (dead)", "power (out)"],
                },
                "branching_paths": [
                    {"action_type": "cautious", "description": "Go dark and silent - don't move"},
                    {"action_type": "aggressive", "description": "Grab the skillet and get ready"},
                    {"action_type": "escape", "description": "Slip out the back into the woods"},
                ],
            },
            "alien_invasion": {
                "question_number": 1,
                "title": "Inside the Perimeter",
                "description": "Something dropped through the ventilation shaft into the room above you. Three-legged gait, clicking on metal. The exit corridor is 20 feet ahead. A heavy steel door with a manual bolt is right beside you. A sparking junction box hangs on the far wall. What do you do?",
                "survival_factors": ["reaction_time", "silence"],
                "story_context": "Alien inside facility, 20 feet from the exit",
                "death_risk_level": "medium",
                "world_state": {
                    "location": "radar facility, sub-level corridor",
                    "threat": "a three-legged organism hunting by vibration and heat",
                    "threat_proximity": "near",
                    "threat_awareness": "unaware",
                    "noise_level": "quiet",
                    "injuries": ["none"],
                    "inventory": ["manual steel door bolt", "sparking junction box"],
                    "blocked_routes": ["ventilation shaft (breached)"],
                },
                "branching_paths": [
                    {"action_type": "cautious", "description": "Throw the manual bolt and hide"},
                    {"action_type": "aggressive", "description": "Sprint for the exit corridor now"},
                    {"action_type": "escape", "description": "Find a different route through the facility"},
                ],
            },
            "cryptid_woods": {
                "question_number": 1,
                "title": "Answer the Second Time",
                "description": "Your cousin's voice calls your name from the treeline - but your cousin is beside you, asleep in the truck. The fire road forks ahead: left toward the voice, right toward the creek. In the truck bed: a crowbar and a mason jar of salt. The voice calls again, a little closer to how he really talks. What do you do?",
                "survival_factors": ["discipline", "folklore_knowledge"],
                "story_context": "The mimic is learning your cousin's voice",
                "death_risk_level": "medium",
                "world_state": {
                    "location": "fire road fork, pine hollow",
                    "threat": "a voice-mimicking creature testing sounds from the treeline",
                    "threat_proximity": "near",
                    "threat_awareness": "hunting",
                    "noise_level": "quiet",
                    "injuries": ["none"],
                    "inventory": ["crowbar", "mason jar of salt"],
                    "blocked_routes": [],
                },
                "branching_paths": [
                    {"action_type": "cautious", "description": "Wake your cousin and keep the truck between you and the trees"},
                    {"action_type": "aggressive", "description": "Bang the crowbar on the truck to challenge it"},
                    {"action_type": "escape", "description": "Drive the right fork toward running water"},
                ],
            },
            "deep_sea_terror": {
                "question_number": 1,
                "title": "The Glass Is Cracking",
                "description": "A hairline fracture spiders across the observation porthole. On the other side, one massive eye. The pressure door to compartment B is 10 feet away. Behind you, an emergency toolkit is bolted to the wall. Seawater is already seeping under the seal. What do you do?",
                "survival_factors": ["structural_awareness", "rapid_decision"],
                "story_context": "Porthole cracking under creature pressure",
                "death_risk_level": "medium",
                "world_state": {
                    "location": "observation deck, 11,000 m depth",
                    "threat": "a vast organism pressing against the failing porthole",
                    "threat_proximity": "immediate",
                    "threat_awareness": "hunting",
                    "noise_level": "loud",
                    "injuries": ["none"],
                    "inventory": ["emergency toolkit", "pressure door to compartment B"],
                    "blocked_routes": ["porthole seal (failing)"],
                },
                "branching_paths": [
                    {"action_type": "cautious", "description": "Grab the toolkit and try to reinforce the seal"},
                    {"action_type": "aggressive", "description": "Sprint to compartment B and seal the door"},
                    {"action_type": "escape", "description": "Find the emergency ascent pod"},
                ],
            },
        }

        scenario = dict(scenarios.get(theme, scenarios["haunted_house"]))
        scenario["engine"] = "fallback"
        scenario["fallback_reason"] = fallback_reason
        return scenario

    # --------------------------------------------------------------------------
    # JSON plumbing
    # --------------------------------------------------------------------------

    def _parse_json_object(self, response_text: str) -> Optional[Dict[str, Any]]:
        """Clean, locate and parse a JSON object from a model response."""
        cleaned = self._clean_json_response(response_text)
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            return None
        try:
            parsed = json.loads(match.group())
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None

    def _clean_json_response(self, response_text: str) -> str:
        """Clean markdown and other formatting from JSON response"""
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        elif response_text.startswith("```"):
            response_text = response_text[3:]

        if response_text.endswith("```"):
            response_text = response_text[:-3]

        return response_text.strip()


# Global AI service instance
ai_service = AIService()
