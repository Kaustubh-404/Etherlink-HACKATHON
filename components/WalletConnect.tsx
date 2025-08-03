// components/WalletConnect.tsx
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { motion } from "framer-motion"
import { Wallet, AlertCircle, CheckCircle } from "lucide-react"
import { etherlink } from "@/lib/web3-config"

interface WalletConnectProps {
  onWalletConnected: () => void
}

export default function WalletConnect({ onWalletConnected }: WalletConnectProps) {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Check if wallet is connected and on correct network
  useEffect(() => {
    if (isConnected && address && chainId === etherlink.id) {
      onWalletConnected()
    }
  }, [isConnected, address, chainId, onWalletConnected])

  const handleConnect = async (connectorId: string) => {
    setIsConnecting(true)
    setConnectionError(null)
    
    try {
      const connector = connectors.find(c => c.id === connectorId)
      if (connector) {
        await connect({ connector })
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      setConnectionError("Could not connect to wallet. Please try again.")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleNetworkSwitch = async () => {
    try {
      await switchChain({ chainId: etherlink.id })
    } catch (error) {
      console.error("Failed to switch network:", error)
      setConnectionError("Failed to switch to Etherlink network.")
    }
  }

  // If connected but wrong network
  if (isConnected && chainId !== etherlink.id) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold text-yellow-400 mb-2">Wrong Network</h2>
          <p className="text-center text-gray-300 mb-4">
            Please switch to Etherlink Testnet to continue
          </p>
        </motion.div>

        <Button
          onClick={handleNetworkSwitch}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2 px-6 rounded-full"
        >
          Switch to Etherlink
        </Button>

        <Button
          onClick={() => disconnect()}
          variant="outline"
          className="text-gray-300"
        >
          Disconnect
        </Button>
      </div>
    )
  }

  // If connected and on correct network
  if (isConnected && address && chainId === etherlink.id) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-green-400 mb-2">Wallet Connected!</h2>
          <p className="text-center text-gray-300">
            {address.substring(0, 6)}...{address.substring(address.length - 6)}
          </p>
          <p className="text-sm text-gray-400 mt-1">Etherlink Testnet</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-yellow-400 mb-2">Connect Your Wallet</h2>
        <p className="text-center text-gray-300">Connect your Web3 wallet to continue to Chrono Clash</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-col items-center space-y-4 w-full max-w-sm"
      >
        {connectors.map((connector) => (
          <Button
            key={connector.id}
            onClick={() => handleConnect(connector.id)}
            disabled={isConnecting || isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 px-6 rounded-full flex items-center gap-3"
          >
            {isConnecting || isPending ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-transparent border-t-white animate-spin"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Wallet className="h-5 w-5" />
                <span>Connect {connector.name}</span>
              </>
            )}
          </Button>
        ))}

        {(connectionError || error) && (
          <div className="mt-4 bg-red-800/30 border border-red-600 rounded-lg px-4 py-3 text-center max-w-xs">
            <p className="text-red-400 text-sm">{connectionError || error?.message}</p>
          </div>
        )}
      </motion.div>

      <div className="mt-4 text-sm text-gray-400 text-center">
        <p>Don't have a wallet?</p>
        <a 
          href="https://metamask.io/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-purple-400 hover:underline"
        >
          Get MetaMask
        </a>
      </div>
    </div>
  )
}