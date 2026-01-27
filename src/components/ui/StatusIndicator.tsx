import React from 'react'

interface StatusIndicatorProps {
  isOnline: boolean
  lastSeen?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function StatusIndicator({
  isOnline,
  lastSeen,
  showLabel = false,
  size = 'md'
}: StatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const getTimeSinceLastSeen = () => {
    if (!lastSeen) return 'Unknown'

    const now = new Date()
    const seen = new Date(lastSeen)
    const diffMs = now.getTime() - seen.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 5) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          className={`
            ${sizeClasses[size]} rounded-full
            ${isOnline
              ? 'bg-accent-success shadow-lg shadow-accent-success/50 animate-pulse'
              : 'bg-gray-500'
            }
          `}
        />
        {isOnline && (
          <div
            className={`
              absolute inset-0 ${sizeClasses[size]} rounded-full
              bg-accent-success animate-ping opacity-75
            `}
          />
        )}
      </div>
      {showLabel && (
        <span className={`text-sm ${isOnline ? 'text-accent-success' : 'text-gray-400'}`}>
          {isOnline ? 'Active' : getTimeSinceLastSeen()}
        </span>
      )}
    </div>
  )
}
