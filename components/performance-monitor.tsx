// components/performance-monitor.tsx - Development tool for monitoring performance
"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Activity, Cpu, Zap } from "lucide-react"

interface PerformanceMetrics {
  fps: number
  memory: number
  renderTime: number
  gasEstimates: number
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: 0,
    renderTime: 0,
    gasEstimates: 0
  })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return

    let animationId: number
    let lastTime = performance.now()
    let frameCount = 0

    const updateMetrics = () => {
      const currentTime = performance.now()
      frameCount++

      // Calculate FPS every second
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
        
        // Get memory usage if available
        const memory = (performance as any).memory 
          ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) 
          : 0

        setMetrics(prev => ({
          ...prev,
          fps,
          memory,
          renderTime: Math.round(currentTime - lastTime)
        }))

        frameCount = 0
        lastTime = currentTime
      }

      animationId = requestAnimationFrame(updateMetrics)
    }

    updateMetrics()

    // Toggle visibility with keyboard shortcut
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [])

  if (process.env.NODE_ENV !== 'development' || !isVisible) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed bottom-4 left-4 bg-black/80 border border-gray-600 rounded-lg p-3 text-xs font-mono z-50"
    >
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Activity className="h-3 w-3 text-green-400" />
          <span className="text-green-400">{metrics.fps} FPS</span>
        </div>
        <div className="flex items-center space-x-1">
          <Cpu className="h-3 w-3 text-blue-400" />
          <span className="text-blue-400">{metrics.memory} MB</span>
        </div>
        <div className="flex items-center space-x-1">
          <Zap className="h-3 w-3 text-yellow-400" />
          <span className="text-yellow-400">{metrics.renderTime}ms</span>
        </div>
      </div>
      <div className="text-gray-400 text-[10px] mt-1">
        Press Ctrl+Shift+P to toggle
      </div>
    </motion.div>
  )
}