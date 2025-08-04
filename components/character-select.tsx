// components/character-select.tsx - Phase 3: Contract Integration
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Check, Plus, Star, Zap, ShoppingCart, TrendingUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameState } from "./game-state-provider"
import { useMultiplayer } from "./multiplayer-context-provider"
import { useContractMultiplayer } from "./contract-multiplayer-provider"
import { playSound } from "@/lib/sound-utils"
import { Web3Utils, type CharacterInstance, type CharacterType } from "@/lib/Web3-Utils"
import TransactionStatus from "./transaction-status"
import { useAccount } from "wagmi"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CharacterSelectProps {
  onSelect: () => void
  onBack: () => void
  isMultiplayer?: boolean
}

type ViewMode = 'owned' | 'available'

export default function CharacterSelect({ onSelect, onBack, isMultiplayer = false }: CharacterSelectProps) {
  const { address } = useAccount()
  const { 
    contractCharacterTypes, 
    ownedCharacters, 
    isLoadingContract, 
    contractError,
    selectContractCharacter,
    acquireNewCharacter,
    levelUpCharacter,
    refreshContractData
  } = useGameState()
  
  // Try to get multiplayer context, but don't fail if it's not available
  let selectMultiplayerCharacter: ((character: any) => void) | null = null
  try {
    const { selectCharacter } = useMultiplayer()
    selectMultiplayerCharacter = selectCharacter
  } catch (error) {
    // useMultiplayer not available in this context, that's okay
    console.log('Regular multiplayer context not available, trying contract multiplayer...')
    try {
      const { selectCharacter } = useContractMultiplayer()
      selectMultiplayerCharacter = selectCharacter
    } catch (contractError) {
      // Neither multiplayer context available, that's okay for single player
      console.log('Contract multiplayer context not available either')
    }
  }
  
  const [viewMode, setViewMode] = useState<ViewMode>('owned')
  const [selectedOwnedIndex, setSelectedOwnedIndex] = useState(0)
  const [selectedAvailableIndex, setSelectedAvailableIndex] = useState(0)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isAcquiring, setIsAcquiring] = useState(false)
  const [isLevelingUp, setIsLevelingUp] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const [transactionError, setTransactionError] = useState<string | null>(null)

  // Initialize view mode based on owned characters
  useEffect(() => {
    if (ownedCharacters.length > 0) {
      setViewMode('owned')
    } else {
      setViewMode('available')
    }
  }, [ownedCharacters.length])

  // Refresh contract data when component mounts
  useEffect(() => {
    if (address) {
      refreshContractData()
    }
  }, [address, refreshContractData])

  const handlePrevious = () => {
    playSound("button-click.mp3")
    if (viewMode === 'owned') {
      setSelectedOwnedIndex((prev) => (prev === 0 ? ownedCharacters.length - 1 : prev - 1))
    } else {
      setSelectedAvailableIndex((prev) => (prev === 0 ? contractCharacterTypes.length - 1 : prev - 1))
    }
  }

  const handleNext = () => {
    playSound("button-click.mp3")
    if (viewMode === 'owned') {
      setSelectedOwnedIndex((prev) => (prev === ownedCharacters.length - 1 ? 0 : prev + 1))
    } else {
      setSelectedAvailableIndex((prev) => (prev === contractCharacterTypes.length - 1 ? 0 : prev + 1))
    }
  }

  const handleSelect = async () => {
    if (viewMode === 'owned' && ownedCharacters.length > 0) {
      playSound("character-select.mp3")
      setIsConfirming(true)

      const selectedCharacterInstance = ownedCharacters[selectedOwnedIndex]
      
      try {
        // Select the character in game state
        await selectContractCharacter(selectedCharacterInstance)
        
        // For multiplayer, also update multiplayer context
        if (isMultiplayer && selectMultiplayerCharacter) {
          // Convert to multiplayer character format
          const multiplayerCharacter = {
            id: selectedCharacterInstance.id.toString(),
            name: selectedCharacterInstance.characterTypeName,
            avatar: getCharacterAvatar(selectedCharacterInstance.characterTypeName),
            health: selectedCharacterInstance.health,
            mana: selectedCharacterInstance.mana,
            description: getCharacterDescription(selectedCharacterInstance.characterTypeName),
            abilities: [] // Will be populated by game state
          }
          selectMultiplayerCharacter(multiplayerCharacter)
        }
        
        // Navigate after short delay
        setTimeout(() => {
          onSelect()
        }, 1500)
      } catch (error) {
        console.error('Error selecting character:', error)
        setIsConfirming(false)
      }
    }
  }

  const handleAcquireCharacter = async () => {
    if (contractCharacterTypes.length === 0) return
    
    const selectedType = contractCharacterTypes[selectedAvailableIndex]
    
    playSound("button-click.mp3")
    setIsAcquiring(true)
    setTransactionError(null)
    setTransactionHash(null)
    
    try {
      const hash = await acquireNewCharacter(selectedType.id)
      setTransactionHash(hash)
      
      // Switch to owned characters view after successful acquisition
      setTimeout(() => {
        setViewMode('owned')
        setSelectedOwnedIndex(ownedCharacters.length) // Select the new character
        setIsAcquiring(false)
        setTransactionHash(null)
      }, 3000)
    } catch (error: any) {
      console.error('Error acquiring character:', error)
      setTransactionError(error.message || 'Failed to acquire character')
      setIsAcquiring(false)
      setTransactionHash(null)
    }
  }

  const handleLevelUp = async () => {
    if (ownedCharacters.length === 0) return
    
    const selectedCharacterInstance = ownedCharacters[selectedOwnedIndex]
    
    playSound("button-click.mp3")
    setIsLevelingUp(true)
    setTransactionError(null)
    setTransactionHash(null)
    
    try {
      const hash = await levelUpCharacter(selectedCharacterInstance.id)
      setTransactionHash(hash)
      
      setTimeout(() => {
        setIsLevelingUp(false)
        setTransactionHash(null)
      }, 3000)
    } catch (error: any) {
      console.error('Error leveling up character:', error)
      setTransactionError(error.message || 'Failed to level up character')
      setIsLevelingUp(false)
      setTransactionHash(null)
    }
  }

  const handleBack = () => {
    playSound("button-click.mp3")
    onBack()
  }

  const canLevelUp = (character: CharacterInstance): boolean => {
    const requiredExp = character.level * 100
    return character.experience >= requiredExp && character.level < 100
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

  const getCharacterDescription = (characterName: string): string => {
    const descriptions: Record<string, string> = {
      'Zeus': 'Master of lightning and ruler of the heavens',
      'Athena': 'Goddess of wisdom and strategic warfare',
      'Hades': 'Lord of the underworld and master of death',
      'Nyx': 'Primordial goddess of night and shadows'
    }
    return descriptions[characterName] || 'A powerful character'
  }

  // Loading state
  if (isLoadingContract) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden bg-gradient-to-b from-gray-900 to-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="mb-4"
        >
          <Zap className="h-16 w-16 text-yellow-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-yellow-400 mb-2">Loading Characters...</h2>
        <p className="text-gray-300">Connecting to the blockchain...</p>
      </div>
    )
  }

  // Error state
  if (contractError) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden bg-gradient-to-b from-gray-900 to-black">
        <Alert variant="destructive" className="max-w-md mb-4">
          <AlertDescription>{contractError}</AlertDescription>
        </Alert>
        <Button onClick={refreshContractData} className="bg-yellow-600 hover:bg-yellow-700">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retry
        </Button>
        <Button onClick={handleBack} variant="outline" className="mt-2">
          Back to Menu
        </Button>
      </div>
    )
  }

  const currentOwnedCharacter = ownedCharacters[selectedOwnedIndex]
  const currentAvailableType = contractCharacterTypes[selectedAvailableIndex]

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden"
      style={{
        backgroundImage: `url(https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Apr%2025%2C%202025%2C%2005_52_37%20PM-6IHp4UAeAu7379o8WR2JRyiAuYRvjo.png)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mb-8"
      >
        <h1 className="text-4xl font-bold text-center text-yellow-400">Choose Your Champion</h1>
        <p className="text-center text-gray-300 mt-2">
          {isMultiplayer 
            ? "Select your character for multiplayer battle" 
            : "Select your character for your time journey"
          }
        </p>
      </motion.div>

      {/* View Mode Toggle */}
      <div className="relative z-10 flex bg-black/70 rounded-lg p-1 mb-6">
        <Button
          onClick={() => setViewMode('owned')}
          className={`px-6 py-2 rounded-md transition-all ${
            viewMode === 'owned'
              ? 'bg-purple-600 text-white'
              : 'bg-transparent text-gray-300 hover:text-white'
          }`}
          disabled={isAcquiring || isLevelingUp}
        >
          <Star className="h-4 w-4 mr-2" />
          My Characters ({ownedCharacters.length})
        </Button>
        <Button
          onClick={() => setViewMode('available')}
          className={`px-6 py-2 rounded-md transition-all ${
            viewMode === 'available'
              ? 'bg-purple-600 text-white'
              : 'bg-transparent text-gray-300 hover:text-white'
          }`}
          disabled={isAcquiring || isLevelingUp}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Acquire New
        </Button>
      </div>

      {/* Transaction Status */}
      <AnimatePresence>
        {(isAcquiring || isLevelingUp || transactionHash || transactionError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-10 w-full max-w-md mb-6"
          >
            <TransactionStatus
              isLoading={isAcquiring || isLevelingUp}
              error={transactionError}
              hash={transactionHash as any}
              title={isAcquiring ? "Acquiring Character" : "Leveling Up Character"}
              onClose={() => {
                setTransactionError(null)
                setTransactionHash(null)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Character Display */}
      <div className="relative z-10 flex items-center justify-center w-full max-w-4xl">
        {/* Navigation Buttons */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          className="bg-black/50 hover:bg-black/70 text-white h-12 w-12 rounded-full mr-4"
          disabled={isConfirming || isAcquiring || isLevelingUp || 
            (viewMode === 'owned' && ownedCharacters.length <= 1) ||
            (viewMode === 'available' && contractCharacterTypes.length <= 1)
          }
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>

        {/* Character Card */}
        <AnimatePresence mode="wait">
          {viewMode === 'owned' && ownedCharacters.length > 0 && currentOwnedCharacter ? (
            <motion.div
              key={`owned-${selectedOwnedIndex}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="bg-black/70 p-8 rounded-lg w-full max-w-2xl"
            >
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="relative">
                  <div className="w-48 h-48 rounded-full bg-gradient-to-br from-yellow-500 to-amber-700 p-1">
                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-900 flex items-center justify-center">
                      <img
                        src={getCharacterAvatar(currentOwnedCharacter.characterTypeName)}
                        alt={currentOwnedCharacter.characterTypeName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  {isConfirming && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full"
                    >
                      <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                        <Check className="h-10 w-10 text-white" />
                      </div>
                    </motion.div>
                  )}
                  {/* Level Badge */}
                  <div className="absolute -top-2 -right-2 bg-purple-600 text-white px-3 py-1 rounded-full font-bold">
                    Level {currentOwnedCharacter.level}
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                    {currentOwnedCharacter.characterTypeName}
                  </h2>
                  <p className="text-gray-300 mb-4">
                    {getCharacterDescription(currentOwnedCharacter.characterTypeName)}
                  </p>

                  {/* Character Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-black/50 p-3 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300">Health</span>
                        <span className="text-red-400 font-bold">{currentOwnedCharacter.health}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                    <div className="bg-black/50 p-3 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300">Mana</span>
                        <span className="text-blue-400 font-bold">{currentOwnedCharacter.mana}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                    <div className="bg-black/50 p-3 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300">Defense</span>
                        <span className="text-green-400 font-bold">{currentOwnedCharacter.defense}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, (currentOwnedCharacter.defense / 100) * 100)}%` }}></div>
                      </div>
                    </div>
                    <div className="bg-black/50 p-3 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300">Experience</span>
                        <span className="text-purple-400 font-bold">{currentOwnedCharacter.experience}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (currentOwnedCharacter.experience / (currentOwnedCharacter.level * 100)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Level Up Button */}
                  {canLevelUp(currentOwnedCharacter) && (
                    <Button
                      onClick={handleLevelUp}
                      disabled={isLevelingUp || isAcquiring}
                      className="mb-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Level Up (Cost: {currentOwnedCharacter.level * 100} XP)
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ) : viewMode === 'available' && contractCharacterTypes.length > 0 && currentAvailableType ? (
            <motion.div
              key={`available-${selectedAvailableIndex}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="bg-black/70 p-8 rounded-lg w-full max-w-2xl"
            >
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="relative">
                  <div className="w-48 h-48 rounded-full bg-gradient-to-br from-purple-500 to-indigo-700 p-1">
                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-900 flex items-center justify-center">
                      <img
                        src={getCharacterAvatar(currentAvailableType.name)}
                        alt={currentAvailableType.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 bg-green-600 text-white px-3 py-1 rounded-full font-bold">
                    <Plus className="h-4 w-4" />
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-yellow-400 mb-2">{currentAvailableType.name}</h2>
                  <p className="text-gray-300 mb-4">{currentAvailableType.description}</p>

                  {/* Base Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-black/50 p-3 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300">Base Health</span>
                        <span className="text-red-400 font-bold">{currentAvailableType.baseHealth}</span>
                      </div>
                    </div>
                    <div className="bg-black/50 p-3 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300">Base Mana</span>
                        <span className="text-blue-400 font-bold">{currentAvailableType.baseMana}</span>
                      </div>
                    </div>
                    <div className="bg-black/50 p-3 rounded col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300">Base Defense</span>
                        <span className="text-green-400 font-bold">{currentAvailableType.baseDefense}</span>
                      </div>
                    </div>
                  </div>

                  {/* Abilities Preview */}
                  <h3 className="text-xl font-semibold text-yellow-300 mb-2">Abilities</h3>
                  <div className="space-y-2">
                    {currentAvailableType.abilities.map((ability, index) => (
                      <div key={index} className="bg-black/30 p-2 rounded">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-medium">{ability.name}</span>
                          <div className="flex gap-2 text-xs">
                            <span className="text-red-400">DMG: {ability.baseDamage}</span>
                            <span className="text-blue-400">MP: {ability.manaCost}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Acquisition Cost */}
                  <div className="mt-4 bg-green-900/30 border border-green-600 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-green-300">Acquisition Cost:</span>
                      <span className="text-green-400 font-bold">FREE</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-black/70 p-8 rounded-lg w-full max-w-2xl text-center"
            >
              <div className="text-gray-400 mb-4">
                {viewMode === 'owned' ? (
                  <>
                    <Star className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                    <h3 className="text-xl font-bold mb-2">No Characters Owned</h3>
                    <p>You haven't acquired any characters yet. Switch to "Acquire New" to get your first character!</p>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                    <h3 className="text-xl font-bold mb-2">No Characters Available</h3>
                    <p>Loading available characters...</p>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="bg-black/50 hover:bg-black/70 text-white h-12 w-12 rounded-full ml-4"
          disabled={isConfirming || isAcquiring || isLevelingUp ||
            (viewMode === 'owned' && ownedCharacters.length <= 1) ||
            (viewMode === 'available' && contractCharacterTypes.length <= 1)
          }
        >
          <ArrowRight className="h-6 w-6" />
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="relative z-10 mt-8 flex gap-4">
        <Button
          onClick={handleBack}
          className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2"
          disabled={isConfirming || isAcquiring || isLevelingUp}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        {viewMode === 'owned' && ownedCharacters.length > 0 ? (
          <Button
            onClick={handleSelect}
            className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-black font-bold px-8 py-2"
            disabled={isConfirming || isAcquiring || isLevelingUp}
          >
            {isConfirming ? "Selecting..." : "Select Character"}
          </Button>
        ) : viewMode === 'available' && contractCharacterTypes.length > 0 ? (
          <Button
            onClick={handleAcquireCharacter}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-8 py-2"
            disabled={isAcquiring || isLevelingUp}
          >
            <Plus className="mr-2 h-4 w-4" />
            {isAcquiring ? "Acquiring..." : "Acquire Character"}
          </Button>
        ) : null}
      </div>

      {/* Help Text */}
      <div className="relative z-10 mt-4 text-center text-sm text-gray-400 max-w-md">
        {viewMode === 'owned' ? (
          ownedCharacters.length > 0 ? (
            <p>Select one of your owned characters to begin your adventure</p>
          ) : (
            <p>You need to acquire a character first. Switch to "Acquire New" to get started!</p>
          )
        ) : (
          <p>Acquire new characters to expand your roster. Characters are currently free to obtain!</p>
        )}
      </div>
    </div>
  )
}