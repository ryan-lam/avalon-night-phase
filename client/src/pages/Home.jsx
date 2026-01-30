import React, { useState } from 'react';
import { socket } from '../socket';

export default function Home({ setGameState, setPlayerInfo }) {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');

    const createLobby = () => {
        console.log('Host Game button clicked', { name });
        if (!name) return setError('Please enter a name');
        console.log('Emitting create-lobby');
        socket.emit('create-lobby', { playerName: name }, (res) => {
            console.log('create-lobby response:', res);
            if (res.success) {
                localStorage.setItem('avalon_session', JSON.stringify({ name, code: res.code, isHost: true }));
                setPlayerInfo({ name, isHost: true, socketId: socket.id }); // Optimistic update
                // The server will emit 'lobby-update' which App.js handles to switch view
            } else {
                setError(res.error);
            }
        });
    };

    const joinLobby = () => {
        if (!name || !code) return setError('Please enter name and code');
        socket.emit('join-lobby', { code, playerName: name }, (res) => {
            if (res.success) {
                localStorage.setItem('avalon_session', JSON.stringify({ name, code, isHost: false }));
                setPlayerInfo({ name, isHost: false, socketId: socket.id });
            } else {
                setError(res.error);
            }
        });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 space-y-8 animate-fade-in">
            <h1 className="text-4xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-avalon-gold to-white">
                AVALON
            </h1>

            <div className="card w-full max-w-sm space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Your Name</label>
                    <input
                        type="text"
                        className="input-field"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                    />
                </div>

                <div className="space-y-4">
                    <button onClick={createLobby} className="btn-primary w-full">
                        HOST GAME
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-600"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-avalon-dark text-gray-400">OR</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <input
                            type="text"
                            className="input-field text-center tracking-widest uppercase"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="ENTER CODE"
                            maxLength={4}
                        />
                        <button onClick={joinLobby} className="w-full py-3 rounded-lg border border-avalon-gold text-avalon-gold hover:bg-avalon-gold hover:text-white transition-colors">
                            JOIN GAME
                        </button>
                    </div>
                </div>
                {error && <p className="text-red-500 text-center text-sm">{error}</p>}
            </div>
        </div>
    );
}
