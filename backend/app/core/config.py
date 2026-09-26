from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    database_url: str = "postgresql://frightfate_user:spooky_password_123@localhost:5432/frightfate"
    secret_key: str = "your-super-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # AI Provider Settings (OpenAI, Groq, DeepSeek, Ollama, Azure, or GitHub)
    github_token: str = ""
    openai_api_key: str = ""
    # Optional second key: carries the analysis (scoring) load so the burst
    # limits of the two keys are spent on different call types.
    openai_api_key_2: str = ""
    openai_base_url: str = ""
    openai_model: str = "gpt-4o-mini"
    
    # CORS & Environment
    allowed_origins: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,*"
    environment: str = "development"
    
    # Keep these for backward compatibility if needed
    gemini_api_key: str = ""  # deprecated
    gemini_model: str = ""    # deprecated

    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache()
def get_settings():
    return Settings()