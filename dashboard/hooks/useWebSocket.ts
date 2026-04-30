import { useState, useEffect, useCallback } from 'react';

export interface Connection {
  LocalAddr: string;
  RemoteAddr: string;
  Status: string;
  RemotePID: number;
}

export interface Process {
  PID: number;
  Name: string;
  Listening: number[];
  Framework: string;
  GitBranch: string;
  GitDirty: boolean;
  CPU: number;
  Mem: number;
  Connections: Connection[];
}

export function useWebSocket(url: string) {
  const [data, setData] = useState<Process[]>([]);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');

  useEffect(() => {
    let socket: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      socket = new WebSocket(url);

      socket.onopen = () => {
        setStatus('open');
        console.log('Connected to Port Detective Backend');
      };

      socket.onmessage = (event) => {
        try {
          const procs = JSON.parse(event.data) as Process[];
          setData(procs);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      socket.onclose = () => {
        setStatus('closed');
        console.log('WebSocket closed. Reconnecting...');
        reconnectTimeout = setTimeout(connect, 2000);
      };

      socket.onerror = (err) => {
        console.error('WebSocket error:', err);
        socket.close();
      };
    };

    connect();

    return () => {
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [url]);

  return { data, status };
}
