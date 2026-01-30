import React, { useState } from 'react';
import { socket } from '../socket';
import { Crown } from 'lucide-react';

export default function LeaderSelection({ lobbyState, playerInfo, isHost }) {
    const [selectedLeader2, setSelectedLeader2] = useState(null);

    // Fallback if isHost not passed (but App.js passes it now)
    const amIHost = isHost !== undefined ? isHost : playerInfo?.isHost;
    const leader1Id = lobbyState.leader1;
    const leader1 = lobbyState.players.find(p => p.socketId === leader1Id);

    // Filter potential second leaders (everyone except Leader 1)
    const potentialLeaders = lobbyState.players.filter(p => p.socketId !== leader1Id);

    const confirmSelection = () => {
        if (!selectedLeader2) return;
        socket.emit('set-second-leader', { code: lobbyState.code, leader2Id: selectedLeader2 });
    };

    return (
        <div className="flex flex-col min-h-screen px-4 py-8 max-w-lg mx-auto text-center space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-avalon-gold tracking-widest uppercase">
                Leader Selection
            </h1>

            {/* Leader 1 Display */}
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <p className="text-gray-400 text-sm mb-2 uppercase tracking-wider">First Leader</p>
                <div className="flex items-center justify-center space-x-3">
                    <Crown className="w-8 h-8 text-avalon-gold" />
                    <span className="text-3xl font-bold">{leader1?.name || 'Unknown'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Randomly selected by the game</p>
            </div>

            {/* Selection UI */}
            {amIHost ? (
                <div className="space-y-4">
                    <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
                        <p className="text-blue-200 font-medium">
                            Please select the player sitting to the <span className="font-bold underline">LEFT</span> of {leader1?.name}.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {potentialLeaders.map(p => (
                            <button
                                key={p.socketId}
                                onClick={() => setSelectedLeader2(p.socketId)}
                                className={`p-3 rounded-lg border text-sm font-medium transition-all ${selectedLeader2 === p.socketId
                                    ? 'bg-avalon-gold text-white border-avalon-gold shadow-lg transform scale-105'
                                    : 'bg-white/5 border-gray-600 text-gray-300 hover:border-gray-400'
                                    }`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={confirmSelection}
                        disabled={!selectedLeader2}
                        className={`w-full py-4 mt-8 rounded-lg font-bold text-white shadow-lg transition-all ${!selectedLeader2
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'btn-primary'
                            }`}
                    >
                        CONFIRM SECOND LEADER
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-48 space-y-4">
                    <div className="w-12 h-12 border-4 border-avalon-gold border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 animate-pulse">Waiting for Host to identify the Second Leader...</p>
                </div>
            )}
        </div>
    );
}
