/**
 * Safe Timestamp Component
 * Prevents hydration errors by only rendering timestamps on the client side
 */

import React, { useState, useEffect } from 'react'

interface SafeTimestampProps {
  timestamp: number | Date
  format?: 'time' | 'date' | 'datetime' | 'relative'
  className?: string
  fallback?: string
}

export default function SafeTimestamp({
  timestamp,
  format = 'relative',
  className = '',
  fallback = 'Loading...'
}: SafeTimestampProps) {
  const [isClient, setIsClient] = useState(false)
  const [formattedTime, setFormattedTime] = useState(fallback)

  useEffect(() => {
    // Only run on client side to avoid hydration mismatches
    setIsClient(true)

    const date = timestamp instanceof Date ? timestamp : new Date(timestamp)

    switch (format) {
      case 'time':
        setFormattedTime(date.toLocaleTimeString())
        break
      case 'date':
        setFormattedTime(date.toLocaleDateString())
        break
      case 'datetime':
        setFormattedTime(date.toLocaleString())
        break
      case 'relative':
        setFormattedTime(formatRelativeTime(date))
        break
      default:
        setFormattedTime(date.toLocaleString())
    }
  }, [timestamp, format])

  // Don't render anything during SSR to avoid hydration mismatch
  if (!isClient) {
    return <span className={className}>{fallback}</span>
  }

  return <span className={className}>{formattedTime}</span>
}

/**
 * Format timestamp as relative time (e.g., "2h ago", "Just now")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) {
    return 'Just now'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`
  } else {
    return date.toLocaleDateString()
  }
}

/**
 * Hook for safe timestamp formatting
 */
export function useSafeTimestamp(timestamp: number | Date, format: 'time' | 'date' | 'datetime' | 'relative' = 'relative') {
  const [isClient, setIsClient] = useState(false)
  const [formattedTime, setFormattedTime] = useState('')

  useEffect(() => {
    setIsClient(true)

    const date = timestamp instanceof Date ? timestamp : new Date(timestamp)

    switch (format) {
      case 'time':
        setFormattedTime(date.toLocaleTimeString())
        break
      case 'date':
        setFormattedTime(date.toLocaleDateString())
        break
      case 'datetime':
        setFormattedTime(date.toLocaleString())
        break
      case 'relative':
        setFormattedTime(formatRelativeTime(date))
        break
      default:
        setFormattedTime(date.toLocaleString())
    }
  }, [timestamp, format])

  return { formattedTime, isClient }
}