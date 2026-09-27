from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.game import GameSession, Player, Scenario, PlayerAnswer, LeaderboardEntry
from pydantic import BaseModel
from typing import Optional
import random
import string
from app.services.ai_service import ai_service
from app.services.feed import fate_feed
from app.routes.websocket import manager as ws_manager
import asyncio
from asyncio import timeout
from datetime import datetime, timezone
import json
import sys

def log_info(msg: str):
    try:
        print(msg)
    except Exception:
        try:
            print(msg.encode("ascii", "replace").decode("ascii"))
        except Exception:
            pass

router = APIRouter()

# Pydantic models for request bodies
class SubmitAnswerRequest(BaseModel):
    session_code: str
    player_id: int
    question_number: int
    answer_text: str
    # The exact scenario the player saw — prevents re-generation mismatch
    scenario_title: Optional[str] = ""
    scenario_description: Optional[str] = ""
    scenario_survival_factors: Optional[list] = []
    scenario_death_risk: Optional[str] = "medium"

class PlayerState(BaseModel):
    player_id: int
    is_eliminated: bool = False
    elimination_reason: Optional[str] = None
    story_context: str = ""

def generate_session_code():
    """Generate a unique 6-character session code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

# Sessions older than this are considered abandoned and purged on new creates.
SESSION_MAX_AGE_HOURS = 6


def purge_stale_sessions(db: Session, max_age_hours: int = SESSION_MAX_AGE_HOURS) -> int:
    """Delete abandoned sessions (and their players/answers) older than the cutoff.

    Runs opportunistically on session creation, so no scheduler is needed for the
    common case. Leaderboard entries are intentionally kept — they outlive the
    session that produced them.
    """
    cutoff = datetime.now(timezone.utc).timestamp() - max_age_hours * 3600
    stale = (
        db.query(GameSession)
        .filter(GameSession.created_at.isnot(None))
        .all()
    )
    purged = 0
    for session in stale:
        created = session.created_at
        # SQLite stores naive datetimes (UTC by convention from func.now());
        # Postgres may hand back tz-aware ones. Normalize before comparing.
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if created.timestamp() < cutoff:
            db.query(PlayerAnswer).filter(PlayerAnswer.session_id == session.id).delete()
            db.query(Player).filter(Player.session_id == session.id).delete()
            db.delete(session)
            purged += 1
    if purged:
        db.commit()
    return purged

@router.post("/create-session")
async def create_session(payload: dict = Body(default=None), theme: str = "haunted_house", db: Session = Depends(get_db)):
    """Create a new game session with dynamic narrative support.

    The theme arrives in the JSON body ({"theme": "zombie_outbreak"}) from the
    web client; the query param stays as a fallback for API callers.
    """
    if isinstance(payload, dict) and payload.get("theme"):
        theme = str(payload["theme"])
    session_code = generate_session_code()
    
    # Make sure code is unique
    while db.query(GameSession).filter(GameSession.session_code == session_code).first():
        session_code = generate_session_code()
    
    # Opportunistic hygiene: clear out abandoned sessions before making room.
    try:
        purge_stale_sessions(db)
    except Exception as e:
        log_info(f"Stale session purge skipped: {e}")

    session = GameSession(
        session_code=session_code,
        theme=theme,
        status="waiting"
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    event = fate_feed.record(session.session_code, "session_created", "A new nightmare opens its doors.", theme=session.theme)
    await ws_manager.broadcast_event(session.session_code, {"type": "feed_event", "event": event})
    
    return {
        "session_code": session.session_code,
        "theme": session.theme,
        "status": session.status
    }

def _upsert_leaderboard_entry(db: Session, session, player_name: str, score: int, survived: bool, eliminated_at=None):
    """Insert or refresh a leaderboard row for a player in this session."""
    entry = db.query(LeaderboardEntry).filter(
        LeaderboardEntry.session_id == session.id,
        LeaderboardEntry.player_name == player_name,
    ).first()

    if entry:
        entry.score = score
        entry.survived = survived
        entry.theme = session.theme
        entry.eliminated_at = eliminated_at
    else:
        entry = LeaderboardEntry(
            player_name=player_name,
            session_id=session.id,
            session_code=session.session_code,
            theme=session.theme,
            score=score,
            survived=survived,
            eliminated_at=eliminated_at,
        )
        db.add(entry)


@router.get("/feed/{session_code}")
async def get_fate_feed(session_code: str, after_seq: int = 0, db: Session = Depends(get_db)):
    """Shared narrative feed for a session (replayable by late joiners)."""
    session = db.query(GameSession).filter(GameSession.session_code == session_code).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    events = fate_feed.get(session_code, after_seq=after_seq)
    return {"session_code": session_code, "events": events}


@router.get("/leaderboard")
async def get_leaderboard(theme: Optional[str] = None, limit: int = 25, db: Session = Depends(get_db)):
    """Top survival scores, optionally filtered to a single theme.

    No accounts are required: entries are name+score snapshots recorded when a
    session's final results are generated.
    """
    limit = max(1, min(limit, 100))

    query = db.query(LeaderboardEntry)
    if theme and theme != "all":
        query = query.filter(LeaderboardEntry.theme == theme)

    entries = (
        query.order_by(LeaderboardEntry.score.desc(), LeaderboardEntry.created_at.asc())
        .limit(limit)
        .all()
    )

    ranked = []
    for index, entry in enumerate(entries, start=1):
        ranked.append({
            "rank": index,
            "player_name": entry.player_name,
            "theme": entry.theme or "haunted_house",
            "score": entry.score or 0,
            "survived": bool(entry.survived),
            "eliminated_at": entry.eliminated_at,
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
        })

    return {
        "theme": theme or "all",
        "limit": limit,
        "entries": ranked,
    }


@router.post("/join-session/{session_code}")
async def join_session(session_code: str, player_name: str, db: Session = Depends(get_db)):
    """Join an existing game session"""
    session = db.query(GameSession).filter(GameSession.session_code == session_code).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if getattr(session, "status", None) != "waiting":
        raise HTTPException(status_code=400, detail="Session is not accepting new players")
    
    # Check if player name already exists in this session
    existing_player = db.query(Player).filter(
        Player.session_id == session.id,
        Player.name == player_name
    ).first()
    
    if existing_player:
        raise HTTPException(status_code=400, detail="Player name already taken in this session")
    
    player = Player(
        name=player_name,
        session_id=session.id
    )
    
    db.add(player)
    db.commit()
    db.refresh(player)
    
    event = fate_feed.record(
        session_code, "player_joined", f"{player.name} stepped through the door.", player_name=player.name
    )
    await ws_manager.broadcast_event(session_code, {"type": "feed_event", "event": event})
    
    return {
        "player_id": player.id,
        "session_code": session.session_code,
        "player_name": player.name
    }

@router.get("/session/{session_code}")
async def get_session(session_code: str, db: Session = Depends(get_db)):
    """Get session details including players and their elimination status"""
    session = db.query(GameSession).filter(GameSession.session_code == session_code).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    players = db.query(Player).filter(Player.session_id == session.id).all()
    
    # Check for eliminated players
    eliminated_players = []
    active_players = []
    
    for player in players:
        is_elim = bool(player.is_eliminated)
        elim_reason = player.elimination_reason or "Unknown"

        if not is_elim:
            latest_answer = db.query(PlayerAnswer).filter(
                PlayerAnswer.player_id == player.id
            ).order_by(PlayerAnswer.id.desc()).first()
            if latest_answer and getattr(latest_answer, 'is_eliminated', False):
                is_elim = True
                elim_reason = getattr(latest_answer, 'elimination_reason', 'Unknown')

        if is_elim:
            eliminated_players.append({
                "id": player.id, 
                "name": player.name, 
                "is_eliminated": True,
                "elimination_reason": elim_reason
            })
        else:
            active_players.append({
                "id": player.id, 
                "name": player.name, 
                "is_ready": player.is_ready,
                "is_eliminated": False
            })
    
    return {
        "session_code": session.session_code,
        "theme": session.theme,
        "status": session.status,
        "current_question": session.current_question,
        "active_players": active_players,
        "eliminated_players": eliminated_players,
        "total_players": len(players)
    }

@router.get("/scenario/{session_code}/{question_number}")
async def get_dynamic_scenario(session_code: str, question_number: int, player_id: int, previous_state: Optional[str] = None, db: Session = Depends(get_db)):
    """Get a dynamically generated scenario based on player's history"""
    print(f"🎭 Getting dynamic scenario for player {player_id}, question {question_number}")
    
    session = db.query(GameSession).filter(GameSession.session_code == session_code).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    try:
        theme_value = str(getattr(session, "theme", "")) or "haunted_house"
        
        # Set timeout for AI operations
        async with timeout(30):
            if question_number == 1:
                # Generate initial scenario
                print(f"🎬 Generating initial scenario for theme: {theme_value}")
                scenario = await ai_service.generate_initial_scenario(theme_value)
            else:
                # Get player's previous choices and scenarios
                previous_answers = db.query(PlayerAnswer).filter(
                    PlayerAnswer.player_id == player_id
                ).order_by(PlayerAnswer.question_number).all()
                
                player_choices = []
                for answer in previous_answers:
                    choice_data = {
                        "question_number": answer.question_number,
                        "answer_text": answer.answer_text,
                        "score": answer.score,
                        "story_context": getattr(answer, 'story_context', '')
                    }
                    player_choices.append(choice_data)
                
                # Get previous scenarios (you might want to store these in DB)
                previous_scenarios = []
                story_context = player_choices[-1].get('story_context', '') if player_choices else ''
                
                # The client echoes the previous round's world-state back to us so the
                # simulation can carry injuries, blocked routes and threat awareness
                # forward without needing any server-side session storage.
                prev_state = None
                if previous_state:
                    try:
                        prev_state = json.loads(previous_state)
                        if not isinstance(prev_state, dict):
                            prev_state = None
                    except (ValueError, TypeError):
                        prev_state = None

                print(f"🎬 Generating scenario {question_number} based on {len(player_choices)} previous choices")
                scenario = await ai_service.generate_next_scenario(
                    theme_value, question_number, previous_scenarios, player_choices, story_context, prev_state
                )
            
            if scenario:
                print(f"✅ Generated dynamic scenario: {scenario.get('title', 'Unknown')}")
                return scenario
            else:
                raise Exception("Failed to generate scenario")
                
    except asyncio.TimeoutError:
        reason = "scenario generation exceeded the 30s time limit"
        log_info(f"⏰ [FALLBACK] dynamic scenario: {reason}")
        theme_value = str(getattr(session, "theme", "")) if 'session' in locals() and session else "haunted_house"
        return ai_service._get_fallback_initial_scenario(theme_value, reason)
    except Exception as e:
        reason = str(e)
        log_info(f"❌ [FALLBACK] dynamic scenario: {reason}")
        theme_value = str(getattr(session, "theme", "")) if 'session' in locals() and session else "haunted_house"
        return ai_service._get_fallback_initial_scenario(theme_value, reason)

