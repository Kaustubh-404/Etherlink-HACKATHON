// lib/socket-service.ts - Fix: Make emit method public
import { type ContractCharacter } from './game-types'
import type { Address } from 'viem'

// Room data interface updated for contract integration
export interface RoomData {
  id: string
  name?: string
  hostId: string
  hostName: string
  hostCharacter?: ContractCharacter
  guestId?: string | null
  guestName?: string
  guestCharacter?: ContractCharacter
  players: string[]
  status: 'waiting' | 'playing' | 'completed'
  maxPlayers: number
  isPrivate: boolean
  createdAt: number
  // Contract-specific fields
  contractMatchId?: number
  stakeAmount?: string
  gameData: {
    currentTurn?: string
    turnCount: number
    winner?: string
    battleLog: string[]
    startTime?: number
    endTime?: number
  }
}

// Mock socket service for development (will be replaced with real WebSocket service)
class MockSocketService {
  private connected: boolean = false
  private playerId: string = ''
  private playerName: string | null = null
  private eventListeners: Map<string, Function[]> = new Map()
  private rooms: Map<string, RoomData> = new Map()
  private availableRooms: RoomData[] = []

  // Connection management
  async connect(): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connected = true
        this.playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        console.log('Mock socket connected with ID:', this.playerId)
        resolve(this.playerId)
      }, 1000)
    })
  }

  disconnect(): void {
    this.connected = false
    this.playerId = ''
    this.eventListeners.clear()
    this.rooms.clear()
    this.availableRooms = []
    console.log('Mock socket disconnected')
  }

  isConnected(): boolean {
    return this.connected
  }

  getPlayerId(): string {
    return this.playerId
  }

  setPlayerName(name: string): void {
    this.playerName = name
  }

  // Event handling
  on(eventName: string, callback: Function): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, [])
    }
    this.eventListeners.get(eventName)?.push(callback)
  }

  off(eventName: string, callback?: Function): void {
    if (!callback) {
      this.eventListeners.delete(eventName)
      return
    }

    const listeners = this.eventListeners.get(eventName)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  // FIX: Make emit method public
  public emit(eventName: string, data: any): void {
    const listeners = this.eventListeners.get(eventName)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error('Error in event listener:', error)
        }
      })
    }
  }

  // Room management
  createRoom(name?: string, isPrivate: boolean = false): void {
    if (!this.connected) {
      throw new Error('Not connected to socket service')
    }

    const roomId = this.generateRoomId()
    const room: RoomData = {
      id: roomId,
      name: name || `${this.playerId}'s Room`,
      hostId: this.playerId,
      hostName: this.playerId,
      players: [this.playerId],
      status: 'waiting',
      maxPlayers: 2,
      isPrivate,
      createdAt: Date.now(),
      gameData: {
        turnCount: 0,
        battleLog: []
      }
    }

    this.rooms.set(roomId, room)
    
    if (!isPrivate) {
      this.availableRooms.push(room)
    }

    // Simulate async response
    setTimeout(() => {
    console.log('Emitting room_created for:', roomId);
    this.emit('room_created', { room })
  }, 100) // Reduced delay
}


  joinRoom(roomId: string): void {
    if (!this.connected) {
      throw new Error('Not connected to socket service')
    }

    const room = this.rooms.get(roomId) || this.availableRooms.find(r => r.id === roomId)
    
    if (!room) {
      setTimeout(() => {
        this.emit('join_room_error', { error: 'Room not found' })
      }, 500)
      return
    }

    if (room.players.length >= room.maxPlayers) {
      setTimeout(() => {
        this.emit('join_room_error', { error: 'Room is full' })
      }, 500)
      return
    }

    if (room.players.includes(this.playerId)) {
      setTimeout(() => {
        this.emit('join_room_error', { error: 'Already in this room' })
      }, 500)
      return
    }

    // Add player to room
    room.players.push(this.playerId)
    room.guestId = this.playerId
    room.guestName = this.playerName || this.playerId // Use actual player name

    // Update room in storage
    this.rooms.set(roomId, room)
    
    // Remove from available rooms if full
    if (room.players.length >= room.maxPlayers) {
      this.availableRooms = this.availableRooms.filter(r => r.id !== roomId)
      room.status = 'playing'
    }

    // Simulate async response
    setTimeout(() => {
      this.emit('room_joined', { room })
      this.emit('player_joined', { 
        playerId: this.playerId, 
        playerName: this.playerName || this.playerId // Use actual player name
      })
    }, 500)
  }

  leaveRoom(roomId: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    // Remove player from room
    room.players = room.players.filter(id => id !== this.playerId)
    
    if (room.guestId === this.playerId) {
      room.guestId = null
      room.guestName = undefined
      room.guestCharacter = undefined
    }

    // If room becomes empty, delete it
    if (room.players.length === 0) {
      this.rooms.delete(roomId)
      this.availableRooms = this.availableRooms.filter(r => r.id !== roomId)
    } else {
      // Update room status
      room.status = 'waiting'
      // Add back to available rooms if not private
      if (!room.isPrivate && !this.availableRooms.find(r => r.id === roomId)) {
        this.availableRooms.push(room)
      }
    }

    this.emit('player_left', { 
      playerId: this.playerId, 
      playerName: this.playerId 
    })
  }

  // Character selection
  selectCharacter(character: ContractCharacter): void {
    this.emit('character_selected', {
      playerId: this.playerId,
      playerName: this.playerId,
      character
    })
  }

  // Game state management
  setPlayerReady(isReady: boolean = true): void {
    this.emit('player_ready_updated', {
      playerId: this.playerId,
      playerName: this.playerId,
      isReady
    })

    // Simulate game start after both players ready
    if (isReady) {
      setTimeout(() => {
        this.emit('game_countdown', { countdown: 3 })
        
        setTimeout(() => {
          this.emit('game_countdown', { countdown: 2 })
          
          setTimeout(() => {
            this.emit('game_countdown', { countdown: 1 })
            
            setTimeout(() => {
              this.emit('game_started', { 
                room: Array.from(this.rooms.values())[0],
                gameData: {
                  currentTurn: this.playerId,
                  turnCount: 1,
                  battleLog: ['Battle started!']
                }
              })
            }, 1000)
          }, 1000)
        }, 1000)
      }, 1000)
    }
  }

  performGameAction(action: any): void {
    // Simulate action processing
    setTimeout(() => {
      this.emit('game_action_performed', {
        playerId: this.playerId,
        action,
        result: {
          ability: action.type === 'ability' ? { 
            name: 'Mock Ability', 
            type: 'fire',
            soundEffect: 'ability.mp3'
          } : null,
          damage: action.type === 'ability' ? 25 : 0
        }
      })
    }, 1000)
  }

  // Utility methods
  async getAvailableRooms(): Promise<RoomData[]> {
    return Promise.resolve(this.availableRooms.filter(room => room.status === 'waiting'))
  }

  private generateRoomId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

// Export singleton instance
export const socketService = new MockSocketService()

// Helper function to check if we should use mock mode
export function shouldUseMockMode(): boolean {
  if (typeof window === 'undefined') return true
  
  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('mock') === 'true') return true
  
  // Check environment
  if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') return true
  
  // Default to mock in development
  return process.env.NODE_ENV === 'development'
}