import React from 'react'
import { Flame, Skull, Star, TrendingUp, TrendingDown } from 'lucide-react'

interface StreakIndicatorProps {
  winStreak: number
  lossStreak: number
  maxStreak?: number
  showMax?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function StreakIndicator({
  winStreak,
  lossStreak,
  maxStreak = 0,
  showMax = false,
  size = 'md'
}: StreakIndicatorProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  // Determine current streak
  const isWinStreak = winStreak > 0
  const isLossStreak = lossStreak > 0
  const currentStreak = isWinStreak ? winStreak : isLossStreak ? lossStreak : 0

  if (currentStreak === 0 && !showMax) {
    return (
      <span className={`${sizeClasses[size]} text-gray-500`}>-</span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Current Streak */}
      {currentStreak > 0 && (
        <div className={`flex items-center gap-1 ${sizeClasses[size]}`}>
          {isWinStreak ? (
            <>
              <Flame className={`${iconSizeClasses[size]} text-orange-500 ${winStreak >= 3 ? 'animate-pulse' : ''}`} />
              <span className="text-orange-500 font-bold">
                {winStreak}W
              </span>
            </>
          ) : (
            <>
              <Skull className={`${iconSizeClasses[size]} text-red-500`} />
              <span className="text-red-500 font-bold">
                {lossStreak}L
              </span>
            </>
          )}
        </div>
      )}

      {/* Max Streak */}
      {showMax && maxStreak > 0 && (
        <div className={`flex items-center gap-1 ${sizeClasses[size]} text-gray-400`}>
          <Star className={`${iconSizeClasses[size]}`} />
          <span>{maxStreak}</span>
        </div>
      )}
    </div>
  )
}

// Compact streak badge for tables
interface StreakBadgeProps {
  winStreak: number
  lossStreak: number
}

export function StreakBadge({ winStreak, lossStreak }: StreakBadgeProps) {
  const isWinStreak = winStreak > 0
  const isLossStreak = lossStreak > 0

  if (!isWinStreak && !isLossStreak) {
    return <span className="text-gray-500">-</span>
  }

  if (isWinStreak) {
    const intensity = winStreak >= 5 ? 'bg-orange-500/30 text-orange-400' :
                      winStreak >= 3 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-orange-500/10 text-orange-400'

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${intensity}`}>
        <Flame className={`w-3 h-3 ${winStreak >= 3 ? 'animate-pulse' : ''}`} />
        {winStreak}
      </span>
    )
  }

  const intensity = lossStreak >= 5 ? 'bg-red-500/30 text-red-400' :
                    lossStreak >= 3 ? 'bg-red-500/20 text-red-400' :
                    'bg-red-500/10 text-red-400'

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${intensity}`}>
      <TrendingDown className="w-3 h-3" />
      {lossStreak}
    </span>
  )
}

// Streak comparison component
interface StreakComparisonProps {
  currentStreak: {
    type: 'win' | 'loss' | 'none'
    count: number
  }
  maxWinStreak: number
  className?: string
}

export function StreakComparison({ currentStreak, maxWinStreak, className = '' }: StreakComparisonProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">Current</span>
        {currentStreak.type === 'none' ? (
          <span className="text-gray-400">-</span>
        ) : currentStreak.type === 'win' ? (
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="w-4 h-4" />
            <span className="font-bold">{currentStreak.count}W</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-red-500">
            <Skull className="w-4 h-4" />
            <span className="font-bold">{currentStreak.count}L</span>
          </div>
        )}
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xs text-gray-500">Best</span>
        <div className="flex items-center gap-1 text-yellow-400">
          <Star className="w-4 h-4" />
          <span className="font-bold">{maxWinStreak}W</span>
        </div>
      </div>
    </div>
  )
}
