import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer, type IncomingMessage } from 'http';
import WebSocket, { Server as WebSocketServer } from 'ws';
import router from './routes';
import { publishInvalidation, subscribeToInvalidations } from './services/realtime';
import { startSomniaReactivityBridge } from './services/reactivity';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const WS_REFRESH_MS = Number(process.env.WS_REFRESH_MS || 60000);
const WS_USE_POLLING_FALLBACK = process.env.WS_USE_POLLING_FALLBACK !== 'false';

// Per-channel in-memory cache: avoids redundant DB round-trips when
// multiple invalidations fire in quick succession and avoids pushing
// unchanged payloads to WebSocket clients.
const CHANNEL_CACHE_TTL_MS = 2000; // minimum ms between re-fetches for the same channel
type ChannelCacheEntry = { payloadStr: string; fetchedAt: number };
const channelCache = new Map<string, ChannelCacheEntry>();

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
  const channelKey = requestUrl.search; // unique key per channel+params combination

  if (!feedPath) {
    socket.send(JSON.stringify({ error: 'Missing required websocket query params' }));
    socket.close();
    return;
  }

  const publish = async (force = false) => {
    try {
      const now = Date.now();
      const cached = channelCache.get(channelKey);

      let payloadStr: string;

      if (!force && cached && now - cached.fetchedAt < CHANNEL_CACHE_TTL_MS) {
        // Re-use cached payload — no DB/REST round-trip needed yet
        payloadStr = cached.payloadStr;
      } else {
        const response = await fetch(`http://127.0.0.1:${PORT}${feedPath}`);
        const payload = await response.json();
        payloadStr = JSON.stringify(payload);
        channelCache.set(channelKey, { payloadStr, fetchedAt: now });
      }

      // Only push to the socket if the payload has actually changed since last
      // time this socket received data, or if this is the initial publish.
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            channel: requestUrl.searchParams.get('channel') || 'markets',
            payload: JSON.parse(payloadStr),
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

  void publish(true); // force fresh data on initial connection
  const unsubscribe = subscribeToInvalidations(() => {
    void publish();
  });

  const interval = WS_USE_POLLING_FALLBACK
    ? setInterval(() => {
        publishInvalidation({
          reason: 'polling-fallback',
          occurredAt: new Date().toISOString(),
        });
      }, WS_REFRESH_MS)
    : null;

  socket.on('close', () => {
    unsubscribe();
    if (interval) {
      clearInterval(interval);
    }
  });
});

server.listen(PORT, async () => {
  console.log(`BitDrum Gateway running on http://localhost:${PORT}`);
  publishInvalidation({
    reason: 'startup',
    occurredAt: new Date().toISOString(),
  });
  await startSomniaReactivityBridge();
});
