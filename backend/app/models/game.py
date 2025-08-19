from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class GameSession(Base):
    __tablename__ = "game_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_code = Column(String(10), unique=True, index=True)
    theme = Column(String(50), default="haunted_house")
    status = Column(String(20), default="waiting")  # waiting, in_progress, completed
    current_question = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    players = relationship("Player", back_populates="session")
    answers = relationship("PlayerAnswer", back_populates="session")

class Player(Base):
    __tablename__ = "players"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    session_id = Column(Integer, ForeignKey("game_sessions.id"))
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    is_ready = Column(Boolean, default=False)
    survival_score = Column(Integer, default=0)
    death_order = Column(Integer, nullable=True)
    
    session = relationship("GameSession", back_populates="players")
    answers = relationship("PlayerAnswer", back_populates="player")

class Scenario(Base):
    __tablename__ = "scenarios"
    
    id = Column(Integer, primary_key=True, index=True)
    theme = Column(String(50), nullable=False)
    question_number = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    scoring_criteria = Column(JSON)  # Store scoring logic as JSON

class PlayerAnswer(Base):
    __tablename__ = "player_answers"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id"))
    player_id = Column(Integer, ForeignKey("players.id"))
    question_number = Column(Integer, nullable=False)
    answer_text = Column(Text, nullable=False)
    score = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("GameSession", back_populates="answers")
    player = relationship("Player", back_populates="answers")