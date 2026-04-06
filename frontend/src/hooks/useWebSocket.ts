'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Generic WebSocket hook. Returns the latest parsed JSON payload from the
 * socket, or null before the first message / after an error.
 *
 * The socket is re-created whenever `url` changes and torn down on unmount.
 */
export function useWebSocket<T = unknown>(url: string | null): T | null {
  const [data, setData] = useState<T | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!url) {
      setData(null);
      return;
    }

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        setData(JSON.parse(event.data) as T);
      } catch {
        // malformed frame — ignore
      }
    };

    socket.onerror = () => setData(null);

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [url]);

  return data;
}
