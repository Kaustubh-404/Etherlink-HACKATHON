// components/create-pvp-room.tsx - Enhanced Room Creation for PvP Arena Battles with ETH Staking
"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Copy, Users, Coins, AlertTriangle, Shield, Sword } from "lucide-react"
import { motion } from "framer-motion"
import { useContractMultiplayer } from "./contract-multiplayer-provider"
import { useGameState, type CharacterInstance } from "./game-state-provider"
import { useContract } from "@/hooks/use-contract"
import { useWallet } from "@/hooks/use-wallet"
import { playSound } from "@/lib/sound-utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import TransactionStatus from "./transaction-status"
import GasEstimation from "./gas-estimation"
import { Web3Utils } from "@/lib/Web3-Utils"
import type { Hash } from "viem"

interface CreatePvPRoomProps {
  onBack: () => void
  onRoomCreated: (roomId: string) => void
}

export default function CreatePvPRoom({ onBack, onRoomCreated }: CreatePvPRoomProps) {
  const { 
    playerName, 
    setPlayerName, 
    createRoom, 
    isConnected, 
    isConnecting,
    connect, 
    currentRoom,
    connectionError: contextConnectionError,
    contractMatchId,
    stakeAmount: contractStakeAmount
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
  const [roomName, setRoomName] = useState("")
  const [stakeAmount, setStakeAmount] = useState("0.001")
  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState(0)
  const [arenaCharacter, setArenaCharacter] = useState<CharacterInstance | null>(null)
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [transactionHash, setTransactionHash] = useState<Hash | null>(null)
  const [walletBalance, setWalletBalance] = useState<string>("0")
  const [gasEstimate, setGasEstimate] = useState<string | null>(null)

  // Predefined stake amounts for quick selection
  const stakePresets = ["0.001", "0.005", "0.01", "0.05", "0.1"]

  // Update wallet balance
  useEffect(() => {
    if (address && isWalletReady) {
      try {
        const balance = getFormattedBalance()
        setWalletBalance(balance)
      } catch (err) {
        setWalletBalance("0")
      }
    }
  }, [address, isWalletReady, getFormattedBalance])

  // Estimate gas for contract operations  
  useEffect(() => {
    if (contractConnected && arenaCharacter && stakeAmount) {
      // Get the proper character instance ID - use the actual character ID from owned characters
      let characterInstanceId: number
      
      if (typeof arenaCharacter.id === 'number') {
        characterInstanceId = arenaCharacter.id
      } else {
        // If arenaCharacter.id is not a number, find it in ownedCharacters
        const ownedChar = ownedCharacters.find(char => char.characterTypeName === arenaCharacter.name)
        if (!ownedChar) {
          console.error('Character not found in owned characters:', arenaCharacter.name)
          return
        }
        characterInstanceId = ownedChar.id
      }
      
      console.log('Gas estimation for character instance ID:', characterInstanceId, 'character:', arenaCharacter.name)
      
      // Validate character ID before estimation
      if (typeof characterInstanceId !== 'number' || characterInstanceId <= 0) {
        console.warn('Invalid character instance ID for gas estimation:', characterInstanceId)
        return
      }

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.log('Gas estimation timeout - continuing without estimate')
        setGasEstimate(null)
      }, 10000) // 10 second timeout

      try {
        // Use the validated character instance ID from above
        console.log('Gas estimation using character instance ID:', characterInstanceId, 'for character:', arenaCharacter.name)
        
        estimateGas('initiateMatch', [BigInt(characterInstanceId)], Web3Utils.parseEth(stakeAmount))
          .then(gas => {
            clearTimeout(timeout)
            setGasEstimate(Web3Utils.formatEth(gas))
          })
          .catch((err) => {
            clearTimeout(timeout)
            console.log('Gas estimation failed, continuing without estimate:', err)
            setGasEstimate(null)
          })
      } catch (error) {
        clearTimeout(timeout)
        console.error('Error in gas estimation setup:', error)
        setGasEstimate(null)
      }

      return () => clearTimeout(timeout)
    }
  }, [contractConnected, arenaCharacter, stakeAmount, estimateGas])

  // Check if user has sufficient balance for stake + gas
  const hasEnoughBalance = useCallback(() => {
    if (!walletBalance || !stakeAmount) return false
    const stake = parseFloat(stakeAmount)
    const balance = parseFloat(walletBalance)
    const gasBuffer = 0.002 // Reserve for gas fees
    return balance >= (stake + gasBuffer)
  }, [walletBalance, stakeAmount])

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

  // Refresh contract data when component mounts
  useEffect(() => {
    if (address) {
      refreshContractData()
    }
  }, [address, refreshContractData])

  // Set initial character when owned characters are loaded
  useEffect(() => {
    console.log('CreatePvPRoom: Owned characters loaded:', ownedCharacters.length, ownedCharacters)
    if (ownedCharacters.length > 0 && !arenaCharacter) {
      // Create a proper character object from the owned character instance
      const firstOwnedChar = ownedCharacters[0]
      const arenaChar = {
        id: firstOwnedChar.id,
        name: firstOwnedChar.characterTypeName,
        avatar: `/images/${firstOwnedChar.characterTypeName.toLowerCase().replace(/\s+/g, '-')}.png`,
        health: firstOwnedChar.health,
        mana: firstOwnedChar.mana,
        abilities: [], // Will be populated later
        description: `Level ${firstOwnedChar.level} ${firstOwnedChar.characterTypeName}`,
        contractInstanceId: firstOwnedChar.id,
        characterTypeId: firstOwnedChar.characterTypeId,
        level: firstOwnedChar.level,
        experience: firstOwnedChar.experience
      }
      console.log('Setting initial arena character:', arenaChar)
      setArenaCharacter(arenaChar)
      setSelectedCharacterIndex(0)
    }
  }, [ownedCharacters, arenaCharacter])

  // Show connection error from context
  useEffect(() => {
    if (contextConnectionError && !error) {
      setError(contextConnectionError)
    }
  }, [contextConnectionError, error])

  // This effect is no longer needed since we go directly to arena after contract match creation
  // Keep it commented for reference but it's not used in the new flow

  // Remove the timeout effect since we're now going directly to arena
  // The old timeout logic is no longer needed since we skip room creation

  // Character selection helpers
  const handlePreviousCharacter = () => {
    if (ownedCharacters.length === 0) return
    playSound("button-click.mp3")
    const newIndex = selectedCharacterIndex === 0 ? ownedCharacters.length - 1 : selectedCharacterIndex - 1
    setSelectedCharacterIndex(newIndex)
    
    // Create proper character object
    const ownedChar = ownedCharacters[newIndex]
    const arenaChar = {
      id: ownedChar.id,
      name: ownedChar.characterTypeName,
      avatar: `/images/${ownedChar.characterTypeName.toLowerCase().replace(/\s+/g, '-')}.png`,
      health: ownedChar.health,
      mana: ownedChar.mana,
      abilities: [],
      description: `Level ${ownedChar.level} ${ownedChar.characterTypeName}`,
      contractInstanceId: ownedChar.id,
      characterTypeId: ownedChar.characterTypeId,
      level: ownedChar.level,
      experience: ownedChar.experience
    }
    setArenaCharacter(arenaChar)
  }

  const handleNextCharacter = () => {
    if (ownedCharacters.length === 0) return
    playSound("button-click.mp3")
    const newIndex = selectedCharacterIndex === ownedCharacters.length - 1 ? 0 : selectedCharacterIndex + 1
    setSelectedCharacterIndex(newIndex)
    
    // Create proper character object
    const ownedChar = ownedCharacters[newIndex]
    const arenaChar = {
      id: ownedChar.id,
      name: ownedChar.characterTypeName,
      avatar: `/images/${ownedChar.characterTypeName.toLowerCase().replace(/\s+/g, '-')}.png`,
      health: ownedChar.health,
      mana: ownedChar.mana,
      abilities: [],
      description: `Level ${ownedChar.level} ${ownedChar.characterTypeName}`,
      contractInstanceId: ownedChar.id,
      characterTypeId: ownedChar.characterTypeId,
      level: ownedChar.level,
      experience: ownedChar.experience
    }
    setArenaCharacter(arenaChar)
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

  // Validate stake amount
  const isValidStake = useCallback(() => {
    const stake = parseFloat(stakeAmount)
    return stake > 0 && stake <= 1 // Max 1 ETH stake
  }, [stakeAmount])

  // Handle room creation
  const handleCreateRoom = async () => {
    if (!name.trim()) {
      setError("Please enter your name")
      return
    }

    if (!arenaCharacter) {
      setError("Please select a character for the arena")
      return
    }

    // Ensure we have owned characters loaded
    if (ownedCharacters.length === 0) {
      setError("No owned characters found. Please acquire a character first from the character select screen.")
      return
    }

    if (!isValidStake()) {
      setError("Please enter a valid stake amount (0.001 - 1 ETH)")
      return
    }

    if (!hasEnoughBalance()) {
      setError(`Insufficient balance. You need at least ${parseFloat(stakeAmount) + 0.002} ETH (including gas fees)`)
      return
    }

    const isConnectedNow = await ensureConnection()
    if (!isConnectedNow) return

    if (!contractConnected) {
      setError("Smart contract not connected. Please check your wallet connection.")
      return
    }

    setCreating(true)
    setError(null)

    try {
      // Update player name
      if (name !== playerName) {
        setPlayerName(name)
      }

      console.log('Creating PvP room with stake:', stakeAmount)

      // Create the room with contract integration
      const generatedRoomName = roomName.trim() || `${name}'s Arena`
      
      // Select the character in game state before creating match
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
      
      console.log('Creating contract room with character instance ID:', characterInstanceId, 'for character:', arenaCharacter.name)
      console.log('Available owned characters:', ownedCharacters.map(char => ({ id: char.id, name: char.characterTypeName })))
      
      // Use the contract provider's createRoom method which properly creates the room and initiates the contract
      await createRoom(generatedRoomName, characterInstanceId, stakeAmount, false)
      
      console.log('Contract room created successfully')
      
      setCreating(false)
      setWaiting(false)
      
      // The room is now properly created, navigate to it
      if (currentRoom) {
        onRoomCreated(currentRoom.id)
      } else {
        // Fallback if room isn't immediately available (wait for state update)
        setTimeout(() => {
          if (currentRoom) {
            onRoomCreated(currentRoom.id)
          }
        }, 500)
      }
      
    } catch (err: any) {
      console.error("Room creation failed:", err)
      setError(err.message || "Failed to create room. Please try again.")
      setCreating(false)
    }
  }

  // Copy room ID to clipboard
  const copyRoomId = async () => {
    if (currentRoom?.id) {
      try {
        await navigator.clipboard.writeText(currentRoom.id)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        playSound('button-click.mp3')
      } catch (err) {
        console.error('Failed to copy room ID:', err)
      }
    }
  }

  // Handle back navigation
  const handleBack = () => {
    if (waiting && currentRoom) {
      // If we're waiting in a room, leave it first
      // leaveRoom() // Uncomment if you have this function
    }
    onBack()
  }

  if (waiting && currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/40 backdrop-blur-lg rounded-xl p-8 max-w-md w-full text-center"
        >
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sword className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Arena Created!</h2>
            <p className="text-gray-300">Waiting for an opponent to join...</p>
          </div>

          <Card className="bg-white/10 border-white/20 mb-6">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Room Name:</span>
                  <span className="text-white font-medium">{currentRoom.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Stake:</span>
                  <span className="text-yellow-400 font-bold flex items-center gap-1">
                    <Coins className="w-4 h-4" />
                    {contractStakeAmount || stakeAmount} ETH
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Pool:</span>
                  <span className="text-green-400 font-bold">
                    {(parseFloat(contractStakeAmount || stakeAmount) * 2).toFixed(3)} ETH
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="bg-purple-500/20 rounded-lg p-3">
              <p className="text-sm text-gray-300 mb-2">Share this Room ID:</p>
              <div className="flex items-center gap-2">
                <code className="bg-black/30 text-purple-300 px-2 py-1 rounded text-sm flex-1">
                  {currentRoom.id}
                </code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={copyRoomId}
                  className="shrink-0"
                >
                  {copied ? "Copied!" : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="text-xs text-gray-400 space-y-1">
              <p>• Players: {currentRoom.players.length}/2</p>
              <p>• Both players will stake {contractStakeAmount || stakeAmount} ETH</p>
              <p>• Winner takes the entire {(parseFloat(contractStakeAmount || stakeAmount) * 2).toFixed(3)} ETH pool</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </motion.div>

        {/* Transaction Status */}
        {transactionHash && (
          <div className="absolute top-4 right-4">
            <TransactionStatus 
              hash={transactionHash}
              title="Creating Match..."
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
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Create PvP Arena</h1>
            <p className="text-gray-400">Set up your battle arena with ETH stakes</p>
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
              You need to acquire a character before creating an arena. Visit the character select screen first to acquire your first character.
              <br /><br />
              <strong>Current Status:</strong> You own {ownedCharacters.length} characters
              <br />
              <strong>Debug Info:</strong> Character types available: {contractCharacterTypes.length}
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

          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Arena Name (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g., Elite Battle Arena"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
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
                              src={getCharacterAvatar(arenaCharacter.name)}
                              alt={arenaCharacter.name}
                              className="w-full h-full object-cover rounded-full border-2 border-purple-400"
                            />
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-bold text-white">
                              {arenaCharacter.name}
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

          {/* Stake Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Stake Amount (ETH)
            </label>
            
            {/* Preset Stakes */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {stakePresets.map((preset) => (
                <Button
                  key={preset}
                  variant={stakeAmount === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStakeAmount(preset)}
                  className="text-xs"
                >
                  {preset}
                </Button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="relative">
              <Input
                type="number"
                step="0.001"
                min="0.001"
                max="1"
                placeholder="0.001"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pr-12"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                ETH
              </span>
            </div>

            {/* Balance Info */}
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Your Balance:</span>
                <span>{walletBalance} ETH</span>
              </div>
              <div className="flex justify-between text-yellow-400">
                <span>Total Pool (Both Players):</span>
                <span>{(parseFloat(stakeAmount || "0") * 2).toFixed(3)} ETH</span>
              </div>
              {gasEstimate && (
                <div className="flex justify-between text-gray-400">
                  <span>Est. Gas Fee:</span>
                  <span>{gasEstimate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Battle Info */}
          <Card className="bg-purple-500/20 border-purple-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-purple-300 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Battle Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-300">
              <p>• Turn-based arena combat</p>
              <p>• Both players stake {contractStakeAmount || stakeAmount || "0.001"} ETH</p>
              <p>• Winner takes the entire pool</p>
              <p>• Stakes are held in smart contract</p>
              <p>• Fair play enforced on-chain</p>
            </CardContent>
          </Card>

          {/* Create Button */}
          <Button
            onClick={handleCreateRoom}
            disabled={creating || !isConnected || !contractConnected || !isValidStake() || !hasEnoughBalance() || !arenaCharacter || isLoadingContract || ownedCharacters.length === 0}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-3"
          >
            {creating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Arena...
              </div>
            ) : ownedCharacters.length === 0 ? (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Acquire Character First
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Sword className="w-5 h-5" />
                Create Arena ({stakeAmount} ETH)
              </div>
            )}
          </Button>

          {/* Wallet Info */}
          <div className="text-center text-xs text-gray-400 space-y-1">
            {address ? (
              <>
                <div>Connected: {address.slice(0, 6)}...{address.slice(-4)}</div>
                <div>Owned Characters: {ownedCharacters.length}</div>
                {ownedCharacters.length > 0 && arenaCharacter && (
                  <div className="text-green-400">
                    Selected: {arenaCharacter.name} (ID: {typeof arenaCharacter.id === 'number' ? arenaCharacter.id : 'Loading...'})
                  </div>
                )}
              </>
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