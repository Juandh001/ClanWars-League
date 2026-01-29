import React from 'react'
import { Clock, AlertTriangle } from 'lucide-react'

interface InactivityBadgeProps {
  lastSeen: string | null | undefined
  threshold?: number // days to consider inactive
  showIcon?: boolean
  className?: string
}

export function InactivityBadge({
  lastSeen,
  threshold = 7,
  showIcon = true,
  className = ''
}: InactivityBadgeProps) {
  const daysInactive = calculateDaysInactive(lastSeen)

  // Active (less than 1 day)
  if (daysInactive < 1) {
    return (
      <span className={`text-green-400 text-xs ${className}`}>
        Active
      </span>
    )
  }

  // Warning (approaching threshold)
  const isWarning = daysInactive >= threshold
  const colorClass = isWarning ? 'text-red-400' : 'text-gray-400'
  const bgClass = isWarning ? 'bg-red-500/10' : ''

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${colorClass} ${bgClass} ${isWarning ? 'px-2 py-0.5 rounded-full' : ''} ${className}`}>
      {showIcon && (
        isWarning ? (
          <AlertTriangle className="w-3 h-3" />
        ) : (
          <Clock className="w-3 h-3" />
        )
      )}
      {formatInactivity(daysInactive)}
    </span>
  )
}

// Compact version for tables
interface InactivityCellProps {
  lastSeen: string | null | undefined
  threshold?: number
}

export function InactivityCell({ lastSeen, threshold = 7 }: InactivityCellProps) {
  const daysInactive = calculateDaysInactive(lastSeen)

  if (daysInactive < 1) {
    return <span className="text-green-400">0</span>
  }

  const isWarning = daysInactive >= threshold
  const colorClass = isWarning ? 'text-red-400' : 'text-gray-400'

  return (
    <span className={`${colorClass} ${isWarning ? 'font-bold' : ''}`}>
      {daysInactive}
    </span>
  )
}

// Helper functions
function calculateDaysInactive(lastSeen: string | null | undefined): number {
  if (!lastSeen) return 999

  const lastSeenDate = new Date(lastSeen)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - lastSeenDate.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

function formatInactivity(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  if (days < 7) return `${days} days`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return `${weeks}w`
  }
  if (days < 365) {
    const months = Math.floor(days / 30)
    return `${months}mo`
  }
  return '1y+'
}

// Status dot with inactivity info
interface ActivityStatusProps {
  isOnline: boolean
  lastSeen: string | null | undefined
  size?: 'sm' | 'md' | 'lg'
}

export function ActivityStatus({ isOnline, lastSeen, size = 'md' }: ActivityStatusProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  }

  const daysInactive = calculateDaysInactive(lastSeen)
  const isWarning = daysInactive >= 7

  if (isOnline) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-green-500 animate-pulse`} title="Online" />
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full ${isWarning ? 'bg-red-500' : 'bg-gray-500'}`}
      title={`Offline - ${formatInactivity(daysInactive)} ago`}
    />
  )
}
