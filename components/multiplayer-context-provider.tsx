// components/multiplayer-context-provider.tsx - Phase 3: Contract Integration
"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { type Character } from "./game-state-provider"
import { socketService, type RoomData } from "@/lib/socket-service"
import { playSound } from "@/lib/sound-utils"
import { useContract } from "@/hooks/use-contract"
import { useAccount } from "wagmi"
import { Web3Utils } from "@/lib/Web3-Utils"

type MultiplayerContextType = {
  // Connection State
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  
  // Player State
  isHost: boolean
  playerId: string
  playerName: string
  
  // Room State
  currentRoom: RoomData | null
  availableRooms: RoomData[]
  
  // Contract Integration
  contractMatchId: number | null
  stakeAmount: string
  
  // Actions
  setPlayerName: (name: string) => void
  connect: () => Promise<void>
  disconnect: () => void
  createRoom: (name?: string, isPrivate?: boolean, stakeAmount?: string) => void
  joinRoom: (roomId: string) => void  
  leaveRoom: () => void
  selectCharacter: (character: Character) => void
  setReady: (isReady?: boolean) => void
  updateOpponentHealth: (health: number) => void
  endBattle: (winnerId: string) => void
  startBattle: () => void
  
  // Contract Battle Actions
  initiateContractMatch: (characterInstanceId: number, stake: string) => Promise<number>
  joinContractMatch: (matchId: number, characterInstanceId: number, stake: string) => Promise<void>
  makeContractMove: (matchId: number, abilityIndex: number) => Promise<void>
}

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined)

export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext)
  if (!context) {
    throw new Error("useMultiplayer must be used within a MultiplayerProvider")
  }
  return context
}

