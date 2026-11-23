import { useEffect, useRef, useState } from 'react';
import { socket } from '../services/socketClient.js';

// Ouvre la connexion au montage et expose l'état de connexion.
export function useSocket() {
  const [connected, setConnected] = useState(socket.connected);
  useEffect(() => {
    const on = () => setConnected(true);
    const off = () => setConnected(false);
    socket.on('connect', on);
    socket.on('disconnect', off);
    if (!socket.connected) socket.connect();
    return () => {
      socket.off('connect', on);
      socket.off('disconnect', off);
    };
  }, []);
  return { connected };
}

// Abonne un composant à un événement du serveur (désabonnement automatique au démontage).
export function useSocketEvent(event, handler) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const fn = (...args) => ref.current(...args);
    socket.on(event, fn);
    return () => socket.off(event, fn);
  }, [event]);
}
