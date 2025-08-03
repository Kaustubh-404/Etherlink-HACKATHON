// components/error-boundary.tsx
"use client"

import React, { Component, type ReactNode, type ErrorInfo } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react"
import { motion } from "framer-motion"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-lg"
          >
            <Alert variant="destructive" className="bg-red-950/50 border-red-800">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="text-lg font-bold">
                Oops! Something went wrong
              </AlertTitle>
              <AlertDescription className="mt-2 space-y-3">
                <p>
                  The game encountered an unexpected error. This might be due to a network issue, 
                  contract interaction problem, or a temporary glitch.
                </p>

                {/* Error details in development */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium mb-2 flex items-center gap-2">
                      <Bug className="h-4 w-4" />
                      Technical Details (Development)
                    </summary>
                    <div className="bg-black/50 p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
                      <div className="text-red-400 mb-2">
                        {this.state.error.name}: {this.state.error.message}
                      </div>
                      <div className="text-gray-400 whitespace-pre-wrap">
                        {this.state.error.stack}
                      </div>
                      {this.state.errorInfo && (
                        <div className="text-gray-500 mt-2 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button
                    onClick={this.handleRetry}
                    className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  
                  <Button
                    onClick={this.handleReload}
                    variant="outline"
                    className="border-gray-600 hover:bg-gray-800"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Page
                  </Button>
                  
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="border-gray-600 hover:bg-gray-800"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>

                <div className="text-sm text-gray-400 mt-4">
                  If this problem persists, please try:
                  <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                    <li>Refreshing your wallet connection</li>
                    <li>Switching to the correct network (Etherlink Testnet)</li>
                    <li>Clearing your browser cache</li>
                    <li>Checking your internet connection</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { captureError, resetError }
}

// Higher-order component wrapper
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}