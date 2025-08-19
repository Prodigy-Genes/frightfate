from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict
import json

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_code: str):
        await websocket.accept()
        if session_code not in self.active_connections:
            self.active_connections[session_code] = []
        self.active_connections[session_code].append(websocket)

    def disconnect(self, websocket: WebSocket, session_code: str):
        if session_code in self.active_connections:
            self.active_connections[session_code].remove(websocket)
            if not self.active_connections[session_code]:
                del self.active_connections[session_code]

    async def send_to_session(self, message: str, session_code: str):
        if session_code in self.active_connections:
            for connection in self.active_connections[session_code]:
                try:
                    await connection.send_text(message)
                except:
                    pass  # Connection might be closed

manager = ConnectionManager()

@router.websocket("/{session_code}")
async def websocket_endpoint(websocket: WebSocket, session_code: str):
    await manager.connect(websocket, session_code)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Broadcast to all clients in this session
            await manager.send_to_session(data, session_code)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_code)