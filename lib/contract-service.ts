// lib/contract-service.ts
import { 
  createPublicClient, 
  createWalletClient, 
  custom, 
  http, 
  type Address, 
  type Hash,
  parseEther
} from 'viem'
import { etherlink } from './web3-config'
import { 
  CONTRACT_ADDRESS, 
  BATTLE_ARENA_ABI, 
  CHARACTER_TYPES,
  CHARACTER_TYPE_NAMES,
  MATCH_STATUS 
} from './contract-config'
import { 
  Web3Utils, 
  type CharacterType, 
  type CharacterInstance, 
  type PlayerProfile, 
  type Match, 
  type MatchCharacters,
  MatchStatus as MatchStatusEnum
} from './Web3-Utils'

// Contract Service Class
export class ContractService {
  private publicClient
  private walletClient: any = null

  constructor() {
    // Initialize public client for read operations
    this.publicClient = createPublicClient({
      chain: etherlink,
      transport: http()
    })
  }

  /**
   * Initialize wallet client for write operations
   */
  async initializeWalletClient() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.walletClient = createWalletClient({
        chain: etherlink,
        transport: custom(window.ethereum)
      })
    }
  }

  /**
   * Get all available character types
   */
  async getAllCharacterTypes(): Promise<CharacterType[]> {
    try {
      const characterTypeIds = await this.publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: BATTLE_ARENA_ABI,
        functionName: 'getAllCharacterTypes'
      }) as readonly bigint[]

      const characterTypes: CharacterType[] = []

      for (const typeId of characterTypeIds) {
        const typeIdNum = Number(typeId)
        const [name, description, baseHealth, baseMana, baseDefense] = await this.publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: BATTLE_ARENA_ABI,
          functionName: 'getCharacterType',
          args: [typeId]
        }) as readonly [string, string, bigint, bigint, bigint]

        const [abilityNames, baseDamages, manaCosts, cooldowns] = await this.publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: BATTLE_ARENA_ABI,
          functionName: 'getCharacterTypeAbilities',
          args: [typeId]
        }) as readonly [readonly [string, string, string, string], readonly [bigint, bigint, bigint, bigint], readonly [bigint, bigint, bigint, bigint], readonly [bigint, bigint, bigint, bigint]]

        const abilities = Array.from(abilityNames).map((name, index) => ({
          name,
          baseDamage: Number(baseDamages[index]),
          manaCost: Number(manaCosts[index]),
          cooldown: Number(cooldowns[index])
        }))

        characterTypes.push({
          id: typeIdNum,
          name,
          description,
          baseHealth: Number(baseHealth),
          baseMana: Number(baseMana),
          baseDefense: Number(baseDefense),
          abilities
        })
      }

      return characterTypes
    } catch (error) {
      console.error('Error fetching character types:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }

  /**
   * Get character instance by ID
   */
  async getCharacterInstance(characterInstanceId: number): Promise<CharacterInstance> {
    try {
      const [
        characterTypeId,
        characterTypeName,
        level,
        health,
        mana,
        defense,
        experience,
        owner
      ] = await this.publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: BATTLE_ARENA_ABI,
        functionName: 'getCharacterInstance',
        args: [BigInt(characterInstanceId)]
      }) as [bigint, string, bigint, bigint, bigint, bigint, bigint, Address]

      return {
        id: characterInstanceId,
        characterTypeId: Number(characterTypeId),
        characterTypeName,
        level: Number(level),
        health: Number(health),
        mana: Number(mana),
        defense: Number(defense),
        experience: Number(experience),
        owner
      }
    } catch (error) {
      console.error('Error fetching character instance:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }

  /**
   * Get player profile
   */
  async getPlayerProfile(playerAddress: Address): Promise<PlayerProfile> {
    try {
      const [ownedCharacterInstances, totalMatches, wins, losses] = await this.publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: BATTLE_ARENA_ABI,
        functionName: 'getPlayerProfile',
        args: [playerAddress]
      }) as readonly [readonly bigint[], bigint, bigint, bigint]

      return {
        address: playerAddress,
        ownedCharacterInstances: Array.from(ownedCharacterInstances).map(id => Number(id)),
        totalMatches: Number(totalMatches),
        wins: Number(wins),
        losses: Number(losses)
      }
    } catch (error) {
      console.error('Error fetching player profile:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }

  /**
   * Get match details
   */
  async getMatch(matchId: number): Promise<Match> {
    try {
      const [
        player1,
        player2,
        stake,
        currentTurn,
        winner,
        status,
        turnCount,
        lastMoveTimestamp
      ] = await this.publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: BATTLE_ARENA_ABI,
        functionName: 'getMatch',
        args: [BigInt(matchId)]
      }) as [Address, Address, bigint, Address, Address, number, bigint, bigint]

      return {
        id: matchId,
        player1,
        player2,
        stake,
        currentTurn,
        winner,
        status: status as MatchStatusEnum,
        turnCount: Number(turnCount),
        lastMoveTimestamp: Number(lastMoveTimestamp)
      }
    } catch (error) {
      console.error('Error fetching match:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }

  /**
   * Get match character states
   */
  async getMatchCharacters(matchId: number): Promise<MatchCharacters> {
    try {
      const [
        char1InstanceId,
        char1Health,
        char1Mana,
        char2InstanceId,
        char2Health,
        char2Mana
      ] = await this.publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: BATTLE_ARENA_ABI,
        functionName: 'getMatchCharacters',
        args: [BigInt(matchId)]
      }) as [bigint, bigint, bigint, bigint, bigint, bigint]

      return {
        char1InstanceId: Number(char1InstanceId),
        char1Health: Number(char1Health),
        char1Mana: Number(char1Mana),
        char2InstanceId: Number(char2InstanceId),
        char2Health: Number(char2Health),
        char2Mana: Number(char2Mana)
      }
    } catch (error) {
      console.error('Error fetching match characters:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }

  /**
   * Get available matches for a stake amount
   */
  async getFindingMatches(stakeAmount: string): Promise<number[]> {
    try {
      const stake = parseEther(stakeAmount)
      const matchIds = await this.publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: BATTLE_ARENA_ABI,
        functionName: 'getFindingMatches',
        args: [stake]
      }) as readonly bigint[]

      return Array.from(matchIds).map(id => Number(id))
    } catch (error) {
      console.error('Error fetching finding matches:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }

  /**
   * Acquire a new character
   */
  async acquireCharacter(characterTypeId: number): Promise<Hash> {
    try {
      if (!this.walletClient) {
        await this.initializeWalletClient()
      }

      const [account] = await this.walletClient.getAddresses()
      
      const { request } = await this.publicClient.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: BATTLE_ARENA_ABI,
        functionName: 'acquireCharacter',
        args: [BigInt(characterTypeId)],
        account,
        value: 0n as const // Characters are currently free
      })

      const hash = await this.walletClient.writeContract(request)
      return hash
    } catch (error) {
      console.error('Error acquiring character:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }

  /**
   * Level up a character
   */
  async levelUpCharacter(characterInstanceId: number): Promise<Hash> {
    try {
      if (!this.walletClient) {
        await this.initializeWalletClient()
      }

      const [account] = await this.walletClient.getAddresses()
      
      const { request } = await this.publicClient.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: BATTLE_ARENA_ABI,
        functionName: 'levelUpCharacter',
        args: [BigInt(characterInstanceId)],
        account
      })

      const hash = await this.walletClient.writeContract(request)
      return hash
    } catch (error) {
      console.error('Error leveling up character:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }

  /**
   * Initiate a new match
   */
  async initiateMatch(characterInstanceId: number, stakeAmount: string): Promise<Hash> {
    try {
      if (!this.walletClient) {
        await this.initializeWalletClient()
      }

      const [account] = await this.walletClient.getAddresses()
      const stake = parseEther(stakeAmount)
      
      const { request } = await this.publicClient.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: BATTLE_ARENA_ABI,
        functionName: 'initiateMatch',
        args: [BigInt(characterInstanceId)],
        account,
        value: stake
      })

      const hash = await this.walletClient.writeContract(request)
      return hash
    } catch (error) {
      console.error('Error initiating match:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }

  /**
   * Join an existing match
   */
  async joinMatch(matchId: number, characterInstanceId: number, stakeAmount: string): Promise<Hash> {
    try {
      if (!this.walletClient) {
        await this.initializeWalletClient()
      }

      const [account] = await this.walletClient.getAddresses()
      const stake = parseEther(stakeAmount)
      
      const { request } = await this.publicClient.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: BATTLE_ARENA_ABI,
        functionName: 'joinMatch',
        args: [BigInt(matchId), BigInt(characterInstanceId)],
        account,
        value: stake
      })

      const hash = await this.walletClient.writeContract(request)
      return hash
    } catch (error) {
      console.error('Error joining match:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }

  /**
   * Make a move in a battle
   */
  async makeMove(matchId: number, abilityIndex: number): Promise<Hash> {
    try {
      if (!this.walletClient) {
        await this.initializeWalletClient()
      }

      const [account] = await this.walletClient.getAddresses()
      
      const { request } = await this.publicClient.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: BATTLE_ARENA_ABI,
        functionName: 'makeMove',
        args: [BigInt(matchId), BigInt(abilityIndex)],
        account
      })

      const hash = await this.walletClient.writeContract(request)
      return hash
    } catch (error) {
      console.error('Error making move:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }

  /**
   * Claim timeout victory
   */
  async claimTimeoutVictory(matchId: number): Promise<Hash> {
    try {
      if (!this.walletClient) {
        await this.initializeWalletClient()
      }

      const [account] = await this.walletClient.getAddresses()
      
      const { request } = await this.publicClient.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: BATTLE_ARENA_ABI,
        functionName: 'claimTimeoutVictory',
        args: [BigInt(matchId)],
        account
      })

      const hash = await this.walletClient.writeContract(request)
      return hash
    } catch (error) {
      console.error('Error claiming timeout victory:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(hash: Hash): Promise<any> {
    try {
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
      return receipt
    } catch (error) {
      console.error('Error waiting for transaction:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(
    functionName: string,
    args: readonly any[],
    value?: bigint,
    account?: Address
  ): Promise<bigint> {
    try {
      if (!account && this.walletClient) {
        const [walletAccount] = await this.walletClient.getAddresses()
        account = walletAccount
      }

      const gasEstimate = await this.publicClient.estimateContractGas({
        address: CONTRACT_ADDRESS,
        abi: BATTLE_ARENA_ABI,
        functionName: functionName as any,
        args: args as any,
        account,
        value: value as any
      })

      return Web3Utils.addGasBuffer(gasEstimate)
    } catch (error) {
      console.error('Error estimating gas:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }

  /**
   * Listen to contract events
   */
  watchContractEvents(
    eventName: 'CharacterAcquired' | 'CharacterLeveledUp' | 'MatchInitiated' | 'MatchJoined' | 'MatchCompleted' | 'MoveMade', 
    callback: (logs: any[]) => void
  ) {
    return this.publicClient.watchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: BATTLE_ARENA_ABI,
      eventName,
      onLogs: callback
    })
  }

  /**
   * Get past contract events
   */
  async getPastEvents(
    eventName: 'CharacterAcquired' | 'CharacterLeveledUp' | 'MatchInitiated' | 'MatchJoined' | 'MatchCompleted' | 'MoveMade', 
    fromBlock?: bigint, 
    toBlock?: bigint,
    args?: any
  ) {
    try {
      const logs = await this.publicClient.getContractEvents({
        address: CONTRACT_ADDRESS,
        abi: BATTLE_ARENA_ABI,
        eventName,
        fromBlock,
        toBlock,
        args
      })
      return logs
    } catch (error) {
      console.error('Error fetching past events:', error)
      throw new Error(Web3Utils.parseContractError(error))
    }
  }
}

// Singleton instance
export const contractService = new ContractService()