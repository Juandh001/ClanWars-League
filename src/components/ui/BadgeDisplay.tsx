import React from 'react'
import { Trophy, Medal, Award } from 'lucide-react'
import type { BadgeWithSeason, BadgeType } from '../../types/database'

interface BadgeDisplayProps {
  badges: BadgeWithSeason[]
  size?: 'sm' | 'md' | 'lg'
  showSeasonInfo?: boolean
  maxDisplay?: number
}

export function BadgeDisplay({
  badges,
  size = 'md',
  showSeasonInfo = false,
  maxDisplay = 5
}: BadgeDisplayProps) {
  if (badges.length === 0) return null

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const containerClasses = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2'
  }

  const displayBadges = badges.slice(0, maxDisplay)
  const remainingCount = badges.length - maxDisplay

  return (
    <div className={`flex items-center flex-wrap ${containerClasses[size]}`}>
      {displayBadges.map((badge) => (
        <BadgeIcon
          key={badge.id}
          badge={badge}
          size={size}
          showSeasonInfo={showSeasonInfo}
        />
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-gray-500">+{remainingCount}</span>
      )}
    </div>
  )
}

interface BadgeIconProps {
  badge: BadgeWithSeason
  size: 'sm' | 'md' | 'lg'
  showSeasonInfo?: boolean
}

function BadgeIcon({ badge, size, showSeasonInfo }: BadgeIconProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const colorClasses: Record<BadgeType, string> = {
    gold: 'text-yellow-400',
    silver: 'text-gray-300',
    bronze: 'text-orange-400'
  }

  const bgClasses: Record<BadgeType, string> = {
    gold: 'bg-yellow-400/20 ring-yellow-400/50',
    silver: 'bg-gray-300/20 ring-gray-300/50',
    bronze: 'bg-orange-400/20 ring-orange-400/50'
  }

  const Icon = badge.rank === 1 ? Trophy : badge.rank === 2 ? Medal : Award

  const tooltipText = showSeasonInfo && badge.season
    ? `${badge.badge_type.charAt(0).toUpperCase() + badge.badge_type.slice(1)} - ${badge.season.name}`
    : `#${badge.rank} ${badge.badge_type.charAt(0).toUpperCase() + badge.badge_type.slice(1)}`

  return (
    <div
      className={`relative group inline-flex items-center justify-center p-1 rounded-full ring-1 ${bgClasses[badge.badge_type]}`}
      title={tooltipText}
    >
      <Icon className={`${sizeClasses[size]} ${colorClasses[badge.badge_type]} ${badge.badge_type === 'gold' ? 'animate-pulse' : ''}`} />

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-dark-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        {tooltipText}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-dark-800" />
      </div>
    </div>
  )
}

// Single badge display for prominent placement
interface SingleBadgeProps {
  type: BadgeType
  rank: number
  seasonName?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function SingleBadge({ type, rank, seasonName, size = 'lg' }: SingleBadgeProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  }

  const iconSizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14'
  }

  const colorClasses: Record<BadgeType, string> = {
    gold: 'text-yellow-400',
    silver: 'text-gray-300',
    bronze: 'text-orange-400'
  }

  const bgClasses: Record<BadgeType, string> = {
    gold: 'bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 ring-yellow-400',
    silver: 'bg-gradient-to-br from-gray-300/30 to-gray-500/30 ring-gray-300',
    bronze: 'bg-gradient-to-br from-orange-400/30 to-orange-600/30 ring-orange-400'
  }

  const Icon = rank === 1 ? Trophy : rank === 2 ? Medal : Award

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${sizeClasses[size]} ${bgClasses[type]} rounded-full ring-2 flex items-center justify-center ${type === 'gold' ? 'animate-pulse' : ''}`}>
        <Icon className={`${iconSizeClasses[size]} ${colorClasses[type]}`} />
      </div>
      {seasonName && (
        <span className="text-xs text-gray-400">{seasonName}</span>
      )}
    </div>
  )
}

// Badge count summary
interface BadgeSummaryProps {
  badges: BadgeWithSeason[]
}

export function BadgeSummary({ badges }: BadgeSummaryProps) {
  const goldCount = badges.filter(b => b.badge_type === 'gold').length
  const silverCount = badges.filter(b => b.badge_type === 'silver').length
  const bronzeCount = badges.filter(b => b.badge_type === 'bronze').length

  if (badges.length === 0) return null

  return (
    <div className="flex items-center gap-3 text-sm">
      {goldCount > 0 && (
        <div className="flex items-center gap-1">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 font-bold">{goldCount}</span>
        </div>
      )}
      {silverCount > 0 && (
        <div className="flex items-center gap-1">
          <Medal className="w-4 h-4 text-gray-300" />
          <span className="text-gray-300 font-bold">{silverCount}</span>
        </div>
      )}
      {bronzeCount > 0 && (
        <div className="flex items-center gap-1">
          <Award className="w-4 h-4 text-orange-400" />
          <span className="text-orange-400 font-bold">{bronzeCount}</span>
        </div>
      )}
    </div>
  )
}
