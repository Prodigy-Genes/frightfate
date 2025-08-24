from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.game import GameSession, Player, Scenario, PlayerAnswer
from pydantic import BaseModel
import random
import string
from app.services.ai_service import ai_service
import asyncio
from asyncio import timeout



router = APIRouter()

# Pydantic models for request bodies
class SubmitAnswerRequest(BaseModel):
    session_code: str
    player_id: int
    question_number: int
    answer_text: str

def generate_session_code():
    """Generate a unique 6-character session code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@router.post("/create-session")
async def create_session(theme: str = "haunted_house", db: Session = Depends(get_db)):
    """Create a new game session"""
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
    
    if session.status != "waiting": # type: ignore
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
    """Get session details including players"""
    session = db.query(GameSession).filter(GameSession.session_code == session_code).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    players = db.query(Player).filter(Player.session_id == session.id).all()
    
    return {
        "session_code": session.session_code,
        "theme": session.theme,
        "status": session.status,
        "current_question": session.current_question,
        "players": [{"id": p.id, "name": p.name, "is_ready": p.is_ready} for p in players]
    }


@router.get("/scenarios/{theme}")
async def get_scenarios(theme: str, db: Session = Depends(get_db)):
    """Get 5 scenarios for a specific theme (AI-generated with timeout)"""
    try:
        print(f"🎭 Generating 5 scenarios for theme: {theme}")
        
        # Set a 30-second timeout for AI generation
        async with timeout(30):
            scenarios = await ai_service.generate_scenarios(theme, count=5)
            
        print(f"✅ Successfully generated {len(scenarios)} scenarios")
        return scenarios
        
    except asyncio.TimeoutError:
        print("⏰ AI generation timed out, using 5 fallback scenarios")
        fallback_scenarios = ai_service._get_fallback_scenarios(theme, 5)
        return fallback_scenarios
        
    except Exception as e:
        print(f"❌ Error generating scenarios: {str(e)}")
        fallback_scenarios = ai_service._get_fallback_scenarios(theme, 5)
        return fallback_scenarios

        

@router.post("/submit-answer")
async def submit_answer(request: SubmitAnswerRequest, db: Session = Depends(get_db)):
    """Submit a player's answer to a scenario with AI analysis"""
    print(f"🧠 Processing answer for player {request.player_id}, question {request.question_number}")
    
    # Verify session exists
    session = db.query(GameSession).filter(GameSession.session_code == request.session_code).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify player exists in session
    player = db.query(Player).filter(
        Player.id == request.player_id,
        Player.session_id == session.id
    ).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found in session")
    
    # Check if answer already exists
    existing_answer = db.query(PlayerAnswer).filter(
        PlayerAnswer.session_id == session.id,
        PlayerAnswer.player_id == request.player_id,
        PlayerAnswer.question_number == request.question_number
    ).first()

    # AI Analysis with timeout handling
    score = 50  # Default score
    try:
        # Extract the string value from the session.theme Column
        theme_value = str(getattr(session, "theme", "")) or ""
        print(f"🎬 5 Loading scenarios for theme: {theme_value}")
        
        # Set timeout for AI operations
        async with timeout(20):  # 20 second timeout
            scenarios = await ai_service.generate_scenarios(theme_value, count=5)
            current_scenario = next((s for s in scenarios if s["question_number"] == request.question_number), None)
            
            if current_scenario:
                print(f"🔍 Analyzing answer with AI...")
                # Analyze the answer with AI
                analysis = await ai_service.analyze_answer(
                    current_scenario["description"],
                    request.answer_text,
                    current_scenario.get("survival_factors", [])
                )
                score = analysis["survival_score"]
                print(f"✅ AI analysis complete: score {score}")
            else:
                print("⚠️ Scenario not found, using fallback analysis")
                # Use fallback analysis
                fallback_analysis = ai_service._fallback_analysis(
                    request.answer_text, 
                    ["logical_thinking", "caution"]
                )
                score = fallback_analysis["survival_score"]
                
    except asyncio.TimeoutError:
        print("⏰ AI analysis timed out, using fallback scoring")
        fallback_analysis = ai_service._fallback_analysis(
            request.answer_text, 
            ["logical_thinking", "caution"]
        )
        score = fallback_analysis["survival_score"]
        
    except Exception as e:
        print(f"❌ Error analyzing answer: {e}")
        # Use sophisticated fallback scoring
        fallback_analysis = ai_service._fallback_analysis(
            request.answer_text, 
            ["logical_thinking", "caution"]
        )
        score = fallback_analysis["survival_score"]
    
    # Save or update answer with generated score
    if existing_answer:
        setattr(existing_answer, "answer_text", request.answer_text)
        setattr(existing_answer, "score", score)
        db.commit()
        print(f"📝 Answer updated for player {request.player_id}")
        return {"message": "Answer updated successfully", "score": score}
    else:
        answer = PlayerAnswer(
            session_id=session.id,
            player_id=request.player_id,
            question_number=request.question_number,
            answer_text=request.answer_text,
            score=score
        )
        
        db.add(answer)
        db.commit()
        print(f"💾 Answer saved for player {request.player_id}")
        return {"message": "Answer submitted successfully", "score": score}
    
@router.get("/results/{session_code}")
async def get_results(session_code: str, db: Session = Depends(get_db)):
    """Get AI-generated final results for a session with timeout handling"""
    print(f"🏆 Generating results for session: {session_code}")
    
    session = db.query(GameSession).filter(GameSession.session_code == session_code).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get all players and their answers
    players = db.query(Player).filter(Player.session_id == session.id).all()
    
    players_data = []
    for player in players:
        answers = db.query(PlayerAnswer).filter(PlayerAnswer.player_id == player.id).all()
        total_score = sum(answer.score for answer in answers)
        
        players_data.append({
            "player_name": player.name,
            "total_score": total_score,
            "answer_count": len(answers),
            "average_score": total_score / len(answers) if answers else 0
        })
    
    print(f"📊 Processing results for {len(players_data)} players")
    
    # Generate AI results with timeout
    try:
        async with timeout(25):  # 25 second timeout for results
            results = await ai_service.generate_final_results(players_data)
            print(f"✅ AI results generated successfully")
            return results
            
    except asyncio.TimeoutError:
        print("⏰ AI results generation timed out, using fallback results")
        fallback_results = ai_service._fallback_results(players_data)
        return fallback_results
        
    except Exception as e:
        print(f"❌ Error generating results: {str(e)}")
        fallback_results = ai_service._fallback_results(players_data)
        return fallback_results