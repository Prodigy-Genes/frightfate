"""Fate Feed: a shared, lightweight narrative view for every session.

Each room keeps an in-memory, bounded list of narrative events (players
joining, deaths, final verdicts). Events are broadcast over WebSocket as
``feed_event`` messages and can also be fetched via ``GET /api/game/feed/{code}``
so late joiners / returning spectators can replay the story so far.

This is deliberately in-memory and per-process: sessions are short party games,
and the source of truth for player state remains the database.
"""

import time
from collections import deque
from threading import Lock
from typing import Any, Dict, List

_MAX_EVENTS_PER_SESSION = 60


class FateFeed:
    """Per-session ring buffer of narrative events with monotonic sequence ids."""

    def __init__(self) -> None:
        self._events: Dict[str, deque] = {}
        self._seq = 0
        self._lock = Lock()

    def record(self, session_code: str, event_type: str, message: str, **data: Any) -> dict:
        """Append an event to a session's feed and return it."""
        with self._lock:
            self._seq += 1
            event = {
                "seq": self._seq,
                "type": event_type,
                "message": message,
                "ts": int(time.time()),
                **data,
            }
            self._events.setdefault(session_code, deque(maxlen=_MAX_EVENTS_PER_SESSION)).append(event)
        return event

    def get(self, session_code: str, after_seq: int = 0) -> List[dict]:
        """Events newer than ``after_seq`` (for incremental polling)."""
        with self._lock:
            return [e for e in self._events.get(session_code, deque()) if e["seq"] > after_seq]


fate_feed = FateFeed()
