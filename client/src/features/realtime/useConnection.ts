import { useEffect, useState } from 'react';
import { getSocket } from '../../lib/socket';

export type ConnectionState = 'connecting' | 'live' | 'reconnecting';

/**
 * Owns the socket for a signed-in session and reports its state, so the UI can
 * admit when it is no longer receiving live updates rather than silently showing
 * stale data.
 */
export function useConnection(): ConnectionState {
  const [state, setState] = useState<ConnectionState>(() =>
    getSocket().connected ? 'live' : 'connecting',
  );

  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setState('live');
    const onDisconnect = () => setState('reconnecting');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onDisconnect);
    if (socket.connected) setState('live');
    else socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onDisconnect);
    };
  }, []);

  return state;
}
