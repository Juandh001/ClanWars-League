export type UserRole = 'user' | 'admin'
export type ClanRole = 'captain' | 'member'
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired'
export type MatchResult = 'win' | 'loss'
export type BadgeType = 'gold' | 'silver' | 'bronze'
export type BadgeCategory = 'clan' | 'warrior'
export type MatchMode = '1v1' | '2v2' | '3v3' | '4v4' | '5v5' | '6v6'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          nickname: string
          avatar_url: string | null
          role: UserRole
          is_online: boolean
          last_seen: string
          created_at: string
          updated_at: string
          // Warrior stats
          warrior_points: number
          warrior_wins: number
          warrior_losses: number
          warrior_power_wins: number
          current_win_streak: number
          current_loss_streak: number
          max_win_streak: number
        }
        Insert: {
          id: string
          email: string
          nickname: string
          avatar_url?: string | null
          role?: UserRole
          is_online?: boolean
          last_seen?: string
          created_at?: string
          updated_at?: string
          warrior_points?: number
          warrior_wins?: number
          warrior_losses?: number
          warrior_power_wins?: number
          current_win_streak?: number
          current_loss_streak?: number
          max_win_streak?: number
        }
        Update: {
          id?: string
          email?: string
          nickname?: string
          avatar_url?: string | null
          role?: UserRole
          is_online?: boolean
          last_seen?: string
          created_at?: string
          updated_at?: string
          warrior_points?: number
          warrior_wins?: number
          warrior_losses?: number
          warrior_power_wins?: number
          current_win_streak?: number
          current_loss_streak?: number
          max_win_streak?: number
        }
      }
      clans: {
        Row: {
          id: string
          name: string
          tag: string
          logo_url: string | null
          description: string | null
          captain_id: string
          points: number
          power_wins: number
          matches_played: number
          matches_won: number
          matches_lost: number
          created_at: string
          updated_at: string
          // Streak fields
          current_win_streak: number
          current_loss_streak: number
          max_win_streak: number
        }
        Insert: {
          id?: string
          name: string
          tag: string
          logo_url?: string | null
          description?: string | null
          captain_id: string
          points?: number
          power_wins?: number
          matches_played?: number
          matches_won?: number
          matches_lost?: number
          created_at?: string
          updated_at?: string
          current_win_streak?: number
          current_loss_streak?: number
          max_win_streak?: number
        }
        Update: {
          id?: string
          name?: string
          tag?: string
          logo_url?: string | null
          description?: string | null
          captain_id?: string
          points?: number
          power_wins?: number
          matches_played?: number
          matches_won?: number
          matches_lost?: number
          created_at?: string
          updated_at?: string
          current_win_streak?: number
          current_loss_streak?: number
          max_win_streak?: number
        }
      }
      clan_members: {
        Row: {
          id: string
          clan_id: string
          user_id: string
          role: ClanRole
          joined_at: string
        }
        Insert: {
          id?: string
          clan_id: string
          user_id: string
          role?: ClanRole
          joined_at?: string
        }
        Update: {
          id?: string
          clan_id?: string
          user_id?: string
          role?: ClanRole
          joined_at?: string
        }
      }
      clan_invitations: {
        Row: {
          id: string
          clan_id: string
          user_id: string | null
          email: string
          invited_by: string
          status: InvitationStatus
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          clan_id: string
          user_id?: string | null
          email?: string
          invited_by: string
          status?: InvitationStatus
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          clan_id?: string
          user_id?: string | null
          email?: string
          invited_by?: string
          status?: InvitationStatus
          created_at?: string
          expires_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          winner_clan_id: string
          loser_clan_id: string
          reported_by: string
          winner_score: number
          loser_score: number
          points_awarded: number
          power_win: boolean
          power_points_bonus: number
          match_mode: MatchMode
          notes: string | null
          created_at: string
          season_id: string | null
        }
        Insert: {
          id?: string
          winner_clan_id: string
          loser_clan_id: string
          reported_by: string
          winner_score?: number
          loser_score?: number
          points_awarded?: number
          power_win?: boolean
          power_points_bonus?: number
          match_mode?: MatchMode
          notes?: string | null
          created_at?: string
          season_id?: string | null
        }
        Update: {
          id?: string
          winner_clan_id?: string
          loser_clan_id?: string
          reported_by?: string
          winner_score?: number
          loser_score?: number
          points_awarded?: number
          power_win?: boolean
          power_points_bonus?: number
          match_mode?: MatchMode
          notes?: string | null
          created_at?: string
          season_id?: string | null
        }
      }
      match_participants: {
        Row: {
          id: string
          match_id: string
          user_id: string
          clan_id: string
          team: 'winner' | 'loser'
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          user_id: string
          clan_id: string
          team: 'winner' | 'loser'
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          user_id?: string
          clan_id?: string
          team?: 'winner' | 'loser'
          created_at?: string
        }
      }
      admin_actions: {
        Row: {
          id: string
          admin_id: string
          action_type: string
          target_type: string
          target_id: string
          details: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action_type: string
          target_type: string
          target_id: string
          details?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action_type?: string
          target_type?: string
          target_id?: string
          details?: Record<string, unknown> | null
          created_at?: string
        }
      }
      seasons: {
        Row: {
          id: string
          name: string
          number: number
          start_date: string
          end_date: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          number: number
          start_date: string
          end_date: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          number?: number
          start_date?: string
          end_date?: string
          is_active?: boolean
          created_at?: string
        }
      }
      season_clan_stats: {
        Row: {
          id: string
          season_id: string
          clan_id: string
          final_rank: number
          points: number
          power_wins: number
          matches_played: number
          matches_won: number
          matches_lost: number
          max_win_streak: number
          created_at: string
        }
        Insert: {
          id?: string
          season_id: string
          clan_id: string
          final_rank: number
          points?: number
          power_wins?: number
          matches_played?: number
          matches_won?: number
          matches_lost?: number
          max_win_streak?: number
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          clan_id?: string
          final_rank?: number
          points?: number
          power_wins?: number
          matches_played?: number
          matches_won?: number
          matches_lost?: number
          max_win_streak?: number
          created_at?: string
        }
      }
      season_warrior_stats: {
        Row: {
          id: string
          season_id: string
          user_id: string
          clan_id: string | null
          final_rank: number
          points: number
          power_wins: number
          matches_played: number
          wins: number
          losses: number
          max_win_streak: number
          created_at: string
        }
        Insert: {
          id?: string
          season_id: string
          user_id: string
          clan_id?: string | null
          final_rank: number
          points?: number
          power_wins?: number
          matches_played?: number
          wins?: number
          losses?: number
          max_win_streak?: number
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          user_id?: string
          clan_id?: string | null
          final_rank?: number
          points?: number
          power_wins?: number
          matches_played?: number
          wins?: number
          losses?: number
          max_win_streak?: number
          created_at?: string
        }
      }
      badges: {
        Row: {
          id: string
          season_id: string
          target_id: string
          category: BadgeCategory
          badge_type: BadgeType
          rank: number
          awarded_at: string
        }
        Insert: {
          id?: string
          season_id: string
          target_id: string
          category: BadgeCategory
          badge_type: BadgeType
          rank: number
          awarded_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          target_id?: string
          category?: BadgeCategory
          badge_type?: BadgeType
          rank?: number
          awarded_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      clan_role: ClanRole
      invitation_status: InvitationStatus
      badge_type: BadgeType
      badge_category: BadgeCategory
      match_mode: MatchMode
    }
  }
}