@router.post("/submit-answer")
async def submit_answer(request: SubmitAnswerRequest, db: Session = Depends(get_db)):
    """Submit a player's answer with death check and dynamic story progression"""
    print(f"🧠 Processing answer for player {request.player_id}, question {request.question_number}")
    
    # Verify session and player
    session = db.query(GameSession).filter(GameSession.session_code == request.session_code).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    player = db.query(Player).filter(
        Player.id == request.player_id,
        Player.session_id == session.id
    ).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found in session")
    
    # Check if player is already eliminated
    if player.is_eliminated:
        raise HTTPException(status_code=400, detail="Player has been eliminated and cannot continue")
    
    # Get current scenario
    theme_value = str(getattr(session, "theme", "")) or "haunted_house"
    
    # Use the scenario the player actually saw (sent from frontend)
    # This prevents the critical bug where analysis was run against a newly
    # generated scenario instead of the one the player responded to.
    if request.scenario_description:
        scenario = {
            "title": request.scenario_title or "Unknown Scenario",
            "description": request.scenario_description,
            "survival_factors": request.scenario_survival_factors or [],
            "death_risk_level": request.scenario_death_risk or "medium",
        }
        log_info(f"✅ Using scenario from request: {scenario['title']}")
    else:
        # Fallback: regenerate if frontend didn't send scenario (old clients)
        log_info("⚠️  No scenario in request, regenerating (may cause mismatch)")
        theme_value = str(getattr(session, "theme", "")) or "haunted_house"
        try:
            async with timeout(20):
                scenario = await ai_service.generate_initial_scenario(theme_value)
        except Exception as e:
            log_info(f"❌ [FALLBACK] scenario regeneration: {e}")
            scenario = ai_service._get_fallback_initial_scenario(theme_value, str(e))
    
    # Get player's choice history for death analysis
    player_history = []
    previous_answers = db.query(PlayerAnswer).filter(
        PlayerAnswer.player_id == request.player_id
    ).order_by(PlayerAnswer.question_number).all()
    
    for answer in previous_answers:
        player_history.append({
            "question_number": answer.question_number,
            "score": answer.score,
            "answer_text": answer.answer_text,
            "story_context": getattr(answer, 'story_context', '') or "",
            "choice_classification": getattr(answer, 'choice_classification', 'neutral') or "neutral"
        })
    
    # AI Analysis with death check
    analysis_result = None
    try:
        async with timeout(20):
            analysis_result = await ai_service.analyze_answer_with_death_check(
                scenario, request.answer_text, player_history, theme_value
            )
            log_info(f"AI analysis complete: score {analysis_result['survival_score']}, death: {analysis_result.get('instant_death', False)}")
    except Exception as e:
        log_info(f"❌ [FALLBACK] answer analysis: {e}")
        # Fallback analysis
        analysis_result = ai_service._fallback_death_analysis(
            request.answer_text, 
            scenario.get("death_risk_level", "medium"), 
            len([h for h in player_history if h.get("score", 50) < 30]),
            theme_value,
            str(e),
        )
    
    # Check for instant death
    instant_death = analysis_result.get("instant_death", False)
    score = analysis_result.get("survival_score", 50)
    death_reason = analysis_result.get("death_reason", "Poor survival choices") if instant_death else None
    
    # Save the answer
    existing_answer = db.query(PlayerAnswer).filter(
        PlayerAnswer.session_id == session.id,
        PlayerAnswer.player_id == request.player_id,
        PlayerAnswer.question_number == request.question_number
    ).first()
    
    if existing_answer:
        existing_answer.answer_text = request.answer_text
        existing_answer.score = score
        existing_answer.story_context = analysis_result.get("story_progression", "")
        existing_answer.choice_classification = analysis_result.get("choice_classification", "neutral")
        if instant_death:
            existing_answer.is_eliminated = True
            existing_answer.elimination_reason = death_reason
    else:
        answer = PlayerAnswer(
            session_id=session.id,
            player_id=request.player_id,
            question_number=request.question_number,
            answer_text=request.answer_text,
            score=score,
            story_context=analysis_result.get("story_progression", ""),
            choice_classification=analysis_result.get("choice_classification", "neutral"),
            is_eliminated=instant_death,
            elimination_reason=death_reason,
        )
        db.add(answer)
    
    # Update player score
    db.commit()
    all_scores = db.query(PlayerAnswer.score).filter(PlayerAnswer.player_id == player.id).all()
    player.survival_score = sum(s[0] for s in all_scores)
    
    better_alternatives = analysis_result.get("better_alternatives") or []
    if not better_alternatives and scenario and scenario.get("branching_paths"):
        better_alternatives = [bp.get("description", "") for bp in scenario.get("branching_paths") if bp.get("description")]
    if not better_alternatives:
        better_alternatives = [
            "Utilize stealth, minimize light and sound, and assess exit vectors before committing.",
            "Improvise a sturdy physical barrier or search for secondary concealed escape routes."
        ]

    response_data = {
        "message": "Answer submitted successfully",
        "score": score,
        "analysis": analysis_result.get("analysis", ""),
        "story_progression": analysis_result.get("story_progression", ""),
        "choice_classification": analysis_result.get("choice_classification", "neutral"),
        "better_alternatives": better_alternatives,
        "host_verdict": analysis_result.get("host_verdict", ""),
        "death_epitaph": analysis_result.get("death_epitaph"),
        "engine": "ai" if analysis_result.get("engine") == "ai" else "fallback",
        "fallback_reason": analysis_result.get("fallback_reason") or None,
    }
    
    # If player died instantly, generate death narrative
    if instant_death:
        player.is_eliminated = True
        player.elimination_reason = death_reason
        log_info(f"Player {request.player_id} has been eliminated: {death_reason}")
        event = fate_feed.record(
            request.session_code,
            "player_eliminated",
            f"💀 {player.name} died: {death_reason}",
            player_name=player.name,
        )
        await ws_manager.broadcast_event(request.session_code, {"type": "feed_event", "event": event})
        
        try:
            player_data = {
                "player_name": player.name,
                "total_score": player.survival_score,
                "answer_count": len(player_history) + 1
            }
            
            death_narrative = await ai_service.generate_death_narrative(player_data, death_reason, theme_value)
            player.death_narrative = death_narrative
            
            response_data.update({
                "instant_death": True,
                "death_narrative": death_narrative,
                "game_over": True,
                "elimination_reason": death_reason
            })
            
        except Exception as e:
            log_info(f"Error generating death narrative: {e}")
            fallback_narrative = {
                "player_name": player.name,
                "eliminated": True,
                "death_narrative": "Your poor decisions caught up with you, leading to your untimely demise.",
                "fate_title": "💀 ELIMINATED",
                "elimination_reason": death_reason
            }
            player.death_narrative = fallback_narrative
            response_data.update({
                "instant_death": True,
                "death_narrative": fallback_narrative,
                "game_over": True,
                "elimination_reason": death_reason
            })
    
    db.commit()
    return response_data

