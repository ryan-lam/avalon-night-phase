import React, { useState } from 'react';
import { socket } from '../socket';
import { EyeOff, CheckCircle } from 'lucide-react';

export default function Game({ lobbyState, knowledge }) {
    const [revealed, setRevealed] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [hasPeeked, setHasPeeked] = useState(false);

    // Hold to reveal logic
    const handleTouchStart = () => {
        if (!confirmed) {
            setRevealed(true);
            setHasPeeked(true);
        }
    };

    const handleTouchEnd = () => {
        if (!confirmed) setRevealed(false);
    };

    const confirmRead = () => {
        setConfirmed(true);
        setRevealed(false);
        socket.emit('confirm-role', { code: lobbyState.code });
    };

    const resetGame = () => {
        socket.emit('reset-game', { code: lobbyState.code });
    };

    // Check if everyone is ready
    const allReady = lobbyState.players.every(p => p.confirmed);

    return (
        <div className="flex flex-col min-h-screen px-4 py-6 max-w-md mx-auto">
            {/* Top Status */}
            <div className="flex justify-between items-center mb-8">
                <span className="text-gray-400 text-sm">NIGHT PHASE</span>
                <div className="px-3 py-1 bg-white/10 rounded-full text-xs">
                    {lobbyState.players.filter(p => p.confirmed).length}/{lobbyState.players.length} Ready
                </div>
            </div>

            {allReady ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
                    <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.5)]">
                        <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold">Everyone is Ready!</h2>
                    <p className="text-gray-300">Proceed to the first quest.</p>
                    {/* Host controls to reset would go here, or handled physically */}
                    {knowledge && ( // Just verification for the user
                        <button onClick={resetGame} className="mt-8 px-6 py-2 border border-gray-600 rounded text-gray-400 hover:text-white">
                            Reset Game
                        </button>
                    )}
                </div>
            ) : confirmed ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                    <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold">You are Ready</h2>
                    <p className="text-gray-400">Waiting for others...</p>

                    <div className="w-full mt-8 space-y-2">
                        {lobbyState.players.map(p => (
                            <div key={p.socketId} className="flex justify-between items-center bg-white/5 p-3 rounded">
                                <span>{p.name}</span>
                                {p.confirmed ? <CheckCircle className="w-5 h-5 text-green-400" /> : <span className="w-5 h-5 block border-2 border-gray-600 rounded-full"></span>}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    <div
                        className="flex-1 relative mb-6 select-none touch-none"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        onMouseDown={handleTouchStart}
                        onMouseUp={handleTouchEnd}
                    >
                        {/* The Card */}
                        <div className={`w-full h-full rounded-2xl transition-all duration-300 transform ${revealed ? 'bg-avalon-gray' : 'bg-gradient-to-br from-avalon-red to-black'} border border-white/20 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden p-6`}>

                            {!revealed ? (
                                <>
                                    <EyeOff className="w-16 h-16 text-white/50 mb-4 animate-pulse" />
                                    <h2 className="text-2xl font-bold tracking-widest text-white/80">HOLD TO REVEAL</h2>
                                    <p className="text-sm text-center text-white/40 mt-2 px-8">Ensure no one else is looking at your screen</p>
                                </>
                            ) : (
                                <div className="text-center space-y-6 animate-fade-in w-full">
                                    {/* Role Reveal */}
                                    <div>
                                        <p className="text-sm text-gray-400 uppercase tracking-widest mb-1">Your Role</p>
                                        <h1 className={`text-4xl font-extrabold ${knowledge?.alignment === 'Evil' ? 'text-red-500' : 'text-blue-400'}`}>
                                            {knowledge?.role}
                                        </h1>
                                        <p className="text-xs mt-1 px-3 py-1 bg-white/10 rounded-full inline-block">
                                            {knowledge?.alignment}
                                        </p>
                                    </div>

                                    <div className="w-full border-t border-white/10"></div>

                                    {/* Information Reveal */}
                                    <div className="text-left w-full bg-black/20 p-4 rounded-lg">
                                        <p className="text-sm text-gray-400 uppercase tracking-widest mb-3">You See:</p>
                                        {knowledge?.info?.length > 0 ? (
                                            <ul className="space-y-2">
                                                {knowledge.info.map((item, idx) => (
                                                    <li key={idx} className="flex items-center space-x-2">
                                                        <span className="font-bold text-white">{item.name}</span>
                                                        <span className="text-gray-400 text-sm">is</span>
                                                        <span className={`font-bold ${item.role === 'Evil' ? 'text-red-400' : 'text-blue-300'}`}>
                                                            {item.role}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-gray-500 italic">You see nothing meaningful.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={confirmRead}
                        disabled={!hasPeeked || confirmed}
                        className={`w-full py-4 rounded-lg font-bold text-white shadow-lg transition-all ${!hasPeeked || confirmed
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 transform active:scale-95'
                            }`}
                    >
                        CONFIRM & HIDE
                    </button>
                </>
            )}
        </div>
    );
}
