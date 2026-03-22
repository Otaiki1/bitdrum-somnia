import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer, type IncomingMessage } from 'http';
import WebSocket, { Server as WebSocketServer } from 'ws';
import router from './routes';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const WS_REFRESH_MS = Number(process.env.WS_REFRESH_MS || 3000);

app.use(cors());
app.use(express.json());
app.use('/api', router);

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'BitDrum Gateway' });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function resolveFeedPath(searchParams: URLSearchParams) {
  const channel = searchParams.get('channel') || 'markets';

  if (channel === 'leaderboard') {
    return '/api/leaderboard';
  }

  if (channel === 'feed') {
    const type = searchParams.get('type') || 'oracle';
    const address = searchParams.get('address');
    const query = new URLSearchParams({ type });

    if (address) {
      query.set('address', address);
    }

    return `/api/feed?${query.toString()}`;
  }

  if (channel === 'positions') {
    const address = searchParams.get('address');
    if (!address) {
      return null;
    }

    return `/api/positions/${address}`;
  }

  return '/api/markets';
}

wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
  const requestUrl = new URL(request.url || '/ws', `http://${request.headers.host}`);
  const feedPath = resolveFeedPath(requestUrl.searchParams);

  if (!feedPath) {
    socket.send(JSON.stringify({ error: 'Missing required websocket query params' }));
    socket.close();
    return;
  }

  const publish = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}${feedPath}`);
      const payload = await response.json();

      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            channel: requestUrl.searchParams.get('channel') || 'markets',
            payload,
          }),
        );
      }
    } catch (error: any) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            error: error?.message || 'Failed to publish websocket payload',
          }),
        );
      }
    }
  };

  void publish();
  const interval = setInterval(() => {
    void publish();
  }, WS_REFRESH_MS);

  socket.on('close', () => clearInterval(interval));
});

server.listen(PORT, () => {
  console.log(`BitDrum Gateway running on http://localhost:${PORT}`);
});