export function MultiplayerProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount()
  const { 
    initiateMatch, 
    joinMatch, 
    makeMove, 
    getMatch,
    isConnected: contractConnected 
  } = useContract()

  // Socket and connection state
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  // Player state
  const [playerId, setPlayerId] = useState<string>("")
  const [playerName, setPlayerName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("chronoClash_playerName") || `Player_${Math.floor(Math.random() * 10000)}`
    }
    return `Player_${Math.floor(Math.random() * 10000)}`
  })
  
  // Room state
  const [isHost, setIsHost] = useState<boolean>(false)
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null)
  const [availableRooms, setAvailableRooms] = useState<RoomData[]>([])
  
  // Contract integration state
  const [contractMatchId, setContractMatchId] = useState<number | null>(null)
  const [stakeAmount, setStakeAmount] = useState<string>("0.01") // Default stake amount
  
  // Save player name to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("chronoClash_playerName", playerName)
    }
  }, [playerName])
  
  // Setup socket event listeners
  const setupSocketListeners = useCallback(() => {
    // Clear existing listeners
    socketService.off('room_created')
    socketService.off('create_room_error')
    socketService.off('room_joined')
    socketService.off('join_room_error')
    socketService.off('player_joined')
    socketService.off('player_left')
    socketService.off('room_updated')
    socketService.off('room_available')
    socketService.off('room_unavailable')
    socketService.off('character_selected')
    socketService.off('player_ready_updated')
    socketService.off('game_countdown')
    socketService.off('game_started')
    socketService.off('game_action_performed')
    socketService.off('game_over')
    socketService.off('contract_match_created')
    socketService.off('contract_match_joined')
    socketService.off('contract_move_made')
    
    // Room creation events
    socketService.on('room_created', (data: any) => {
      console.log("Room created event received:", data)
      const room = data.room
      
      if (!room) {
        console.error("Received room_created event with no room data")
        const errorEvent = new CustomEvent('create_room_error', { 
          detail: { error: "Invalid room data received from server" } 
        })
        window.dispatchEvent(errorEvent)
        return
      }
      
      // Set contract match ID if provided
      if (data.contractMatchId) {
        setContractMatchId(data.contractMatchId)
        room.contractMatchId = data.contractMatchId
      }
      
      setCurrentRoom(room)
      setIsHost(true)
      
      const event = new CustomEvent('room_created', { detail: data })
      window.dispatchEvent(event)
      playSound('room-created.mp3')
    })
    
    socketService.on('create_room_error', (data: any) => {
      console.error('Failed to create room:', data.error)
      const event = new CustomEvent('create_room_error', { detail: data })
      window.dispatchEvent(event)
    })
    
    // Room joining events
    socketService.on('room_joined', (data: any) => {
      console.log("Room joined event received:", data)
      const room = data.room
      
      if (!room) {
        console.error("Received room_joined event with no room data")
        const errorEvent = new CustomEvent('join_room_error', { 
          detail: { error: "Invalid room data received from server" } 
        })
        window.dispatchEvent(errorEvent)
        return
      }
      
      // Set contract match ID if provided
      if (data.contractMatchId) {
        setContractMatchId(data.contractMatchId)
        room.contractMatchId = data.contractMatchId
      }
      
      setCurrentRoom(room)
      setIsHost(room.hostId === playerId)
      
      const event = new CustomEvent('room_joined', { detail: data })
      window.dispatchEvent(event)
      playSound('room-joined.mp3')
    })
    
    socketService.on('join_room_error', (data: any) => {
      console.error('Failed to join room:', data.error)
      const event = new CustomEvent('join_room_error', { detail: data })
      window.dispatchEvent(event)
    })
    
    // Contract-specific events
    socketService.on('contract_match_created', (data: any) => {
      console.log('Contract match created:', data)
      setContractMatchId(data.matchId)
      
      if (currentRoom) {
        setCurrentRoom({
          ...currentRoom,
          contractMatchId: data.matchId,
          stakeAmount: data.stakeAmount
        })
      }
    })
    
    socketService.on('contract_match_joined', (data: any) => {
      console.log('Contract match joined:', data)
      
      if (currentRoom) {
        setCurrentRoom({
          ...currentRoom,
          status: 'playing',
          gameData: {
            ...currentRoom.gameData,
            currentTurn: data.currentTurn,
            turnCount: 1,
            startTime: Date.now(),
            battleLog: ['Contract battle started!']
          }
        })
      }
    })
    
    socketService.on('contract_move_made', (data: any) => {
      console.log('Contract move made:', data)
      
      if (currentRoom) {
        setCurrentRoom({
          ...currentRoom,
          gameData: {
            ...currentRoom.gameData,
            currentTurn: data.currentTurn,
            turnCount: data.turnCount,
            battleLog: [
              ...currentRoom.gameData?.battleLog || [],
              `${data.playerName} made a move with ${data.abilityName}`
            ]
          }
        })
      }
      
      // Dispatch event for battle components
      const event = new CustomEvent('contract_move_performed', { 
        detail: {
          playerId: data.playerId,
          abilityIndex: data.abilityIndex,
          damage: data.damage,
          newHealth: data.newHealth
        }
      })
      window.dispatchEvent(event)
    })
    
    // Player events
    socketService.on('player_joined', (data: any) => {
      console.log('Player joined:', data)
      
      setCurrentRoom(prev => {
        if (!prev) return null
        
        const updatedPlayers = prev.players.includes(data.playerId)
          ? prev.players
          : [...prev.players, data.playerId]
        
        let updatedGuestId = prev.guestId
        let updatedGuestName = prev.guestName
        
        if (!prev.guestId && data.playerId !== prev.hostId) {
          updatedGuestId = data.playerId
          updatedGuestName = data.playerName
        }
        
        return {
          ...prev,
          players: updatedPlayers,
          guestId: updatedGuestId,
          guestName: updatedGuestName
        }
      })
      
      playSound('player-joined.mp3')
    })
    
    socketService.on('player_left', (data: any) => {
      console.log('Player left:', data)
      
      setCurrentRoom(prev => {
        if (!prev) return null
        
        const updatedPlayers = prev.players.filter(id => id !== data.playerId)
        
        let updatedGuestId = prev.guestId
        let updatedGuestName = prev.guestName
        let updatedGuestCharacter = prev.guestCharacter
        
        if (prev.guestId === data.playerId) {
          updatedGuestId = null
          updatedGuestName = undefined
          updatedGuestCharacter = undefined
        }
        
        return {
          ...prev,
          players: updatedPlayers,
          guestId: updatedGuestId,
          guestName: updatedGuestName,
          guestCharacter: updatedGuestCharacter
        }
      })
      
      playSound('player-left.mp3')
    })
    
    // Character selection
    socketService.on('character_selected', (data: any) => {
      console.log('Character selected:', data)
      
      if (!data.character) {
        console.error("Received character_selected event with no character data")
        return
      }
      
      setCurrentRoom(prev => {
        if (!prev) return null
        
        if (data.playerId === prev.hostId) {
          return { ...prev, hostCharacter: data.character }
        } else if (data.playerId === prev.guestId) {
          return { ...prev, guestCharacter: data.character }
        }
        
        return prev
      })
      
      playSound('character-select.mp3')
    })
    
    // Ready status
    socketService.on('player_ready_updated', (data: any) => {
      console.log('Player ready updated:', data)
      
      if (data.isReady) {
        playSound('player-ready.mp3')
      }
      
      const event = new CustomEvent('player_ready_updated', { detail: data })
      window.dispatchEvent(event)
    })
    
    // Game events
    socketService.on('game_countdown', (data: { countdown: number }) => {
      console.log('Game countdown:', data)
      playSound('countdown.mp3')
      
      const event = new CustomEvent('game_countdown', { detail: data })
      window.dispatchEvent(event)
    })
    
    socketService.on('game_started', (data: any) => {
      console.log('Game started:', data)
      
      if (currentRoom && data.room.id === currentRoom.id) {
        setCurrentRoom(data.room)
      }
      
      playSound('battle-start.mp3')
      
      const event = new CustomEvent('game_started', { detail: data })
      window.dispatchEvent(event)
    })
    
    socketService.on('game_over', (data: { winnerId: string, winnerName: string }) => {
      console.log('Game over:', data)
      
      setCurrentRoom(prev => {
        if (!prev) return null
        
        return {
          ...prev,
          status: 'completed',
          gameData: {
            ...prev.gameData,
            winner: data.winnerId,
            endTime: Date.now(),
            battleLog: [
              ...prev.gameData?.battleLog || [],
              `${data.winnerName} wins the battle!`
            ]
          }
        }
      })
      
      if (data.winnerId === playerId) {
        playSound('victory.mp3')
      } else {
        playSound('defeat.mp3')
      }
    })
  }, [currentRoom, playerName, playerId])
  
  // Connect to socket server
  const connect = useCallback(async () => {
    try {
      if (isConnecting) {
        console.log('Already attempting to connect, skipping duplicate call')
        return
      }
      
      setIsConnecting(true)
      setConnectionError(null)
      
      if (socketService.isConnected()) {
        console.log('Already connected to socket server')
        setIsConnected(true)
        const connectedId = socketService.getPlayerId()
        if (connectedId) {
          setPlayerId(connectedId)
        }
        
        const rooms = await socketService.getAvailableRooms()
        setAvailableRooms(rooms || [])
        
        setupSocketListeners()
        setIsConnecting(false)
        return
      }
      
      console.log('Connecting to socket server...')
      
      const id = await socketService.connect()
      console.log(`Connected with ID: ${id}`)
      setPlayerId(id)
      setIsConnected(true)
      
      setupSocketListeners()
      
      const rooms = await socketService.getAvailableRooms()
      setAvailableRooms(rooms || [])
      
    } catch (error: any) {
      console.error('Failed to connect to socket server:', error)
      setConnectionError(error.message || 'Failed to connect to server. Please try again.')
    } finally {
      setIsConnecting(false)
    }
  }, [isConnecting, setupSocketListeners])
  
  // Disconnect from socket server
  const disconnect = useCallback(() => {
    socketService.disconnect()
    setIsConnected(false)
    setPlayerId("")
    setCurrentRoom(null)
    setAvailableRooms([])
    setContractMatchId(null)
  }, [])
  
  // Create room with optional contract integration
  const createRoom = useCallback((name?: string, isPrivate: boolean = false, stake?: string): void => {
    if (!isConnected) {
      connect().then(() => {
        console.log(`Connected, now creating room with name: ${name}`)
        socketService.createRoom(name, isPrivate)
      }).catch(error => {
        console.error("Failed to connect before creating room:", error)
        const errorEvent = new CustomEvent('create_room_error', { 
          detail: { error: "Failed to connect to server. Please try again." } 
        })
        window.dispatchEvent(errorEvent)
      })
      return
    }
    
    if (stake) {
      setStakeAmount(stake)
    }
    
    socketService.createRoom(name, isPrivate)
  }, [isConnected, connect])
  
  // Join room
  const joinRoom = useCallback((roomId: string) => {
    if (!isConnected) {
      connect().then(() => {
        console.log(`Connected, now joining room with ID: ${roomId}`)
        socketService.joinRoom(roomId)
      }).catch(error => {
        console.error("Failed to connect before joining room:", error)
        const errorEvent = new CustomEvent('join_room_error', { 
          detail: { error: "Failed to connect to multiplayer service" } 
        })
        window.dispatchEvent(errorEvent)
      })
    } else {
      socketService.joinRoom(roomId)
    }
  }, [isConnected, connect])
  
  // Leave room
  const leaveRoom = useCallback(() => {
    if (currentRoom && isConnected) {
      socketService.leaveRoom(currentRoom.id)
      setCurrentRoom(null)
      setIsHost(false)
      setContractMatchId(null)
    }
  }, [currentRoom, isConnected])
  
  // Select character
  const selectCharacter = useCallback((character: Character) => {
    if (currentRoom && isConnected) {
      socketService.selectCharacter(character)
      
      setCurrentRoom(prev => {
        if (!prev) return null
        
        if (isHost) {
          return { ...prev, hostCharacter: character }
        } else {
          return { ...prev, guestCharacter: character }
        }
      })
    }
  }, [currentRoom, isConnected, isHost])
  
  // Set ready status
  const setReady = useCallback((isReady: boolean = true) => {
    if (currentRoom && isConnected) {
      socketService.setPlayerReady(isReady)
    }
  }, [currentRoom, isConnected])
  
  // Start battle
  const startBattle = useCallback(() => {
    if (currentRoom && isConnected && isHost) {
      socketService.setPlayerReady(true)
    }
  }, [currentRoom, isConnected, isHost])
  
  // Contract battle functions
  const initiateContractMatch = useCallback(async (characterInstanceId: number, stake: string): Promise<number> => {
    if (!contractConnected || !address) {
      throw new Error('Contract not connected')
    }
    
    try {
      // Validate stake amount
      const validation = Web3Utils.validateStakeAmount(stake)
      if (!validation.isValid) {
        throw new Error(validation.error)
      }
      
      // Initiate match on contract
      const hash = await initiateMatch(characterInstanceId, stake)
      console.log('Contract match initiated:', hash)
      
      // Get the match ID from contract events (simplified - in real implementation would listen to events)
      // For now, return a mock match ID
      const matchId = Date.now() % 1000000 // Simplified for demo
      
      setContractMatchId(matchId)
      setStakeAmount(stake)
      
      // Notify socket service about contract match
      socketService.emit('contract_match_created', {
        matchId,
        stakeAmount: stake,
        characterInstanceId
      })
      
      return matchId
    } catch (error: any) {
      console.error('Error initiating contract match:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }, [contractConnected, address, initiateMatch])
  
  const joinContractMatch = useCallback(async (matchId: number, characterInstanceId: number, stake: string): Promise<void> => {
    if (!contractConnected || !address) {
      throw new Error('Contract not connected')
    }
    
    try {
      // Join match on contract
      const hash = await joinMatch(matchId, characterInstanceId, stake)
      console.log('Contract match joined:', hash)
      
      setContractMatchId(matchId)
      
      // Notify socket service about joining contract match
      socketService.emit('contract_match_joined', {
        matchId,
        characterInstanceId,
        playerId
      })
      
    } catch (error: any) {
      console.error('Error joining contract match:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }, [contractConnected, address, joinMatch, playerId])
  
  const makeContractMove = useCallback(async (matchId: number, abilityIndex: number): Promise<void> => {
    if (!contractConnected || !address) {
      throw new Error('Contract not connected')
    }
    
    try {
      // Make move on contract
      const hash = await makeMove(matchId, abilityIndex)
      console.log('Contract move made:', hash)
      
      // Notify socket service about move
      socketService.emit('contract_move_made', {
        matchId,
        abilityIndex,
        playerId,
        transactionHash: hash
      })
      
    } catch (error: any) {
      console.error('Error making contract move:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }, [contractConnected, address, makeMove, playerId])
  
  // Legacy functions for compatibility
  const updateOpponentHealth = useCallback((health: number) => {
    if (!currentRoom || !isConnected) return
    
    socketService.performGameAction({
      type: 'damage',
      targetHealth: health
    })
  }, [currentRoom, isConnected])
  
  const endBattle = useCallback((winnerId: string) => {
    if (!currentRoom || !isConnected) return
    
    socketService.performGameAction({
      type: 'end_battle',
      winnerId
    })
  }, [currentRoom, isConnected])
  
  // Auto-connect on mount
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      connect().catch(err => {
        console.error("Failed to auto-connect:", err)
      })
    }
    
    return () => {
      // Cleanup listeners on unmount
      socketService.off('room_created')
      socketService.off('create_room_error')
      socketService.off('room_joined')
      socketService.off('join_room_error')
      socketService.off('player_joined')
      socketService.off('player_left')
      socketService.off('room_updated')
      socketService.off('room_available')
      socketService.off('room_unavailable')
      socketService.off('character_selected')
      socketService.off('player_ready_updated')
      socketService.off('game_countdown')
      socketService.off('game_started')
      socketService.off('game_action_performed')
      socketService.off('game_over')
      socketService.off('contract_match_created')
      socketService.off('contract_match_joined')
      socketService.off('contract_move_made')
    }
  }, [isConnected, isConnecting, connect])
  
  return (
    <MultiplayerContext.Provider
      value={{
        // Connection State
        isConnected,
        isConnecting,
        connectionError,
        
        // Player State
        isHost,
        playerId,
        playerName,
        
        // Room State
        currentRoom,
        availableRooms,
        
        // Contract Integration
        contractMatchId,
        stakeAmount,
        
        // Actions
        setPlayerName,
        connect,
        disconnect,
        createRoom,
        joinRoom,
        leaveRoom,
        selectCharacter,
        setReady,
        updateOpponentHealth,
        endBattle,
        startBattle,
        
        // Contract Battle Actions
        initiateContractMatch,
        joinContractMatch,
        makeContractMove
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  )
}