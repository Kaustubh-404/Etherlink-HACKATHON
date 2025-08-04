// components/contract-battle-room.tsx - Contract-based multiplayer battle room
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Users, Sword, Shield, Heart, Droplet, Clock, Zap } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useContractMultiplayer } from "./contract-multiplayer-provider"
import { useGameState } from "./game-state-provider"
import { playSound } from "@/lib/sound-utils"
// import BattleEffects from "./battle-effects" // TODO: Add back when implementing battle animations

interface ContractBattleRoomProps {
  onBack: () => void
  onCharacterSelect: () => void
  onStartBattle: () => void
  onEndBattle: () => void
}

export default function ContractBattleRoom({ onBack, onCharacterSelect, onStartBattle, onEndBattle }: ContractBattleRoomProps) {
  const { 
    isHost,
    playerAddress,
    playerName,
    currentRoom,
    availableRooms,
    contractConnected,
    contractMatchId,
    stakeAmount,
    leaveRoom,
    setPlayerReady,
    selectCharacter
  } = useContractMultiplayer()
  
  const { selectedCharacter } = useGameState()
  
  const [playerReady, setPlayerReadyState] = useState(false)
  const [opponentReady, setOpponentReady] = useState(false)
  const [battleStarting, setBattleStarting] = useState(false)
  const [startCountdown, setStartCountdown] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [contractCharacterSelected, setContractCharacterSelected] = useState(false)
  
  // Get the opponent's data
  const opponentName = isHost 
    ? currentRoom?.guestName || "Waiting for opponent..." 
    : currentRoom?.hostName || "Host"
  
  const isRoomFull = currentRoom?.players.length === 2
  
  // For contract rooms, character is selected during room creation/joining
  const hasSelectedCharacter = contractCharacterSelected || (isHost ? !!currentRoom?.gameData.hostCharacterId : !!currentRoom?.gameData.guestCharacterId)
  
  // Check if opponent has selected a character  
  const opponentHasSelectedCharacter = isHost ? !!currentRoom?.gameData.guestCharacterId : !!currentRoom?.gameData.hostCharacterId
  
  // Auto-start when both players have characters and room is full
  const bothPlayersHaveCharacters = hasSelectedCharacter && opponentHasSelectedCharacter
  const canStartBattle = bothPlayersHaveCharacters && isRoomFull

  // Setup event listeners for game state updates
  useEffect(() => {
    const handleContractCharacterSelected = (event: CustomEvent) => {
      const { characterInstanceId, roomId, isHost: eventIsHost } = event.detail
      
      // If this character selection is for the current player in the current room
      if (roomId === currentRoom?.id && eventIsHost === isHost) {
        setContractCharacterSelected(true)
        console.log('Contract character selected for current player:', characterInstanceId)
      }
    }

    const handlePlayerReadyUpdate = (event: CustomEvent) => {
      const { playerAddress: readyPlayerAddress, isReady } = event.detail
      
      if (readyPlayerAddress === playerAddress) {
        setPlayerReadyState(isReady)
      } else {
        setOpponentReady(isReady)
      }
    }

    const handleGameCountdown = (event: CustomEvent) => {
      const { countdown } = event.detail
      setStartCountdown(countdown)
      setBattleStarting(true)
      
      if (countdown === 0) {
        setTimeout(() => {
          onStartBattle()
        }, 1000)
      }
    }

    const handlePlayerJoined = (event: CustomEvent) => {
      console.log('Player joined the contract room:', event.detail)
      playSound('player-joined.mp3')
    }

    const handlePlayerLeft = (event: CustomEvent) => {
      console.log('Player left the contract room:', event.detail)
      setOpponentReady(false)
      playSound('player-left.mp3')
    }

    window.addEventListener('contract_character_selected', handleContractCharacterSelected as EventListener)
    window.addEventListener('player_ready_updated', handlePlayerReadyUpdate as EventListener)
    window.addEventListener('game_countdown', handleGameCountdown as EventListener)
    window.addEventListener('player_joined', handlePlayerJoined as EventListener)
    window.addEventListener('player_left', handlePlayerLeft as EventListener)

    return () => {
      window.removeEventListener('contract_character_selected', handleContractCharacterSelected as EventListener)
      window.removeEventListener('player_ready_updated', handlePlayerReadyUpdate as EventListener)
      window.removeEventListener('game_countdown', handleGameCountdown as EventListener)
      window.removeEventListener('player_joined', handlePlayerJoined as EventListener)
      window.removeEventListener('player_left', handlePlayerLeft as EventListener)
    }
  }, [playerAddress, onStartBattle, currentRoom?.id, isHost])

  // Auto-start battle when both players have characters and room is full
  useEffect(() => {
    if (canStartBattle && !battleStarting && !startCountdown) {
      console.log("Contract room: Both players ready, auto-starting battle...");
      const timer = setTimeout(() => {
        if (isHost) {
          // Trigger battle start countdown
          const countdownEvent = new CustomEvent('game_countdown', { 
            detail: { countdown: 3 } 
          });
          window.dispatchEvent(countdownEvent);
        }
      }, 2000); // 2 second delay before auto-start
      
      return () => clearTimeout(timer);
    }
  }, [canStartBattle, battleStarting, startCountdown, isHost]);

  // For contract rooms, character is already selected during room creation/joining
  // No need for additional character selection logic

  const handleBack = () => {
    playSound("button-click.mp3")
    if (currentRoom) {
      leaveRoom()
    }
    onBack()
  }

  const handleCharacterSelect = () => {
    playSound("button-click.mp3")
    onCharacterSelect()
  }

  // Auto-battle will start when both players have characters

  // Show error if no room found
  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-300 mb-4">Room Not Found</h1>
          <p className="text-gray-300 mb-6">The contract room you're looking for doesn't exist or has been closed.</p>
          <Button onClick={handleBack} className="bg-purple-600 hover:bg-purple-700">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Menu
          </Button>
        </div>
      </div>
    )
  }

      return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
        {/* <BattleEffects /> TODO: Add back when implementing battle animations */}
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="text-purple-300 hover:text-purple-100"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Leave Room
        </Button>
        
        <div className="text-center">
          <h1 className="text-2xl font-bold text-purple-100">{currentRoom.name}</h1>
          <p className="text-purple-300 flex items-center justify-center">
            <Zap className="mr-2 h-4 w-4" />
            Contract Room - Stake: {stakeAmount} ETH
          </p>
        </div>
        
        <div className="w-24"></div> {/* Spacer for balance */}
      </div>

      {/* Room Status */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="bg-black/20 backdrop-blur-md border border-purple-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-purple-300" />
              <span className="text-purple-300">
                Players: {currentRoom.players.length}/2
              </span>
            </div>
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 text-purple-300" />
              <span className="text-purple-300">Match ID: {contractMatchId}</span>
            </div>
          </div>
          
          <Progress 
            value={(currentRoom.players.length / 2) * 100} 
            className="h-2 bg-purple-900/50"
          />
        </div>
      </div>

      {/* Battle Countdown */}
      <AnimatePresence>
        {startCountdown !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <div className="text-center">
              <motion.div
                key={startCountdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-8xl font-bold text-yellow-400 mb-4"
              >
                {startCountdown === 0 ? "FIGHT!" : startCountdown}
              </motion.div>
              <p className="text-2xl text-purple-300">Battle Starting...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Players */}
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 mb-8">
        {/* Host Player */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/20 backdrop-blur-md border border-purple-500/30 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-purple-100">
              {isHost ? "You (Host)" : currentRoom.hostName}
            </h3>
            <div className="flex items-center">
              <Shield className="mr-2 h-4 w-4 text-yellow-500" />
              <span className="text-yellow-500 text-sm">HOST</span>
            </div>
          </div>
          
          {/* Character Display */}
          <div className="mb-4">
            {hasSelectedCharacter ? (
              <div className="flex items-center p-3 bg-purple-900/30 rounded-lg">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
                  <Sword className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-purple-100">
                    Character Selected
                  </p>
                  <div className="flex items-center text-sm text-purple-300">
                    <span>Contract Character ID: {isHost ? currentRoom.gameData.hostCharacterId : currentRoom.gameData.guestCharacterId}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-900/30 rounded-lg text-center text-gray-400">
                No character selected
              </div>
            )}
          </div>
          
          {/* Ready Status */}
          <div className="flex items-center justify-center">
            {isHost ? (
              <div className={`px-3 py-1 rounded-full text-sm ${
                playerReady ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
              }`}>
                {playerReady ? 'READY' : 'NOT READY'}
              </div>
            ) : (
              <div className={`px-3 py-1 rounded-full text-sm ${
                opponentHasSelectedCharacter ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
              }`}>
                {opponentHasSelectedCharacter ? 'READY' : 'NOT READY'}
              </div>
            )}
          </div>
        </motion.div>

        {/* Guest Player */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/20 backdrop-blur-md border border-purple-500/30 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-purple-100">
              {!isHost ? "You (Guest)" : opponentName}
            </h3>
            {isRoomFull && (
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4 text-blue-500" />
                <span className="text-blue-500 text-sm">GUEST</span>
              </div>
            )}
          </div>
          
          {/* Character Display or Waiting */}
          <div className="mb-4">
            {isRoomFull ? (
              opponentHasSelectedCharacter ? (
                <div className="flex items-center p-3 bg-purple-900/30 rounded-lg">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mr-3">
                    <Sword className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-purple-100">
                      Character Selected
                    </p>
                    <div className="flex items-center text-sm text-purple-300">
                      <span>Contract Character ID: {isHost ? currentRoom.gameData.guestCharacterId : currentRoom.gameData.hostCharacterId}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-900/30 rounded-lg text-center text-gray-400">
                  No character selected
                </div>
              )
            ) : (
              <div className="p-8 bg-gray-900/30 rounded-lg text-center">
                <Users className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">Waiting for opponent to join...</p>
                <p className="text-xs text-gray-500 mt-2">
                  Share room ID: {currentRoom.id}
                </p>
              </div>
            )}
          </div>
          
          {/* Ready Status */}
          <div className="flex items-center justify-center">
            {isRoomFull ? (
              !isHost ? (
                <div className={`px-3 py-1 rounded-full text-sm ${
                  playerReady ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                }`}>
                  {playerReady ? 'READY' : 'NOT READY'}
                </div>
              ) : (
                <div className={`px-3 py-1 rounded-full text-sm ${
                  opponentHasSelectedCharacter ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                }`}>
                  {opponentHasSelectedCharacter ? 'READY' : 'NOT READY'}
                </div>
              )
            ) : (
              <div className="px-3 py-1 rounded-full text-sm bg-gray-600 text-gray-300">
                WAITING
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <div className="max-w-md mx-auto space-y-4">
        {!hasSelectedCharacter && (
          <Button
            onClick={handleCharacterSelect}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3"
          >
            <Sword className="mr-2 h-4 w-4" />
            Select Character
          </Button>
        )}
        
        {hasSelectedCharacter && isRoomFull && (
          <div className="w-full bg-green-600 py-3 rounded text-center text-white font-semibold">
            Character Selected - Ready for Battle!
          </div>
        )}
        
        {canStartBattle && (
          <div className="bg-green-600/20 border border-green-600/50 rounded-lg p-3 text-center">
            <p className="text-green-400 font-medium">
              🚀 Battle starting automatically in a few seconds...
            </p>
          </div>
        )}
      </div>

      {/* Room Info */}
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-black/20 backdrop-blur-md border border-purple-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-purple-100 mb-2">Contract Room Info</h4>
          <div className="space-y-1 text-sm text-purple-300">
            <p>• Room ID: {currentRoom.id}</p>
            <p>• Stake Amount: {stakeAmount} ETH</p>
            <p>• Status: {currentRoom.status.toUpperCase()}</p>
            <p>• Players: {currentRoom.players.length}/2</p>
            {contractMatchId && <p>• Match ID: {contractMatchId}</p>}
          </div>
        </div>
      </div>
    </div>
  )
} 