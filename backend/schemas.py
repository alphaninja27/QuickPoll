from pydantic import BaseModel
from typing import List
from datetime import datetime

class PollOptionCreate(BaseModel):
    option_text: str

class PollOptionResponse(BaseModel):
    id: int
    option_text: str
    votes: int
    
    class Config:
        from_attributes = True

class PollCreate(BaseModel):
    title: str
    options: List[str]  # List of option texts

class PollResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    likes: int
    options: List[PollOptionResponse]
    
    class Config:
        from_attributes = True
