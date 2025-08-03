// hooks/use-contract.ts
"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { contractService } from '@/lib/contract-service'
import { Web3Utils, type CharacterType, type CharacterInstance, type PlayerProfile, type Match } from '@/lib/Web3-Utils'
import { etherlink } from '@/lib/web3-config'
import { type Hash } from 'viem'

// Hook for managing contract operations
export function useContract() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [characterTypes, setCharacterTypes] = useState<CharacterType[]>([])
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null)
  const [ownedCharacters, setOwnedCharacters] = useState<CharacterInstance[]>([])

  const isCorrectNetwork = chainId === etherlink.id

  // Reset state when account changes
  useEffect(() => {
    setPlayerProfile(null)
    setOwnedCharacters([])
    setError(null)
  }, [address])

  // Load character types on mount
  useEffect(() => {
    loadCharacterTypes()
  }, [])

  // Load player data when connected and on correct network
  useEffect(() => {
    if (isConnected && address && isCorrectNetwork) {
      loadPlayerData()
    }
  }, [isConnected, address, isCorrectNetwork])

  /**
   * Load all available character types
   */
  const loadCharacterTypes = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const types = await contractService.getAllCharacterTypes()
      setCharacterTypes(types)
    } catch (err: any) {
      console.error('Error loading character types:', err)
      setError(err.message || 'Failed to load character types')
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Load player profile and owned characters
   */
  const loadPlayerData = useCallback(async () => {
    if (!address) return

    try {
      setIsLoading(true)
      setError(null)
      
      // Load player profile
      const profile = await contractService.getPlayerProfile(address)
      setPlayerProfile(profile)

      // Load owned character instances
      if (profile.ownedCharacterInstances.length > 0) {
        const characters = await Promise.all(
          profile.ownedCharacterInstances.map(id => 
            contractService.getCharacterInstance(id)
          )
        )
        setOwnedCharacters(characters)
      } else {
        setOwnedCharacters([])
      }
    } catch (err: any) {
      console.error('Error loading player data:', err)
      setError(err.message || 'Failed to load player data')
    } finally {
      setIsLoading(false)
    }
  }, [address])

  /**
   * Acquire a new character
   */
  const acquireCharacter = useCallback(async (characterTypeId: number): Promise<Hash> => {
    if (!isConnected || !address || !isCorrectNetwork) {
      throw new Error('Wallet not connected or wrong network')
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const hash = await contractService.acquireCharacter(characterTypeId)
      
      // Wait for transaction confirmation
      await contractService.waitForTransaction(hash)
      
      // Reload player data to show new character
      await loadPlayerData()
      
      return hash
    } catch (err: any) {
      console.error('Error acquiring character:', err)
      const errorMessage = err.message || 'Failed to acquire character'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, address, isCorrectNetwork, loadPlayerData])

  /**
   * Level up a character
   */
  const levelUpCharacter = useCallback(async (characterInstanceId: number): Promise<Hash> => {
    if (!isConnected || !address || !isCorrectNetwork) {
      throw new Error('Wallet not connected or wrong network')
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const hash = await contractService.levelUpCharacter(characterInstanceId)
      
      // Wait for transaction confirmation
      await contractService.waitForTransaction(hash)
      
      // Reload player data to show updated character
      await loadPlayerData()
      
      return hash
    } catch (err: any) {
      console.error('Error leveling up character:', err)
      const errorMessage = err.message || 'Failed to level up character'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, address, isCorrectNetwork, loadPlayerData])

  /**
   * Initiate a new match
   */
  const initiateMatch = useCallback(async (characterInstanceId: number, stakeAmount: string): Promise<Hash> => {
    if (!isConnected || !address || !isCorrectNetwork) {
      throw new Error('Wallet not connected or wrong network')
    }

    // Validate stake amount
    const validation = Web3Utils.validateStakeAmount(stakeAmount)
    if (!validation.isValid) {
      throw new Error(validation.error)
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const hash = await contractService.initiateMatch(characterInstanceId, stakeAmount)
      
      // Wait for transaction confirmation
      await contractService.waitForTransaction(hash)
      
      return hash
    } catch (err: any) {
      console.error('Error initiating match:', err)
      const errorMessage = err.message || 'Failed to initiate match'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, address, isCorrectNetwork])

  /**
   * Join an existing match
   */
  const joinMatch = useCallback(async (matchId: number, characterInstanceId: number, stakeAmount: string): Promise<Hash> => {
    if (!isConnected || !address || !isCorrectNetwork) {
      throw new Error('Wallet not connected or wrong network')
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const hash = await contractService.joinMatch(matchId, characterInstanceId, stakeAmount)
      
      // Wait for transaction confirmation
      await contractService.waitForTransaction(hash)
      
      return hash
    } catch (err: any) {
      console.error('Error joining match:', err)
      const errorMessage = err.message || 'Failed to join match'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, address, isCorrectNetwork])

  /**
   * Make a move in battle
   */
  const makeMove = useCallback(async (matchId: number, abilityIndex: number): Promise<Hash> => {
    if (!isConnected || !address || !isCorrectNetwork) {
      throw new Error('Wallet not connected or wrong network')
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const hash = await contractService.makeMove(matchId, abilityIndex)
      
      // Wait for transaction confirmation
      await contractService.waitForTransaction(hash)
      
      return hash
    } catch (err: any) {
      console.error('Error making move:', err)
      const errorMessage = err.message || 'Failed to make move'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, address, isCorrectNetwork])

  /**
   * Get match details
   */
  const getMatch = useCallback(async (matchId: number): Promise<Match> => {
    try {
      return await contractService.getMatch(matchId)
    } catch (err: any) {
      console.error('Error fetching match:', err)
      throw new Error(err.message || 'Failed to fetch match')
    }
  }, [])

  /**
   * Get available matches for joining
   */
  const getFindingMatches = useCallback(async (stakeAmount: string): Promise<number[]> => {
    try {
      return await contractService.getFindingMatches(stakeAmount)
    } catch (err: any) {
      console.error('Error fetching finding matches:', err)
      throw new Error(err.message || 'Failed to fetch available matches')
    }
  }, [])

  /**
   * Estimate gas for transaction
   */
  const estimateGas = useCallback(async (
    functionName: 'acquireCharacter' | 'levelUpCharacter' | 'initiateMatch' | 'joinMatch' | 'makeMove' | 'claimTimeoutVictory',
    args: readonly bigint[] | readonly [bigint, bigint] | readonly [],
    value?: bigint
  ): Promise<bigint> => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    try {
      return await contractService.estimateGas(functionName, args, value, address)
    } catch (err: any) {
      console.error('Error estimating gas:', err)
      throw new Error(err.message || 'Failed to estimate gas')
    }
  }, [address])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Refresh all data
   */
  const refreshData = useCallback(async () => {
    await Promise.all([
      loadCharacterTypes(),
      loadPlayerData()
    ])
  }, [loadCharacterTypes, loadPlayerData])

  return {
    // State
    isLoading,
    error,
    characterTypes,
    playerProfile,
    ownedCharacters,
    isConnected: isConnected && isCorrectNetwork,
    
    // Actions
    acquireCharacter,
    levelUpCharacter,
    initiateMatch,
    joinMatch,
    makeMove,
    getMatch,
    getFindingMatches,
    estimateGas,
    clearError,
    refreshData,
    loadPlayerData,
    
    // Utils
    contractService
  }
}