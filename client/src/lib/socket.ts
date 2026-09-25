import { io, Socket } from 'socket.io-client';

export const socket: Socket = io('/', {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
});
