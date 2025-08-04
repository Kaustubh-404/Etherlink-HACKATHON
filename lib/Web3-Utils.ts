// lib/web3-utils.ts
import { type Address, parseEther, formatEther } from 'viem'
import { etherlink } from './web3-config'

// Type definitions for contract data
export interface CharacterType {
  id: number
  name: string
  description: string
  baseHealth: number
  baseMana: number
  baseDefense: number
  abilities: AbilityType[]
}

export interface AbilityType {
  name: string
  baseDamage: number
  manaCost: number
  cooldown: number
}

export interface CharacterInstance {
  id: number
  characterTypeId: number
  characterTypeName: string
  level: number
  health: number
  mana: number
  defense: number
  experience: number
  owner: Address
}

export interface PlayerProfile {
  address: Address
  ownedCharacterInstances: number[]
  totalMatches: number
  wins: number
  losses: number
}

export interface Match {
  id: number
  player1: Address
  player2: Address
  stake: bigint
  currentTurn: Address
  winner: Address
  status: MatchStatus
  turnCount: number
  lastMoveTimestamp: number
}

export interface MatchCharacters {
  char1InstanceId: number
  char1Health: number
  char1Mana: number
  char2InstanceId: number
  char2Health: number
  char2Mana: number
}

export enum MatchStatus {
  FINDING = 0,
  ONGOING = 1,
  COMPLETED = 2
}

// Utility functions for Web3 operations
export class Web3Utils {
  /**
   * Convert ETH amount to Wei (BigInt)
   */
  static parseEth(amount: string): bigint {
    return parseEther(amount)
  }

  /**
   * Convert Wei (BigInt) to ETH string
   */
  static formatEth(amount: bigint): string {
    return formatEther(amount)
  }

  /**
   * Format address for display (0x1234...5678)
   */
  static formatAddress(address: Address): string {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  /**
   * Check if address is valid
   */
  static isValidAddress(address: string): address is Address {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  /**
   * Get block explorer URL for transaction
   */
  static getTransactionUrl(txHash: string): string {
    return `${etherlink.blockExplorers.default.url}/tx/${txHash}`
  }

  /**
   * Get block explorer URL for address
   */
  static getAddressUrl(address: Address): string {
    return `${etherlink.blockExplorers.default.url}/address/${address}`
  }

  /**
   * Calculate gas limit with buffer
   */
  static addGasBuffer(gasEstimate: bigint, bufferPercentage = 20): bigint {
    const buffer = (gasEstimate * BigInt(bufferPercentage)) / BigInt(100)
    return gasEstimate + buffer
  }

  /**
   * Format large numbers with suffixes (1K, 1M, etc.)
   */
  static formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  /**
   * Convert seconds to human readable time
   */
  static formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`
    }
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
    }
    const hours = Math.floor(seconds / 3600)
    const remainingMinutes = Math.floor((seconds % 3600) / 60)
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  /**
   * Calculate percentage with precision
   */
  static calculatePercentage(value: number, total: number, precision = 1): number {
    if (total === 0) return 0
    return Number(((value / total) * 100).toFixed(precision))
  }

  /**
   * Generate random number within range
   */
  static randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * Delay execution for specified milliseconds
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (retries > 0) {
        await this.delay(delay)
        return this.retry(fn, retries - 1, delay * 2)
      }
      throw error
    }
  }

  /**
   * Check if current network is Etherlink
   */
  static isEtherlinkNetwork(chainId: number): boolean {
    return chainId === etherlink.id
  }

  /**
   * Get network name from chain ID
   */
  static getNetworkName(chainId: number): string {
    switch (chainId) {
      case etherlink.id:
        return 'Etherlink Testnet'
      case 1:
        return 'Ethereum Mainnet'
      case 11155111:
        return 'Sepolia Testnet'
      default:
        return `Unknown Network (${chainId})`
    }
  }

  /**
   * Parse contract error messages into user-friendly strings
   */
  static parseContractError(error: any): string {
    if (error?.message) {
      // Extract revert reason if available
      const revertMatch = error.message.match(/reverted with reason string '([^']+)'/)
      if (revertMatch) {
        return revertMatch[1]
      }

      // Handle "execution reverted for unknown reason" - common in race conditions
      if (error.message.includes('Execution reverted for an unknown reason') || 
          (error.message.includes('execution reverted') && error.message.includes('unknown reason'))) {
        return 'Transaction failed due to changing contract state. The match may have been filled by another player or is no longer available.'
      }

      // Handle OutOfFund error specifically
      if (error.message.includes('OutOfFund') || error.message.includes('The transaction failed: Error(OutOfFund)')) {
        return 'Insufficient funds in wallet. Please add more ETH to cover gas fees and stake amount.'
      }

      // Handle limit exceeded errors (often related to insufficient balance)
      if (error.message.includes('Request exceeds defined limit') || error.message.includes('LimitExceededRpcError')) {
        return 'Transaction exceeds limit, likely due to insufficient funds. Please check your balance and try again.'
      }

      // Common error patterns
      if (error.message.includes('insufficient funds')) {
        return 'Insufficient funds for transaction'
      }
      if (error.message.includes('user rejected')) {
        return 'Transaction rejected by user'
      }
      if (error.message.includes('nonce too low')) {
        return 'Transaction nonce too low'
      }
      if (error.message.includes('gas limit')) {
        return 'Gas limit exceeded'
      }

      return error.message
    }
    return 'Unknown contract error'
  }

  /**
   * Validate stake amount
   */
  static validateStakeAmount(amount: string): { isValid: boolean; error?: string } {
    try {
      const parsed = parseFloat(amount)
      if (isNaN(parsed) || parsed <= 0) {
        return { isValid: false, error: 'Stake must be greater than 0' }
      }
      if (parsed > 1000) {
        return { isValid: false, error: 'Stake amount too large' }
      }
      return { isValid: true }
    } catch {
      return { isValid: false, error: 'Invalid stake amount format' }
    }
  }

  /**
   * Format match status for display
   */
  static formatMatchStatus(status: MatchStatus): string {
    switch (status) {
      case MatchStatus.FINDING:
        return 'Finding Opponent'
      case MatchStatus.ONGOING:
        return 'In Progress'
      case MatchStatus.COMPLETED:
        return 'Completed'
      default:
        return 'Unknown'
    }
  }

  /**
   * Calculate character stats at specific level
   */
  static calculateCharacterStats(baseStats: { health: number; mana: number; defense: number }, level: number) {
    return {
      health: baseStats.health + (level - 1) * 20,
      mana: baseStats.mana + (level - 1) * 10,
      defense: baseStats.defense + (level - 1) * 5
    }
  }

  /**
   * Calculate experience needed for next level
   */
  static calculateExpForNextLevel(level: number): number {
    return level * 100
  }

  /**
   * Calculate damage with level and defense modifiers
   */
  static calculateDamage(
    baseDamage: number,
    attackerLevel: number, 
    defenderDefense: number,
    defenderLevel: number
  ): number {
    const levelBonus = (attackerLevel - 1) * 2
    const totalDamage = baseDamage + levelBonus
    
    // Apply defense (max 80% reduction)
    const totalDefense = defenderDefense + (defenderLevel - 1) * 5
    const defenseReduction = Math.min(80, (totalDefense * 100) / totalDamage)
    
    const finalDamage = totalDamage * (100 - defenseReduction) / 100
    return Math.max(1, Math.floor(finalDamage)) // Minimum 1 damage
  }
}