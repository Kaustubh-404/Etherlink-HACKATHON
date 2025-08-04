// components/contract-multiplayer-provider.tsx - Real contract multiplayer provider
'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { type Address } from 'viem'
import { useContract } from '@/hooks/use-contract'
import { playSound } from '@/lib/sound-utils'

interface ContractRoom {
  id: string
  matchId: number
  name: string
  hostAddress: Address
  hostName: string
  guestAddress?: Address
  guestName?: string
  players: Address[]
  status: 'waiting' | 'playing' | 'completed'
  maxPlayers: number
  isPrivate: boolean
  createdAt: number
  stakeAmount: string
  gameData: {
    hostCharacterId?: number
    guestCharacterId?: number
    currentTurn?: Address
    turnCount: number
    battleLog: string[]
    startTime?: number
    endTime?: number
    winner?: Address
  }
}

interface ContractCharacter {
  id: string
  name: string
  avatar: string
  health: number
  mana: number
  abilities: any[]
  description: string
  contractInstanceId: number
  characterTypeId: number
  level: number
  experience: number
  owner: Address
}

interface ContractMultiplayerContextType {
  // Connection state
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  playerAddress: Address | null
  playerName: string

  // Room state
  currentRoom: ContractRoom | null
  availableRooms: ContractRoom[]
  isHost: boolean

  // Contract state
  contractConnected: boolean
  contractMatchId: number | null
  stakeAmount: string

  // Actions
  connect: () => Promise<void>
  disconnect: () => void
  setPlayerName: (name: string) => void
  createRoom: (name?: string, characterInstanceId?: number, stake?: string, isPrivate?: boolean) => Promise<void>
  joinRoom: (roomId: string, characterInstanceId?: number) => void
  leaveRoom: () => void
  selectCharacter: (roomId: string, character: ContractCharacter) => void
  setPlayerReady: (roomId: string, isReady?: boolean) => void
  performGameAction: (roomId: string, action: any) => Promise<void>
  refreshAvailableRooms: () => Promise<void>
}

const ContractMultiplayerContext = createContext<ContractMultiplayerContextType | undefined>(undefined)

export function useContractMultiplayer() {
  const context = useContext(ContractMultiplayerContext)
  if (context === undefined) {
    throw new Error('useContractMultiplayer must be used within a ContractMultiplayerProvider')
  }
  return context
}

