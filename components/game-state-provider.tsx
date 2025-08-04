// components/game-state-provider.tsx - Phase 5: Enhanced with Notifications
"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useContract } from "@/hooks/use-contract"
import { useAccount } from "wagmi"
import { Web3Utils, type CharacterType, type CharacterInstance } from "@/lib/Web3-Utils"

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'achievement'
  title: string
  message: string
  duration?: number
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'default' | 'outline'
  }>
}

export type Character = {
  id: string
  name: string
  avatar: string
  health: number
  mana: number
  abilities: Ability[]
  description: string
  contractInstanceId?: number
  characterTypeId?: number
  level?: number
  experience?: number
}

export type Ability = {
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

export type Enemy = {
  id: string
  name: string
  avatar: string
  health: number
  maxHealth: number
  abilities: Ability[]
  level: number
}

type GameState = {
  // Contract Data
  contractCharacterTypes: CharacterType[]
  ownedCharacters: CharacterInstance[]
  isLoadingContract: boolean
  contractError: string | null
  
  // Game State
  score: number
  highScore: number
  level: number
  gold: number
  selectedCharacter: Character | null
  currentEnemy: Enemy | null
  playerHealth: number
  playerMaxHealth: number
  playerMana: number
  playerMaxMana: number
  experience: number
  experienceToNextLevel: number
  playerLevel: number
  inventory: string[]
  achievements: string[]
  battleLog: string[]
  currentMatchId: number | null
  
  // UI State
  notifications: Notification[]
  
  // Actions
  selectCharacter: (character: Character) => void
  selectContractCharacter: (characterInstance: CharacterInstance) => Promise<void>
  acquireNewCharacter: (characterTypeId: number) => Promise<string>
  levelUpCharacter: (characterInstanceId: number) => Promise<string>
  increaseScore: (amount: number) => void
  increaseGold: (amount: number) => void
  updatePlayerHealth: (amount: number) => void
  updatePlayerMana: (amount: number) => void
  setCurrentEnemy: (enemy: Enemy) => void
  damageEnemy: (amount: number) => void
  addToBattleLog: (message: string) => void
  resetBattleLog: () => void
  resetGame: () => void
  levelUp: () => void
  gainExperience: (amount: number) => void
  refreshContractData: () => Promise<void>
  
  // UI Actions
  addNotification: (notification: Omit<Notification, 'id'>) => void
  dismissNotification: (id: string) => void
}

const GameStateContext = createContext<GameState | undefined>(undefined)

export const useGameState = () => {
  const context = useContext(GameStateContext)
  if (!context) {
    throw new Error("useGameState must be used within a GameStateProvider")
  }
  return context
}

// Convert contract character instance to game character format
const convertContractCharacterToGameCharacter = (
  characterInstance: CharacterInstance,
  characterType: CharacterType
): Character => {
  const abilities: Ability[] = characterType.abilities.map((ability, index) => ({
    id: `ability_${index}`,
    name: ability.name,
    damage: ability.baseDamage,
    manaCost: ability.manaCost,
    cooldown: ability.cooldown,
    currentCooldown: 0,
    type: getAbilityType(ability.name),
    description: getAbilityDescription(ability.name),
    soundEffect: getAbilitySoundEffect(ability.name)
  }))

  return {
    id: `contract_${characterInstance.id}`,
    name: characterInstance.characterTypeName,
    avatar: getCharacterAvatar(characterInstance.characterTypeName),
    health: characterInstance.health,
    mana: characterInstance.mana,
    abilities,
    description: characterType.description,
    contractInstanceId: characterInstance.id,
    characterTypeId: characterInstance.characterTypeId,
    level: characterInstance.level,
    experience: characterInstance.experience
  }
}

// Helper functions for character data mapping
const getAbilityType = (abilityName: string): "fire" | "ice" | "lightning" | "time" | "physical" => {
  const name = abilityName.toLowerCase()
  if (name.includes('fire') || name.includes('flame') || name.includes('burn')) return 'fire'
  if (name.includes('ice') || name.includes('frost') || name.includes('freeze')) return 'ice'
  if (name.includes('lightning') || name.includes('thunder') || name.includes('bolt')) return 'lightning'
  if (name.includes('time') || name.includes('temporal') || name.includes('age')) return 'time'
  return 'physical'
}

const getAbilityDescription = (abilityName: string): string => {
  const descriptions: Record<string, string> = {
    'Lightning Bolt': 'Strikes the enemy with a powerful bolt of lightning',
    'Thunderstorm': 'Calls down a devastating storm of lightning',
    'Heaven\'s Wrath': 'Divine lightning that pierces through defenses',
    'Divine Restoration': 'Restores health with divine energy',
    'Spear Thrust': 'A precise thrust with Athena\'s spear',
    'Aegis Shield': 'Protective barrier that absorbs damage',
    'Judgment Strike': 'A righteous strike that deals extra damage',
    'Wisdom\'s Blessing': 'Restores mana and provides tactical advantage',
    'Soulfire': 'Dark flames that burn the enemy\'s soul',
    'Underworld Grasp': 'Tendrils from the underworld that drain life',
    'Hellfire Surge': 'A surge of hellfire that burns everything',
    'Soul Drain': 'Drains the enemy\'s life force',
    'Shadowbind': 'Binds the enemy in shadows',
    'Eclipse Nova': 'A devastating explosion of dark energy',
    'Veil of Night': 'Shrouds the battlefield in darkness',
    'Night\'s Embrace': 'Healing embrace of the night'
  }
  return descriptions[abilityName] || `A powerful ${abilityName.toLowerCase()} attack`
}

const getAbilitySoundEffect = (abilityName: string): string => {
  const name = abilityName.toLowerCase()
  if (name.includes('lightning') || name.includes('thunder') || name.includes('bolt')) return 'lightning-ability.mp3'
  if (name.includes('fire') || name.includes('flame') || name.includes('burn')) return 'fire-ability.mp3'
  if (name.includes('time') || name.includes('temporal')) return 'time-ability.mp3'
  if (name.includes('shield') || name.includes('restoration') || name.includes('blessing')) return 'heal-ability.mp3'
  return 'ability.mp3'
}

const getCharacterAvatar = (characterName: string): string => {
  const avatars: Record<string, string> = {
    'Zeus': '/images/zeus.png',
    'Athena': '/images/athena.png',
    'Hades': '/images/hades.png',
    'Nyx': '/images/nyx.png'
  }
  return avatars[characterName] || '/images/default-character.png'
}

// Generate enemy based on level
const generateContractEnemy = (level: number): Enemy => {
  const enemyTypes = [
    {
      name: "Time Corrupted Warrior",
      baseHealth: 80,
      abilities: [
        { id: "temporal_strike", name: "Temporal Strike", damage: 15, manaCost: 10, cooldown: 1, currentCooldown: 0, type: "time" as const, description: "A strike that warps time", soundEffect: "time-ability.mp3" },
        { id: "time_drain", name: "Time Drain", damage: 25, manaCost: 20, cooldown: 3, currentCooldown: 0, type: "time" as const, description: "Drains temporal energy", soundEffect: "time-ability.mp3" }
      ]
    },
    {
      name: "Lightning Elemental",
      baseHealth: 70,
      abilities: [
        { id: "shock", name: "Shock", damage: 20, manaCost: 12, cooldown: 1, currentCooldown: 0, type: "lightning" as const, description: "Electric shock attack", soundEffect: "lightning-ability.mp3" },
        { id: "chain_lightning", name: "Chain Lightning", damage: 30, manaCost: 25, cooldown: 4, currentCooldown: 0, type: "lightning" as const, description: "Lightning that chains between targets", soundEffect: "lightning-ability.mp3" }
      ]
    },
    {
      name: "Flame Wraith",
      baseHealth: 75,
      abilities: [
        { id: "fire_burst", name: "Fire Burst", damage: 18, manaCost: 15, cooldown: 2, currentCooldown: 0, type: "fire" as const, description: "Burst of magical flames", soundEffect: "fire-ability.mp3" },
        { id: "inferno", name: "Inferno", damage: 35, manaCost: 30, cooldown: 5, currentCooldown: 0, type: "fire" as const, description: "Raging inferno attack", soundEffect: "fire-ability.mp3" }
      ]
    }
  ]

  const randomIndex = Math.floor(Math.random() * enemyTypes.length)
  const enemyType = enemyTypes[randomIndex]
  
  const scaleFactor = 1 + (level - 1) * 0.15
  const health = Math.floor(enemyType.baseHealth * scaleFactor)

  return {
    id: `enemy_${Date.now()}`,
    name: enemyType.name,
    avatar: `/images/enemy-${randomIndex + 1}.png`,
    health,
    maxHealth: health,
    abilities: enemyType.abilities,
    level
  }
}

export function GameStateProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount()
  const {
    characterTypes: contractCharacterTypes,
    ownedCharacters,
    isLoading: isLoadingContract,
    error: contractError,
    acquireCharacter,
    levelUpCharacter: contractLevelUpCharacter,
    refreshData
  } = useContract()

  // Game state
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [gold, setGold] = useState(0)
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [currentEnemy, setCurrentEnemy] = useState<Enemy | null>(null)
  const [playerHealth, setPlayerHealth] = useState(100)
  const [playerMaxHealth, setPlayerMaxHealth] = useState(100)
  const [playerMana, setPlayerMana] = useState(100)
  const [playerMaxMana, setPlayerMaxMana] = useState(100)
  const [experience, setExperience] = useState(0)
  const [experienceToNextLevel, setExperienceToNextLevel] = useState(100)
  const [playerLevel, setPlayerLevel] = useState(1)
  const [inventory, setInventory] = useState<string[]>([])
  const [achievements, setAchievements] = useState<string[]>([])
  const [battleLog, setBattleLog] = useState<string[]>([])
  const [currentMatchId, setCurrentMatchId] = useState<number | null>(null)
  
  // UI state
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Load saved game state
  useEffect(() => {
    const savedHighScore = localStorage.getItem("chronoClash_highScore")
    if (savedHighScore) {
      setHighScore(Number.parseInt(savedHighScore))
    }

    const savedGameData = localStorage.getItem("chronoClash_gameData")
    if (savedGameData) {
      try {
        const data = JSON.parse(savedGameData)
        setScore(data.score || 0)
        setLevel(data.level || 1)
        setGold(data.gold || 0)
        setExperience(data.experience || 0)
        setPlayerLevel(data.playerLevel || 1)
        setInventory(data.inventory || [])
        setAchievements(data.achievements || [])
      } catch (error) {
        console.error('Error loading saved game data:', error)
      }
    }
  }, [])

  // Save game state when it changes
  useEffect(() => {
    localStorage.setItem("chronoClash_highScore", highScore.toString())
    
    const gameData = {
      score,
      level,
      gold,
      experience,
      playerLevel,
      inventory,
      achievements
    }
    localStorage.setItem("chronoClash_gameData", JSON.stringify(gameData))
  }, [score, highScore, level, gold, experience, playerLevel, inventory, achievements])

  // Auto-generate enemy when level changes
  useEffect(() => {
    if (level > 0 && !currentEnemy) {
      setCurrentEnemy(generateContractEnemy(level))
    }
  }, [level, currentEnemy])

  // Auto-dismiss notifications
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.duration && notification.duration > 0) {
        const timer = setTimeout(() => {
          dismissNotification(notification.id)
        }, notification.duration)
        
        return () => clearTimeout(timer)
      }
    })
  }, [notifications])

  // Notification management
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notification_${Date.now()}_${Math.random()}`
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 5000
    }
    
    setNotifications(prev => [...prev, newNotification])
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const selectCharacter = useCallback((character: Character) => {
    setSelectedCharacter(character)
    
    // Set player stats based on character
    const maxHealth = character.health
    const maxMana = character.mana
    
    setPlayerHealth(maxHealth)
    setPlayerMaxHealth(maxHealth)
    setPlayerMana(maxMana)
    setPlayerMaxMana(maxMana)

    // Generate initial enemy if none exists
    if (!currentEnemy) {
      setCurrentEnemy(generateContractEnemy(level))
    }
  }, [level, currentEnemy])

  const addToBattleLog = useCallback((message: string) => {
    setBattleLog(prev => [...prev, message].slice(-50)) // Keep last 50 messages
  }, [])

  const selectContractCharacter = useCallback(async (characterInstance: CharacterInstance) => {
    try {
      // Find the character type
      const characterType = contractCharacterTypes.find(
        type => type.id === characterInstance.characterTypeId
      )
      
      if (!characterType) {
        throw new Error('Character type not found')
      }

      // Convert to game character format
      const gameCharacter = convertContractCharacterToGameCharacter(characterInstance, characterType)
      
      // Select the character
      selectCharacter(gameCharacter)
      
      addToBattleLog(`Selected ${gameCharacter.name} (Level ${gameCharacter.level})`)
      
      addNotification({
        type: 'success',
        title: 'Character Selected',
        message: `${gameCharacter.name} is ready for battle!`,
        duration: 3000
      })
    } catch (error) {
      console.error('Error selecting contract character:', error)
      addToBattleLog('Error selecting character')
      addNotification({
        type: 'error',
        title: 'Selection Failed',
        message: 'Failed to select character',
        duration: 3000
      })
    }
  }, [contractCharacterTypes, selectCharacter, addToBattleLog, addNotification])

  const acquireNewCharacter = useCallback(async (characterTypeId: number): Promise<string> => {
    try {
      addNotification({
        type: 'info',
        title: 'Acquiring Character',
        message: 'Transaction submitted. Please wait...',
        duration: 3000
      })
      
      // Call the contract function and get the transaction hash
      const hash = await acquireCharacter(characterTypeId)
      
      addToBattleLog('Character acquired successfully!')
      
      addNotification({
        type: 'success',
        title: 'Character Acquired!',
        message: 'Your new character has been successfully acquired.',
        duration: 5000
      })
      
      // Return the transaction hash
      return hash
      
    } catch (error) {
      console.error('Error acquiring character:', error)
      addToBattleLog('Failed to acquire character')
      
      addNotification({
        type: 'error',
        title: 'Acquisition Failed',
        message: 'Failed to acquire character',
        duration: 7000
      })
      
      throw error
    }
  }, [acquireCharacter, addToBattleLog, addNotification])

  const levelUpCharacter = useCallback(async (characterInstanceId: number): Promise<string> => {
    try {
      addNotification({
        type: 'info',
        title: 'Leveling Up Character',
        message: 'Transaction submitted. Please wait...',
        duration: 3000
      })
      
      // Call the contract function and get the transaction hash
      const hash = await contractLevelUpCharacter(characterInstanceId)
      
      addToBattleLog('Character leveled up successfully!')
      
      addNotification({
        type: 'achievement',
        title: 'Level Up!',
        message: 'Your character has been successfully leveled up!',
        duration: 5000
      })
      
      // Update selected character if it was leveled up
      if (selectedCharacter?.contractInstanceId === characterInstanceId) {
        // Refresh will happen automatically after transaction confirmation in useContract
        // But we can manually trigger a refresh here if needed
        setTimeout(async () => {
          await refreshData()
          
          // Find the updated character instance
          const updatedInstance = ownedCharacters.find(char => char.id === characterInstanceId)
          if (updatedInstance) {
            const characterType = contractCharacterTypes.find(
              type => type.id === updatedInstance.characterTypeId
            )
            if (characterType) {
              const updatedGameCharacter = convertContractCharacterToGameCharacter(updatedInstance, characterType)
              selectCharacter(updatedGameCharacter)
            }
          }
        }, 1000)
      }
      
      // Return the transaction hash
      return hash
      
    } catch (error) {
      console.error('Error leveling up character:', error)
      addToBattleLog('Failed to level up character')
      
      addNotification({
        type: 'error',
        title: 'Level Up Failed',
        message: 'Failed to level up character',
        duration: 7000
      })
      
      throw error
    }
  }, [contractLevelUpCharacter, selectedCharacter, refreshData, ownedCharacters, contractCharacterTypes, selectCharacter, addToBattleLog, addNotification])

  const increaseScore = useCallback((amount: number) => {
    const newScore = score + amount
    setScore(newScore)
    if (newScore > highScore) {
      setHighScore(newScore)
      addNotification({
        type: 'achievement',
        title: 'New High Score!',
        message: `Amazing! You set a new record: ${newScore}`,
        duration: 5000
      })
    }
  }, [score, highScore, addNotification])

  const increaseGold = useCallback((amount: number) => {
    setGold(prev => prev + amount)
    if (amount > 100) {
      addNotification({
        type: 'success',
        title: 'Gold Earned',
        message: `You earned ${amount} gold!`,
        duration: 3000
      })
    }
  }, [addNotification])

  const updatePlayerHealth = useCallback((amount: number) => {
    setPlayerHealth(prev => Math.min(playerMaxHealth, Math.max(0, prev + amount)))
  }, [playerMaxHealth])

  const updatePlayerMana = useCallback((amount: number) => {
    setPlayerMana(prev => Math.min(playerMaxMana, Math.max(0, prev + amount)))
  }, [playerMaxMana])

  const damageEnemy = useCallback((amount: number) => {
    if (currentEnemy) {
      const newHealth = Math.max(0, currentEnemy.health - amount)
      setCurrentEnemy({
        ...currentEnemy,
        health: newHealth,
      })
    }
  }, [currentEnemy])

  

  const resetBattleLog = useCallback(() => {
    setBattleLog([])
  }, [])

  const resetGame = useCallback(() => {
    setScore(0)
    setLevel(1)
    setGold(0)
    setSelectedCharacter(null)
    setCurrentEnemy(null)
    setPlayerHealth(100)
    setPlayerMaxHealth(100)
    setPlayerMana(100)
    setPlayerMaxMana(100)
    setExperience(0)
    setExperienceToNextLevel(100)
    setPlayerLevel(1)
    setInventory([])
    setBattleLog([])
    setCurrentMatchId(null)
    setNotifications([])
  }, [])

  const levelUp = useCallback(() => {
    const newLevel = playerLevel + 1
    setPlayerLevel(newLevel)
    setPlayerMaxHealth(prev => Math.floor(prev * 1.2))
    setPlayerHealth(prev => Math.floor(prev * 1.2))
    setPlayerMaxMana(prev => Math.floor(prev * 1.1))
    setPlayerMana(prev => Math.floor(prev * 1.1))
    setExperienceToNextLevel(prev => Math.floor(prev * 1.5))
    
    addToBattleLog(`Level up! You are now level ${newLevel}`)
    
    addNotification({
      type: 'achievement',
      title: 'Level Up!',
      message: `Congratulations! You reached level ${newLevel}!`,
      duration: 5000
    })
  }, [playerLevel, addToBattleLog, addNotification])

  const gainExperience = useCallback((amount: number) => {
    const newExperience = experience + amount
    const newLevel = Math.floor(newExperience / 100) + 1
    
    if (newLevel > playerLevel) {
      levelUp()
    }
    
    setExperience(newExperience)
    setExperienceToNextLevel(newLevel * 100)
  }, [experience, playerLevel, levelUp])

  const refreshContractData = useCallback(async () => {
    if (address) {
      try {
        await refreshData()
        addNotification({
          type: 'info',
          title: 'Data Refreshed',
          message: 'Contract data has been updated',
          duration: 2000
        })
      } catch (error) {
        addNotification({
          type: 'error',
          title: 'Refresh Failed',
          message: 'Failed to refresh contract data',
          duration: 3000
        })
      }
    }
  }, [address, refreshData, addNotification])

  const contextValue: GameState = {
    // Contract Data
    contractCharacterTypes,
    ownedCharacters,
    isLoadingContract,
    contractError,
    
    // Game State
    score,
    highScore,
    level,
    gold,
    selectedCharacter,
    currentEnemy,
    playerHealth,
    playerMaxHealth,
    playerMana,
    playerMaxMana,
    experience,
    experienceToNextLevel,
    playerLevel,
    inventory,
    achievements,
    battleLog,
    currentMatchId,
    
    // UI State
    notifications,
    
    // Actions
    selectCharacter,
    selectContractCharacter,
    acquireNewCharacter,
    levelUpCharacter,
    increaseScore,
    increaseGold,
    updatePlayerHealth,
    updatePlayerMana,
    setCurrentEnemy,
    damageEnemy,
    addToBattleLog,
    resetBattleLog,
    resetGame,
    levelUp,
    gainExperience,
    refreshContractData,
    
    // UI Actions
    addNotification,
    dismissNotification
  }

  return (
    <GameStateContext.Provider value={contextValue}>
      {children}
    </GameStateContext.Provider>
  )
}