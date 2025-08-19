## Project structure

frightfate-game/
├── frontend/                 # Vite frontend
│   ├── src/
│   │   ├── styles/
│   │   │   └── main.css     # Our horror-themed CSS
│   │   ├── js/
│   │   │   ├── game.js      # Game logic
│   │   │   ├── api.js       # API calls
│   │   │   └── ui.js        # UI interactions
│   │   └── assets/
│   ├── index.html
│   └── package.json
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI app
│   │   ├── models/          # SQLAlchemy models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── database.py      # DB connection
│   ├── alembic/             # DB migrations
│   ├── requirements.txt
│   └── .env
└── README.md