import React from 'react'
import { Calendar, ChevronDown, Trophy } from 'lucide-react'
import { format } from 'date-fns'
import type { Season } from '../../types/database'

interface SeasonSelectorProps {
  seasons: Season[]
  selectedSeasonId: string | null
  onSelect: (seasonId: string | null) => void
  showAllTime?: boolean
  showCurrentOnly?: boolean
  className?: string
}

export function SeasonSelector({
  seasons,
  selectedSeasonId,
  onSelect,
  showAllTime = true,
  showCurrentOnly = false,
  className = ''
}: SeasonSelectorProps) {
  const currentSeason = seasons.find(s => s.is_active)
  const selectedSeason = seasons.find(s => s.id === selectedSeasonId)

  const displaySeasons = showCurrentOnly
    ? seasons.filter(s => s.is_active)
    : seasons

  const getDisplayText = () => {
    if (selectedSeasonId === null && showAllTime) {
      return 'All Time'
    }
    if (selectedSeason) {
      return selectedSeason.name
    }
    if (currentSeason) {
      return currentSeason.name
    }
    return 'Select Season'
  }

  return (
    <div className={`relative ${className}`}>
      <select
        value={selectedSeasonId || ''}
        onChange={(e) => onSelect(e.target.value || null)}
        className="appearance-none bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-accent-primary cursor-pointer"
      >
        {showAllTime && (
          <option value="">All Time</option>
        )}
        {displaySeasons.map((season) => (
          <option key={season.id} value={season.id}>
            {season.name} {season.is_active ? '(Current)' : ''}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  )
}

// Season info card
interface SeasonInfoProps {
  season: Season | null
  className?: string
}

export function SeasonInfo({ season, className = '' }: SeasonInfoProps) {
  if (!season) {
    return (
      <div className={`flex items-center gap-2 text-gray-400 ${className}`}>
        <Calendar className="w-4 h-4" />
        <span>All Time Rankings</span>
      </div>
    )
  }

  const startDate = new Date(season.start_date)
  const endDate = new Date(season.end_date)
  // Use start of day for accurate day calculation
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endDayStart = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  const daysRemaining = Math.max(0, Math.ceil((endDayStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)))

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-accent-primary" />
        <span className="font-semibold">{season.name}</span>
        {season.is_active && (
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
            Active
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span>{format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}</span>
        {season.is_active && (
          <span className="text-accent-warning">
            {daysRemaining} days remaining
          </span>
        )}
      </div>
    </div>
  )
}

// Compact season badge
interface SeasonBadgeProps {
  season: Season
  size?: 'sm' | 'md'
}

export function SeasonBadge({ season, size = 'sm' }: SeasonBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1'
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${sizeClasses[size]} ${
      season.is_active
        ? 'bg-green-500/20 text-green-400'
        : 'bg-gray-500/20 text-gray-400'
    }`}>
      <Calendar className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {season.name}
    </span>
  )
}
