"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Users, Sword, Shield, Heart, Droplet, Clock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useMultiplayer } from "./multiplayer-context-provider"
import { useGameState } from "./game-state-provider"
import { playSound } from "@/lib/sound-utils"
import BattleEffects from "./battle-effects"

interface MultiplayerBattleRoomProps {
  onBack: () => void
  onCharacterSelect: () => void
  onStartBattle: () => void
  onEndBattle: () => void
}

export default function MultiplayerBattleRoom({ onBack, onCharacterSelect, onStartBattle, onEndBattle }: MultiplayerBattleRoomProps) {
  const { 
    isHost, 
    playerId, 
    playerName, 
    currentRoom, 
    leaveRoom, 
    setReady, 
    startBattle 
  } = useMultiplayer()
  
  const { selectedCharacter } = useGameState()
  
  const [playerReady, setPlayerReady] = useState(false)
  const [opponentReady, setOpponentReady] = useState(false)
  const [battleStarting, setBattleStarting] = useState(false)
  const [startCountdown, setStartCountdown] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Get the opponent's data
  const opponentName = isHost 
    ? currentRoom?.guestName || "Waiting for opponent..." 
    : currentRoom?.hostName || "Host"
  
  const opponentCharacter = isHost 
    ? currentRoom?.guestCharacter 
    : currentRoom?.hostCharacter
  
  // Check if player has selected a character
  const hasSelectedCharacter = !!selectedCharacter
  
  // Check if opponent has selected a character
  const opponentHasSelectedCharacter = !!opponentCharacter
  
  // Auto-start when both players have selected characters
  const bothPlayersHaveCharacters = hasSelectedCharacter && opponentHasSelectedCharacter
  const canStartBattle = bothPlayersHaveCharacters

  // Setup event listeners for game state updates
  useEffect(() => {
    const handlePlayerReadyUpdate = (e: CustomEvent) => {
      if (!e.detail) return;
      
      const { playerId: readyPlayerId, isReady } = e.detail;
      
      // If this is the current player
      if (readyPlayerId === playerId) {
        setPlayerReady(isReady);
      } else {
        // This is the opponent
        setOpponentReady(isReady);
      }
    };
    
    const handleGameCountdown = (e: CustomEvent) => {
      if (!e.detail || typeof e.detail.countdown !== 'number') return;
      
      setBattleStarting(true);
      setStartCountdown(e.detail.countdown);
    };
    
    const handleGameStarted = () => {
      // Game has started, transition to battle screen
      onStartBattle();
    };
    
    // Add event listeners (with type assertions)
    window.addEventListener("player_ready_updated", handlePlayerReadyUpdate as EventListener);
    window.addEventListener("game_countdown", handleGameCountdown as EventListener);
    window.addEventListener("game_started", handleGameStarted);
    
    return () => {
      // Clean up event listeners
      window.removeEventListener("player_ready_updated", handlePlayerReadyUpdate as EventListener);
      window.removeEventListener("game_countdown", handleGameCountdown as EventListener);
      window.removeEventListener("game_started", handleGameStarted);
    };
  }, [playerId, onStartBattle]);

  // Start countdown timer
  useEffect(() => {
    if (startCountdown !== null && startCountdown > 0) {
      playSound("countdown.mp3");
      const timer = setTimeout(() => {
        setStartCountdown(startCountdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (startCountdown === 0) {
      playSound("battle-start.mp3");
      // The game_started event should handle transitioning to battle
    }
  }, [startCountdown]);
  
  // Auto-start battle when both players have characters
  useEffect(() => {
    if (bothPlayersHaveCharacters && !battleStarting && !startCountdown) {
      console.log("Both players have characters, auto-starting battle...");
      const timer = setTimeout(() => {
        if (isHost) {
          startBattle();
        }
      }, 2000); // 2 second delay before auto-start
      
      return () => clearTimeout(timer);
    }
  }, [bothPlayersHaveCharacters, battleStarting, startCountdown, isHost, startBattle]);

  // Handle character selection
  const handleSelectCharacter = () => {
    playSound("button-click.mp3");
    onCharacterSelect();
  };

  // Auto-battle will start when both players have characters

  // Handle leave room
  const handleLeaveRoom = () => {
    playSound("button-click.mp3");
    leaveRoom();
    onBack();
  };

  if (!currentRoom) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Room not found</h2>
          <Button onClick={onBack}>Return to Menu</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden"
      style={{
        backgroundImage: `url(https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Apr%2025%2C%202025%2C%2005_52_37%20PM-6IHp4UAeAu7379o8WR2JRyiAuYRvjo.png)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

      {/* Battle Starting Countdown */}
      <AnimatePresence>
        {startCountdown !== null && (
          <motion.div
            key="countdown"
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
          >
            <div className="text-center">
              {startCountdown > 0 ? (
                <motion.div
                  key={startCountdown}
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="text-9xl font-bold text-yellow-400"
                >
                  {startCountdown}
                </motion.div>
              ) : (
                <motion.div
                  key="fight"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  exit={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-8xl font-bold text-red-500"
                >
                  FIGHT!
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mb-8"
      >
        <h1 className="text-4xl font-bold text-center text-yellow-400">Battle Room</h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Users className="text-yellow-400 h-5 w-5" />
          <span className="text-gray-300">Room Code: <span className="text-yellow-400 font-mono">{currentRoom.id}</span></span>
        </div>
        {error && (
          <p className="text-red-400 text-center mt-2">{error}</p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative z-10 bg-black/80 p-8 rounded-lg w-full max-w-4xl mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Your Character */}
          <div className="bg-gray-900/80 rounded-lg p-4 border border-yellow-600/50">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-yellow-400">Your Character</h2>
              <p className="text-gray-400 text-sm">{playerName}</p>
            </div>

            {selectedCharacter ? (
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500 to-amber-700 p-1 mb-3">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-900 flex items-center justify-center">
                    <img
                      src={selectedCharacter.avatar || "/placeholder.svg?height=96&width=96"}
                      alt={selectedCharacter.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-1">{selectedCharacter.name}</h3>
                <p className="text-sm text-gray-400 mb-3">{selectedCharacter.description}</p>
                
                <div className="w-full space-y-2">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <div className="flex items-center">
                        <Heart className="h-3 w-3 text-red-500 mr-1" />
                        <span>HP</span>
                      </div>
                      <span>{selectedCharacter.health}</span>
                    </div>
                    <Progress value={100} className="h-2 bg-gray-700" indicatorClassName="bg-red-500" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <div className="flex items-center">
                        <Droplet className="h-3 w-3 text-blue-500 mr-1" />
                        <span>Mana</span>
                      </div>
                      <span>{selectedCharacter.mana}</span>
                    </div>
                    <Progress value={100} className="h-2 bg-gray-700" indicatorClassName="bg-blue-500" />
                  </div>
                </div>
                
                <div className="mt-4 w-full bg-green-600 py-2 rounded text-center text-white font-medium">
                  Character Selected - Ready for Battle!
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-gray-800 mx-auto flex items-center justify-center mb-4">
                  <Users className="h-10 w-10 text-gray-500" />
                </div>
                <p className="text-gray-400 mb-4">Select a character to begin</p>
                <Button onClick={handleSelectCharacter} className="bg-yellow-600 hover:bg-yellow-700">
                  Select Character
                </Button>
              </div>
            )}
          </div>

          {/* Battle Arena */}
          <div className="bg-gray-900/80 rounded-lg p-4 border border-purple-600/50">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-purple-400">Battle Arena</h2>
              <p className="text-gray-400 text-sm">
                {!hasSelectedCharacter || !opponentHasSelectedCharacter
                  ? "Waiting for both players to select characters"
                  : "Both players ready! Battle starting soon..."}
              </p>
            </div>

            <div className="h-64 relative rounded-lg overflow-hidden bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center">
              {/* Battle area content */}
              {!hasSelectedCharacter || !opponentHasSelectedCharacter ? (
                <div className="text-center text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-2 animate-pulse" />
                  <p>Waiting for players...</p>
                </div>
              ) : (
                <div className="text-center text-red-500">
                  <Shield className="h-16 w-16 mx-auto mb-2 animate-pulse" />
                  <p className="text-xl font-bold">Prepare for combat!</p>
                </div>
              )}

              {/* Opponent's character preview */}
              {opponentHasSelectedCharacter && (
                <div className="absolute top-4 right-4">
                  <div className="w-12 h-12 rounded-full bg-gray-800 border-2 border-red-500 overflow-hidden">
                    <img
                      src={opponentCharacter.avatar || "/placeholder.svg?height=48&width=48"}
                      alt="Opponent"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Your character preview */}
              {selectedCharacter && (
                <div className="absolute bottom-4 left-4">
                  <div className="w-12 h-12 rounded-full bg-gray-800 border-2 border-green-500 overflow-hidden">
                    <img
                      src={selectedCharacter.avatar || "/placeholder.svg?height=48&width=48"}
                      alt={selectedCharacter.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {bothPlayersHaveCharacters && (
                <div className="bg-green-600/20 border border-green-600/50 rounded-lg p-3 text-center">
                  <p className="text-green-400 font-medium">
                    🚀 Battle starting automatically in a few seconds...
                  </p>
                </div>
              )}
              
              <Button 
                onClick={handleLeaveRoom} 
                variant="outline" 
                className="border-red-600 text-red-400 hover:bg-red-900/20"
                disabled={battleStarting}
              >
                Leave Room
              </Button>
            </div>
          </div>

          {/* Opponent */}
          <div className="bg-gray-900/80 rounded-lg p-4 border border-red-600/50">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-red-400">Opponent</h2>
              <p className="text-gray-400 text-sm">
                {opponentName}
              </p>
            </div>

            {opponentHasSelectedCharacter ? (
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-700 p-1 mb-3">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-900 flex items-center justify-center">
                    <img
                      src={opponentCharacter.avatar || "/placeholder.svg?height=96&width=96"}
                      alt="Opponent"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-1">
                  {opponentCharacter.name}
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                  {opponentCharacter.description}
                </p>
                
                <div className="w-full space-y-2">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <div className="flex items-center">
                        <Heart className="h-3 w-3 text-red-500 mr-1" />
                        <span>HP</span>
                      </div>
                      <span>{opponentCharacter.health}</span>
                    </div>
                    <Progress value={100} className="h-2 bg-gray-700" indicatorClassName="bg-red-500" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <div className="flex items-center">
                        <Droplet className="h-3 w-3 text-blue-500 mr-1" />
                        <span>Mana</span>
                      </div>
                      <span>{opponentCharacter.mana}</span>
                    </div>
                    <Progress value={100} className="h-2 bg-gray-700" indicatorClassName="bg-blue-500" />
                  </div>
                </div>
                
                <div className="mt-4 w-full bg-green-600 rounded py-2 text-center text-white font-medium">
                  Character Selected - Ready for Battle!
                </div>
              </div>
            ) : currentRoom.guestId || !isHost ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-gray-800 mx-auto flex items-center justify-center mb-4 animate-pulse">
                  <Users className="h-10 w-10 text-gray-500" />
                </div>
                <p className="text-gray-400">Opponent is selecting a character...</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-gray-800 mx-auto flex items-center justify-center mb-4">
                  <Users className="h-10 w-10 text-gray-500" />
                </div>
                <p className="text-gray-400 mb-4">Waiting for opponent to join...</p>
                <p className="text-sm text-gray-500">Share your room code: <span className="text-yellow-400 font-mono">{currentRoom.id}</span></p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}



