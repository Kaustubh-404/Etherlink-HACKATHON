// components/connection-status.tsx - Real-time connection indicator
"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Activity } from "lucide-react"
import { useMultiplayer } from "./multiplayer-context-provider"
import { useAccount, useChainId } from "wagmi"
import { etherlink } from "@/lib/web3-config"

export default function ConnectionStatus() {
  const { isConnected: multiplayerConnected, isConnecting } = useMultiplayer()
  const { isConnected: walletConnected } = useAccount()
  const chainId = useChainId()
  const isCorrectNetwork = chainId === etherlink.id
  
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online')

  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online')
    const handleOffline = () => setNetworkStatus('offline')

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const getConnectionStatus = () => {
    if (networkStatus === 'offline') {
      return { status: 'offline', text: 'No Internet', color: 'bg-red-500' }
    }
    
    if (!walletConnected) {
      return { status: 'wallet', text: 'Wallet Disconnected', color: 'bg-orange-500' }
    }
    
    if (!isCorrectNetwork) {
      return { status: 'network', text: 'Wrong Network', color: 'bg-yellow-500' }
    }
    
    if (isConnecting) {
      return { status: 'connecting', text: 'Connecting...', color: 'bg-blue-500' }
    }
    
    if (!multiplayerConnected) {
      return { status: 'multiplayer', text: 'Server Disconnected', color: 'bg-orange-500' }
    }
    
    return { status: 'connected', text: 'All Systems Online', color: 'bg-green-500' }
  }

  const { status, text, color } = getConnectionStatus()

  return (
    <Badge variant="outline" className={`${color} text-white border-none text-xs`}>
      {status === 'offline' && <WifiOff className="h-3 w-3 mr-1" />}
      {status === 'connecting' && <Activity className="h-3 w-3 mr-1 animate-pulse" />}
      {(status === 'connected' || status === 'wallet' || status === 'network' || status === 'multiplayer') && 
        <Wifi className="h-3 w-3 mr-1" />}
      {text}
    </Badge>
  )
}