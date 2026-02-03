from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.backends import TokenBackend
from channels.db import database_sync_to_async
import urllib.parse


class JwtAuthMiddleware:
    """ASGI middleware to authenticate WebSocket connections using JWT token.

    Accepts token via query string `?token=...`.
    """

    def __init__(self, inner):
        self.inner = inner

    def __call__(self, scope):
        return JwtAuthMiddlewareInstance(scope, self.inner)


class JwtAuthMiddlewareInstance:
    def __init__(self, scope, inner):
        self.scope = dict(scope)
        self.inner = inner

    async def __call__(self, receive, send):
        scope = self.scope
        # default to anonymous
        scope["user"] = AnonymousUser()

        # parse token from query string
        qs = scope.get("query_string", b"").decode()
        params = urllib.parse.parse_qs(qs)
        token_list = params.get("token") or params.get("access")
        token = token_list[0] if token_list else None

        if token:
            try:
                backend = TokenBackend(algorithm=settings.SIMPLE_JWT.get("ALGORITHM", "HS256"))
                validated = backend.decode(token, verify=True)
                user_id = validated.get("user_id") or validated.get("user")
                if user_id:
                    User = get_user_model()
                    user = await database_sync_to_async(User.objects.get)(id=user_id)
                    scope["user"] = user
            except Exception:
                scope["user"] = AnonymousUser()

        inner = self.inner(scope)
        return await inner(receive, send)


def JwtAuthMiddlewareStack(inner):
    return JwtAuthMiddleware(inner)
