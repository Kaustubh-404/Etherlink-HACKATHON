// components/wallet-status.tsx
"use client"

import { useAccount, useDisconnect, useChainId, useBalance } from 'wagmi'
import { Button } from "@/components/ui/button"
import { Wallet, LogOut, AlertTriangle } from "lucide-react"
import { useState } from "react"
import { etherlink } from "@/lib/web3-config"
import { formatEther } from 'viem'

interface WalletStatusProps {
  showDisconnect?: boolean
  className?: string
  showBalance?: boolean
}

export default function WalletStatus({ 
  showDisconnect = false, 
  className = "",
  showBalance = false 
}: WalletStatusProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { data: balance } = useBalance({ address })

  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      await disconnect()
    } catch (error) {
      console.error("Failed to disconnect wallet:", error)
    } finally {
      setIsDisconnecting(false)
    }
  }

  const isCorrectNetwork = chainId === etherlink.id

  if (!isConnected || !address) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className={`bg-black/50 border-purple-600 hover:bg-purple-950/30 ${className}`}
        disabled
      >
        <Wallet className="h-4 w-4 mr-1" />
        <span>Not Connected</span>
      </Button>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`border rounded-full px-3 py-1 text-xs flex items-center ${
        isCorrectNetwork 
          ? 'bg-purple-950/30 border-purple-600' 
          : 'bg-red-950/30 border-red-600'
      }`}>
        <Wallet className={`h-3 w-3 mr-1 ${
          isCorrectNetwork ? 'text-purple-400' : 'text-red-400'
        }`} />
        
        <div className="flex flex-col">
          <span className={isCorrectNetwork ? 'text-purple-200' : 'text-red-200'}>
            {address.substring(0, 4)}...{address.substring(address.length - 4)}
          </span>
          
          {showBalance && balance && (
            <span className="text-xs text-gray-400">
              {parseFloat(formatEther(balance.value)).toFixed(4)} ETH
            </span>
          )}
        </div>

        {!isCorrectNetwork && (
          <AlertTriangle className="h-3 w-3 ml-1 text-red-400" />
        )}
      </div>

      {!isCorrectNetwork && (
        <div className="text-xs text-red-400">
          Wrong Network
        </div>
      )}

      {showDisconnect && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="h-7 w-7 rounded-full bg-red-900/20 hover:bg-red-900/40 text-red-400"
          title="Disconnect wallet"
        >
          {isDisconnecting ? (
            <div className="h-3 w-3 rounded-full border-2 border-transparent border-t-red-400 animate-spin" />
          ) : (
            <LogOut className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  )
}