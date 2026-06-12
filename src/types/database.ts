export type Role = 'user' | 'admin';
export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final';
export type MatchStatus = 'scheduled' | 'live' | 'finished';
export type QualifierSide = 'home' | 'away';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  group_name: string | null;
  total_points: number;
  role: Role;
  winner_place: 1 | 2 | 3 | null;
  created_at: string;
}

export interface Team {
  code: string;
  name_en: string;
  name_ar: string;
  flag: string;
}

export interface Match {
  id: number;
  stage: Stage;
  group_letter: string | null;
  home_team: string | null;
  away_team: string | null;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  qualifier_team: QualifierSide | null;
  status: MatchStatus;
  scored_at: string | null;
  created_at: string;
}

export interface MatchWithTeams extends Match {
  home: Team | null;
  away: Team | null;
}

export interface Prediction {
  id: number;
  user_id: string;
  match_id: number;
  home_score: number;
  away_score: number;
  qualifier_pick: QualifierSide | null;
  points_awarded: number | null;
  created_at: string;
  updated_at: string;
}

export interface ScoringRule {
  key: 'exact_score' | 'correct_outcome' | 'goal_difference' | 'correct_qualifier';
  value: number;
  label: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  full_name: string;
  group_name: string | null;
  total_points: number;
  winner_place: 1 | 2 | 3 | null;
  position: number;
}
