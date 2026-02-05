from channels.generic.websocket import AsyncJsonWebsocketConsumer
import logging

logger = logging.getLogger(__name__)

class AlertsConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        # Subscribe connection to a global "alerts" group and user-specific group when available.
        await self.channel_layer.group_add("alerts", self.channel_name)
        await self.channel_layer.group_add("community_alerts", self.channel_name)

        user = self.scope.get("user")
        if user and getattr(user, "is_authenticated", False):
            user_group = f"user_{user.id}"
            await self.channel_layer.group_add(user_group, self.channel_name)

        await self.accept()
        logger.info("WebSocket connected: %s user=%s", self.channel_name, getattr(user, 'id', None))

    async def disconnect(self, code):
        await self.channel_layer.group_discard("alerts", self.channel_name)
        await self.channel_layer.group_discard("community_alerts", self.channel_name)
        user = self.scope.get("user")
        if user and getattr(user, "is_authenticated", False):
            user_group = f"user_{user.id}"
            await self.channel_layer.group_discard(user_group, self.channel_name)
        logger.info("WebSocket disconnected: %s user=%s", self.channel_name, getattr(user, 'id', None))

    async def alert_message(self, event):
        # Receives messages sent to the group
        await self.send_json(event.get("data", {}))

    async def community_alert(self, event):
        # Receives community alert broadcasts
        await self.send_json(event.get("data", {}))
