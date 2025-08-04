"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Trophy, Star, Coins, Users, Clock, Zap } from "lucide-react"
import { useGameState } from "./game-state-provider"
import { useContract } from "@/hooks/use-contract"
import { useWallet } from "@/hooks/use-wallet"

interface GameCompletionScreenProps {
  onMainMenu: () => void
  onPlayAgain: () => void
}

export default function GameCompletionScreen({ onMainMenu, onPlayAgain }: GameCompletionScreenProps) {
  const { 
    score, 
    highScore, 
    level, 
    gold, 
    playerLevel,
    ownedCharacters,
    addNotification 
  } = useGameState()
  
  const { isConnected } = useContract()
  const { isWalletReady } = useWallet()
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    // Show completion notification
    addNotification({
      type: 'achievement',
      title: 'Game Complete!',
      message: 'Congratulations on completing Chrono Clash!',
      duration: 5000
    })

    // Animate stats display
    setTimeout(() => setShowStats(true), 1000)
  }, [addNotification])

  const gameStats = [
    { label: "Final Score", value: score, icon: <Trophy className="h-5 w-5" />, color: "text-yellow-400" },
    { label: "Best Score", value: highScore, icon: <Star className="h-5 w-5" />, color: "text-purple-400" },
    { label: "Gold Earned", value: gold, icon: <Coins className="h-5 w-5" />, color: "text-yellow-400" },
    { label: "Level Reached", value: level, icon: <Zap className="h-5 w-5" />, color: "text-blue-400" },
    { label: "Character Level", value: playerLevel, icon: <Users className="h-5 w-5" />, color: "text-green-400" },
    { label: "Characters Owned", value: ownedCharacters.length, icon: <Users className="h-5 w-5" />, color: "text-red-400" }
  ]

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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 mb-8 flex flex-col items-center"
      >
        <motion.div
          animate={{
            y: [0, -10, 0],
            rotate: [0, 5, 0, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          <Trophy className="h-32 w-32 text-yellow-400 mb-4" />
        </motion.div>
        
        <h1 className="text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 mb-4">
          MASTERY ACHIEVED
        </h1>
        
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-6 w-6 text-purple-400" />
          <span className="text-2xl font-bold text-purple-300">Time Conqueror</span>
        </div>

        {isWalletReady && isConnected && (
          <div className="bg-green-900/30 border border-green-600 rounded-lg px-4 py-2 mb-4">
            <span className="text-green-300 text-sm">✅ Blockchain Integration Complete</span>
          </div>
        )}
      </motion.div>

      {/* Game Statistics */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: showStats ? 1 : 0, scale: showStats ? 1 : 0.9 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="relative z-10 bg-black/80 p-8 rounded-lg w-full max-w-4xl mb-8"
      >
        <h2 className="text-3xl font-bold text-center text-yellow-400 mb-6">Game Statistics</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {gameStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
              className="text-center bg-gray-900/50 rounded-lg p-4"
            >
              <div className={`flex justify-center mb-2 ${stat.color}`}>
                {stat.icon}
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value.toLocaleString()}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Achievement Summary */}
        <div className="mt-8 text-center">
          <h3 className="text-xl font-bold text-purple-400 mb-4">Phase Completion Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { phase: "Phase 1", title: "Wallet Integration", completed: true },
              { phase: "Phase 2", title: "Contract Service", completed: true },
              { phase: "Phase 3", title: "Game Integration", completed: true },
              { phase: "Phase 4", title: "Multiplayer System", completed: true },
              { phase: "Phase 5", title: "UI Enhancements", completed: true }
            ].map((phase) => (
              <div key={phase.phase} className="bg-green-900/30 border border-green-600 rounded-lg p-3">
                <div className="text-green-400 font-bold text-sm">{phase.phase}</div>
                <div className="text-green-300 text-xs">{phase.title}</div>
                <div className="text-green-500 text-xs mt-1">✅ Complete</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="relative z-10 flex gap-6"
      >
        <Button
          onClick={onPlayAgain}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-8 py-4 text-lg rounded-full flex items-center"
        >
          <Zap className="mr-2 h-6 w-6" />
          New Adventure
        </Button>

        <Button
          onClick={onMainMenu}
          className="bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-white font-bold px-8 py-4 text-lg rounded-full flex items-center"
        >
          <Trophy className="mr-2 h-6 w-6" />
          Main Menu
        </Button>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        className="relative z-10 mt-8 text-center"
      >
        <p className="text-gray-400 text-sm">
          Thank you for playing Chrono Clash - The Ultimate Blockchain Battle Experience
        </p>
        <p className="text-gray-500 text-xs mt-2">
          Built with Next.js, TypeScript, Etherlink L2, and Web3 Technologies
        </p>
      </motion.div>
    </div>
  )
}