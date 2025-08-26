from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.game import GameSession, Player, Scenario, PlayerAnswer
from pydantic import BaseModel
from typing import Optional
import random
import string
from app.services.ai_service import ai_service
import asyncio
from asyncio import timeout
import json

router = APIRouter()

# Pydantic models for request bodies
class SubmitAnswerRequest(BaseModel):
    session_code: str
    player_id: int
    question_number: int
    answer_text: str

class PlayerState(BaseModel):
    player_id: int
    is_eliminated: bool = False
    elimination_reason: Optional[str] = None
    story_context: str = ""

def generate_session_code():
    """Generate a unique 6-character session code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@router.post("/create-session")
async def create_session(theme: str = "haunted_house", db: Session = Depends(get_db)):
    """Create a new game session with dynamic narrative support"""
    session_code = generate_session_code()
    
    # Make sure code is unique
    while db.query(GameSession).filter(GameSession.session_code == session_code).first():
        session_code = generate_session_code()
    
    session = GameSession(
        session_code=session_code,
        theme=theme,
        status="waiting"
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return {
        "session_code": session.session_code,
        "theme": session.theme,
        "status": session.status
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
        # Check if player has been eliminated (has an elimination record in their latest answer)
        latest_answer = db.query(PlayerAnswer).filter(
            PlayerAnswer.player_id == player.id
        ).order_by(PlayerAnswer.id.desc()).first()
        
        if latest_answer and hasattr(latest_answer, 'is_eliminated') and getattr(latest_answer, 'is_eliminated', False):
            eliminated_players.append({
                "id": player.id, 
                "name": player.name, 
                "is_eliminated": True,
                "elimination_reason": getattr(latest_answer, 'elimination_reason', 'Unknown')
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
async def get_dynamic_scenario(session_code: str, question_number: int, player_id: int, db: Session = Depends(get_db)):
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
                
                print(f"🎬 Generating scenario {question_number} based on {len(player_choices)} previous choices")
                scenario = await ai_service.generate_next_scenario(
                    theme_value, question_number, previous_scenarios, player_choices, story_context
                )
            
            if scenario:
                print(f"✅ Generated dynamic scenario: {scenario.get('title', 'Unknown')}")
                return scenario
            else:
                raise Exception("Failed to generate scenario")
                
    except asyncio.TimeoutError:
        print("⏰ Scenario generation timed out, using fallback")
        theme_value = str(getattr(session, "theme", "")) if 'session' in locals() and session else "haunted_house"
        return ai_service._get_fallback_initial_scenario(theme_value)
    except Exception as e:
        print(f"❌ Error generating dynamic scenario: {e}")
        theme_value = str(getattr(session, "theme", "")) if 'session' in locals() and session else "haunted_house"
        return ai_service._get_fallback_initial_scenario(theme_value)

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
    latest_answer = db.query(PlayerAnswer).filter(
        PlayerAnswer.player_id == request.player_id
    ).order_by(PlayerAnswer.id.desc()).first()
    
    if latest_answer and hasattr(latest_answer, 'is_eliminated') and latest_answer.is_eliminated:
        raise HTTPException(status_code=400, detail="Player has been eliminated and cannot continue")
    
    # Get current scenario
    theme_value = str(getattr(session, "theme", "")) or "haunted_house"
    
    try:
        async with timeout(20):
            if request.question_number == 1:
                scenario = await ai_service.generate_initial_scenario(theme_value)
            else:
                # Get player history for dynamic scenario generation
                previous_answers = db.query(PlayerAnswer).filter(
                    PlayerAnswer.player_id == request.player_id
                ).order_by(PlayerAnswer.question_number).all()
                
                player_choices = []
                for answer in previous_answers:
                    choice_data = {
                        "question_number": answer.question_number,
                        "answer_text": answer.answer_text,
                        "score": answer.score
                    }
                    player_choices.append(choice_data)
                
                scenario = await ai_service.generate_next_scenario(
                    theme_value, request.question_number, [], player_choices, ""
                ) or ai_service._get_fallback_initial_scenario(theme_value)
    except Exception as e:
        print(f"Error getting scenario: {e}")
        scenario = ai_service._get_fallback_initial_scenario(theme_value)
    
    # Get player's choice history for death analysis
    player_history = []
    previous_answers = db.query(PlayerAnswer).filter(
        PlayerAnswer.player_id == request.player_id
    ).order_by(PlayerAnswer.question_number).all()
    
    for answer in previous_answers:
        player_history.append({
            "question_number": answer.question_number,
            "score": answer.score,
            "answer_text": answer.answer_text[:100]  # Truncated for analysis
        })
    
    # AI Analysis with death check
    analysis_result = None
    try:
        async with timeout(20):
            analysis_result = await ai_service.analyze_answer_with_death_check(
                scenario, request.answer_text, player_history
            )
            print(f"✅ AI analysis complete: score {analysis_result['survival_score']}, death: {analysis_result.get('instant_death', False)}")
    except Exception as e:
        print(f"❌ Error analyzing answer: {e}")
        # Fallback analysis
        analysis_result = ai_service._fallback_death_analysis(
            request.answer_text, 
            scenario.get("death_risk_level", "medium"), 
            len([h for h in player_history if h.get("score", 50) < 30])
        )
    
    # Check for instant death
    instant_death = analysis_result.get("instant_death", False)
    score = analysis_result.get("survival_score", 50)
    
    # Save the answer
    existing_answer = db.query(PlayerAnswer).filter(
        PlayerAnswer.session_id == session.id,
        PlayerAnswer.player_id == request.player_id,
        PlayerAnswer.question_number == request.question_number
    ).first()
    
    if existing_answer:
        setattr(existing_answer, "answer_text", request.answer_text)
        setattr(existing_answer, "score", score)
        if instant_death:
            setattr(existing_answer, "is_eliminated", True)
            setattr(existing_answer, "elimination_reason", analysis_result.get("death_reason", "Poor survival choices"))
        db.commit()
    else:
        answer_data = {
            "session_id": session.id,
            "player_id": request.player_id,
            "question_number": request.question_number,
            "answer_text": request.answer_text,
            "score": score
        }
        
        if instant_death:
            answer_data["is_eliminated"] = True
            answer_data["elimination_reason"] = analysis_result.get("death_reason", "Poor survival choices")
        
        answer = PlayerAnswer(**answer_data)
        db.add(answer)
        db.commit()
    
    response_data = {
        "message": "Answer submitted successfully",
        "score": score,
        "analysis": analysis_result.get("analysis", ""),
        "story_progression": analysis_result.get("story_progression", ""),
        "choice_classification": analysis_result.get("choice_classification", "neutral")
    }
    
    # If player died instantly, generate death narrative
    if instant_death:
        print(f"💀 Player {request.player_id} has been eliminated")
        
        try:
            player_data = {
                "player_name": player.name,
                "total_score": sum(a.score for a in db.query(PlayerAnswer).filter(PlayerAnswer.player_id == request.player_id).all()),
                "answer_count": len(player_history) + 1
            }
            
            death_narrative = await ai_service.generate_death_narrative(
                player_data, analysis_result.get("death_reason", "Poor survival choices")
            )
            
            response_data.update({
                "instant_death": True,
                "death_narrative": death_narrative,
                "game_over": True,
                "elimination_reason": analysis_result.get("death_reason", "Poor survival choices")
            })
            
        except Exception as e:
            print(f"❌ Error generating death narrative: {e}")
            response_data.update({
                "instant_death": True,
                "death_narrative": {
                    "player_name": player.name,
                    "eliminated": True,
                    "death_narrative": "Your poor decisions caught up with you, leading to your untimely demise.",
                    "fate_title": "💀 ELIMINATED"
                },
                "game_over": True
            })
    
    return response_data

@router.get("/check-elimination/{session_code}/{player_id}")
async def check_player_elimination(session_code: str, player_id: int, db: Session = Depends(get_db)):
    """Check if a player has been eliminated"""
    session = db.query(GameSession).filter(GameSession.session_code == session_code).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    latest_answer = db.query(PlayerAnswer).filter(
        PlayerAnswer.player_id == player_id
    ).order_by(PlayerAnswer.id.desc()).first()
    
    if latest_answer and hasattr(latest_answer, 'is_eliminated') and getattr(latest_answer, 'is_eliminated', False):
        return {
            "is_eliminated": True,
            "elimination_reason": getattr(latest_answer, 'elimination_reason', 'Unknown'),
            "can_continue": False
        }
    
    return {
        "is_eliminated": False,
        "can_continue": True
    }

@router.get("/results/{session_code}")
async def get_results(session_code: str, db: Session = Depends(get_db)):
    """Get AI-generated final results including eliminated players"""
    print(f"🏆 Generating results for session: {session_code}")
    
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
        
        # Check if player was eliminated
        latest_answer = answers[-1] if answers else None
        is_eliminated = latest_answer and hasattr(latest_answer, 'is_eliminated') and getattr(latest_answer, 'is_eliminated', False)
        
        player_data = {
            "player_name": player.name,
            "total_score": total_score,
            "answer_count": len(answers),
            "average_score": total_score / len(answers) if answers else 0,
            "is_eliminated": is_eliminated
        }
        
        if is_eliminated:
            player_data["elimination_reason"] = getattr(latest_answer, 'elimination_reason', 'Poor survival choices')
            eliminated_players_data.append(player_data)
        else:
            players_data.append(player_data)
    
    print(f"📊 Processing results: {len(players_data)} survivors, {len(eliminated_players_data)} eliminated")
    
    # Generate AI results with timeout
    try:
        async with timeout(25):
            # Generate results for survivors
            survivor_results = []
            if players_data:
                survivor_results = await ai_service.generate_final_results(players_data)
            
            # Generate elimination narratives for eliminated players
            elimination_results = []
            for eliminated_player in eliminated_players_data:
                try:
                    death_narrative = await ai_service.generate_death_narrative(
                        eliminated_player, 
                        eliminated_player.get('elimination_reason', 'Poor survival choices')
                    )
                    elimination_results.append(death_narrative)
                except Exception as e:
                    print(f"❌ Error generating elimination narrative: {e}")
                    elimination_results.append({
                        "player_name": eliminated_player["player_name"],
                        "eliminated": True,
                        "death_narrative": "Poor decision-making led to their elimination from the game.",
                        "fate_title": "💀 ELIMINATED",
                        "elimination_reason": eliminated_player.get('elimination_reason', 'Unknown')
                    })
            
            # Combine results
            all_results = elimination_results + survivor_results
            
            print(f"✅ Generated results for {len(all_results)} players")
            return {
                "results": all_results,
                "survivors": len(survivor_results),
                "eliminated": len(elimination_results),
                "total_players": len(all_results)
            }
            
    except asyncio.TimeoutError:
        print("⏰ Results generation timed out, using fallback results")
        fallback_results = ai_service._fallback_results(players_data + eliminated_players_data)
        return {"results": fallback_results, "survivors": len(players_data), "eliminated": len(eliminated_players_data)}
        
    except Exception as e:
        print(f"❌ Error generating results: {str(e)}")
        fallback_results = ai_service._fallback_results(players_data + eliminated_players_data)
        return {"results": fallback_results, "survivors": len(players_data), "eliminated": len(eliminated_players_data)}