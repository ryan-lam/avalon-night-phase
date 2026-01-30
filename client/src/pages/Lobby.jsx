import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { Users, Crown, Copy, Minus, Plus } from 'lucide-react';

export default function Lobby({ lobbyState, isHost }) {
    const [availableRoles, setAvailableRoles] = useState({ Good: [], Evil: [] });
    // Local state for Host interaction, synced from server
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [genericCounts, setGenericCounts] = useState({ 'Minion': 0, 'Servant': 0 });

    // Load available roles on mount
    useEffect(() => {
        socket.emit('get-roles', (roles) => {
            const grouped = { Good: [], Evil: [] };
            roles.forEach(r => {
                if (r.name === 'Minion' || r.name === 'Servant') return; // Handled by counters
                if (grouped[r.alignment]) grouped[r.alignment].push(r);
            });
            setAvailableRoles(grouped);
        });
    }, []);

    // Sync with server state
    useEffect(() => {
        if (lobbyState.config) {
            setSelectedRoles(lobbyState.config.roles || []);
            setGenericCounts(lobbyState.config.genericCounts || { 'Minion': 0, 'Servant': 0 });
        }
    }, [lobbyState.config]);

    // Helper to emit updates (debounced ideally, but direct for now)
    const emitUpdate = (newRoles, newCounts) => {
        if (!isHost) return;
        socket.emit('update-lobby-settings', {
            code: lobbyState.code,
            config: { roles: newRoles, genericCounts: newCounts }
        });
    };

    const toggleRole = (role) => {
        if (!isHost) return;
        let newRoles;
        if (selectedRoles.includes(role)) {
            newRoles = selectedRoles.filter(r => r !== role);
        } else {
            newRoles = [...selectedRoles, role];
        }
        setSelectedRoles(newRoles); // Optimistic
        emitUpdate(newRoles, genericCounts);
    };

    const updateCount = (type, delta) => {
        if (!isHost) return;
        const newCount = Math.max(0, (genericCounts[type] || 0) + delta);
        const newCounts = { ...genericCounts, [type]: newCount };
        setGenericCounts(newCounts);
        emitUpdate(selectedRoles, newCounts);
    };

    const startGame = () => {
        const playerCount = lobbyState.players?.length || 0;
        const totalRoles = selectedRoles.length + genericCounts['Minion'] + genericCounts['Servant'];

        if (playerCount !== totalRoles) {
            alert(`Role count (${totalRoles}) must match player count (${playerCount})`);
            return;
        }
        // We send just the unique roles; server adds generics based on counts in config (or we send here)
        // Actually server implementation creates list from passed roles + counts. 
        // Wait, server `startGame` receives `roles`. If I look at server/index.js: `gameManager.startGame(code, roles);`
        // And gameManager.js: `let allRoles = [...rolesList];` then adds generics from config.
        // So here we pass just `selectedRoles`.
        socket.emit('start-game', { code: lobbyState.code, roles: selectedRoles }, (res) => {
            if (res && !res.success) {
                alert(res.error);
            }
        });
    };

    const copyCode = () => {
        navigator.clipboard.writeText(lobbyState.code);
    };

    const RoleButton = ({ role }) => (
        <button
            onClick={() => toggleRole(role)}
            disabled={!isHost}
            className={`px-3 py-2 text-sm rounded transition-colors border flex-1 text-center whitespace-nowrap ${selectedRoles.includes(role)
                ? 'bg-avalon-gold text-white border-avalon-gold shadow-md'
                : 'border-gray-600 text-gray-400 hover:border-gray-400'
                } ${!isHost && !selectedRoles.includes(role) ? 'opacity-50' : ''}`}
        >
            {role}
        </button>
    );

    return (
        <div className="flex flex-col min-h-screen px-4 py-8 max-w-lg mx-auto">
            {/* Header */}
            <div className="text-center mb-8 relative">
                {!isHost && (
                    <button
                        onClick={() => {
                            if (window.confirm("Are you sure you want to leave?")) {
                                socket.emit('leave-game', { code: lobbyState.code });
                                localStorage.removeItem('avalon_session');
                                window.location.reload();
                            }
                        }}
                        className="absolute left-0 top-1 text-xs text-red-400 hover:text-red-300 border border-red-900/50 bg-red-900/20 px-2 py-1 rounded"
                    >
                        LEAVE
                    </button>
                )}
                <h2 className="text-gray-400 text-sm tracking-widest uppercase mb-2">LOBBY CODE</h2>
                <div className="flex items-center justify-center space-x-3" onClick={copyCode}>
                    <span className="text-6xl font-bold text-avalon-gold tracking-widest">{lobbyState.code}</span>
                    <Copy className="w-6 h-6 text-gray-500 cursor-pointer" />
                </div>
            </div>

            {/* Players List */}
            <div className="card mb-6">
                <h3 className="text-lg font-bold mb-3 flex items-center text-gray-200">
                    <Users className="w-5 h-5 mr-2" /> Players ({lobbyState.players?.length})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {lobbyState.players?.map((p) => (
                        <div key={p.socketId} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                            <div className="flex items-center">
                                {p.isHost && <Crown className="w-3 h-3 text-avalon-gold mr-2" />}
                                <span className={`font-medium text-sm truncate ${!p.connected ? 'text-gray-500 italic' : ''}`}>
                                    {p.name} {!p.connected && '(DC)'}
                                </span>
                            </div>
                            {isHost && !p.isHost && (
                                <button
                                    onClick={() => socket.emit('kick-player', { code: lobbyState.code, targetId: p.socketId })}
                                    className="text-red-500 hover:text-red-400 p-1"
                                    title="Kick Player"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-6">
                {/* Evil Section */}
                <div className="card border-l-4 border-l-red-800">
                    <h3 className="text-lg font-bold mb-3 text-red-400 uppercase tracking-wider">Evil Forces</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {availableRoles.Evil?.map(r => <RoleButton key={r.name} role={r.name} />)}
                    </div>

                    {/* Minion Counter */}
                    <div className="flex items-center justify-between bg-black/20 p-3 rounded-lg">
                        <span className="text-gray-300 font-medium">Minion of Mordred</span>
                        <div className="flex items-center space-x-3">
                            {isHost && <button onClick={() => updateCount('Minion', -1)} className="p-1 bg-gray-700 rounded hover:bg-gray-600"><Minus className="w-4 h-4" /></button>}
                            <span className="text-xl font-bold w-6 text-center">{genericCounts['Minion']}</span>
                            {isHost && <button onClick={() => updateCount('Minion', 1)} className="p-1 bg-gray-700 rounded hover:bg-gray-600"><Plus className="w-4 h-4" /></button>}
                        </div>
                    </div>
                </div>

                {/* Good Section */}
                <div className="card border-l-4 border-l-blue-600">
                    <h3 className="text-lg font-bold mb-3 text-blue-400 uppercase tracking-wider">Servants of Arthur</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {availableRoles.Good?.map(r => <RoleButton key={r.name} role={r.name} />)}
                    </div>

                    {/* Servant Counter */}
                    <div className="flex items-center justify-between bg-black/20 p-3 rounded-lg">
                        <span className="text-gray-300 font-medium">Loyal Servant</span>
                        <div className="flex items-center space-x-3">
                            {isHost && <button onClick={() => updateCount('Servant', -1)} className="p-1 bg-gray-700 rounded hover:bg-gray-600"><Minus className="w-4 h-4" /></button>}
                            <span className="text-xl font-bold w-6 text-center">{genericCounts['Servant']}</span>
                            {isHost && <button onClick={() => updateCount('Servant', 1)} className="p-1 bg-gray-700 rounded hover:bg-gray-600"><Plus className="w-4 h-4" /></button>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Info & Actions */}
            <div className="mt-8 text-center bg-black/40 p-3 rounded-lg backdrop-blur-sm w-full border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-3 px-2">
                    <span className="text-sm text-gray-400">Total Roles:</span>
                    <span className={`text-xl font-bold ${(selectedRoles.length + genericCounts['Minion'] + genericCounts['Servant']) === (lobbyState.players?.length || 0)
                        ? 'text-green-400'
                        : 'text-red-400'
                        }`}>
                        {selectedRoles.length + genericCounts['Minion'] + genericCounts['Servant']} / {lobbyState.players?.length || 0}
                    </span>
                </div>

                {isHost ? (
                    <button onClick={startGame} className="btn-primary w-full shadow-lg">
                        START NIGHT PHASE
                    </button>
                ) : (
                    <div className="text-center text-gray-400 text-xs animate-pulse">
                        Waiting for host to configure game...
                    </div>
                )}
            </div>
        </div>
    );
}
