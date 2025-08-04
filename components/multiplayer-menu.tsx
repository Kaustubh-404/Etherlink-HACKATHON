"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Plus, LogIn, Zap } from "lucide-react"
import { motion } from "framer-motion"
import { useMultiplayer } from "./multiplayer-context-provider"
import { playSound } from "@/lib/sound-utils"

interface MultiplayerMenuProps {
  onCreateRoom: () => void
  onCreateContractRoom: () => void
  onJoinRoom: () => void
  onBack: () => void
}

export default function MultiplayerMenu({ onCreateRoom, onCreateContractRoom, onJoinRoom, onBack }: MultiplayerMenuProps) {
  
  const handleCreateRoom = () => {
    playSound("button-click.mp3")
    onCreateRoom()
  }

  const handleCreateContractRoom = () => {
    playSound("button-click.mp3")
    onCreateContractRoom()
  }

  const handleJoinRoom = () => {
    playSound("button-click.mp3")
    onJoinRoom()
  }

  const handleBack = () => {
    playSound("button-click.mp3")
    onBack()
  }

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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mb-8"
      >
        <h1 className="text-4xl font-bold text-center text-yellow-400">Multiplayer Mode</h1>
        <p className="text-center text-gray-300 mt-2">Challenge other players in epic time battles!</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative z-10 bg-black/80 p-8 rounded-lg w-full max-w-md mb-8"
      >
        <div className="space-y-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mx-auto flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-white" />
            </div>
            <p className="text-gray-300">Arena PvP battles with smart contract wagering - winner takes all!</p>
          </div>

          <Button
            onClick={handleCreateRoom}
            className="w-full bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-black font-bold py-3 text-sm mb-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            🏟️ Create PvP Arena
          </Button>
          <p className="text-xs text-gray-400 text-center mb-4">Stake ETH • Winner takes pool • Arena combat</p>

          <Button
            onClick={handleJoinRoom}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 text-sm mb-2"
          >
            <LogIn className="mr-2 h-4 w-4" />
            ⚔️ Join PvP Arena
          </Button>
          <p className="text-xs text-gray-400 text-center mb-4">Match stakes • Battle for ETH • Arena style</p>

          <div className="border-t border-gray-600 pt-4 mt-4">
            <p className="text-xs text-gray-500 text-center mb-2">Legacy Options:</p>
            <Button
              onClick={handleCreateContractRoom}
              variant="outline"
              className="w-full border-gray-600 text-gray-400 hover:bg-gray-800 py-2 text-xs"
            >
              <Zap className="mr-2 h-3 w-3" />
              Old Contract Room
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Button
          onClick={handleBack}
          className="bg-gray-800/90 hover:bg-gray-700/90 text-white px-6 py-2 rounded-full"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Main Menu
        </Button>
      </motion.div>
    </div>
  )
}