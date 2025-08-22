from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.game import GameSession, Player, Scenario, PlayerAnswer
from pydantic import BaseModel
import random
import string
from app.services.ai_service import ai_service


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
    """Get scenarios for a specific theme (AI-generated)"""
    try:
        # Generate fresh scenarios using AI
        scenarios = await ai_service.generate_scenarios(theme, count=10)
        return scenarios
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate scenarios: {str(e)}")
        

@router.post("/submit-answer")
async def submit_answer(request: SubmitAnswerRequest, db: Session = Depends(get_db)):
    """Submit a player's answer to a scenario"""
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

    # AI Analysis section
    try:
        # Extract the string value from the session.theme Column
        theme_value = str(getattr(session, "theme", "")) or ""
        scenarios = await ai_service.generate_scenarios(theme_value, count=10)
        current_scenario = next((s for s in scenarios if s["question_number"] == request.question_number), None)
        
        if current_scenario:
            # Analyze the answer with AI
            analysis = await ai_service.analyze_answer(
                current_scenario["description"],
                request.answer_text,
                current_scenario.get("survival_factors", [])
            )
            score = analysis["survival_score"]
        else:
            score = 50  # Default score if scenario not found
            
    except Exception as e:
        print(f"Error analyzing answer: {e}")
        score = 50  # Default score on error
    
    # Save or update answer with AI-generated score
    if existing_answer:
        # Use setattr to avoid type checking issues with SQLAlchemy models
        setattr(existing_answer, "answer_text", request.answer_text)
        setattr(existing_answer, "score", score)
        db.commit()
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
        return {"message": "Answer submitted successfully", "score": score}
    
    
@router.get("/results/{session_code}")
async def get_results(session_code: str, db: Session = Depends(get_db)):
    """Get AI-generated final results for a session"""
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
    
    # Generate AI results
    try:
        results = await ai_service.generate_final_results(players_data)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate results: {str(e)}")