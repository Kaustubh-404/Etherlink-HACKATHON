// components/game-screen.tsx - Phase 3: Contract Integration
"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Heart, Droplet, Sword, Shield, Home, Trophy, Coins } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameState } from "./game-state-provider"
import { playSound } from "@/lib/sound-utils"
import BattleEffects from "./battle-effects"
import TransactionStatus from "./transaction-status"
import { useContract } from "@/hooks/use-contract"
import { Web3Utils } from "@/lib/Web3-Utils"

interface GameScreenProps {
  onGameOver: () => void
  onVictory: () => void
  onExit: () => void
}

export default function GameScreen({ onGameOver, onVictory, onExit }: GameScreenProps) {
  const {
    selectedCharacter,
    currentEnemy,
    playerHealth,
    playerMaxHealth,
    playerMana,
    playerMaxMana,
    score,
    level,
    gold,
    experience,
    experienceToNextLevel,
    playerLevel,
    battleLog,
    updatePlayerHealth,
    updatePlayerMana,
    damageEnemy,
    increaseScore,
    increaseGold,
    gainExperience,
    addToBattleLog,
    resetBattleLog,
    setCurrentEnemy
  } = useGameState()

  const { isConnected } = useContract()

  const [playerTurn, setPlayerTurn] = useState(true)
  const [selectedAbility, setSelectedAbility] = useState<string | null>(null)
  const [abilityAnimation, setAbilityAnimation] = useState<string | null>(null)
  const [enemyAnimation, setEnemyAnimation] = useState<string | null>(null)
  const [showPauseMenu, setShowPauseMenu] = useState(false)
  const [turnCount, setTurnCount] = useState(1)
  const [comboCounter, setComboCounter] = useState(0)
  const [showComboText, setShowComboText] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [battleRewards, setBattleRewards] = useState<{xp: number, gold: number} | null>(null)

  const battleLogRef = useRef<HTMLDivElement>(null)

  // Auto-scroll battle log
  useEffect(() => {
    if (battleLogRef.current) {
      battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight
    }
  }, [battleLog])

  // Initialize battle
  useEffect(() => {
    if (selectedCharacter && !currentEnemy && !isGameOver) {
      // Generate enemy based on current level
      const enemy = generateEnemy(level)
      setCurrentEnemy(enemy)
      addToBattleLog(`Battle started against ${enemy.name}!`)
      addToBattleLog("Your turn - choose an ability!")
    }
  }, [selectedCharacter, currentEnemy, level, isGameOver, setCurrentEnemy, addToBattleLog])

  // Check for game over conditions
  useEffect(() => {
    if (playerHealth <= 0 && !isGameOver) {
      setIsGameOver(true)
      addToBattleLog("You have been defeated!")
      setTimeout(() => {
        onGameOver()
      }, 2000)
    }
  }, [playerHealth, isGameOver, addToBattleLog, onGameOver])

  // Check for victory conditions
  useEffect(() => {
    if (currentEnemy && currentEnemy.health <= 0 && !isGameOver) {
      setIsGameOver(true)
      
      // Calculate rewards based on enemy level and performance
      const baseXP = currentEnemy.level * 25
      const baseGold = currentEnemy.level * 15
      const comboBonus = Math.floor(comboCounter * 0.1)
      
      const finalXP = Math.floor(baseXP * (1 + comboBonus))
      const finalGold = Math.floor(baseGold * (1 + comboBonus))
      const scoreGained = currentEnemy.level * 100 + (comboCounter * 50)

      setBattleRewards({ xp: finalXP, gold: finalGold })

      addToBattleLog(`Victory! Defeated ${currentEnemy.name}!`)
      addToBattleLog(`Gained ${finalXP} XP and ${finalGold} gold!`)
      if (comboCounter > 0) {
        addToBattleLog(`Combo bonus: +${Math.floor(comboBonus * 100)}%`)
      }

      // Apply rewards
      increaseScore(scoreGained)
      increaseGold(finalGold)
      gainExperience(finalXP)

      setTimeout(() => {
        onVictory()
      }, 3000)
    }
  }, [currentEnemy, isGameOver, comboCounter, addToBattleLog, increaseScore, increaseGold, gainExperience, onVictory])

  // Enemy turn logic
  useEffect(() => {
    if (!playerTurn && currentEnemy && currentEnemy.health > 0 && playerHealth > 0 && !isGameOver) {
      const enemyTurnTimeout = setTimeout(() => {
        // Enemy AI: Select ability based on current situation
        const availableAbilities = currentEnemy.abilities.filter(ability => 
          ability.currentCooldown <= turnCount
        )
        
        let selectedEnemyAbility
        if (availableAbilities.length === 0) {
          // Use basic attack if all abilities on cooldown
          selectedEnemyAbility = {
            id: 'basic_attack',
            name: 'Basic Attack',
            damage: Math.floor(currentEnemy.level * 8),
            manaCost: 0,
            cooldown: 0,
            currentCooldown: 0,
            type: 'physical' as const,
            description: 'A basic physical attack',
            soundEffect: 'basic-attack.mp3'
          }
        } else {
          // Smart AI: prefer high damage abilities when player health is low
          if (playerHealth < playerMaxHealth * 0.3) {
            selectedEnemyAbility = availableAbilities.reduce((prev, current) => 
              prev.damage > current.damage ? prev : current
            )
          } else {
            // Random selection for balanced gameplay
            selectedEnemyAbility = availableAbilities[Math.floor(Math.random() * availableAbilities.length)]
          }
        }

        // Play enemy attack sound
        playSound(selectedEnemyAbility.soundEffect)

        // Show enemy attack animation
        setEnemyAnimation(selectedEnemyAbility.type)

        // Add to battle log
        addToBattleLog(`${currentEnemy.name} used ${selectedEnemyAbility.name}!`)

        // Calculate and apply damage
        setTimeout(() => {
          const damage = calculateEnemyDamage(selectedEnemyAbility.damage, currentEnemy.level)
          updatePlayerHealth(-damage)
          addToBattleLog(`You took ${damage} damage!`)

          // Reset combo on being hit
          setComboCounter(0)

          // Update ability cooldown
          if (selectedEnemyAbility.cooldown > 0) {
            const abilityIndex = currentEnemy.abilities.findIndex(a => a.id === selectedEnemyAbility.id)
            if (abilityIndex >= 0) {
              currentEnemy.abilities[abilityIndex].currentCooldown = turnCount + selectedEnemyAbility.cooldown
            }
          }

          // Clear animation and switch turns
          setTimeout(() => {
            setEnemyAnimation(null)
            if (playerHealth - damage > 0) {
              setPlayerTurn(true)
              setTurnCount(prev => prev + 1)
              addToBattleLog("Your turn!")
            }
          }, 500)
        }, 500)
      }, 1500)

      return () => clearTimeout(enemyTurnTimeout)
    }
  }, [playerTurn, currentEnemy, playerHealth, playerMaxHealth, turnCount, isGameOver, updatePlayerHealth, addToBattleLog])

  const calculateEnemyDamage = (baseDamage: number, enemyLevel: number): number => {
    const levelMultiplier = 1 + (enemyLevel - 1) * 0.1
    const randomFactor = 0.8 + Math.random() * 0.4 // 80-120% damage variance
    return Math.floor(baseDamage * levelMultiplier * randomFactor)
  }

  const generateEnemy = (currentLevel: number) => {
    const enemyTypes = [
      {
        name: "Corrupted Guardian",
        baseHealth: 80,
        abilities: [
          { id: "shadow_strike", name: "Shadow Strike", damage: 15, manaCost: 0, cooldown: 2, currentCooldown: 0, type: "physical" as const, description: "A dark physical attack", soundEffect: "shadow-attack.mp3" },
          { id: "void_pulse", name: "Void Pulse", damage: 25, manaCost: 0, cooldown: 4, currentCooldown: 0, type: "physical" as const, description: "A pulse of void energy", soundEffect: "void-attack.mp3" }
        ]
      },
      {
        name: "Lightning Wraith",
        baseHealth: 70,
        abilities: [
          { id: "lightning_bolt", name: "Lightning Bolt", damage: 20, manaCost: 0, cooldown: 1, currentCooldown: 0, type: "lightning" as const, description: "A bolt of lightning", soundEffect: "lightning-ability.mp3" },
          { id: "storm_call", name: "Storm Call", damage: 30, manaCost: 0, cooldown: 5, currentCooldown: 0, type: "lightning" as const, description: "Calls down a storm", soundEffect: "storm-attack.mp3" }
        ]
      },
      {
        name: "Flame Demon",
        baseHealth: 85,
        abilities: [
          { id: "fire_blast", name: "Fire Blast", damage: 18, manaCost: 0, cooldown: 2, currentCooldown: 0, type: "fire" as const, description: "A blast of fire", soundEffect: "fire-ability.mp3" },
          { id: "inferno", name: "Inferno", damage: 35, manaCost: 0, cooldown: 6, currentCooldown: 0, type: "fire" as const, description: "A raging inferno", soundEffect: "inferno-attack.mp3" }
        ]
      }
    ]

    const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)]
    const scaleFactor = 1 + (currentLevel - 1) * 0.2
    const health = Math.floor(randomType.baseHealth * scaleFactor)

    return {
      id: `enemy_${Date.now()}`,
      name: randomType.name,
      avatar: `/images/enemy-${Math.floor(Math.random() * 3) + 1}.png`,
      health,
      maxHealth: health,
      abilities: randomType.abilities,
      level: currentLevel
    }
  }

  const handleAbilitySelect = (abilityId: string) => {
    if (!playerTurn || isGameOver || !selectedCharacter || !currentEnemy) return

    const ability = selectedCharacter.abilities.find(a => a.id === abilityId)
    if (!ability) return

    setSelectedAbility(abilityId)

    // Check mana cost
    if (playerMana < ability.manaCost) {
      addToBattleLog(`Not enough mana to use ${ability.name}!`)
      setSelectedAbility(null)
      return
    }

    // Check cooldown
    if (ability.currentCooldown > turnCount) {
      addToBattleLog(`${ability.name} is on cooldown!`)
      setSelectedAbility(null)
      return
    }

    // Use the ability
    updatePlayerMana(-ability.manaCost)
    
    // Set cooldown
    ability.currentCooldown = turnCount + ability.cooldown

    // Play ability sound
    playSound(ability.soundEffect)

    // Show ability animation
    setAbilityAnimation(ability.type)

    // Add to battle log
    addToBattleLog(`You used ${ability.name}!`)

    // Update combo counter
    const newCombo = comboCounter + 1
    setComboCounter(newCombo)

    if (newCombo > 1) {
      setShowComboText(true)
      setTimeout(() => setShowComboText(false), 1500)
    }

    // Calculate damage with level and combo bonuses
    const levelBonus = selectedCharacter.level ? (selectedCharacter.level - 1) * 2 : 0
    const comboMultiplier = 1 + (newCombo - 1) * 0.15
    const baseDamage = ability.damage + levelBonus
    const finalDamage = Math.floor(baseDamage * comboMultiplier)

    // Apply damage after animation delay
    setTimeout(() => {
      damageEnemy(finalDamage)

      // Add damage info to battle log
      if (newCombo > 1) {
        addToBattleLog(`${newCombo}x COMBO! Dealt ${finalDamage} damage!`)
      } else {
        addToBattleLog(`${currentEnemy.name} took ${finalDamage} damage!`)
      }

      // Clear animation and switch turns
      setTimeout(() => {
        setAbilityAnimation(null)
        setSelectedAbility(null)

        // Regenerate mana
        const manaRegen = Math.floor(playerMaxMana * 0.1) // 10% mana regen per turn
        updatePlayerMana(manaRegen)

        // Switch to enemy turn if enemy is still alive
        if (currentEnemy.health - finalDamage > 0) {
          setPlayerTurn(false)
          addToBattleLog(`${currentEnemy.name}'s turn...`)
        }
      }, 500)
    }, 500)
  }

  const togglePauseMenu = () => {
    playSound("button-click.mp3")
    setShowPauseMenu(!showPauseMenu)
  }

  const handleExitGame = () => {
    playSound("button-click.mp3")
    if (window.confirm("Are you sure you want to exit? Progress will be saved.")) {
      resetBattleLog()
      onExit()
    } else {
      setShowPauseMenu(false)
    }
  }

  // Show loading if no character selected
  if (!selectedCharacter) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-yellow-400">No Character Selected</h2>
          <p className="text-gray-300 mb-4">Please select a character first</p>
          <Button onClick={onExit}>Return to Character Selection</Button>
        </div>
      </div>
    )
  }

  // Show loading if no enemy
  if (!currentEnemy) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="mb-4"
          >
            <Sword className="h-16 w-16 text-yellow-400 mx-auto" />
          </motion.div>
          <h2 className="text-2xl font-bold text-yellow-400">Preparing Battle...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gray-900">
      {/* Battle Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(/images/battle-background-${level % 3 + 1}.jpg)`,
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Battle HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10">
        {/* Player Stats */}
        <div className="bg-black/80 p-4 rounded-lg w-72 border border-yellow-600/50">
          <div className="flex items-center mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-amber-700 p-0.5 mr-3">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-900">
                <img
                  src={selectedCharacter.avatar || "/placeholder.svg?height=48&width=48"}
                  alt={selectedCharacter.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white">{selectedCharacter.name}</h3>
              <div className="text-xs text-gray-300">Level {selectedCharacter.level || 1}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <div className="flex items-center">
                  <Heart className="h-3 w-3 text-red-500 mr-1" />
                  <span>Health</span>
                </div>
                <span>{playerHealth}/{playerMaxHealth}</span>
              </div>
              <Progress
                value={(playerHealth / playerMaxHealth) * 100}
                className="h-2 bg-gray-700"
                indicatorClassName="bg-red-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <div className="flex items-center">
                  <Droplet className="h-3 w-3 text-blue-500 mr-1" />
                  <span>Mana</span>
                </div>
                <span>{playerMana}/{playerMaxMana}</span>
              </div>
              <Progress
                value={(playerMana / playerMaxMana) * 100}
                className="h-2 bg-gray-700"
                indicatorClassName="bg-blue-500"
              />
            </div>

            {/* Combo Counter */}
            {comboCounter > 0 && (
              <div className="bg-purple-900/50 border border-purple-500/50 rounded p-2">
                <div className="text-center">
                  <span className="text-purple-300 text-sm">Combo</span>
                  <div className="text-purple-400 font-bold">{comboCounter}x</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Battle Info */}
        <div className="bg-black/80 p-4 rounded-lg border border-purple-600/50">
          <div className="text-center">
            <div className="text-xs text-gray-300 mb-1">Battle Level {level}</div>
            <div className="text-sm font-bold text-yellow-400 mb-2">Turn {turnCount}</div>
            <div className="text-xs text-purple-300">
              {playerTurn ? "Your Turn" : `${currentEnemy.name}'s Turn`}
            </div>
          </div>
          
          <div className="mt-3 flex justify-between text-xs">
            <div className="text-center">
              <Trophy className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
              <div className="text-yellow-400">{score}</div>
            </div>
            <div className="text-center">
              <Coins className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
              <div className="text-yellow-400">{gold}</div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={togglePauseMenu}
            className="w-full mt-3 bg-gray-800/90 hover:bg-gray-700/90"
          >
            Menu
          </Button>
        </div>

        {/* Enemy Stats */}
        <div className="bg-black/80 p-4 rounded-lg w-72 border border-red-600/50">
          <div className="flex items-center mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 p-0.5 mr-3">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-900">
                <img
                  src={currentEnemy.avatar || "/placeholder.svg?height=48&width=48"}
                  alt={currentEnemy.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white">{currentEnemy.name}</h3>
              <div className="text-xs text-gray-300">Level {currentEnemy.level}</div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <div className="flex items-center">
                <Heart className="h-3 w-3 text-red-500 mr-1" />
                <span>Health</span>
              </div>
              <span>{currentEnemy.health}/{currentEnemy.maxHealth}</span>
            </div>
            <Progress
              value={(currentEnemy.health / currentEnemy.maxHealth) * 100}
              className="h-2 bg-gray-700"
              indicatorClassName="bg-red-500"
            />
          </div>
        </div>
      </div>

      {/* Battle Area */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Battle Effects */}
        <BattleEffects playerAnimation={abilityAnimation} enemyAnimation={enemyAnimation} />

        {/* Enemy Character */}
        <motion.div
          className="absolute right-1/4 top-1/3 z-20"
          animate={enemyAnimation ? { x: [-10, 10, -5, 5, 0], y: [-5, 5, -2, 2, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 3, repeatType: "reverse" }}
          >
            <img
              src={currentEnemy.avatar || "/placeholder.svg?height=200&width=200"}
              alt={currentEnemy.name}
              className="w-48 h-48 object-contain filter drop-shadow-2xl"
            />
          </motion.div>
        </motion.div>

        {/* Player Character */}
        <motion.div
          className="absolute left-1/4 bottom-1/3 z-20"
          animate={abilityAnimation ? { rotate: [-2, 2, -1, 1, 0] } : {}}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, repeatType: "reverse" }}
          >
            <img
              src={selectedCharacter.avatar || "/placeholder.svg?height=200&width=200"}
              alt={selectedCharacter.name}
              className="w-48 h-48 object-contain filter drop-shadow-2xl"
            />
          </motion.div>
        </motion.div>

        {/* Combo Text */}
        <AnimatePresence>
          {showComboText && comboCounter > 1 && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 0 }}
              animate={{ scale: 1.5, opacity: 1, y: -50 }}
              exit={{ scale: 0.5, opacity: 0, y: -100 }}
              transition={{ duration: 0.5 }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
            >
              <div className="text-6xl font-bold text-purple-400 filter drop-shadow-lg">
                {comboCounter}x COMBO!
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Victory Rewards Display */}
        <AnimatePresence>
          {battleRewards && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
            >
              <div className="bg-black/90 border-2 border-yellow-500 rounded-lg p-6 text-center">
                <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-yellow-400 mb-3">Victory!</h3>
                <div className="space-y-2">
                  <div className="text-green-400">+{battleRewards.xp} XP</div>
                  <div className="text-yellow-400">+{battleRewards.gold} Gold</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Battle Log */}
      <div
        ref={battleLogRef}
        className="absolute bottom-32 left-4 w-80 h-48 bg-black/80 rounded-lg p-4 overflow-y-auto text-sm border border-gray-600 z-10"
      >
        <div className="text-yellow-400 font-bold mb-2 border-b border-gray-600 pb-1">Battle Log</div>
        {battleLog.map((log, index) => (
          <div key={index} className="mb-1 text-gray-200">
            {log}
          </div>
        ))}
      </div>

      {/* Abilities Panel */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/90 border-t border-gray-600 z-10">
        <div className="grid grid-cols-4 gap-3 max-w-4xl mx-auto">
          {selectedCharacter.abilities.map((ability) => {
            const isOnCooldown = ability.currentCooldown > turnCount
            const canAfford = playerMana >= ability.manaCost
            const canUse = playerTurn && !isGameOver && canAfford && !isOnCooldown

            return (
              <Button
                key={ability.id}
                onClick={() => handleAbilitySelect(ability.id)}
                disabled={!canUse}
                className={`
                  relative p-4 h-auto text-left border-2 transition-all
                  ${selectedAbility === ability.id 
                    ? "bg-yellow-600 hover:bg-yellow-700 border-yellow-400" 
                    : "bg-gray-800 hover:bg-gray-700 border-gray-600"
                  }
                  ${!canUse ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                <div>
                  <div className="font-bold text-white mb-1">{ability.name}</div>
                  <div className="text-xs text-gray-300 mb-2">{ability.description}</div>
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <Sword className="h-3 w-3 text-red-400 mr-1" />
                        <span>{ability.damage}</span>
                      </div>
                      <div className="flex items-center">
                        <Droplet className="h-3 w-3 text-blue-400 mr-1" />
                        <span>{ability.manaCost}</span>
                      </div>
                    </div>
                    {isOnCooldown && (
                      <div className="text-orange-400">
                        CD: {ability.currentCooldown - turnCount}
                      </div>
                    )}
                  </div>
                </div>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Pause Menu */}
      <AnimatePresence>
        {showPauseMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 p-8 rounded-lg w-80 border border-purple-600"
            >
              <h2 className="text-2xl font-bold text-center mb-6 text-yellow-400">Game Paused</h2>

              <div className="space-y-4">
                <div className="text-center text-gray-300 space-y-1">
                  <div>Level: {level}</div>
                  <div>Score: {score}</div>
                  <div>Gold: {gold}</div>
                  {isConnected && <div className="text-green-400 text-sm">✓ Blockchain connected</div>}
                </div>

                <div className="border-t border-gray-700 pt-4 space-y-3">
                  <Button
                    onClick={togglePauseMenu}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold"
                  >
                    Resume Battle
                  </Button>

                  <Button 
                    onClick={handleExitGame} 
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Exit to Main Menu
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}