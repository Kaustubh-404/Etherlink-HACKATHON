// lib/contract-multiplayer-service.ts - Real contract-only multiplayer service
import type { Address } from 'viem'
import { ContractService } from './contract-service'
import { Web3Utils, type Match, MatchStatus, type CharacterInstance } from './Web3-Utils'

export interface ContractRoom {
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

export interface ContractCharacter {
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

class ContractMultiplayerService {
  private contractService: ContractService
  private connectedAddress: Address | null = null
  private eventListeners: Map<string, Function[]> = new Map()
  private pollingInterval: NodeJS.Timeout | null = null

  constructor(contractService: ContractService) {
    this.contractService = contractService
  }

  // Connection management
  async connect(address: Address): Promise<Address> {
    this.connectedAddress = address
    console.log('Connected to contract multiplayer with address:', address)
    
    // Start polling for contract updates
    this.startPolling()
    
    return address
  }

  disconnect(): void {
    this.connectedAddress = null
    this.eventListeners.clear()
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    
    console.log('Disconnected from contract multiplayer')
  }

  isConnected(): boolean {
    return this.connectedAddress !== null
  }

  getPlayerAddress(): Address | null {
    return this.connectedAddress
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

  private emit(eventName: string, data: any): void {
    const listeners = this.eventListeners.get(eventName)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error('Error in contract event listener:', error)
        }
      })
    }
  }

  // Contract polling to simulate real-time updates
  private startPolling(): void {
    if (this.pollingInterval) return
    
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollContractUpdates()
      } catch (error) {
        console.error('Error polling contract updates:', error)
      }
    }, 5000) // Poll every 5 seconds
  }

  private async pollContractUpdates(): Promise<void> {
    if (!this.connectedAddress) return
    
    try {
      // Get finding matches (available rooms) - using default stake amount for polling
      const findingMatchIds = await this.contractService.getFindingMatches('0.001')
      
      // Get full match details for each ID
      const availableRooms: ContractRoom[] = []
      for (const matchId of findingMatchIds) {
        try {
          const match = await this.contractService.getMatch(matchId)
          if (match) {
            availableRooms.push(this.convertMatchToRoom(match))
          }
        } catch (error) {
          console.error('Error getting match details for ID:', matchId, error)
        }
      }
      
      this.emit('available_rooms_updated', { rooms: availableRooms })
      
    } catch (error) {
      console.error('Error polling contract updates:', error)
    }
  }

  // Convert contract Match to ContractRoom
  private convertMatchToRoom(match: Match): ContractRoom {
    const isHost = match.player1 === this.connectedAddress
    const hasGuest = match.player2 !== '0x0000000000000000000000000000000000000000'
    
    return {
      id: `CONTRACT_${match.id}`,
      matchId: match.id,
      name: `Contract Match ${match.id}`,
      hostAddress: match.player1,
      hostName: `Player_${match.player1.slice(-4)}`,
      guestAddress: hasGuest ? match.player2 : undefined,
      guestName: hasGuest ? `Player_${match.player2.slice(-4)}` : undefined,
      players: hasGuest ? [match.player1, match.player2] : [match.player1],
      status: match.status === 0 ? 'waiting' : match.status === 1 ? 'playing' : 'completed',
      maxPlayers: 2,
      isPrivate: false, // Contract matches are public by default
      createdAt: Number(match.lastMoveTimestamp) * 1000,
      stakeAmount: Web3Utils.formatEth(match.stake),
      gameData: {
        currentTurn: match.currentTurn,
        turnCount: match.turnCount,
        battleLog: [`Match ${match.id} - Stake: ${Web3Utils.formatEth(match.stake)} ETH`],
        winner: match.winner !== '0x0000000000000000000000000000000000000000' ? match.winner : undefined
      }
    }
  }

  // Room management
  async createRoom(name: string, characterInstanceId: number, stake: string, isPrivate: boolean = false): Promise<string> {
    if (!this.connectedAddress) {
      throw new Error('Not connected to contract service')
    }

    try {
      console.log('Creating contract match with character ID:', characterInstanceId, 'stake:', stake)
      
      // Ensure player owns the character
      const playerProfile = await this.contractService.getPlayerProfile(this.connectedAddress)
      
      if (!playerProfile.ownedCharacterInstances.includes(characterInstanceId)) {
        throw new Error(`You don't own character instance ${characterInstanceId}`)
      }
      
      // Create match on contract
      const txHash = await this.contractService.initiateMatch(characterInstanceId, stake)
      console.log('Contract match creation transaction:', txHash)
      
      // Wait for transaction to be mined and get the match ID
      // In a real implementation, we would listen to contract events to get the actual match ID
      // For now, we'll poll to find the new match
      await this.waitForNewMatch()
      
      return 'match_creating' // Return placeholder while waiting for contract confirmation
      
    } catch (error: any) {
      console.error('Error creating contract room:', error)
      this.emit('create_room_error', { error: error.message || 'Failed to create contract match' })
      throw error
    }
  }

  private async waitForNewMatch(): Promise<void> {
    // Wait for the transaction to be processed and find the new match
    let attempts = 0
    const maxAttempts = 10
    
    while (attempts < maxAttempts) {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
        
        const findingMatchIds = await this.contractService.getFindingMatches('0.001')
        
        // Check each match ID to see if player1 is the connected address
        for (const matchId of findingMatchIds) {
          try {
            const match = await this.contractService.getMatch(matchId)
            if (match && match.player1 === this.connectedAddress) {
              // Found the new match
              const room = this.convertMatchToRoom(match)
              this.emit('room_created', { room })
              return
            }
          } catch (matchError: any) {
            console.error('Error checking match:', matchId, matchError.message)
          }
        }
        
        attempts++
      } catch (error: any) {
        console.error('Error waiting for new match:', error.message)
        attempts++
      }
    }
    
    throw new Error('Timeout waiting for match creation confirmation')
  }

  async joinRoom(roomId: string, characterInstanceId: number): Promise<void> {
    if (!this.connectedAddress) {
      throw new Error('Not connected to contract service')
    }

    const matchId = parseInt(roomId.replace('CONTRACT_', ''))
    if (isNaN(matchId)) {
      throw new Error('Invalid room ID format')
    }

    try {
      console.log('Joining contract match:', matchId, 'with character:', characterInstanceId)
      
      // Ensure player owns the character
      const playerProfile = await this.contractService.getPlayerProfile(this.connectedAddress)
      
      if (!playerProfile.ownedCharacterInstances.includes(characterInstanceId)) {
        throw new Error(`You don't own character instance ${characterInstanceId}`)
      }
      
      // Get match details first
      const match = await this.contractService.getMatch(matchId)
      
      if (!match) {
        throw new Error('Match not found')
      }
      
      if (match.status !== 0) { // Not in FINDING status
        throw new Error('Match is not available for joining')
      }
      
      if (match.player1 === this.connectedAddress) {
        throw new Error('Cannot join your own match')
      }
      
      // Join match on contract - need to pass the stake amount
      const stakeAmount = Web3Utils.formatEth(match.stake)
      const txHash = await this.contractService.joinMatch(matchId, characterInstanceId, stakeAmount)
      console.log('Contract match join transaction:', txHash)
      
      // Wait for transaction confirmation
      await this.waitForMatchJoin(matchId)
      
      // Emit success event after transaction confirmation
      console.log('Contract match join confirmed for match:', matchId)
      this.emit('join_room_success', { matchId, roomId: `CONTRACT_${matchId}` })
      
    } catch (error: any) {
      console.error('Error joining contract room:', error)
      this.emit('join_room_error', { error: error.message || 'Failed to join contract match' })
      throw error
    }
  }

  private async waitForMatchJoin(matchId: number): Promise<void> {
    let attempts = 0
    const maxAttempts = 10
    
    while (attempts < maxAttempts) {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
        
        const match = await this.contractService.getMatch(matchId)
        
        if (match && match.player2 === this.connectedAddress) {
          // Successfully joined
          const room = this.convertMatchToRoom(match)
          
          this.emit('room_joined', { room })
          
          if (match.status === 1) { // ONGOING
            this.emit('game_started', { room })
          }
          
          return
        }
        
        attempts++
      } catch (error: any) {
        console.error('Error waiting for match join:', error.message)
        attempts++
      }
    }
    
    throw new Error('Timeout waiting for match join confirmation')
  }

  async leaveRoom(roomId: string): Promise<void> {
    // Contract matches can't be left once started - this is handled by the contract
    console.log('Leave room requested for:', roomId)
    // In a real implementation, this might forfeit the match or handle it according to contract rules
  }

  selectCharacter(roomId: string, character: ContractCharacter): void {
    // Character selection is handled during room creation/joining in contract matches
    console.log('Character selection for room:', roomId, 'character:', character.name)
  }

  setPlayerReady(roomId: string, isReady: boolean = true): void {
    // Ready state is automatic in contract matches once both players join
    console.log('Player ready state:', roomId, isReady)
  }

  async performGameAction(roomId: string, action: any): Promise<void> {
    if (!this.connectedAddress) {
      throw new Error('Not connected to contract service')
    }

    const matchId = parseInt(roomId.replace('CONTRACT_', ''))
    if (isNaN(matchId)) {
      throw new Error('Invalid room ID format')
    }

    try {
      console.log('Performing contract move:', action)
      
      // This would call the contract's makeMove function
      // For now, we'll use a placeholder with ability index
      const txHash = await this.contractService.makeMove(matchId, action.abilityId || 0)
      console.log('Contract move transaction:', txHash)
      
      // The contract will handle the move logic and update the match state
      // We'll poll for updates to get the new state
      
    } catch (error: any) {
      console.error('Error performing contract action:', error.message)
      throw error
    }
  }

  async getAvailableRooms(): Promise<ContractRoom[]> {
    try {
      const findingMatchIds = await this.contractService.getFindingMatches('0.001')
      const availableRooms: ContractRoom[] = []
      
      for (const matchId of findingMatchIds) {
        try {
          const match = await this.contractService.getMatch(matchId)
          if (match) {
            availableRooms.push(this.convertMatchToRoom(match))
          }
        } catch (matchError: any) {
          console.error('Error getting match details:', matchId, matchError.message)
        }
      }
      
      return availableRooms
    } catch (error: any) {
      console.error('Error getting available rooms:', error.message)
      return []
    }
  }

  async getRoom(roomId: string): Promise<ContractRoom | null> {
    const matchId = parseInt(roomId.replace('CONTRACT_', ''))
    if (isNaN(matchId)) {
      return null
    }

    try {
      const match = await this.contractService.getMatch(matchId)
      return match ? this.convertMatchToRoom(match) : null
    } catch (error) {
      console.error('Error getting room:', error)
      return null
    }
  }
}

// Export singleton instance
let contractMultiplayerService: ContractMultiplayerService | null = null

export function getContractMultiplayerService(contractService: ContractService): ContractMultiplayerService {
  if (!contractMultiplayerService) {
    contractMultiplayerService = new ContractMultiplayerService(contractService)
  }
  return contractMultiplayerService
}

export { ContractMultiplayerService } 