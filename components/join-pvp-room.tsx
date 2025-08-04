// components/join-pvp-room.tsx - Enhanced Room Joining for PvP Arena Battles with ETH Staking
"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Search, Users, Coins, AlertTriangle, Shield, Sword, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"
import { useContractMultiplayer } from "./contract-multiplayer-provider"
import { useGameState, type CharacterInstance } from "./game-state-provider"
import { useContract } from "@/hooks/use-contract"
import { useWallet } from "@/hooks/use-wallet"
import { playSound } from "@/lib/sound-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import TransactionStatus from "./transaction-status"
import GasEstimation from "./gas-estimation"
import { Web3Utils } from "@/lib/Web3-Utils"
import type { Hash } from "viem"

interface JoinPvPRoomProps {
  onBack: () => void
  onRoomJoined: (roomId: string) => void
}

interface AvailableRoom {
  id: string
  name: string
  hostName: string
  stakeAmount: string
  players: number
  maxPlayers: number
  character?: string
  createdAt: number
}

export default function JoinPvPRoom({ onBack, onRoomJoined }: JoinPvPRoomProps) {
  const { 
    playerName, 
    setPlayerName, 
    availableRooms, 
    joinRoom, 
    isConnected, 
    isConnecting,
    connect, 
    currentRoom, 
    connectionError: contextConnectionError
  } = useContractMultiplayer()
  
  const { 
    selectedCharacter, 
    ownedCharacters, 
    contractCharacterTypes,
    isLoadingContract,
    refreshContractData,
    selectContractCharacter 
  } = useGameState()
  const { 
    getFindingMatches, 
    getMatch, 
    joinMatch,
    isConnected: contractConnected,
    estimateGas
  } = useContract()
  const { 
    address, 
    isWalletReady, 
    getFormattedBalance, 
    hasSufficientBalance 
  } = useWallet()
  
  const [name, setName] = useState(playerName)
  const [roomCode, setRoomCode] = useState("")
  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState(0)
  const [arenaCharacter, setArenaCharacter] = useState<CharacterInstance | null>(null)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewingRooms, setViewingRooms] = useState(false)
  const [refreshingRooms, setRefreshingRooms] = useState(false)
  const [availableMatches, setAvailableMatches] = useState<AvailableRoom[]>([])
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)
  const [transactionHash, setTransactionHash] = useState<Hash | null>(null)
  const [walletBalance, setWalletBalance] = useState<string>("0")
  const [gasEstimate, setGasEstimate] = useState<string | null>(null)

  // Update wallet balance
  useEffect(() => {
    // Only run on client side to avoid hydration mismatch
    if (typeof window !== 'undefined' && address && isWalletReady) {
      try {
        const balance = getFormattedBalance()
        setWalletBalance(balance)
      } catch (err) {
        setWalletBalance("0")
      }
    }
  }, [address, isWalletReady, getFormattedBalance])

  // Reset errors when room code changes
  useEffect(() => {
    setError(null)
  }, [roomCode])

  // Ensure connection is established
  const ensureConnection = useCallback(async () => {
    if (!isConnected && !isConnecting) {
      try {
        setError(null)
        await connect()
        return true
      } catch (err) {
        console.error("Failed to connect:", err)
        setError("Failed to connect to game server. Please try again.")
        return false
      }
    }
    return isConnected
  }, [isConnected, isConnecting, connect])

  // Make sure connection is established on mount
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      ensureConnection()
    }
  }, [isConnected, isConnecting, ensureConnection])

  // Show connection error from context
  useEffect(() => {
    if (contextConnectionError && !error) {
      setError(contextConnectionError)
    }
  }, [contextConnectionError, error])

  // Handle successful room join
  useEffect(() => {
    if (currentRoom && joining) {
      setJoining(false)
      playSound('room-joined.mp3')
      onRoomJoined(currentRoom.id)
    }
  }, [currentRoom, joining, onRoomJoined])

  // Refresh available rooms
  const refreshRooms = async () => {
    if (!contractConnected) return

    setRefreshingRooms(true)
    try {
      // Get contract matches that are finding opponents
      const matches = await getFindingMatches("0.001") // Get matches with any stake amount
      
      const rooms: AvailableRoom[] = matches.map((match: any) => ({
        id: `CONTRACT_${match.id}`,
        name: `Arena Battle #${match.id}`,
        hostName: `${match.player1.slice(0, 6)}...${match.player1.slice(-4)}`,
        stakeAmount: Web3Utils.formatEth(match.stake),
        players: 1,
        maxPlayers: 2,
        character: "Unknown", // Could be enhanced to show character info
        createdAt: match.createdAt || Date.now()
      }))

      // Also include socket-based rooms
      const socketRooms: AvailableRoom[] = availableRooms.map(room => ({
        id: room.id,
        name: room.name,
        hostName: room.hostName || "Unknown",
        stakeAmount: room.stakeAmount || "0",
        players: room.players.length,
        maxPlayers: room.maxPlayers,
        character: room.hostCharacter?.name || "Unknown",
        createdAt: room.createdAt
      }))

      setAvailableMatches([...rooms, ...socketRooms])
    } catch (err) {
      console.error('Failed to refresh rooms:', err)
      setError('Failed to load available rooms')
    } finally {
      setRefreshingRooms(false)
    }
  }

  // Auto-refresh rooms when viewing
  useEffect(() => {
    if (viewingRooms) {
      refreshRooms()
      const interval = setInterval(refreshRooms, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [viewingRooms, contractConnected])

  // Refresh contract data when component mounts
  useEffect(() => {
    // Only run on client side to avoid hydration mismatch
    if (typeof window !== 'undefined' && address) {
      refreshContractData()
    }
  }, [address, refreshContractData])

  // Set initial character when owned characters are loaded
  useEffect(() => {
    // Only run on client side after hydration
    if (typeof window !== 'undefined' && ownedCharacters.length > 0 && !arenaCharacter) {
      setArenaCharacter(ownedCharacters[0])
      setSelectedCharacterIndex(0)
    }
  }, [ownedCharacters, arenaCharacter])

  // Character selection helpers
  const handlePreviousCharacter = () => {
    if (ownedCharacters.length === 0) return
    playSound("button-click.mp3")
    const newIndex = selectedCharacterIndex === 0 ? ownedCharacters.length - 1 : selectedCharacterIndex - 1
    setSelectedCharacterIndex(newIndex)
    setArenaCharacter(ownedCharacters[newIndex])
  }

  const handleNextCharacter = () => {
    if (ownedCharacters.length === 0) return
    playSound("button-click.mp3")
    const newIndex = selectedCharacterIndex === ownedCharacters.length - 1 ? 0 : selectedCharacterIndex + 1
    setSelectedCharacterIndex(newIndex)
    setArenaCharacter(ownedCharacters[newIndex])
  }

  const getCharacterAvatar = (characterTypeName: string) => {
    const avatarMap: Record<string, string> = {
      "Chronos": "/images/chronos.png",
      "Pyromancer": "/images/pyromancer.png", 
      "Stormcaller": "/images/stormcaller.png",
      "Time Wraith": "/images/time-wraith.png",
      "Flame Elemental": "/images/flame-elemental.png",
      "Chrono Guardian": "/images/chrono-gaurdian.png"
    }
    return avatarMap[characterTypeName] || "/images/chronos.png"
  }

  // Check if user has sufficient balance for stake
  const canAffordStake = useCallback((stakeAmount: string) => {
    if (!walletBalance) return false
    const stake = parseFloat(stakeAmount)
    const balance = parseFloat(walletBalance)
    const gasBuffer = 0.002 // Reserve for gas fees
    return balance >= (stake + gasBuffer)
  }, [walletBalance])

  // Handle room join by code
  const handleJoinByCode = async () => {
    if (!name.trim()) {
      setError("Please enter your name")
      return
    }

    if (!roomCode.trim()) {
      setError("Please enter a room code")
      return
    }

    if (!arenaCharacter) {
      setError("Please select a character for the arena")
      return
    }

    const isConnectedNow = await ensureConnection()
    if (!isConnectedNow) return

    setJoining(true)
    setError(null)

    try {
      // Update player name
      if (name !== playerName) {
        setPlayerName(name)
      }

      console.log('Joining room with code:', roomCode)

      // Check if it's a contract room
      if (roomCode.startsWith('CONTRACT_')) {
        const matchId = parseInt(roomCode.replace('CONTRACT_', ''))
        
        // Get match details to check stake amount
        const match = await getMatch(matchId)
        if (!match) {
          throw new Error('Match not found')
        }

        const stakeAmount = Web3Utils.formatEth(match.stake)
        
        if (!canAffordStake(stakeAmount)) {
          throw new Error(`Insufficient balance. You need ${stakeAmount} ETH + gas fees`)
        }

        // Select the character in game state before joining match
        await selectContractCharacter(arenaCharacter)
        
        console.log(`Attempting to join match with details:`, {
          matchId,
          characterInstanceId: arenaCharacter.id,
          stakeAmount,
          playerAddress: address
        })
        
        // Get the match details to validate basic requirements
        try {
          const matchDetails = await getMatch(matchId)
          console.log('Match details before joining:', matchDetails)
          
          // Check if trying to join own match
          if (matchDetails.player1.toLowerCase() === address?.toLowerCase()) {
            throw new Error('Cannot join your own match')
          }
          
          // Check stake amount match (convert to wei for comparison)
          const matchStakeWei = matchDetails.stake.toString()
          const ourStakeWei = Web3Utils.parseEth(stakeAmount).toString()
          if (matchStakeWei !== ourStakeWei) {
            throw new Error(`Stake amount mismatch. Match requires ${Web3Utils.formatEth(matchDetails.stake)} ETH, you provided ${stakeAmount} ETH`)
          }
          
          // Note: We don't check match status here as it can change due to race conditions
          // The contract will handle rejecting if match is no longer available
          
        } catch (matchCheckError: any) {
          console.error('Match validation failed:', matchCheckError)
          throw new Error(`Match validation failed: ${matchCheckError.message}`)
        }
        
        // Join contract match
        const txHash = await joinMatch(matchId, arenaCharacter.id, stakeAmount)
        setTransactionHash(txHash)
      }

      // Join the room
      joinRoom(roomCode)
      
    } catch (err: any) {
      console.error("Failed to join room:", err)
      setError(err.message || "Failed to join room. Please check the room code.")
      setJoining(false)
    }
  }

  // Handle room join by selection
  const handleJoinRoom = async (room: AvailableRoom) => {
    if (!name.trim()) {
      setError("Please enter your name")
      return
    }

    if (!arenaCharacter) {
      setError("Please select a character for the arena")
      return
    }

    if (!canAffordStake(room.stakeAmount)) {
      setError(`Insufficient balance. You need ${room.stakeAmount} ETH + gas fees`)
      return
    }

    const isConnectedNow = await ensureConnection()
    if (!isConnectedNow) return

    setJoiningRoomId(room.id)
    setJoining(true)
    setError(null)

    try {
      // Update player name
      if (name !== playerName) {
        setPlayerName(name)
      }

      console.log('Joining room:', room.id)

      // Check if it's a contract room
      if (room.id.startsWith('CONTRACT_')) {
        const matchId = parseInt(room.id.replace('CONTRACT_', ''))
        
        // Select the character in game state before joining match
        await selectContractCharacter(arenaCharacter)
        
        // Get the actual character instance ID from owned characters
        let characterInstanceId: number
        
        if (typeof arenaCharacter.id === 'number') {
          characterInstanceId = arenaCharacter.id
        } else {
          // If arenaCharacter.id is not a number, find it in ownedCharacters  
          const ownedChar = ownedCharacters.find(char => char.characterTypeName === arenaCharacter.name)
          if (!ownedChar) {
            throw new Error(`Character "${arenaCharacter.name}" not found in owned characters. Please acquire this character first.`)
          }
          characterInstanceId = ownedChar.id
        }
        
        console.log('Joining contract match with character instance ID:', characterInstanceId, 'for character:', arenaCharacter.name)
        console.log('Available owned characters:', ownedCharacters.map(char => ({ id: char.id, name: char.characterTypeName })))
        const txHash = await joinMatch(matchId, characterInstanceId, room.stakeAmount)
        setTransactionHash(txHash)
      }

      // Join the room
      joinRoom(room.id)
      
    } catch (err: any) {
      console.error("Failed to join room:", err)
      setError(err.message || "Failed to join room. Please try again.")
      setJoining(false)
      setJoiningRoomId(null)
    }
  }

  if (viewingRooms) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setViewingRooms(false)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Available Arenas</h1>
                <p className="text-gray-400">Join an existing battle arena</p>
              </div>
            </div>
            
            <Button
              onClick={refreshRooms}
              disabled={refreshingRooms}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshingRooms ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6 border-red-500/50 bg-red-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Available Rooms */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableMatches.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Active Arenas</h3>
                <p className="text-gray-500">Create a new arena to start battling!</p>
              </div>
            ) : (
              availableMatches.map((room) => (
                <Card key={room.id} className="bg-black/40 border-white/20 hover:border-purple-500/50 transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-white flex items-center justify-between">
                      <span className="truncate">{room.name}</span>
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{room.players}/{room.maxPlayers}</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Host:</span>
                        <span className="text-white">{room.hostName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Stake:</span>
                        <span className="text-yellow-400 font-bold flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          {room.stakeAmount} ETH
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Pool:</span>
                        <span className="text-green-400 font-bold">
                          {(parseFloat(room.stakeAmount) * 2).toFixed(3)} ETH
                        </span>
                      </div>
                      {room.character && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Character:</span>
                          <span className="text-purple-400">{room.character}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => handleJoinRoom(room)}
                      disabled={joining || joiningRoomId === room.id || !canAffordStake(room.stakeAmount)}
                      className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    >
                      {joiningRoomId === room.id ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Joining...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Sword className="w-4 h-4" />
                          Join Arena
                        </div>
                      )}
                    </Button>

                    {!canAffordStake(room.stakeAmount) && (
                      <p className="text-xs text-red-400 text-center">
                        Insufficient balance
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Transaction Status */}
        {transactionHash && (
          <div className="fixed top-4 right-4">
            <TransactionStatus 
              hash={transactionHash}
              title="Joining Arena..."
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/40 backdrop-blur-lg rounded-xl p-8 max-w-lg w-full"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Join PvP Arena</h1>
            <p className="text-gray-400">Enter a battle arena with ETH stakes</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Connection Status */}
        {!isConnected && !isConnecting && (
          <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Connection Required</AlertTitle>
            <AlertDescription>
              Connecting to game server...
            </AlertDescription>
          </Alert>
        )}

        {/* Character Loading Check */}
        {isLoadingContract && (
          <Alert className="mb-6 border-blue-500/50 bg-blue-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Loading Characters</AlertTitle>
            <AlertDescription>
              Loading your characters from the blockchain...
            </AlertDescription>
          </Alert>
        )}

        {!isLoadingContract && ownedCharacters.length === 0 && (
          <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Characters Available</AlertTitle>
            <AlertDescription>
              You need to acquire a character before joining an arena. Visit the character select screen first.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Player Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Name
            </label>
            <Input
              type="text"
              placeholder="Enter your name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>

          {/* Character Selection */}
          {!isLoadingContract && ownedCharacters.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select Your Champion
              </label>
              
              <Card className="bg-white/10 border-white/20 mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousCharacter}
                      disabled={ownedCharacters.length <= 1}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      ‹
                    </Button>

                    <div className="flex-1 mx-4 text-center">
                      {arenaCharacter && (
                        <div className="space-y-3">
                          <div className="w-20 h-20 mx-auto">
                            <img
                              src={getCharacterAvatar(arenaCharacter.characterTypeName)}
                              alt={arenaCharacter.characterTypeName}
                              className="w-full h-full object-cover rounded-full border-2 border-purple-400"
                            />
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-bold text-white">
                              {arenaCharacter.characterTypeName}
                            </h3>
                            <p className="text-sm text-gray-300">
                              Level {arenaCharacter.level}
                            </p>
                            <div className="flex justify-center gap-4 mt-2 text-xs text-gray-400">
                              <span>❤️ {arenaCharacter.health}</span>
                              <span>💧 {arenaCharacter.mana}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleNextCharacter}
                      disabled={ownedCharacters.length <= 1}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      ›
                    </Button>
                  </div>

                  {ownedCharacters.length > 1 && (
                    <div className="text-center mt-3">
                      <p className="text-xs text-gray-400">
                        {selectedCharacterIndex + 1} of {ownedCharacters.length} characters
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Room Code */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Room Code
            </label>
            <Input
              type="text"
              placeholder="Enter room code..."
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 font-mono"
            />
          </div>

          {/* Join by Code Button */}
          <Button
            onClick={handleJoinByCode}
            disabled={joining || !isConnected || !contractConnected || !arenaCharacter || isLoadingContract}
            className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3"
          >
            {joining && !joiningRoomId ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Joining Arena...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Join by Code
              </div>
            )}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-gray-400 text-sm">OR</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {/* Browse Rooms Button */}
          <Button
            onClick={() => setViewingRooms(true)}
            disabled={!isConnected || !contractConnected || !arenaCharacter || isLoadingContract}
            variant="outline"
            className="w-full border-white/20 text-white hover:bg-white/10 py-3"
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Browse Available Arenas
            </div>
          </Button>

          {/* Balance Info */}
          <Card className="bg-purple-500/20 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Your Balance:</span>
                <span className="text-white font-mono">{walletBalance} ETH</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Make sure you have enough ETH to match the arena stake + gas fees
              </p>
            </CardContent>
          </Card>

          {/* Wallet Info */}
          <div className="text-center text-xs text-gray-400">
            {address ? (
              <span>Connected: {address.slice(0, 6)}...{address.slice(-4)}</span>
            ) : (
              <span>Wallet not connected</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Gas Estimation */}
      {gasEstimate && (
        <div className="absolute bottom-4 right-4">
          <GasEstimation estimate={gasEstimate} />
        </div>
      )}
    </div>
  )
}