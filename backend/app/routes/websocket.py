from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any, Optional
import json

from app.services.feed import fate_feed

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.connection_meta: Dict[WebSocket, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, session_code: str):
        await websocket.accept()
        if session_code not in self.active_connections:
            self.active_connections[session_code] = []
        self.active_connections[session_code].append(websocket)
        self.connection_meta[websocket] = {"session_code": session_code}

    def set_player_info(self, websocket: WebSocket, player_id: Any, player_name: str):
        if websocket in self.connection_meta:
            self.connection_meta[websocket]["player_id"] = player_id
            self.connection_meta[websocket]["player_name"] = player_name

    async def disconnect(self, websocket: WebSocket, session_code: str):
        meta = self.connection_meta.pop(websocket, {})
        if session_code in self.active_connections:
            if websocket in self.active_connections[session_code]:
                self.active_connections[session_code].remove(websocket)
            if not self.active_connections[session_code]:
                del self.active_connections[session_code]
        
        player_name = meta.get("player_name")
        if player_name:
            event = fate_feed.record(
                session_code, "player_left", f"{player_name} vanished into the dark.", player_name=player_name
            )
            await self.broadcast_event(session_code, {
                "type": "player_left",
                "player_id": meta.get("player_id"),
                "player_name": player_name,
                "message": f"{player_name} disconnected"
            })
            await self.broadcast_event(session_code, {"type": "feed_event", "event": event})

    async def broadcast_event(self, session_code: str, event_data: dict, exclude: Optional[WebSocket] = None):
        message = json.dumps(event_data)
        if session_code in self.active_connections:
            dead_connections = []
            for connection in list(self.active_connections[session_code]):
                if connection == exclude:
                    continue
                try:
                    await connection.send_text(message)
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                await self.disconnect(dead, session_code)

    async def send_to_session(self, message: str, session_code: str):
        if session_code in self.active_connections:
            dead_connections = []
            for connection in list(self.active_connections[session_code]):
                try:
                    await connection.send_text(message)
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                await self.disconnect(dead, session_code)

manager = ConnectionManager()

@router.websocket("/{session_code}")
async def websocket_endpoint(websocket: WebSocket, session_code: str):
    await manager.connect(websocket, session_code)
    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                message = json.loads(raw_data)
            except json.JSONDecodeError:
                continue

            msg_type = message.get("type", "")

            # Heartbeat ping
            if msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue

            # Player register identification
            if msg_type == "register":
                manager.set_player_info(
                    websocket, 
                    message.get("player_id"), 
                    message.get("player_name", "Unknown")
                )
                # Replay the shared Fate Feed so late joiners see the story so far.
                try:
                    session_code_str = str(session_code)
                    for event in fate_feed.get(session_code_str):
                        await websocket.send_text(json.dumps({"type": "feed_event", "event": event}))
                except Exception:
                    pass
                await manager.broadcast_event(session_code, {
                    "type": "player_registered",
                    "player_id": message.get("player_id"),
                    "player_name": message.get("player_name"),
                }, exclude=websocket)
                continue

            # Standard broadcast to all peers in the room
            await manager.send_to_session(raw_data, session_code)
            
    except WebSocketDisconnect:
        await manager.disconnect(websocket, session_code)
    except Exception:
        await manager.disconnect(websocket, session_code)