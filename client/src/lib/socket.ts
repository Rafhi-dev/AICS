import { io, Socket } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_API_URL
  ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
  : '/';

export const socket: Socket = io(socketUrl, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
});
