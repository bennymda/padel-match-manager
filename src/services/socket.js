import { io } from 'socket.io-client';

// Determine connection URL (fallback to port 3001 if on port 3000 in dev)
const socketUrl = window.location.port === '3000'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : window.location.origin;

export const socket = io(socketUrl, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('[Socket] Connected to server:', socket.id);
});

socket.on('disconnect', () => {
  console.log('[Socket] Disconnected from server');
});
