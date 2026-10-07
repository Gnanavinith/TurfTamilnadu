import { Match, Player, Team } from '../../../types';

export interface LiveScoringViewProps {
  match: Match;
  players: Player[];
  teams: Team[];
  isAdmin?: boolean;
  allMatches?: Match[];
  onContinueSeries?: (seriesId: string, team1Id: string, team2Id: string, totalSeriesMatches: number, tournamentName?: string) => void;
  onEndSeries?: (seriesId: string) => void;
  onDeliverBall: (
    outcome: string,
    wicketDetail?: {
      type: 'Bowled' | 'Caught' | 'LBW' | 'Run Out' | 'Stumped' | 'Hit Wicket' | 'Retired';
      bowlerId?: string;
      helperId?: string;
      outPlayerId?: string;
      runOutRuns?: number;
    }
  ) => void;
  onUndoLastBall: () => void;
  onSwapBatsmen: () => void;
  onRetireHurt: (pid: string) => void;
  onSelectStriker: (pid: string) => void;
  onSelectNonStriker: (pid: string) => void;
  onSelectBowler: (pid: string) => void;
  onReplaceBatsman?: (type: 'striker' | 'nonStriker', pid: string) => void;
  onEndMatch?: () => void;
  onExit: () => void;
}

export type WicketType = 'Bowled' | 'Caught' | 'LBW' | 'Run Out' | 'Stumped' | 'Hit Wicket' | 'Retired';

export interface PlayerHelpers {
  getPlayerName: (pid: string) => string;
  getPlayerJersey: (pid: string) => string;
  getPlayerRole: (pid: string) => string;
}
