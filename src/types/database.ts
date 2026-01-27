export type UserRole = 'user' | 'admin'
export type ClanRole = 'captain' | 'member'
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired'
export type MatchResult = 'win' | 'loss'

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
          email: string
          invited_by: string
          status: InvitationStatus
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          clan_id: string
          email: string
          invited_by: string
          status?: InvitationStatus
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          clan_id?: string
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
          notes: string | null
          created_at: string
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
          notes?: string | null
          created_at?: string
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
          notes?: string | null
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      clan_role: ClanRole
      invitation_status: InvitationStatus
    }
  }
}

// Types helper
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Clan = Database['public']['Tables']['clans']['Row']
export type ClanMember = Database['public']['Tables']['clan_members']['Row']
export type ClanInvitation = Database['public']['Tables']['clan_invitations']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type AdminAction = Database['public']['Tables']['admin_actions']['Row']

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

export interface ProfileWithClan extends Profile {
  clan_member?: ClanMember & { clan: Clan }
}
