// lib/game-types.ts (Updated for Phase 2)
import type { JSX } from "react"
import type { Address } from 'viem'

// Legacy types for backward compatibility
export type Ability = {
  name: string
  type: string
  power: number
  manaCost: number
}

export type Enemy = {
  name: string
  level: number
  health: number
  maxHealth: number
  attack: number
  defense: number
  abilities: Ability[]
  icon: JSX.Element
}

// New contract-based types
export interface ContractAbility {
  id: string
  name: string
  damage: number
  manaCost: number
  cooldown: number
  currentCooldown: number
  type: "fire" | "ice" | "lightning" | "time" | "physical"
  description: string
  soundEffect: string
}

export interface ContractCharacter {
  id: string
  name: string
  avatar: string
  health: number
  mana: number
  abilities: ContractAbility[]
  description: string
  // Contract-specific fields
  contractInstanceId?: number
  characterTypeId?: number
  level?: number
  experience?: number
  owner?: Address
}

export interface ContractCharacterType {
  id: number
  name: string
  description: string
  baseHealth: number
  baseMana: number
  baseDefense: number
  abilities: {
    name: string
    baseDamage: number
    manaCost: number
    cooldown: number
  }[]
}

export interface ContractMatch {
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

export enum MatchStatus {
  FINDING = 0,
  ONGOING = 1,
  COMPLETED = 2
}

// Battle state types
export interface BattleState {
  matchId?: number
  playerCharacter: ContractCharacter
  opponentCharacter: ContractCharacter
  playerHealth: number
  playerMaxHealth: number
  playerMana: number
  playerMaxMana: number
  opponentHealth: number
  opponentMaxHealth: number
  opponentMana: number
  opponentMaxMana: number
  isPlayerTurn: boolean
  turnCount: number
  battleLog: string[]
}

// Game mode types
export type GameMode = "singleplayer" | "multiplayer"

// Screen types (updated)
export type GameScreen = 
  | "loading" 
  | "main-menu" 
  | "character-select" 
  | "game" 
  | "game-over" 
  | "victory" 
  | "settings"
  | "multiplayer-menu"
  | "create-room"
  | "join-room"
  | "multiplayer-room"
  | "multiplayer-character-select"
  | "multiplayer-battle"
  | "wallet-connect"

// Transaction types
export interface TransactionState {
  isLoading: boolean
  error: string | null
  hash: string | null
  receipt: any | null
}

// Character acquisition flow
export interface CharacterAcquisitionFlow {
  selectedCharacterTypeId: number | null
  isAcquiring: boolean
  transaction: TransactionState
}