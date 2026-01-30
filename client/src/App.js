import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [playerInfo, setPlayerInfo] = useState(null); // { name, isHost, socketId }
  const [lobbyState, setLobbyState] = useState(null);
  const [knowledge, setKnowledge] = useState(null);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
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

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('lobby-update', onLobbyUpdate);
    socket.on('game-started', onGameStarted);
    socket.on('game-reset', onGameReset);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('lobby-update', onLobbyUpdate);
      socket.off('game-started', onGameStarted);
      socket.off('game-reset', onGameReset);
    };
  }, []);

  // View Routing Logic
  let view = <Home setGameState={setLobbyState} setPlayerInfo={setPlayerInfo} />;

  if (lobbyState) {
    if (lobbyState.state === 'waiting') {
      view = <Lobby lobbyState={lobbyState} isHost={playerInfo?.isHost} />;
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
