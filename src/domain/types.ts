// Domain types — pure TypeScript, no runtime dependencies.
// Source of truth for entities shared across all layers.

// ============ Enums (as string literal unions) ============

export type TournamentStatus = 'upcoming' | 'active' | 'finished';

export type PhaseType = 'group_stage' | 'knockout';

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';

export type GroupStatus = 'active' | 'inactive';

export type ParticipantStatus = 'active' | 'inactive';

export type StartingPhaseCode = 'ALL' | 'FROM_ROUND_OF_16' | 'FROM_SEMIFINALS' | 'FINAL_ONLY';

// ============ User ============

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  city: string;
  timezone: string;
  avatarUrl: string | null;
  isSystemAdmin: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

// ============ Tournament ============

export interface Tournament {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  status: TournamentStatus;
}

export interface Phase {
  id: string;
  tournamentId: string;
  name: string;
  type: PhaseType;
  orderIndex: number;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  shortName: string; // 3 chars
  flagUrl: string | null;
  groupName: string | null;
}

// ============ Match ============

export interface Match {
  id: string;
  tournamentId: string;
  phaseId: string;
  homeTeam: Team;
  awayTeam: Team;
  scheduledAt: string; // ISO 8601 UTC
  lockAt: string; // computed: scheduledAt - 10 min
  status: MatchStatus;
  homeGoals: number | null; // null when scheduled/live for non-admin
  awayGoals: number | null;
  isKnockout: boolean;
  matchday: string | null;
}

// Admin view includes live results even when match is not finished.
export interface AdminMatch extends Match {
  homeGoals: number;
  awayGoals: number;
}

// ============ Group ============

export interface FootballGroup {
  id: string;
  shortCode: string;
  name: string;
  description: string | null;
  specialConditions: string | null;
  tournamentId: string;
  startingPhase: StartingPhaseCode;
  adminUserId: string;
  maxParticipants: number;
  status: GroupStatus;
  createdAt: string;
}

export interface GroupParticipant {
  id: string;
  groupId: string;
  userId: string;
  username?: string;
  avatarUrl?: string | null;
  status: ParticipantStatus;
  totalPoints: number;
  position: number;
  joinedAt: string;
}

// ============ Prediction ============

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  groupId: string;
  homeGoalsPredicted: number;
  awayGoalsPredicted: number;
  isLocked: boolean;
  pointsEarned: PointBreakdown | null;
  submittedAt: string;
  updatedAt: string;
}

export interface PointBreakdown {
  winnerPoints: number;
  homeGoalsPoints: number;
  awayGoalsPoints: number;
  diffPoints: number;
  totalPoints: number;
}

// ============ Leaderboard ============

export interface LeaderboardEntry {
  position: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalPoints: number;
  matchesPlayed: number;
  perfectScores: number;
  joinedAt: string;
}

// ============ Scoring inputs (pure, no DB) ============

export interface PredictionInput {
  home: number;
  away: number;
}

export interface ResultInput {
  home: number;
  away: number;
}

// ============ Result wrapper for Server Actions ============

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string };
