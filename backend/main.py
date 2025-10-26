from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os

from database import SessionLocal, Poll, PollOption
from schemas import PollCreate, PollResponse

app = FastAPI()

# === FRONTEND URL ===
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://quickpoll-frontend-mcyo.onrender.com")

# === CORS SETUP ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,                      # deployed frontend
        FRONTEND_URL.replace("https://", "http://"),  # fallback
        "http://localhost:3000",           # local dev support
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "QuickPoll API is running"}

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Create Poll
@app.post("/polls/", response_model=PollResponse)
async def create_poll(poll: PollCreate, db: Session = Depends(get_db)):
    # Create poll
    db_poll = Poll(title=poll.title)
    db.add(db_poll)
    db.commit()
    db.refresh(db_poll)
    
    # Create options
    for option_text in poll.options:
        db_option = PollOption(poll_id=db_poll.id, option_text=option_text)
        db.add(db_option)
    
    db.commit()
    db.refresh(db_poll)
    
    # Broadcast to all connected clients
    await manager.broadcast({
        "type": "poll_created",
        "poll": {
            "id": db_poll.id,
            "title": db_poll.title,
            "created_at": db_poll.created_at.isoformat(),
            "likes": db_poll.likes,
            "options": [
                {
                    "id": opt.id,
                    "option_text": opt.option_text,
                    "votes": opt.votes
                } for opt in db_poll.options
            ]
        }
    })
    
    return db_poll

# Get all polls
@app.get("/polls/", response_model=List[PollResponse])
def get_polls(db: Session = Depends(get_db)):
    polls = db.query(Poll).all()
    return polls

# Get single poll
@app.get("/polls/{poll_id}", response_model=PollResponse)
def get_poll(poll_id: int, db: Session = Depends(get_db)):
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    return poll

# Vote on a poll option
@app.post("/polls/{poll_id}/vote/{option_id}")
async def vote_on_option(poll_id: int, option_id: int, db: Session = Depends(get_db)):
    # Check if poll exists
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    # Check if option exists and belongs to this poll
    option = db.query(PollOption).filter(
        PollOption.id == option_id,
        PollOption.poll_id == poll_id
    ).first()
    
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")
    
    # Increment vote count
    option.votes += 1
    db.commit()
    db.refresh(option)
    db.refresh(poll)
    
    # Broadcast to all connected clients
    await manager.broadcast({
        "type": "vote_updated",
        "poll_id": poll_id,
        "option_id": option_id,
        "votes": option.votes
    })
    
    return poll

# Like a poll
@app.post("/polls/{poll_id}/like")
async def like_poll(poll_id: int, db: Session = Depends(get_db)):
    # Check if poll exists
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    # Increment like count
    poll.likes += 1
    db.commit()
    db.refresh(poll)
    
    # Broadcast to all connected clients
    await manager.broadcast({
        "type": "like_updated",
        "poll_id": poll_id,
        "likes": poll.likes
    })
    
    return poll
