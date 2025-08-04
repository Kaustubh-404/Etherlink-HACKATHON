// components/transaction-status.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, Loader2, ExternalLink, Clock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Web3Utils } from "@/lib/Web3-Utils"
import type { Hash } from "viem"

interface TransactionStatusProps {
  isLoading: boolean
  error: string | null
  hash: Hash | string | null  // Allow both Hash and string types
  title?: string
  description?: string
  onClose?: () => void
  onRetry?: () => void
  showExplorerLink?: boolean
}

export default function TransactionStatus({
  isLoading,
  error,
  hash,
  title = "Transaction",
  description,
  onClose,
  onRetry,
  showExplorerLink = true
}: TransactionStatusProps) {
  const [timeElapsed, setTimeElapsed] = useState(0)

  // Track time elapsed for pending transactions
  useEffect(() => {
    if (!isLoading) {
      setTimeElapsed(0)
      return
    }

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isLoading])

  const getStatusIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
    }
    if (error) {
      return <XCircle className="h-6 w-6 text-red-500" />
    }
    if (hash) {
      return <CheckCircle className="h-6 w-6 text-green-500" />
    }
    return <Clock className="h-6 w-6 text-gray-500" />
  }

  const getStatusTitle = () => {
    if (isLoading) return `${title} Pending...`
    if (error) return `${title} Failed`
    if (hash) return `${title} Successful`
    return title
  }

  const getStatusDescription = () => {
    if (isLoading) {
      return description || `Your ${title.toLowerCase()} is being processed on the blockchain...`
    }
    if (error) {
      return error
    }
    if (hash) {
      return `Your ${title.toLowerCase()} has been confirmed on the blockchain.`
    }
    return description
  }

  const getVariant = () => {
    if (error) return "destructive"
    if (hash) return "default"
    return "default"
  }

  const formatTimeElapsed = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <AnimatePresence>
      {(isLoading || error || hash) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <Alert variant={getVariant()} className="relative">
            <div className="flex items-start gap-3">
              {getStatusIcon()}
              <div className="flex-1 min-w-0">
                <AlertTitle className="flex items-center gap-2">
                  {getStatusTitle()}
                  {isLoading && timeElapsed > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {formatTimeElapsed(timeElapsed)}
                    </span>
                  )}
                </AlertTitle>
                <AlertDescription className="mt-1">
                  {getStatusDescription()}
                </AlertDescription>
                
                {/* Transaction Hash */}
                {hash && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Hash:</span>
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                      {Web3Utils.formatAddress(hash as Hash)}
                    </code>
                    {showExplorerLink && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1"
                        onClick={() => window.open(Web3Utils.getTransactionUrl(hash as string), '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}

                {/* Loading progress indicator */}
                {isLoading && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Confirming transaction...</span>
                      <span>{timeElapsed > 30 ? 'This may take a while' : 'Usually takes 30-60s'}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${Math.min(90, (timeElapsed / 60) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {error && onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="text-xs"
                  >
                    Retry
                  </Button>
                )}
                {onClose && (hash || error) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-xs"
                  >
                    ✕
                  </Button>
                )}
              </div>
            </div>

            {/* Success animation */}
            {hash && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.6, times: [0, 0.6, 1] }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
              >
                <CheckCircle className="h-4 w-4 text-white" />
              </motion.div>
            )}
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  )
}