// Types helper
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Clan = Database['public']['Tables']['clans']['Row']
export type ClanMember = Database['public']['Tables']['clan_members']['Row']
export type ClanInvitation = Database['public']['Tables']['clan_invitations']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type MatchParticipant = Database['public']['Tables']['match_participants']['Row']
export type AdminAction = Database['public']['Tables']['admin_actions']['Row']
export type Season = Database['public']['Tables']['seasons']['Row']
export type SeasonClanStats = Database['public']['Tables']['season_clan_stats']['Row']
export type SeasonWarriorStats = Database['public']['Tables']['season_warrior_stats']['Row']
export type Badge = Database['public']['Tables']['badges']['Row']

// Extended types with relations
export interface ClanWithMembers extends Clan {
  members: (ClanMember & { profile: Profile })[]
  captain: Profile
}

export interface MatchWithClans extends Match {
  winner_clan: Clan
  loser_clan: Clan
  reporter: Profile
}

export interface MatchParticipantWithProfile extends MatchParticipant {
  profile: Profile
}

export interface MatchWithParticipants extends MatchWithClans {
  participants: MatchParticipantWithProfile[]
}

export interface ProfileWithClan extends Profile {
  clan_member?: ClanMember & { clan: Clan }
}

// New extended types for seasons and badges
export interface BadgeWithSeason extends Badge {
  season: Season
}

export interface ClanWithBadges extends Clan {
  badges: BadgeWithSeason[]
}

export interface ProfileWithBadges extends Profile {
  badges: BadgeWithSeason[]
}

export interface SeasonClanStatsWithClan extends SeasonClanStats {
  clan: Clan
}

export interface SeasonWarriorStatsWithProfile extends SeasonWarriorStats {
  profile: Profile
  clan?: Clan
}

export interface WarriorRanking extends Profile {
  clan?: Clan
  clan_tag?: string
  clan_name?: string
  days_inactive: number
  total_games: number
}
