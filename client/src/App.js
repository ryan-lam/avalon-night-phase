import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import LeaderSelection from './pages/LeaderSelection';

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [playerInfo, setPlayerInfo] = useState(null); // { name, isHost, socketId }
  const [lobbyState, setLobbyState] = useState(null);
  const [knowledge, setKnowledge] = useState(null);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      // Auto-rejoin attempt
      const session = localStorage.getItem('avalon_session');
      if (session) {
        try {
          const { name, code, isHost } = JSON.parse(session);
          socket.emit('join-lobby', { code, playerName: name }, (res) => {
            if (res.success) {
              setPlayerInfo({ name, isHost, socketId: socket.id });
              // If game already started, we might need to request game state explicitly? 
              // actually join-lobby returns 'lobby' and triggers 'lobby-update'. 
              // But if game started, we also need 'game-started' event for knowledge.
              if (res.lobby.state === 'night_phase') {
                // We rely on server sending knowledge, but join-lobby currently doesn't trigger knowledge send. 
                // It only emits lobby-update. 
                // Let's rely on server sending game-started if we rejoin a running game.
              }
            }
          });
        } catch (e) {
          console.error("Rejoin failed", e);
        }
      }
    }
    function onDisconnect() {
      setIsConnected(false);
    }

    function onLobbyUpdate(newLobbyState) {
      setLobbyState(newLobbyState);
    }

    function onGameStarted(playerKnowledge) {
      setKnowledge(playerKnowledge);
      // Lobby state update usually comes separately or we can rely on state inside lobbyState
    }

    function onGameReset() {
      setKnowledge(null);
    }

    function onKicked() {
      setLobbyState(null);
      setPlayerInfo(null);
      setKnowledge(null);
      localStorage.removeItem('avalon_session');
      alert("You have been kicked from the lobby.");
      window.location.reload(); // Force reload to clear all state and return to Home
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('lobby-update', onLobbyUpdate);
    socket.on('game-started', onGameStarted);
    socket.on('game-reset', onGameReset);
    socket.on('kicked', onKicked);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('lobby-update', onLobbyUpdate);
      socket.off('game-started', onGameStarted);
      socket.off('game-reset', onGameReset);
      socket.off('kicked', onKicked);
    };
  }, []);

  // View Routing Logic
  let view = <Home setPlayerInfo={setPlayerInfo} />;

  if (lobbyState) {
    if (lobbyState.state === 'waiting') {
      view = <Lobby lobbyState={lobbyState} isHost={playerInfo?.isHost} />;
    } else if (lobbyState.state === 'leader_selection') {
      view = <LeaderSelection lobbyState={lobbyState} playerInfo={playerInfo} />;
    } else if (lobbyState.state === 'night_phase') {
      view = <Game lobbyState={lobbyState} knowledge={knowledge} />;
    }
  }

  return (
    <div className="min-h-screen bg-avalon-dark text-white font-sans selection:bg-avalon-gold selection:text-black">
      {!isConnected && (
        <div className="fixed top-0 left-0 w-full bg-avalon-red text-white text-center text-xs py-1 z-50">
          Connecting to server...
        </div>
      )}
      {view}
    </div>
  );
}

export default App;
