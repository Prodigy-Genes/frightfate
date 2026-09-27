from slowapi import Limiter
from slowapi.util import get_remote_address

# Per-IP rate limiting, shared app-wide. Session creation and joining are
# unauthenticated write endpoints, so without this anyone can spam
# sessions/players into the database. Lives in its own module (not app.main)
# to avoid a circular import: main -> routes.game -> limiter.
limiter = Limiter(key_func=get_remote_address, default_limits=[])
