"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle, AlertCircle, Info, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'achievement'
  title: string
  message: string
  duration?: number
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'default' | 'outline'
  }>
}

interface GameNotificationsProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
}

export default function GameNotifications({ notifications, onDismiss }: GameNotificationsProps) {
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'achievement': return <Trophy className="h-5 w-5 text-yellow-500" />
      default: return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getBackgroundColor = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'bg-green-900/90 border-green-700'
      case 'error': return 'bg-red-900/90 border-red-700'
      case 'achievement': return 'bg-yellow-900/90 border-yellow-700'
      default: return 'bg-blue-900/90 border-blue-700'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className={`p-4 rounded-lg border backdrop-blur-sm ${getBackgroundColor(notification.type)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {getIcon(notification.type)}
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white mb-1">
                    {notification.title}
                  </h4>
                  <p className="text-sm text-gray-200">
                    {notification.message}
                  </p>
                  {notification.actions && (
                    <div className="flex space-x-2 mt-3">
                      {notification.actions.map((action, index) => (
                        <Button
                          key={index}
                          size="sm"
                          variant={action.variant || 'default'}
                          onClick={action.onClick}
                          className="text-xs"
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(notification.id)}
                className="text-gray-400 hover:text-white p-1 h-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}