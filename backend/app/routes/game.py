from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.game import GameSession, Player, Scenario, PlayerAnswer
from pydantic import BaseModel
import random
import string

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
    """Get all scenarios for a specific theme"""
    scenarios = db.query(Scenario).filter(Scenario.theme == theme).order_by(Scenario.question_number).all()
    
    if not scenarios:
        raise HTTPException(status_code=404, detail=f"No scenarios found for theme: {theme}")
    
    return [
        {
            "question_number": s.question_number,
            "title": s.title,
            "description": s.description
        }
        for s in scenarios
    ]

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
    
    if existing_answer:
        # Update existing answer
        existing_answer.answer_text = request.answer_text # type: ignore
        db.commit()
        return {"message": "Answer updated successfully"}
    else:
        # Create new answer
        answer = PlayerAnswer(
            session_id=session.id,
            player_id=request.player_id,
            question_number=request.question_number,
            answer_text=request.answer_text,
            score=0  # We'll calculate this later
        )
        
        db.add(answer)
        db.commit()
        return {"message": "Answer submitted successfully"}

@router.get("/results/{session_code}")
async def get_results(session_code: str, db: Session = Depends(get_db)):
    """Get final results for a session"""
    session = db.query(GameSession).filter(GameSession.session_code == session_code).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    players = db.query(Player).filter(Player.session_id == session.id).all()
    
    # For now, return mock results. Later we'll implement proper scoring logic
    results = []
    for i, player in enumerate(players):
        results.append({
            "player_name": player.name,
            "survived": i == 0,  # First player survives for demo
            "death_order": i + 1 if i > 0 else None,
            "fate": "🎉 SOLE SURVIVOR" if i == 0 else f"💀 Died #{i + 1}",
            "analysis": "Your strategic thinking and careful decision-making kept you alive when others perished." if i == 0 else "Your impulsive choices led to an early demise."
        })
    
    return results