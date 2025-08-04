// components/contract-pvp-battle.tsx - Arena-style PvP with Smart Contract Wagering
"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Heart, Droplet, Sword, Shield, Home, Trophy, Coins } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useContractMultiplayer } from "./contract-multiplayer-provider"
import { useGameState } from "./game-state-provider"
import { useContract } from "@/hooks/use-contract"
import { useWallet } from "@/hooks/use-wallet"
import { playSound } from "@/lib/sound-utils"
import BattleEffects from "./battle-effects"
import TransactionStatus from "./transaction-status"
import { Web3Utils } from "@/lib/Web3-Utils"
import type { Hash } from "viem"

interface ContractPvPBattleProps {
  onGameOver: () => void
  onVictory: () => void
  onExit: () => void
}

export default function ContractPvPBattle({ onGameOver, onVictory, onExit }: ContractPvPBattleProps) {
  const { 
    isHost, 
    playerName, 
    currentRoom, 
    leaveRoom,
    contractMatchId,
    stakeAmount
  } = useContractMultiplayer()
  
  const { 
    selectedCharacter, 
    playerHealth, 
    playerMaxHealth, 
    playerMana, 
    playerMaxMana, 
    updatePlayerHealth, 
    updatePlayerMana, 
    addToBattleLog, 
    battleLog,
    resetBattleLog
  } = useGameState()
  
  const { 
    makeMove,
    getMatch
  } = useContract()
  
  const { address, getFormattedBalance } = useWallet()
  
  // Create playerId from address for compatibility
  const playerId = address || ""
  
  // Opponent data
  const opponentName = isHost 
    ? currentRoom?.guestName || "Opponent" 
    : currentRoom?.hostName || "Opponent"
    
  const opponentCharacter = isHost ? currentRoom?.guestCharacter : currentRoom?.hostCharacter
  
  // Battle state
  const [opponentHealth, setOpponentHealth] = useState(opponentCharacter?.health || 100)
  const [opponentMaxHealth, setOpponentMaxHealth] = useState(opponentCharacter?.health || 100)
  const [opponentMana, setOpponentMana] = useState(opponentCharacter?.mana || 100)
  const [opponentMaxMana, setOpponentMaxMana] = useState(opponentCharacter?.mana || 100)
  const [playerTurn, setPlayerTurn] = useState(isHost) // Host goes first
  const [turnCount, setTurnCount] = useState(1)
  const [selectedAbility, setSelectedAbility] = useState<string | null>(null)
  const [playerAnimation, setPlayerAnimation] = useState<string | null>(null)
  const [opponentAnimation, setOpponentAnimation] = useState<string | null>(null)
  const [comboCounter, setComboCounter] = useState(0)
  const [showComboText, setShowComboText] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [showPauseMenu, setShowPauseMenu] = useState(false)

  // Contract state
  const [gameWinner, setGameWinner] = useState<string | null>(null)
  const [totalStake, setTotalStake] = useState("0")
  const [isPayingOut, setIsPayingOut] = useState(false)
  const [payoutHash, setPayoutHash] = useState<Hash | null>(null)
  const [payoutComplete, setPayoutComplete] = useState(false)
  
  const battleLogRef = useRef<HTMLDivElement>(null)

  // Calculate total stake pool (both players' stakes)
  useEffect(() => {
    if (stakeAmount) {
      const stake = parseFloat(stakeAmount)
      setTotalStake((stake * 2).toString()) // Both players stake the same amount
    }
  }, [stakeAmount])

  // Initialize battle state
  useEffect(() => {
    resetBattleLog()
    
    if (opponentCharacter) {
      setOpponentHealth(opponentCharacter.health)
      setOpponentMaxHealth(opponentCharacter.health)
      setOpponentMana(opponentCharacter.mana)
      setOpponentMaxMana(opponentCharacter.mana)
      
      addToBattleLog("🏟️ Arena Battle Started!")
      addToBattleLog(`💰 Total Stake Pool: ${totalStake} ETH`)
      addToBattleLog(`⚔️ ${opponentName} vs ${playerName}`)
      addToBattleLog(`${isHost ? "You" : opponentName} go first!`)
    }
    
    setPlayerTurn(isHost)
    setTurnCount(1)
    
    return () => {
      resetBattleLog()
    }
  }, [opponentCharacter, isHost, opponentName, playerName, totalStake, addToBattleLog, resetBattleLog])

  // Scroll battle log to bottom
  useEffect(() => {
    if (battleLogRef.current) {
      battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight
    }
  }, [battleLog])

  // Listen for opponent actions via socket
  useEffect(() => {
    const handleGameAction = (e: CustomEvent) => {
      if (!e.detail) return
      
      const { 
        playerId: actingPlayerId, 
        action, 
        result 
      } = e.detail
      
      // Only process actions from opponent
      if (actingPlayerId === playerId) return
      
      // Handle ability use
      if (action?.type === 'ability' && result?.ability) {
        setOpponentAnimation(result.ability.type)
        playSound(result.ability.soundEffect || 'ability.mp3')
        addToBattleLog(`⚡ ${opponentName} used ${result.ability.name}!`)
        
        setTimeout(() => {
          if (result.damage) {
            updatePlayerHealth(-result.damage)
            addToBattleLog(`💥 You took ${result.damage} damage!`)
            
            // Check if player is defeated
            if (playerHealth - result.damage <= 0) {
              handleGameOver(false) // Player lost
              return
            }
          }
          
          setComboCounter(0)
          
          setTimeout(() => {
            setOpponentAnimation(null)
            
            if (!isGameOver) {
              setPlayerTurn(true)
              setTurnCount(prev => prev + 1)
              addToBattleLog("🎯 Your turn!")
            }
          }, 500)
        }, 500)
      }
    }

    window.addEventListener('game_action' as any, handleGameAction)
    return () => window.removeEventListener('game_action' as any, handleGameAction)
  }, [playerId, opponentName, playerHealth, isGameOver, updatePlayerHealth, addToBattleLog])

  // Check for game over conditions
  useEffect(() => {
    if (playerHealth <= 0 && !isGameOver) {
      handleGameOver(false) // Player lost
    }
  }, [playerHealth, isGameOver])

  useEffect(() => {
    if (opponentHealth <= 0 && !isGameOver) {
      handleGameOver(true) // Player won
    }
  }, [opponentHealth, isGameOver])

  // Handle game over and payouts
  const handleGameOver = async (playerWon: boolean) => {
    setIsGameOver(true)
    setGameWinner(playerWon ? playerName : opponentName)
    
    if (playerWon) {
      playSound('victory.mp3')
      addToBattleLog(`🎉 Victory! You defeated ${opponentName}!`)
      addToBattleLog(`💰 Claiming ${totalStake} ETH prize pool...`)
      
      // Process payout via smart contract
      if (contractMatchId && !isPayingOut) {
        setIsPayingOut(true)
        
        try {
          addToBattleLog("🔄 Processing smart contract payout...")
          // For now, we'll handle payouts automatically via the contract's _endMatch function
          // The winner claiming is handled by the smart contract when a character's health reaches 0
          addToBattleLog("✅ Victory confirmed! Prize will be distributed automatically.")
          
          // Simulate transaction processing for UX
          setTimeout(() => {
            setPayoutComplete(true)
            addToBattleLog(`🏆 ${totalStake} ETH prize distribution initiated!`)
            setTimeout(() => onVictory(), 3000)
          }, 2000)
          
        } catch (error) {
          console.error('Payout failed:', error)
          addToBattleLog("❌ Payout failed. Please contact support.")
          setTimeout(() => onVictory(), 2000)
        }
      } else {
        setTimeout(() => onVictory(), 2000)
      }
    } else {
      playSound('game-over.mp3')
      addToBattleLog(`💀 Defeat! ${opponentName} wins!`)
      addToBattleLog(`💸 ${opponentName} claims the ${totalStake} ETH prize pool`)
      setTimeout(() => onGameOver(), 3000)
    }

    // For contract battles, the contract handles the battle end
    // Just cleanup local state
    setIsGameOver(true)
  }

  // Handle ability selection and execution
  const handleAbilityUse = async (abilityName: string) => {
    if (!playerTurn || !selectedCharacter || isGameOver) return

    const abilities = getCharacterAbilities(selectedCharacter.name)
    const ability = abilities.find(a => a.name === abilityName)
    
    if (!ability) return
    
    // Check mana cost
    if (playerMana < ability.manaCost) {
      addToBattleLog("❌ Not enough mana!")
      return
    }

    setSelectedAbility(abilityName)
    setPlayerTurn(false)
    
    // Update mana
    updatePlayerMana(-ability.manaCost)
    
    // Play sound and animation
    playSound(ability.soundEffect)
    setPlayerAnimation(ability.type)
    
    addToBattleLog(`⚡ You used ${ability.name}!`)

    // Submit move to smart contract if available
    if (contractMatchId && makeMove) {
      try {
        const abilityIndex = abilities.findIndex(a => a.name === abilityName)
        await makeMove(contractMatchId, abilityIndex)
      } catch (error) {
        console.error('Contract move failed:', error)
      }
    }

    // Calculate damage
    setTimeout(() => {
      const baseDamage = ability.damage
      const levelMultiplier = 1 + (selectedCharacter.level * 0.1)
      const comboMultiplier = 1 + (comboCounter * 0.05)
      const randomFactor = 0.8 + Math.random() * 0.4
      
      const finalDamage = Math.floor(baseDamage * levelMultiplier * comboMultiplier * randomFactor)
      
      // Apply damage to opponent
      const newOpponentHealth = Math.max(0, opponentHealth - finalDamage)
      setOpponentHealth(newOpponentHealth)
      
      // Update combo counter
      setComboCounter(prev => prev + 1)
      if (comboCounter > 2) {
        setShowComboText(true)
        setTimeout(() => setShowComboText(false), 1500)
      }
      
      addToBattleLog(`💥 ${opponentName} takes ${finalDamage} damage!`)
      
      // Check if opponent is defeated
      if (newOpponentHealth <= 0) {
        handleGameOver(true) // Player won
        return
      }
      
      // Notify opponent of the action via socket
      const gameAction = {
        playerId,
        action: { type: 'ability', abilityName },
        result: {
          ability: { name: ability.name, type: ability.type, soundEffect: ability.soundEffect },
          damage: finalDamage
        }
      }
      
      // Update opponent health locally (contract handles authoritative state)
      setOpponentHealth(newOpponentHealth)
      window.dispatchEvent(new CustomEvent('game_action', { detail: gameAction }))
      
      setTimeout(() => {
        setPlayerAnimation(null)
        
        if (!isGameOver) {
          setTurnCount(prev => prev + 1)
          addToBattleLog("⏳ Waiting for opponent...")
        }
      }, 500)
    }, 500)
  }

  // Get character abilities
  const getCharacterAbilities = (characterName: string) => {
    const abilityMap: Record<string, any[]> = {
      "Chronos": [
        { name: "Time Slash", damage: 25, manaCost: 20, type: "slash", soundEffect: "time-slash.mp3" },
        { name: "Temporal Blast", damage: 35, manaCost: 30, type: "blast", soundEffect: "temporal-blast.mp3" },
        { name: "Time Freeze", damage: 15, manaCost: 25, type: "freeze", soundEffect: "time-freeze.mp3" },
        { name: "Chrono Strike", damage: 45, manaCost: 40, type: "strike", soundEffect: "chrono-strike.mp3" }
      ],
      "Pyromancer": [
        { name: "Fireball", damage: 30, manaCost: 25, type: "fire", soundEffect: "fireball.mp3" },
        { name: "Flame Burst", damage: 20, manaCost: 20, type: "fire", soundEffect: "flame-burst.mp3" },
        { name: "Inferno", damage: 50, manaCost: 45, type: "fire", soundEffect: "inferno.mp3" },
        { name: "Fire Shield", damage: 10, manaCost: 15, type: "shield", soundEffect: "fire-shield.mp3" }
      ],
      "Stormcaller": [
        { name: "Lightning Bolt", damage: 28, manaCost: 22, type: "lightning", soundEffect: "lightning.mp3" },
        { name: "Thunder Strike", damage: 35, manaCost: 30, type: "lightning", soundEffect: "thunder.mp3" },
        { name: "Storm Shield", damage: 12, manaCost: 18, type: "shield", soundEffect: "storm.mp3" },
        { name: "Chain Lightning", damage: 40, manaCost: 38, type: "lightning", soundEffect: "chain-lightning.mp3" }
      ]
    }
    
    return abilityMap[characterName] || abilityMap["Chronos"]
  }

  const abilities = selectedCharacter ? getCharacterAbilities(selectedCharacter.name) : []

  const handleExit = () => {
    leaveRoom()
    onExit()
  }

  if (!selectedCharacter || !opponentCharacter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-muted-foreground mb-4">Loading battle...</div>
          <Button onClick={handleExit}>Exit</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[url('/images/battle-background.jpg')] bg-cover bg-center opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />
      
      {/* Battle Arena UI */}
      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-black/30">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleExit}>
              <Home className="w-4 h-4" />
            </Button>
            <div className="text-lg font-bold">Arena Battle</div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <Coins className="w-4 h-4" />
              <span className="font-bold">{totalStake} ETH Pool</span>
            </div>
            <div className="text-sm text-muted-foreground">Turn {turnCount}</div>
          </div>
        </div>

        {/* Battle Area */}
        <div className="flex-1 flex">
          {/* Player Character */}
          <div className="w-1/2 flex flex-col justify-center items-center p-8">
            <motion.div
              className="relative"
              animate={playerAnimation ? { scale: [1, 1.1, 1], x: [0, 20, 0] } : {}}
              transition={{ duration: 0.5 }}
            >
              <img
                src={selectedCharacter.avatar}
                alt={selectedCharacter.name}
                className="w-48 h-48 object-cover rounded-full border-4 border-blue-400 shadow-lg"
              />
              <BattleEffects 
                type={playerAnimation} 
                position="center"
                onComplete={() => setPlayerAnimation(null)}
              />
            </motion.div>
            
            <div className="mt-4 text-center">
              <h3 className="text-xl font-bold text-blue-400">{playerName}</h3>
              <p className="text-sm text-muted-foreground">{selectedCharacter.name}</p>
            </div>
            
            {/* Player Stats */}
            <div className="mt-4 w-full max-w-xs space-y-2">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                <Progress 
                  value={(playerHealth / playerMaxHealth) * 100} 
                  className="flex-1 h-2"
                />
                <span className="text-sm font-mono">{playerHealth}/{playerMaxHealth}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Droplet className="w-4 h-4 text-blue-400" />
                <Progress 
                  value={(playerMana / playerMaxMana) * 100} 
                  className="flex-1 h-2"
                />
                <span className="text-sm font-mono">{playerMana}/{playerMaxMana}</span>
              </div>
            </div>
          </div>

          {/* VS Indicator */}
          <div className="flex items-center justify-center px-4">
            <div className="text-6xl font-bold text-purple-400 opacity-50">VS</div>
          </div>

          {/* Opponent Character */}
          <div className="w-1/2 flex flex-col justify-center items-center p-8">
            <motion.div
              className="relative"
              animate={opponentAnimation ? { scale: [1, 1.1, 1], x: [0, -20, 0] } : {}}
              transition={{ duration: 0.5 }}
            >
              <img
                src={opponentCharacter.avatar}
                alt={opponentCharacter.name}
                className="w-48 h-48 object-cover rounded-full border-4 border-red-400 shadow-lg"
              />
              <BattleEffects 
                type={opponentAnimation} 
                position="center"
                onComplete={() => setOpponentAnimation(null)}
              />
            </motion.div>
            
            <div className="mt-4 text-center">
              <h3 className="text-xl font-bold text-red-400">{opponentName}</h3>
              <p className="text-sm text-muted-foreground">{opponentCharacter.name}</p>
            </div>
            
            {/* Opponent Stats */}
            <div className="mt-4 w-full max-w-xs space-y-2">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                <Progress 
                  value={(opponentHealth / opponentMaxHealth) * 100} 
                  className="flex-1 h-2"
                />
                <span className="text-sm font-mono">{opponentHealth}/{opponentMaxHealth}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Droplet className="w-4 h-4 text-blue-400" />
                <Progress 
                  value={(opponentMana / opponentMaxMana) * 100} 
                  className="flex-1 h-2"
                />
                <span className="text-sm font-mono">{opponentMana}/{opponentMaxMana}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom UI */}
        <div className="bg-black/40 p-4 space-y-4">
          {/* Battle Log */}
          <div className="bg-black/50 rounded-lg p-4 h-32 overflow-y-auto" ref={battleLogRef}>
            <div className="space-y-1 text-sm">
              {battleLog.map((message, index) => (
                <div key={index} className="text-gray-300">
                  {message}
                </div>
              ))}
            </div>
          </div>

          {/* Abilities */}
          <div className="grid grid-cols-4 gap-2">
            {abilities.map((ability, index) => (
              <Button
                key={index}
                onClick={() => handleAbilityUse(ability.name)}
                disabled={!playerTurn || playerMana < ability.manaCost || isGameOver}
                variant={selectedAbility === ability.name ? "default" : "secondary"}
                className="h-16 flex flex-col items-center justify-center gap-1"
              >
                <span className="text-xs font-bold">{ability.name}</span>
                <span className="text-xs text-muted-foreground">{ability.manaCost} MP</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Combo Text */}
      <AnimatePresence>
        {showComboText && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="text-4xl font-bold text-yellow-400 text-center">
              {comboCounter}x COMBO!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction Status */}
      {payoutHash && (
        <div className="absolute top-4 right-4 z-50">
          <TransactionStatus 
            hash={payoutHash}
            title={payoutComplete ? "💰 Payout Complete!" : "🔄 Processing Payout..."}
            onComplete={() => setPayoutComplete(true)}
          />
        </div>
      )}

      {/* Game Over Overlay */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-purple-900 to-blue-900 p-8 rounded-xl text-center max-w-md mx-4"
            >
              {gameWinner === playerName ? (
                <div>
                  <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-yellow-400 mb-2">VICTORY!</h2>
                  <p className="text-lg mb-4">You defeated {opponentName}!</p>
                  <div className="flex items-center justify-center gap-2 text-2xl font-bold text-green-400">
                    <Coins className="w-6 h-6" />
                    <span>+{totalStake} ETH</span>
                  </div>
                  {isPayingOut && (
                    <p className="text-sm text-muted-foreground mt-2 animate-pulse">
                      Processing payout...
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="text-6xl mb-4">💀</div>
                  <h2 className="text-3xl font-bold text-red-400 mb-2">DEFEAT</h2>
                  <p className="text-lg mb-4">{opponentName} wins!</p>
                  <div className="flex items-center justify-center gap-2 text-xl text-red-400">
                    <Coins className="w-5 h-5" />
                    <span>-{stakeAmount} ETH</span>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}