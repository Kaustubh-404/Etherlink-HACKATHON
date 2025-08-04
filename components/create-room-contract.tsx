// components/create-room-contract.tsx - Contract-only room creation with character selection
'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ArrowLeft, Users, Lock, Unlock, Zap, User, Sword } from 'lucide-react'
import { useContractMultiplayer } from './contract-multiplayer-provider'
import { useGameState } from './game-state-provider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import type { CharacterInstance } from '@/lib/Web3-Utils'

interface CreateRoomContractProps {
  onBack: () => void
  onRoomCreated: (roomId: string) => void
}

export default function CreateRoomContract({ onBack, onRoomCreated }: CreateRoomContractProps) {
  const {
    isConnected,
    isConnecting,
    connectionError,
    playerName,
    contractConnected,
    connect,
    createRoom,
    setPlayerName
  } = useContractMultiplayer()

  const { ownedCharacters, isLoadingContract } = useGameState()

  const [roomName, setRoomName] = useState('')
  const [stakeAmount, setStakeAmount] = useState<string>('0.001')
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(playerName)

  // Auto-select first character if available
  useEffect(() => {
    if (ownedCharacters.length > 0 && selectedCharacterId === null) {
      setSelectedCharacterId(ownedCharacters[0].id)
    }
  }, [ownedCharacters, selectedCharacterId])

  // Handle room creation success
  const handleRoomCreated = useCallback((event: Event) => {
    try {
      console.log("handleRoomCreated called in CreateRoomContract component!")
      const e = event as CustomEvent
      console.log("Contract room created successfully:", e.detail)
      
      if (!e.detail?.room?.id) {
        console.error("No room ID received in room_created event")
        setError("Failed to create room. No room ID received.")
        setCreating(false)
        return
      }
      
      const roomId = e.detail.room.id
      console.log(`Contract room created with ID: ${roomId}`)
      
      setCreating(false)
      setWaiting(true)
      
      // Proceed to the room with a short delay
      setTimeout(() => {
        onRoomCreated(roomId)
      }, 500)
    } catch (err) {
      console.error("Error handling room creation success:", err)
      setCreating(false)
      setError("An error occurred while processing the room creation response.")
    }
  }, [onRoomCreated])

  // Handle room creation error
  const handleCreateError = useCallback((event: CustomEvent) => {
    try {
      console.error("Room creation error:", event.detail)
      setCreating(false)
      setError(event.detail?.error || "An error occurred while creating the room.")
    } catch (err) {
      console.error("Error handling room creation error:", err)
      setCreating(false)
      setError("An error occurred while processing the room creation error.")
    }
  }, [])

  // Setup event listeners
  useEffect(() => {
    console.log("Setting up window event listeners in CreateRoomContract component")
    window.addEventListener("room_created", handleRoomCreated)
    window.addEventListener("create_room_error", handleCreateError as EventListener)

    const TIMEOUT = 45000 // 45 seconds for contract operations
    let timeoutId: NodeJS.Timeout | null = null
    
    if (creating) {
      timeoutId = setTimeout(() => {
        console.warn("Contract room creation timeout reached")
        setCreating(false)
        setError("Room creation timed out. Please check your wallet and try again.")
      }, TIMEOUT)
    }

    return () => {
      window.removeEventListener("room_created", handleRoomCreated)
      window.removeEventListener("create_room_error", handleCreateError as EventListener)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [creating, handleRoomCreated, handleCreateError])

  // Auto-connect when component mounts
  useEffect(() => {
    if (!isConnected && !isConnecting && !connectionError) {
      connect().catch(err => {
        console.error("Auto-connect failed:", err)
        setError("Failed to connect to contract service. Please try again.")
      })
    }
  }, [isConnected, isConnecting, connectionError, connect])

  // Handle create room button click
  const handleCreateRoom = useCallback(async () => {
    if (!roomName.trim()) {
      setError("Please enter a room name.")
      return
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      setError("Please enter a valid stake amount.")
      return
    }

    if (!selectedCharacterId) {
      setError("Please select a character for the match.")
      return
    }

    if (!contractConnected) {
      setError("Contract not connected. Please connect your wallet.")
      return
    }

    setError(null)
    setCreating(true)

    try {
      // Update player name if changed
      if (name !== playerName) {
        setPlayerName(name)
      }

      console.log(`Creating contract room with name: ${roomName.trim() || `${name}'s Room`}`)
      console.log(`Selected character ID: ${selectedCharacterId}`)
      
      // Create room using contract service with selected character
      await createRoom(
        roomName.trim() || `${name}'s Room`,
        selectedCharacterId,
        stakeAmount,
        isPrivate
      )
      
    } catch (err: any) {
      console.error("Error creating contract room:", err)
      setCreating(false)
      setError(err.message || "Failed to create room. Please try again.")
    }
  }, [roomName, stakeAmount, isPrivate, selectedCharacterId, contractConnected, name, playerName, setPlayerName, createRoom])

  const canCreateRoom = isConnected && contractConnected && !creating && !waiting && selectedCharacterId !== null
  const selectedCharacter = ownedCharacters.find(char => char.id === selectedCharacterId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-black/20 backdrop-blur-md border-purple-500/30">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-purple-300 hover:text-purple-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <CardTitle className="text-2xl font-bold text-purple-100 mb-2">
            Create Contract Room
          </CardTitle>
          <CardDescription className="text-purple-300">
            Create a blockchain-secured multiplayer room
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertDescription className="text-red-300">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {connectionError && (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertDescription className="text-yellow-300">
                {connectionError}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="player-name" className="text-purple-300">
                Your Name
              </Label>
              <Input
                id="player-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="bg-purple-900/30 border-purple-500/50 text-purple-100 placeholder-purple-400"
                disabled={creating || waiting}
              />
            </div>

            <div>
              <Label htmlFor="room-name" className="text-purple-300">
                Room Name
              </Label>
              <Input
                id="room-name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder={`${name}'s Room`}
                className="bg-purple-900/30 border-purple-500/50 text-purple-100 placeholder-purple-400"
                disabled={creating || waiting}
              />
            </div>

            {/* Character Selection */}
            <div>
              <Label className="text-purple-300 flex items-center mb-3">
                <Sword className="h-4 w-4 mr-2" />
                Select Your Character
              </Label>
              
              {isLoadingContract ? (
                <div className="flex items-center justify-center p-4 bg-purple-900/30 rounded-lg border border-purple-500/50">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin text-purple-300" />
                  <span className="text-purple-300">Loading characters...</span>
                </div>
              ) : ownedCharacters.length === 0 ? (
                <Alert className="border-yellow-500/50 bg-yellow-500/10">
                  <AlertDescription className="text-yellow-300">
                    You don't have any characters yet. Go to Character Select to acquire one first.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-3">
                  {ownedCharacters.map((character) => (
                    <div
                      key={character.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedCharacterId === character.id
                          ? 'border-purple-400 bg-purple-600/30'
                          : 'border-purple-500/30 bg-purple-900/20 hover:border-purple-400/50'
                      }`}
                      onClick={() => setSelectedCharacterId(character.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <User className="h-6 w-6 text-purple-300" />
                          <div>
                            <div className="text-purple-100 font-medium">
                              {character.characterTypeName}
                            </div>
                            <div className="text-purple-400 text-sm">
                              Level {character.level} • HP: {character.health}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-purple-300 border-purple-500/50">
                            ID: {character.id}
                          </Badge>
                          {selectedCharacterId === character.id && (
                            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="stake-amount" className="text-purple-300">
                Stake Amount (ETH)
              </Label>
              <Input
                id="stake-amount"
                type="number"
                step="0.001"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="0.001"
                className="bg-purple-900/30 border-purple-500/50 text-purple-100 placeholder-purple-400"
                disabled={creating || waiting}
              />
              <p className="text-xs text-purple-400 mt-1">
                Both players will stake this amount to join the match
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`border-purple-500/50 ${
                  isPrivate 
                    ? 'bg-purple-600/30 text-purple-100' 
                    : 'bg-transparent text-purple-300'
                } hover:bg-purple-600/50`}
                disabled={creating || waiting}
              >
                {isPrivate ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
                {isPrivate ? 'Private' : 'Public'}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleCreateRoom}
              disabled={!canCreateRoom}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Contract Match...
                </>
              ) : waiting ? (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Waiting for Players...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Create Contract Room
                  {selectedCharacter && (
                    <span className="ml-2 text-purple-200">
                      with {selectedCharacter.characterTypeName}
                    </span>
                  )}
                </>
              )}
            </Button>

            {!contractConnected && (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertDescription className="text-yellow-300">
                  Please connect your wallet to create a contract room.
                </AlertDescription>
              </Alert>
            )}

            {ownedCharacters.length > 0 && (
              <Alert className="border-blue-500/50 bg-blue-500/10">
                <AlertDescription className="text-blue-300 text-sm">
                  💡 <strong>Ready to battle!</strong> Your character will be staked in this contract match. Winner takes both stakes!
                </AlertDescription>
              </Alert>
            )}

            {!isConnected && !isConnecting && (
              <Button
                onClick={connect}
                variant="outline"
                className="w-full border-purple-500/50 text-purple-300 hover:bg-purple-600/20"
              >
                Connect to Contract Service
              </Button>
            )}
          </div>

          {waiting && (
            <div className="text-center text-purple-300 text-sm">
              <p>Room created successfully!</p>
              <p>Redirecting to room...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 