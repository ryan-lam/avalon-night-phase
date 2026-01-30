import { io } from 'socket.io-client';

// Use environment variable for production (Vercel) or default to same origin (for unified deployment/dev)
const URL = process.env.REACT_APP_SERVER_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '/');

export const socket = io(URL, {
    autoConnect: true
});
