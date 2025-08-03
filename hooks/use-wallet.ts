// hooks/use-wallet.ts
"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useBalance } from 'wagmi'
import { etherlink } from '@/lib/web3-config'
import { Web3Utils } from '@/lib/Web3-Utils'

// Hook for managing wallet operations
export function useWallet() {
  const { address, isConnected, status } = useAccount()
  const { connect, connectors, isPending: isConnecting, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { data: balance } = useBalance({ address })

  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const isCorrectNetwork = chainId === etherlink.id
  const isWalletReady = isConnected && isCorrectNetwork

  // Initialize wallet state
  useEffect(() => {
    // Set initializing to false after connection status is determined
    if (status !== 'connecting' && status !== 'reconnecting') {
      setIsInitializing(false)
    }
  }, [status])

  // Handle connection errors
  useEffect(() => {
    if (connectError) {
      setError(Web3Utils.parseContractError(connectError))
    }
  }, [connectError])

  // Clear error when account changes
  useEffect(() => {
    setError(null)
  }, [address])

  /**
   * Connect to a specific wallet
   */
  const connectWallet = useCallback(async (connectorId?: string) => {
    try {
      setError(null)
      
      let connector
      if (connectorId) {
        connector = connectors.find(c => c.id === connectorId)
        if (!connector) {
          throw new Error(`Connector ${connectorId} not found`)
        }
      } else {
        // Use first available connector (usually MetaMask)
        connector = connectors[0]
      }

      if (!connector) {
        throw new Error('No wallet connectors available')
      }

      await connect({ connector })
    } catch (err: any) {
      console.error('Error connecting wallet:', err)
      const errorMessage = err.message || 'Failed to connect wallet'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [connect, connectors])

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(() => {
    try {
      disconnect()
      setError(null)
    } catch (err: any) {
      console.error('Error disconnecting wallet:', err)
      setError(err.message || 'Failed to disconnect wallet')
    }
  }, [disconnect])

  /**
   * Switch to Etherlink network
   */
  const switchToEtherlink = useCallback(async () => {
    try {
      setError(null)
      await switchChain({ chainId: etherlink.id })
    } catch (err: any) {
      console.error('Error switching network:', err)
      const errorMessage = err.message || 'Failed to switch to Etherlink network'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [switchChain])

  /**
   * Get formatted address for display
   */
  const getFormattedAddress = useCallback(() => {
    if (!address) return ''
    return Web3Utils.formatAddress(address)
  }, [address])

  /**
   * Get formatted balance for display
   */
  const getFormattedBalance = useCallback((decimals = 4) => {
    if (!balance) return '0.0000'
    const formatted = Web3Utils.formatEth(balance.value)
    return parseFloat(formatted).toFixed(decimals)
  }, [balance])

  /**
   * Get network information
   */
  const getNetworkInfo = useCallback(() => {
    return {
      chainId,
      name: Web3Utils.getNetworkName(chainId),
      isCorrect: isCorrectNetwork,
      isEtherlink: Web3Utils.isEtherlinkNetwork(chainId)
    }
  }, [chainId, isCorrectNetwork])

  /**
   * Check if wallet has sufficient balance for transaction
   */
  const hasSufficientBalance = useCallback((requiredAmount: string) => {
    if (!balance) return false
    
    try {
      const required = Web3Utils.parseEth(requiredAmount)
      return balance.value >= required
    } catch {
      return false
    }
  }, [balance])

  /**
   * Get available wallet connectors
   */
  const getAvailableConnectors = useCallback(() => {
    return connectors.map(connector => ({
      id: connector.id,
      name: connector.name,
      icon: connector.icon,
      ready: connector.ready
    }))
  }, [connectors])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Check if a specific connector is available
   */
  const isConnectorAvailable = useCallback((connectorId: string) => {
    const connector = connectors.find(c => c.id === connectorId)
    return connector?.ready || false
  }, [connectors])

  /**
   * Get wallet connection status details
   */
  const getConnectionStatus = useCallback(() => {
    return {
      isConnected,
      isConnecting,
      isSwitching,
      isInitializing,
      isWalletReady,
      status,
      hasError: !!error
    }
  }, [isConnected, isConnecting, isSwitching, isInitializing, isWalletReady, status, error])

  /**
   * Retry connection after error
   */
  const retryConnection = useCallback(async () => {
    if (error) {
      setError(null)
      // Try to reconnect with the first available connector
      if (connectors.length > 0) {
        await connectWallet(connectors[0].id)
      }
    }
  }, [error, connectors, connectWallet])

  return {
    // Wallet State
    address,
    balance,
    chainId,
    isConnected,
    isConnecting,
    isSwitching,
    isInitializing,
    isCorrectNetwork,
    isWalletReady,
    error,
    status,

    // Wallet Actions
    connectWallet,
    disconnectWallet,
    switchToEtherlink,
    clearError,
    retryConnection,

    // Utility Functions
    getFormattedAddress,
    getFormattedBalance,
    getNetworkInfo,
    hasSufficientBalance,
    getAvailableConnectors,
    isConnectorAvailable,
    getConnectionStatus,

    // Available Connectors
    connectors: getAvailableConnectors()
  }
}