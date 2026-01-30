import { io } from 'socket.io-client';

// Change this to your server URL if deployed
const URL = 'http://localhost:3001';

export const socket = io(URL, {
    autoConnect: true,
});
