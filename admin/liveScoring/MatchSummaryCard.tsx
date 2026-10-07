import React from 'react';
import { Match } from '../../../types';
import { Award, Trophy } from 'lucide-react';
import { getMatchWinnerId } from './helpers';

interface MatchSummaryCardProps {
  match: Match;
  allMatches: Match[];
  isAdmin: boolean;
  onContinueSeries?: (seriesId: string, team1Id: string, team2Id: string, totalSeriesMatches: number, tournamentName?: string) => void;
  onEndSeries?: (seriesId: string) => void;
  onExit: () => void;
}

export default function MatchSummaryCard({ match, allMatches, isAdmin, onContinueSeries, onEndSeries, onExit }: MatchSummaryCardProps) {
  const isTournament = match.matchType === 'tournament' && match.seriesId;
  const seriesMatches = isTournament && allMatches ? allMatches.filter(m => m.seriesId === match.seriesId) : [];
  const completedMatches = seriesMatches.filter(m => m.status === 'complete');

  const sortedSeriesMatches = [...seriesMatches].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const currentMatchNo = sortedSeriesMatches.findIndex(m => m.id === match.id) + 1;
  const totalSeriesMatches = match.tournamentMatches || 3;

  let team1Wins = 0;
  let team2Wins = 0;
  let ties = 0;

  completedMatches.forEach(m => {
    const wId = getMatchWinnerId(m);
    if (wId === match.team1Id) team1Wins++;
    else if (wId === match.team2Id) team2Wins++;
    else if (wId === null) ties++;
  });

  const hasManualEnd = seriesMatches.some(m => m.seriesEnded);
  const isSeriesFinished = hasManualEnd || completedMatches.length >= totalSeriesMatches;

  let standingText = 'Series tied';
  if (team1Wins > team2Wins) {
    standingText = `${match.team1Name} leads ${team1Wins}-${team2Wins}`;
    if (isSeriesFinished) standingText = `${match.team1Name} wins the series ${team1Wins}-${team2Wins}!`;
  } else if (team2Wins > team1Wins) {
    standingText = `${match.team2Name} leads ${team2Wins}-${team1Wins}`;
    if (isSeriesFinished) standingText = `${match.team2Name} wins the series ${team2Wins}-${team1Wins}!`;
  } else if (team1Wins === team2Wins && team1Wins > 0) {
    standingText = `Series tied ${team1Wins}-${team2Wins}`;
  }

  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6 text-center space-y-4 shadow-sm animate-fadeIn">
      <Award size={48} className="mx-auto text-emerald-600" />
      <div>
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
          {isTournament ? `Tournament Match ${currentMatchNo} of ${totalSeriesMatches}` : 'Match Complete'}
        </span>
        <h3 className="text-2xl font-black text-neutral-900 mt-3">{match.result}</h3>
      </div>

      {isTournament && (
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 space-y-2.5 text-left">
          <div className="flex items-center justify-between border-b border-amber-100 pb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800"><Trophy size={10} className="inline-flex -mt-0.5 mr-0.5" /> Series Standing</span>
            <span className="text-xs font-bold text-neutral-600">{standingText}</span>
          </div>
          <div className="space-y-1">
            {sortedSeriesMatches.map((m, idx) => (
              <div key={m.id} className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-medium">Match {idx + 1}:</span>
                <span className={m.id === match.id ? 'font-bold text-emerald-600' : 'text-neutral-700'}>
                  {m.status === 'live' ? 'Live in progress' : m.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {isTournament && !isSeriesFinished && onContinueSeries && isAdmin && (
          <button
            onClick={() => onContinueSeries(match.seriesId!, match.team1Id, match.team2Id, totalSeriesMatches, match.tournamentName)}
            className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 active:scale-95 shadow-sm flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Start Match {currentMatchNo + 1} of Series
          </button>
        )}

        {isTournament && !isSeriesFinished && onEndSeries && isAdmin && (
          <button
            onClick={() => onEndSeries(match.seriesId!)}
            className="w-full rounded-2xl bg-amber-600 py-3 text-sm font-bold text-white transition hover:bg-amber-500 active:scale-95 shadow-sm flex items-center justify-center gap-2"
          >
            End Series Early / Complete Tournament
          </button>
        )}

        <button
          onClick={onExit}
          className="w-full rounded-2xl bg-neutral-900 py-3 text-sm font-bold text-white transition hover:bg-neutral-800 active:scale-95 shadow-sm"
        >
          Exit Scorecard
        </button>
      </div>
    </div>
  );
}
