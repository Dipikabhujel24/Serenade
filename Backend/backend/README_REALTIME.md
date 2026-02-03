Realtime setup (local development)

1) Install Redis (locally or via Docker). Example using Docker:

   docker run -p 6379:6379 -d redis:7-alpine

2) Set `REDIS_URL` environment variable before starting the server (example on Windows PowerShell):

   $env:REDIS_URL = "redis://127.0.0.1:6379/0"

3) Install Python deps and start Daphne (recommended) or `runserver`:

   python -m pip install -r requirements.txt
   daphne -b 0.0.0.0 -p 8000 backend.asgi:application

4) On the mobile client (Expo):
   - Ensure you are logged in so the `accessToken` is stored in `AsyncStorage`.
   - Open the Notifications screen; it connects to the websocket at `ws://<host>:8000/ws/alerts/?token=<jwt>`.

Notes:
- For Android emulators the mobile client uses host `10.0.2.2` to reach the machine's localhost.
- For production use set a proper `REDIS_URL` and use secure WebSocket (wss) behind TLS.
- If you prefer JWT in headers for WebSocket, we can implement that, but query param is simple for clients.