export function ContractMultiplayerProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount()
  const { 
    isConnected: contractConnected, 
    initiateMatch, 
    joinMatch, 
    getMatch,
    getFindingMatches 
  } = useContract()

  // Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [playerName, setPlayerNameState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("chronoClash_playerName") || "Anonymous Player"
    }
    return "Anonymous Player"
  })

  // Room state
  const [currentRoom, setCurrentRoom] = useState<ContractRoom | null>(null)
  const [availableRooms, setAvailableRooms] = useState<ContractRoom[]>([])
  const [isHost, setIsHost] = useState(false)

  // Contract state
  const [contractMatchId, setContractMatchId] = useState<number | null>(null)
  const [stakeAmount, setStakeAmountState] = useState<string>('0.001')

  // Save player name to localStorage
  useEffect(() => {
    if (playerName) {
      localStorage.setItem("chronoClash_playerName", playerName)
    }
  }, [playerName])

  // Auto-connect when component mounts
  useEffect(() => {
    if (address && contractConnected && !isConnected) {
      connect()
    }
  }, [address, contractConnected, isConnected])

  // Connection management
  const connect = useCallback(async () => {
    if (!address) {
      throw new Error('No wallet address available')
    }

    setIsConnecting(true)
    setConnectionError(null)

    try {
      console.log('Connecting to contract multiplayer with address:', address)
      setIsConnected(true)
      console.log('Connected to contract multiplayer service')
    } catch (error: any) {
      console.error('Connection failed:', error)
      setConnectionError(error.message || 'Failed to connect')
      throw error
    } finally {
      setIsConnecting(false)
    }
  }, [address])

  const disconnect = useCallback(() => {
    setIsConnected(false)
    setCurrentRoom(null)
    setIsHost(false)
    setContractMatchId(null)
    console.log('Disconnected from contract multiplayer')
  }, [])

  const setPlayerName = useCallback((name: string) => {
    setPlayerNameState(name)
  }, [])

  // Create room using real contract
  const createRoom = useCallback(async (
    name?: string, 
    characterInstanceId: number = 1, 
    stake: string = '0.001', 
    isPrivate: boolean = false
  ) => {
    if (!address || !contractConnected) {
      throw new Error('Contract not connected')
    }

    try {
      console.log('Creating contract match with character:', characterInstanceId, 'stake:', stake)
      
      // Call the real contract to initiate match
      const txHash = await initiateMatch(characterInstanceId, stake)
      console.log('Contract match creation transaction:', txHash)
      
      // Set local state
      setStakeAmountState(stake)
      
      // Create room data for UI
      const matchId = Date.now() % 1000000 // Temporary ID until we get real one from contract
      const room: ContractRoom = {
        id: `CONTRACT_${matchId}`,
        matchId,
        name: name || `${playerName}'s Room`,
        hostAddress: address,
        hostName: playerName,
        players: [address],
        status: 'waiting',
        maxPlayers: 2,
        isPrivate,
        createdAt: Date.now(),
        stakeAmount: stake,
        gameData: {
          hostCharacterId: characterInstanceId,
          turnCount: 0,
          battleLog: ['Contract match created! Waiting for opponent...']
        }
      }

      setCurrentRoom(room)
      setIsHost(true)
      setContractMatchId(matchId)
      
      // Set the character in room data so UI knows character is already selected
      const characterSelectedEvent = new CustomEvent('contract_character_selected', { 
        detail: { 
          characterInstanceId,
          roomId: `CONTRACT_${matchId}`,
          isHost: true
        } 
      })
      window.dispatchEvent(characterSelectedEvent)
      
      // Emit success event for UI
      setTimeout(() => {
        const event = new CustomEvent('room_created', { detail: { room } })
        window.dispatchEvent(event)
      }, 100)
      
    } catch (error: any) {
      console.error('Error creating contract room:', error)
      setTimeout(() => {
        const event = new CustomEvent('create_room_error', { detail: { error: error.message } })
        window.dispatchEvent(event)
      }, 100)
      throw error
    }
  }, [address, contractConnected, initiateMatch, playerName])

  // Join room using real contract
  const joinRoom = useCallback((roomId: string, characterInstanceId: number = 1) => {
    if (!address || !contractConnected) {
      throw new Error('Contract not connected')
    }

    const matchId = parseInt(roomId.replace('CONTRACT_', ''))
    if (isNaN(matchId)) {
      throw new Error('Invalid room ID')
    }

    try {
      console.log('Joining contract match:', matchId, 'with character:', characterInstanceId)
      
      // This would call the real contract joinMatch method
      // For now, we'll emit the join event
      const room: ContractRoom = {
        id: roomId,
        matchId,
        name: `Contract Match ${matchId}`,
        hostAddress: '0x0000000000000000000000000000000000000000' as Address, // Would get from contract
        hostName: 'Host Player',
        guestAddress: address,
        guestName: playerName,
        players: ['0x0000000000000000000000000000000000000000' as Address, address],
        status: 'playing',
        maxPlayers: 2,
        isPrivate: false,
        createdAt: Date.now(),
        stakeAmount: '0.001',
        gameData: {
          guestCharacterId: characterInstanceId,
          turnCount: 1,
          battleLog: ['Player joined! Battle starting...']
        }
      }

      setCurrentRoom(room)
      setIsHost(false)
      console.log('Contract room created and set:', room)
      console.log('Contract currentRoom state after setting:', room.id)
      
      // Set the character in room data so UI knows character is already selected
      const characterSelectedEvent = new CustomEvent('contract_character_selected', { 
        detail: { 
          characterInstanceId,
          roomId,
          isHost: false
        } 
      })
      window.dispatchEvent(characterSelectedEvent)
      
      // Use a longer timeout to ensure state has updated and dispatch the room_joined event
      setTimeout(() => {
        console.log('Dispatching room_joined event for room:', room.id)
        const event = new CustomEvent('room_joined', { detail: { room, roomId: room.id } })
        window.dispatchEvent(event)
      }, 500) // Increased timeout to ensure state update
      
    } catch (error: any) {
      console.error('Error joining room:', error)
      setTimeout(() => {
        const event = new CustomEvent('join_room_error', { detail: { error: error.message } })
        window.dispatchEvent(event)
      }, 100)
    }
  }, [address, contractConnected, playerName])

  const leaveRoom = useCallback(() => {
    setCurrentRoom(null)
    setIsHost(false)
    setContractMatchId(null)
  }, [])

  const selectCharacter = useCallback((roomId: string, character: ContractCharacter) => {
    console.log('Character selected for room:', roomId, 'character:', character.name)
    // Character selection is handled during room creation in contract matches
  }, [])

  const setPlayerReady = useCallback((roomId: string, isReady: boolean = true) => {
    console.log('Player ready state for room:', roomId, 'ready:', isReady)
    // Ready state is automatic in contract matches
  }, [])

  const performGameAction = useCallback(async (roomId: string, action: any) => {
    console.log('Performing game action in room:', roomId, 'action:', action)
    // Would call contract makeMove method
  }, [])

  const refreshAvailableRooms = useCallback(async () => {
    if (!contractConnected) return

    try {
      const findingMatchIds = await getFindingMatches('0.001')
      const rooms: ContractRoom[] = []
      
      for (const matchId of findingMatchIds) {
        // Would get full match details from contract
        const room: ContractRoom = {
          id: `CONTRACT_${matchId}`,
          matchId,
          name: `Contract Match ${matchId}`,
          hostAddress: '0x0000000000000000000000000000000000000000' as Address,
          hostName: 'Host Player',
          players: ['0x0000000000000000000000000000000000000000' as Address],
          status: 'waiting',
          maxPlayers: 2,
          isPrivate: false,
          createdAt: Date.now(),
          stakeAmount: '0.001',
          gameData: {
            turnCount: 0,
            battleLog: ['Match available for joining']
          }
        }
        rooms.push(room)
      }
      
      setAvailableRooms(rooms)
    } catch (error) {
      console.error('Error refreshing available rooms:', error)
    }
  }, [contractConnected, getFindingMatches])

  const value: ContractMultiplayerContextType = {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    playerAddress: address || null,
    playerName,

    // Room state
    currentRoom,
    availableRooms,
    isHost,

    // Contract state
    contractConnected,
    contractMatchId,
    stakeAmount,

    // Actions
    connect,
    disconnect,
    setPlayerName,
    createRoom,
    joinRoom,
    leaveRoom,
    selectCharacter,
    setPlayerReady,
    performGameAction,
    refreshAvailableRooms
  }

  return (
    <ContractMultiplayerContext.Provider value={value}>
      {children}
    </ContractMultiplayerContext.Provider>
  )
} 