@router.get("/check-elimination/{session_code}/{player_id}")
async def check_player_elimination(session_code: str, player_id: int, db: Session = Depends(get_db)):
    """Check if a player has been eliminated"""
    session = db.query(GameSession).filter(GameSession.session_code == session_code).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    player = db.query(Player).filter(Player.id == player_id, Player.session_id == session.id).first()
    if player and player.is_eliminated:
        return {
            "is_eliminated": True,
            "elimination_reason": player.elimination_reason or "Poor survival choices",
            "can_continue": False
        }
    
    return {
        "is_eliminated": False,
        "can_continue": True
    }

@router.get("/results/{session_code}")
async def get_results(session_code: str, db: Session = Depends(get_db)):
    """Get AI-generated final results including eliminated players"""
    log_info(f"Generating results for session: {session_code}")
    
    session = db.query(GameSession).filter(GameSession.session_code == session_code).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get all players and their answers
    players = db.query(Player).filter(Player.session_id == session.id).all()
    
    players_data = []
    eliminated_players_data = []
    
    for player in players:
        answers = db.query(PlayerAnswer).filter(PlayerAnswer.player_id == player.id).all()
        total_score = sum(answer.score for answer in answers)
        is_eliminated = bool(player.is_eliminated)
        
        player_data = {
            "player_name": player.name,
            "total_score": total_score,
            "answer_count": len(answers),
            "average_score": total_score / len(answers) if answers else 0,
            "is_eliminated": is_eliminated
        }
        
        if is_eliminated:
            player_data["elimination_reason"] = player.elimination_reason or "Poor survival choices"
            eliminated_players_data.append(player_data)
        else:
            players_data.append(player_data)
    
    log_info(f"Processing results: {len(players_data)} survivors, {len(eliminated_players_data)} eliminated")
    
    # Cap the story: record the final verdicts on the shared Fate Feed.
    try:
        for player_data in players_data:
            event = fate_feed.record(
                session_code,
                "survived",
                f"✟ {player_data['player_name']} survived with {int(player_data.get('total_score', 0) or 0)} points.",
                player_name=player_data["player_name"],
            )
            await ws_manager.broadcast_event(session_code, {"type": "feed_event", "event": event})
    except Exception as e:
        log_info(f"Feed record error: {e}")
    
    # Record scores on the leaderboard. We do this before the (slow) AI calls
    # so a timeout can never lose a finished game's scores.
    for player_data in players_data:
        _upsert_leaderboard_entry(
            db,
            session,
            player_data["player_name"],
            int(player_data.get("total_score", 0) or 0),
            True,
        )
    for player_data in eliminated_players_data:
        _upsert_leaderboard_entry(
            db,
            session,
            player_data["player_name"],
            int(player_data.get("total_score", 0) or 0),
            False,
            eliminated_at=player_data.get("answer_count"),
        )
    db.commit()

    # Generate AI results with timeout
    try:
        async with timeout(25):
            # Generate results for survivors
            survivor_results = []
            if players_data:
                survivor_results = await ai_service.generate_final_results(
                    players_data, str(getattr(session, "theme", "") or "haunted_house")
                )
            
            # Generate elimination narratives for eliminated players
            elimination_results = []
            for eliminated_player in eliminated_players_data:
                try:
                    death_narrative = await ai_service.generate_death_narrative(
                        eliminated_player, 
                        eliminated_player.get('elimination_reason', 'Poor survival choices'),
                        str(getattr(session, "theme", "") or "haunted_house"),
                    )
                    elimination_results.append(death_narrative)
                except Exception as e:
                    log_info(f"Error generating elimination narrative: {e}")
                    elimination_results.append({
                        "player_name": eliminated_player["player_name"],
                        "eliminated": True,
                        "death_narrative": "Poor decision-making led to their elimination from the game.",
                        "fate_title": "💀 ELIMINATED",
                        "elimination_reason": eliminated_player.get('elimination_reason', 'Unknown')
                    })
            
            # Combine results
            all_results = elimination_results + survivor_results

            # Honest telemetry: did the model actually answer, or did we fall back?
            results_engine = "fallback"
            if survivor_results and survivor_results[0].get("engine") == "ai":
                results_engine = "ai"
            results_reason = next(
                (r.get("fallback_reason") for r in all_results if r.get("fallback_reason")), None
            )

            log_info(f"Generated results for {len(all_results)} players ({results_engine})")
            return {
                "results": all_results,
                "survivors": len(survivor_results),
                "eliminated": len(elimination_results),
                "total_players": len(all_results),
                "theme": session.theme,
                "engine": results_engine,
                "fallback_reason": results_reason if results_engine == "fallback" else None,
            }
            
    except asyncio.TimeoutError:
        reason = "results generation exceeded the 25s time limit"
        log_info(f"⏰ [FALLBACK] results: {reason}")
        fallback_results = ai_service._fallback_results(players_data + eliminated_players_data, fallback_reason=reason)
        return {"results": fallback_results, "survivors": len(players_data), "eliminated": len(eliminated_players_data), "fallback_reason": reason}
        
    except Exception as e:
        reason = str(e)
        log_info(f"❌ [FALLBACK] results: {reason}")
        fallback_results = ai_service._fallback_results(players_data + eliminated_players_data, fallback_reason=reason)
        return {"results": fallback_results, "survivors": len(players_data), "eliminated": len(eliminated_players_data), "fallback_reason": reason}