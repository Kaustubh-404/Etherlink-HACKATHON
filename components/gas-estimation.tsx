// components/gas-estimation.tsx
"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Fuel, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { Web3Utils } from "@/lib/Web3-Utils"
import { useContract } from "@/hooks/use-contract"
import { useWallet } from "@/hooks/use-wallet"
import type { Address } from "viem"

// Define specific argument types for each function
type FunctionArgs = {
  acquireCharacter: readonly [bigint]
  levelUpCharacter: readonly [bigint]
  initiateMatch: readonly [bigint]
  joinMatch: readonly [bigint, bigint]
  makeMove: readonly [bigint, bigint]
  claimTimeoutVictory: readonly [bigint]
}

type FunctionName = keyof FunctionArgs

interface GasEstimationProps {
  functionName: FunctionName
  args: FunctionArgs[FunctionName]
  value?: bigint
  className?: string
  showDetails?: boolean
  onEstimationComplete?: (gasEstimate: bigint, gasCost: string) => void
}

export default function GasEstimation({
  functionName,
  args,
  value,
  className = "",
  showDetails = true,
  onEstimationComplete
}: GasEstimationProps) {
  const { estimateGas } = useContract()
  const { address, getFormattedBalance } = useWallet()
  
  const [gasEstimate, setGasEstimate] = useState<bigint | null>(null)
  const [gasCost, setGasCost] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gasPrice, setGasPrice] = useState<bigint>(20000000000n) // 20 gwei default

  // Estimate gas when parameters change
  useEffect(() => {
    if (!address) return
    
    // Add a small delay to avoid rapid successive calls
    const timeoutId = setTimeout(() => {
    
    // Check for invalid values in args (BigInt can't be created from null/undefined)
    try {
      // Validate that all args can be converted to strings (BigInt validation)
      console.log('GasEstimation: Validating args', { functionName, args, argTypes: args.map(arg => typeof arg) })
      
      args.forEach((arg, index) => {
        if (arg === undefined || arg === null) {
          throw new Error(`Argument at index ${index} is ${arg}`)
        }
        // Try to convert to BigInt to validate
        if (typeof arg !== 'bigint' && typeof arg !== 'number' && typeof arg !== 'string') {
          throw new Error(`Argument at index ${index} is not a valid type for BigInt: ${typeof arg}`)
        }
      })
      
      console.log('GasEstimation: Args validation passed')
    } catch (validationError) {
      console.warn('GasEstimation: Args validation failed', { functionName, args, error: validationError })
      return
    }

    const performEstimation = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('GasEstimation: Estimating gas for', { functionName, args, value })
        const estimate = await estimateGas(functionName, args, value)
        const cost = Web3Utils.formatEth(estimate * gasPrice)
        
        setGasEstimate(estimate)
        setGasCost(cost)
        
        if (onEstimationComplete) {
          onEstimationComplete(estimate, cost)
        }
      } catch (err: any) {
        console.error('Gas estimation failed:', err)
        
        // Check if this is an OutOfFund error
        if (err.message.includes('OutOfFund') || 
            err.message.includes('Request exceeds defined limit') ||
            err.message.includes('insufficient funds')) {
          
          // Provide a fallback estimate for insufficient funds scenarios
          const fallbackGasEstimate = 100000n // Conservative estimate
          const fallbackCost = Web3Utils.formatEth(fallbackGasEstimate * gasPrice)
          
          setGasEstimate(fallbackGasEstimate)
          setGasCost(fallbackCost)
          setError('Cannot estimate exact gas due to insufficient funds. Showing conservative estimate.')
          
          if (onEstimationComplete) {
            onEstimationComplete(fallbackGasEstimate, fallbackCost)
          }
        } else {
          setError(err.message || 'Failed to estimate gas')
          setGasEstimate(null)
          setGasCost("")
        }
      } finally {
        setIsLoading(false)
      }
    }

    performEstimation()
    }, 3000) // 3s delay to prevent rate limiting
    
    return () => clearTimeout(timeoutId)
  }, [functionName, args, value, address, gasPrice, estimateGas, onEstimationComplete])

  const getGasLevel = () => {
    if (!gasEstimate) return 'unknown'
    
    const gasNumber = Number(gasEstimate)
    if (gasNumber < 50000) return 'low'
    if (gasNumber < 100000) return 'medium'
    return 'high'
  }

  const getGasLevelColor = () => {
    const level = getGasLevel()
    switch (level) {
      case 'low': return 'text-green-500'
      case 'medium': return 'text-yellow-500'
      case 'high': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getGasLevelIcon = () => {
    const level = getGasLevel()
    switch (level) {
      case 'low': return <TrendingDown className="h-3 w-3" />
      case 'medium': return <Fuel className="h-3 w-3" />
      case 'high': return <TrendingUp className="h-3 w-3" />
      default: return <AlertCircle className="h-3 w-3" />
    }
  }

  const formatGasEstimate = () => {
    if (!gasEstimate) return '---'
    return Web3Utils.formatNumber(Number(gasEstimate))
  }

  const checkSufficientBalance = () => {
    if (!gasEstimate || !address) return true
    
    const totalCost = value ? gasEstimate * gasPrice + value : gasEstimate * gasPrice
    const balanceWei = Web3Utils.parseEth(getFormattedBalance())
    
    return balanceWei >= totalCost
  }

  const hasSufficientBalance = checkSufficientBalance()

  if (!address) return null

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Gas Estimate Summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-gray-400" />
          <span className="text-gray-300">Gas Fee:</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
              <span className="text-gray-400">Estimating...</span>
            </div>
          ) : error ? (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Failed
            </Badge>
          ) : gasEstimate ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${getGasLevelColor()}`}>
                {getGasLevelIcon()}
                <span className="ml-1">{formatGasEstimate()}</span>
              </Badge>
              <span className="font-mono text-yellow-400">
                ~{parseFloat(gasCost).toFixed(6)} ETH
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Detailed breakdown */}
      {showDetails && gasEstimate && !isLoading && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="text-xs text-gray-400 space-y-1"
        >
          <div className="flex justify-between">
            <span>Gas Limit:</span>
            <span className="font-mono">{gasEstimate.toString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Gas Price:</span>
            <span className="font-mono">{Web3Utils.formatEth(gasPrice)} ETH</span>
          </div>
          {value && (
            <div className="flex justify-between">
              <span>Transaction Value:</span>
              <span className="font-mono text-yellow-400">{Web3Utils.formatEth(value)} ETH</span>
            </div>
          )}
          <div className="border-t border-gray-700 pt-1 flex justify-between font-medium">
            <span>Total Cost:</span>
            <span className="font-mono text-yellow-400">
              ~{Web3Utils.formatEth(gasEstimate * gasPrice + (value || 0n))} ETH
            </span>
          </div>
        </motion.div>
      )}

      {/* Insufficient balance warning */}
      {!hasSufficientBalance && gasEstimate && (
        <Alert variant="destructive" className="text-xs py-2">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium">Insufficient Balance</div>
              <div>
                Required: ~{Web3Utils.formatEth(gasEstimate * gasPrice + (value || 0n))} ETH
                {value && (
                  <div className="text-xs opacity-80">
                    (Gas: ~{Web3Utils.formatEth(gasEstimate * gasPrice)} ETH + Stake: {Web3Utils.formatEth(value)} ETH)
                  </div>
                )}
              </div>
              <div>Available: {getFormattedBalance()} ETH</div>
              <div className="text-xs opacity-80">
                Please add more ETH to your wallet before proceeding.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error display */}
      {error && (
        <Alert variant="destructive" className="text-xs py-2">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}