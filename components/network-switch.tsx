// components/network-switch.tsx
"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react"
import { useChainId, useSwitchChain } from "wagmi"
import { etherlink } from "@/lib/web3-config"
import { useState } from "react"
import { motion } from "framer-motion"

interface NetworkSwitchProps {
  className?: string
  showStatus?: boolean
}

export default function NetworkSwitch({ className = "", showStatus = true }: NetworkSwitchProps) {
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()
  const [error, setError] = useState<string | null>(null)

  const isCorrectNetwork = chainId === etherlink.id

  const handleSwitchNetwork = async () => {
    setError(null)
    try {
      await switchChain({ chainId: etherlink.id })
    } catch (err: any) {
      console.error("Failed to switch network:", err)
      setError(err.message || "Failed to switch network")
    }
  }

  if (isCorrectNetwork && showStatus) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-2 text-green-400 ${className}`}
      >
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">Etherlink Testnet</span>
      </motion.div>
    )
  }

  if (!isCorrectNetwork) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex flex-col items-center gap-3 ${className}`}
      >
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">Wrong Network Detected</span>
        </div>
        
        <Button
          onClick={handleSwitchNetwork}
          disabled={isPending}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
        >
          {isPending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Switching...
            </>
          ) : (
            `Switch to Etherlink`
          )}
        </Button>

        {error && (
          <p className="text-red-400 text-sm text-center max-w-xs">{error}</p>
        )}
      </motion.div>
    )
  }

  return null
}