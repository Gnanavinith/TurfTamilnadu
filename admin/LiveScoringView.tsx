import React, { useState, useMemo } from 'react';
import { Match, Player, Team } from '../../types';
import { sr, ovStr, rr } from '../../utils/cricket';
import { Undo, RefreshCw, AlertTriangle, Award, ArrowLeftRight, Heart, ChevronDown, ChevronUp, ArrowLeft, Check, HeartPulse, Activity } from 'lucide-react';
import { motion } from 'motion/react';

import { LiveScoringViewProps, WicketType } from './liveScoring/types';
import { createPlayerHelpers, getBallBadgeStyles } from './liveScoring/helpers';
import WicketModal from './liveScoring/WicketModal';
import NoBallRunsModal from './liveScoring/NoBallRunsModal';
import ScoringControls from './liveScoring/ScoringControls';
import MatchSummaryCard from './liveScoring/MatchSummaryCard';
import { OverLogs, LiveBattingScorecard, LiveBowlingScorecard } from './liveScoring/LiveScorecard';

export default function LiveScoringView({
  match,
  players,
  teams,
  isAdmin = false,
  allMatches = [],
  onContinueSeries,
  onEndSeries,
  onDeliverBall,
  onUndoLastBall,
  onSwapBatsmen,
  onRetireHurt,
  onSelectStriker,
  onSelectNonStriker,
  onSelectBowler,
  onReplaceBatsman,
  onEndMatch,
  onExit,
}: LiveScoringViewProps) {
  const [showRetireConfirm, setShowRetireConfirm] = useState(false);
  const [showEndMatchConfirm, setShowEndMatchConfirm] = useState(false);
  const [changingBatsmanType, setChangingBatsmanType] = useState<'striker' | 'nonStriker' | null>(null);
  const [changingBowler, setChangingBowler] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showNoBallRunsModal, setShowNoBallRunsModal] = useState(false);

  const helpers = useMemo(() => createPlayerHelpers(players), [players]);
  const { getPlayerName, getPlayerJersey } = helpers;

  const innIdx = match.currentInnings - 1;
  const inn = match.innings[innIdx];
  const { striker, nonStriker, bowler } = inn;

  const isComplete = match.status === 'complete';

  // Identify squad players
  const batTeamId = match.currentInnings === 1 ? match.battingFirstId : match.fieldingFirstId;
  const bowlTeamId = match.currentInnings === 1 ? match.fieldingFirstId : match.battingFirstId;

  const batTeam = teams.find(t => t.id === batTeamId);
  const bowlTeam = teams.find(t => t.id === bowlTeamId);

  const availBatPlayerIds = batTeam ? batTeam.playerIds : [];
  const availBowlPlayerIds = bowlTeam ? bowlTeam.playerIds : [];

  const outPlayerIds = inn.batting.filter(b => b.out).map(b => b.pid);
  const retiredHurtIds = inn.retiredHurt || [];
  const unavailableBatIds = [...outPlayerIds, ...retiredHurtIds];

  const needsStriker = !striker;
  const needsNonStriker = !nonStriker;
  const needsBowler = !bowler;
  const lastPlayerSolo = match.lastPlayerSolo ?? true;
  const isLastManStanding = lastPlayerSolo && needsNonStriker && striker && availBatPlayerIds.filter(pid => !unavailableBatIds.includes(pid) && pid !== striker).length === 0;

  const canScore = !!striker && !!bowler;
  const previousBowler = inn.previousBowler || null;

  const target = match.currentInnings === 2 ? match.innings[0].runs + 1 : null;
  const neededRuns = target ? target - inn.runs : null;
  const ballsRemaining = match.totalOvers * 6 - (inn.overs * 6 + inn.balls);

  const strikerData = inn.batting.find(b => b.pid === striker);
  const nonStrikerData = inn.batting.find(b => b.pid === nonStriker);
  const bowlerData = inn.bowling.find(b => b.pid === bowler);

  const totalExtras = inn.extras.wide + inn.extras.noBall + inn.extras.bye + inn.extras.legBye;

  const handleDeliverBallScrolled = (outcome: string, wicketDetail?: WicketType) => {
    onDeliverBall(outcome, wicketDetail);
    if (outcome !== 'W') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleWicketSubmit = (wicketType: WicketType, bowlerId: string | undefined, helperId: string | undefined, outPlayerId: string | undefined, runOutRuns: number | undefined) => {
    handleDeliverBallScrolled('W', { type: wicketType, bowlerId, helperId, outPlayerId, runOutRuns });
    setShowWicketModal(false);
  };

  return (
    <div id="live-scoring-view" className="space-y-4">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="inline-flex min-h-[44px] items-center gap-1.5 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-900 select-none touch-manipulation">
          {isAdmin ? (<><ArrowLeft size={14} />Save & Exit</>) : (<><ArrowLeft size={14} />Back to Home</>)}
        </button>
        <div className="flex items-center gap-2">
          {isAdmin && !isComplete && onEndMatch && (
            <button onClick={() => setShowEndMatchConfirm(true)} className="inline-flex items-center gap-1 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-red-700 transition select-none touch-manipulation whitespace-nowrap">
              End Match
            </button>
          )}
          {isComplete ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200"><Check size={12} />Finished</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600 border border-red-100 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>Scoring Live
            </span>
          )}
        </div>
      </div>

      {showEndMatchConfirm && (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 text-sm space-y-3 animate-fadeIn">
          <div className="flex items-start gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <div className="font-bold text-red-950">End current match manually?</div>
              <div className="text-xs text-red-800 mt-1">This will immediately finalize the match status to complete and record the winner based on the current live score. This action cannot be undone.</div>
            </div>
          </div>
          <div className="flex justify-end gap-2 text-xs font-bold pt-1">
            <button onClick={() => setShowEndMatchConfirm(false)} className="px-3 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700">Cancel</button>
            <button onClick={() => { setShowEndMatchConfirm(false); onEndMatch?.(); }} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-xs">Yes, End Match</button>
          </div>
        </div>
      )}

      {/* Match title header */}
      <div className="text-center">
        <h2 className="text-lg font-black text-neutral-950 leading-tight break-words px-2">
          {match.team1Name} <span className="text-neutral-400 font-semibold mx-1">VS</span> {match.team2Name}
        </h2>
      </div>

      {/* Quick Score Summary */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map(n => {
          const innData = match.innings[n - 1];
          const name = n === 1 ? match.battingFirstName : match.fieldingFirstName;
          const isActive = match.currentInnings === n && !isComplete;
          return (
            <div key={n} className={`rounded-2xl border p-4 text-center transition-all min-w-0 ${isActive ? 'border-emerald-300 bg-emerald-50/50 shadow-xs' : 'border-neutral-100 bg-white'}`}>
              <div className={`text-[10px] font-black uppercase tracking-wider truncate ${isActive ? 'text-emerald-700' : 'text-neutral-400'}`}>{name}</div>
              <div className="text-2xl font-black text-neutral-900 mt-1 font-mono tabular-nums leading-none">
                {innData.runs}<span className="text-red-500 text-lg">/{innData.wickets}</span>
              </div>
              <div className="text-xs text-neutral-500 font-medium font-mono tabular-nums mt-1">{ovStr(innData.overs, innData.balls)} / {match.totalOvers} ov</div>
              <div className="text-[10px] text-neutral-400 font-semibold uppercase mt-1">RR: {rr(innData.runs, innData.overs, innData.balls)}</div>
            </div>
          );
        })}
      </div>

      {/* Extras Summary Bar */}
      {totalExtras > 0 && !isComplete && (
        <div className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50/50 px-4 py-2 text-[11px] text-neutral-500 font-semibold">
          <span className="font-bold text-neutral-700">Extras: <span className="font-mono text-neutral-900">{totalExtras}</span></span>
          <div className="flex gap-3 font-mono tabular-nums">
            {inn.extras.wide > 0 && <span>Wd <strong className="text-neutral-800">{inn.extras.wide}</strong></span>}
            {inn.extras.noBall > 0 && <span>Nb <strong className="text-neutral-800">{inn.extras.noBall}</strong></span>}
            {inn.extras.bye > 0 && <span>B <strong className="text-neutral-800">{inn.extras.bye}</strong></span>}
            {inn.extras.legBye > 0 && <span>Lb <strong className="text-neutral-800">{inn.extras.legBye}</strong></span>}
          </div>
        </div>
      )}

      {/* Second Innings Target */}
      {target && !isComplete && neededRuns !== null && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-center space-y-1">
          <div className="text-sm font-bold text-amber-900">
            {match.fieldingFirstName} needs <span className="font-black text-amber-700 font-mono text-lg">{neededRuns}</span> runs off <span className="font-black font-mono text-lg text-amber-700">{ballsRemaining}</span> balls
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-bold text-amber-800">
            <span>Target: <strong className="font-mono">{target}</strong></span>
            <span>Req. RR: <strong className="font-mono">{ballsRemaining > 0 ? ((neededRuns / ballsRemaining) * 6).toFixed(2) : '—'}</strong></span>
          </div>
        </div>
      )}

      {/* Current Over ball tracker */}
      {inn.currentOver.length > 0 && !isComplete && (
        <div className="rounded-2xl border border-neutral-100 bg-white p-4 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Current Over</div>
          <div className="flex flex-wrap gap-2">
            {inn.currentOver.map((b, i) => (
              <span key={i} className={`ball-badge flex h-8 min-w-8 flex-shrink-0 items-center justify-center rounded-lg px-1 text-xs font-bold font-mono tabular-nums select-none ${getBallBadgeStyles(b)}`}>{b}</span>
            ))}
          </div>
        </div>
      )}

      {/* Batters crease information panel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-neutral-400">At the Crease</h3>
          {isAdmin ? (
            <div className="flex gap-2">
              {striker && nonStriker && (
                <button onClick={onSwapBatsmen} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-50 select-none touch-manipulation whitespace-nowrap">
                  <ArrowLeftRight size={12} className="flex-shrink-0" />Swap Strike
                </button>
              )}
              {(striker || nonStriker) && (
                <button onClick={() => setShowRetireConfirm(!showRetireConfirm)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50/50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 select-none touch-manipulation whitespace-nowrap">
                  <Heart size={12} className="flex-shrink-0" />Retire Hurt
                </button>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600 border border-emerald-200/50 animate-pulse">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />Live Viewer Mode
            </span>
          )}
        </div>

        {/* Retire hurt selection */}
        {showRetireConfirm && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm space-y-2 animate-fadeIn">
            <div className="font-bold text-amber-900 text-xs uppercase tracking-wide">Select batsman to retire hurt:</div>
            <div className="flex flex-wrap gap-2">
              {[striker, nonStriker].filter(Boolean).map(pid => (
                <button key={pid} onClick={() => { onRetireHurt(pid!); setShowRetireConfirm(false); }} className="min-h-[44px] max-w-full truncate rounded-lg bg-white border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100 active:scale-95 transition select-none touch-manipulation">
                  <HeartPulse size={12} className="flex-shrink-0" />{getPlayerName(pid!)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Change batsman helper menu */}
        {changingBatsmanType && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="font-black text-emerald-900 text-xs uppercase tracking-wider">Change {changingBatsmanType === 'striker' ? 'Striker' : 'Non-Striker'}</div>
              <button onClick={() => setChangingBatsmanType(null)} className="text-[10px] font-bold text-neutral-500 hover:text-neutral-900 uppercase">Cancel</button>
            </div>
            <div className="text-xs text-emerald-800">Select a player to replace {getPlayerName(changingBatsmanType === 'striker' ? striker! : nonStriker!)}:</div>
            <div className="flex flex-wrap gap-2">
              {availBatPlayerIds.filter(pid => !unavailableBatIds.includes(pid) && pid !== (changingBatsmanType === 'striker' ? nonStriker : striker)).map(pid => (
                <button key={pid} onClick={() => { onReplaceBatsman?.(changingBatsmanType, pid); setChangingBatsmanType(null); }} className="inline-flex min-h-[44px] max-w-full items-center gap-1.5 rounded-lg bg-white border border-emerald-300 hover:border-emerald-500 px-3 py-2 text-xs font-bold text-neutral-900 shadow-xs hover:bg-emerald-50 active:scale-95 transition select-none touch-manipulation">
                  <span className="font-mono text-[10px] font-black text-emerald-600 flex-shrink-0">#{getPlayerJersey(pid)}</span>
                  <span className="truncate">{getPlayerName(pid)}</span>
                </button>
              ))}
              {availBatPlayerIds.filter(pid => !unavailableBatIds.includes(pid) && pid !== (changingBatsmanType === 'striker' ? nonStriker : striker)).length === 0 && (
                <div className="text-xs text-neutral-500 font-medium">No other available batsmen in the squad.</div>
              )}
            </div>
          </div>
        )}

        {/* Change bowler helper menu */}
        {changingBowler && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="font-black text-blue-900 text-xs uppercase tracking-wider">Change Bowler</div>
              <button onClick={() => setChangingBowler(false)} className="text-[10px] font-bold text-neutral-500 hover:text-neutral-900 uppercase">Cancel</button>
            </div>
            <div className="text-xs text-blue-800">Select a player to replace {bowler ? getPlayerName(bowler) : 'the bowler'}:</div>
            <div className="flex flex-wrap gap-2">
              {availBowlPlayerIds.filter(pid => pid !== bowler).map(pid => (
                <button key={pid} onClick={() => { onSelectBowler(pid); setChangingBowler(false); }} className="inline-flex min-h-[44px] max-w-full items-center gap-1.5 rounded-lg bg-white border border-blue-300 hover:border-blue-500 px-3 py-2 text-xs font-bold text-neutral-900 shadow-xs hover:bg-blue-50 active:scale-95 transition select-none touch-manipulation">
                  <span className="font-mono text-[10px] font-black text-blue-600 flex-shrink-0">#{getPlayerJersey(pid)}</span>
                  <span className="truncate">{getPlayerName(pid)}</span>
                </button>
              ))}
              {availBowlPlayerIds.filter(pid => pid !== bowler).length === 0 && (
                <div className="text-xs text-neutral-500 font-medium">No other available bowlers in the squad.</div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/* Striker card */}
          <div className={`rounded-2xl border p-4 transition-all min-w-0 ${striker ? 'border-emerald-300 bg-emerald-50/30' : 'border-dashed border-red-200 bg-red-50/30 text-center flex flex-col justify-center'}`}>
            {striker ? (
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-emerald-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-neutral-950">Striker ●</span>
                  {isAdmin && (
                    <button onClick={() => { setChangingBatsmanType('striker'); setShowRetireConfirm(false); }} className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-1.5 py-0.5 rounded transition">Change</button>
                  )}
                </div>
                <div className="font-extrabold text-neutral-900 mt-2 truncate">{getPlayerName(striker)}</div>
                <div className="text-3xl font-black text-neutral-900 mt-1 font-mono tabular-nums leading-none">
                  {strikerData?.runs || 0}<span className="text-sm font-semibold text-neutral-500 font-normal ml-1">({strikerData?.balls || 0}b)</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-neutral-500 font-mono tabular-nums">
                  <span>4s: {strikerData?.fours || 0}</span><span>6s: {strikerData?.sixes || 0}</span><span>SR: {sr(strikerData?.runs || 0, strikerData?.balls || 0)}</span>
                </div>
              </div>
            ) : (
              <div className="py-2">
                <span className="text-xs font-bold text-red-700">Wicket Fallen!</span>
                <div className="text-[11px] text-red-500 mt-1">Select the next batsman from squad.</div>
              </div>
            )}
          </div>

          {/* Non-striker card */}
          <div className={`rounded-2xl border p-4 transition-all min-w-0 ${nonStriker ? 'border-neutral-100 bg-white' : isLastManStanding ? 'border-amber-200 bg-amber-50/30 text-center flex flex-col justify-center' : 'border-dashed border-red-200 bg-red-50/30 text-center flex flex-col justify-center'}`}>
            {nonStriker ? (
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-neutral-500">Non-Striker</span>
                  {isAdmin && (
                    <button onClick={() => { setChangingBatsmanType('nonStriker'); setShowRetireConfirm(false); }} className="text-[9px] font-extrabold uppercase tracking-wider text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-1.5 py-0.5 rounded transition">Change</button>
                  )}
                </div>
                <div className="font-extrabold text-neutral-900 mt-2 truncate">{getPlayerName(nonStriker)}</div>
                <div className="text-3xl font-black text-neutral-900 mt-1 font-mono tabular-nums leading-none">
                  {nonStrikerData?.runs || 0}<span className="text-sm font-semibold text-neutral-500 font-normal ml-1">({nonStrikerData?.balls || 0}b)</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-neutral-500 font-mono tabular-nums">
                  <span>4s: {nonStrikerData?.fours || 0}</span><span>6s: {nonStrikerData?.sixes || 0}</span><span>SR: {sr(nonStrikerData?.runs || 0, nonStrikerData?.balls || 0)}</span>
                </div>
              </div>
            ) : isLastManStanding ? (
              <div className="py-2">
                <span className="text-xs font-bold text-amber-800">Last Man Standing</span>
                <div className="text-[11px] text-amber-600 mt-1">Batter is scoring solo.</div>
              </div>
            ) : (
              <div className="py-2">
                <span className="text-xs font-bold text-red-700">Wicket Fallen!</span>
                <div className="text-[11px] text-red-500 mt-1">Select the next batsman from squad.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bowler Details Panel */}
      <div className="space-y-1.5">
        <h3 className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Current Bowler</h3>
        <div className={`rounded-2xl border p-4 flex items-center justify-between ${bowler ? 'border-neutral-100 bg-white' : 'border-dashed border-red-200 bg-red-50/30'}`}>
          {bowler ? (
            <>
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase bg-blue-500 text-neutral-950 px-1.5 py-0.5 rounded-md">Active Bowler ●</span>
                  {isAdmin && (
                    <button onClick={() => setChangingBowler(true)} className="text-[9px] font-extrabold uppercase tracking-wider text-blue-700 hover:text-blue-950 bg-blue-100 hover:bg-blue-200 px-1.5 py-0.5 rounded transition">Change</button>
                  )}
                </div>
                <h4 className="font-extrabold text-neutral-950 mt-1.5 leading-tight truncate">{getPlayerName(bowler)}</h4>
                <p className="text-[11px] text-neutral-500 font-semibold font-mono tabular-nums mt-0.5">
                  {bowlerData ? `${bowlerData.overs}.${bowlerData.balls}` : '0.0'} overs · {bowlerData?.runs || 0} runs · {bowlerData?.wickets || 0} wickets
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Economy</div>
                <div className="text-lg font-black text-neutral-900 font-mono tabular-nums leading-none mt-1">
                  {bowlerData ? `${((bowlerData.runs / (bowlerData.overs * 6 + bowlerData.balls)) * 6).toFixed(2)}` : '0.00'}
                </div>
              </div>
            </>
          ) : (
            <div className="py-1 text-center w-full">
              <span className="text-xs font-bold text-red-700">Bowler Required!</span>
              <div className="text-[11px] text-red-500 mt-0.5">Select a bowler from squad to initiate next over.</div>
            </div>
          )}
        </div>
      </div>

      {/* Selection Panels */}
      {!isComplete && (
        <div className="space-y-3">
          {isAdmin ? (
            <>
              {needsStriker && !isLastManStanding && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/20 p-5 space-y-3 animate-slideUp">
                  <h4 className="text-xs font-black uppercase tracking-widest text-emerald-800">Assign New Striker</h4>
                  <div className="flex flex-wrap gap-2">
                    {availBatPlayerIds.filter(pid => !unavailableBatIds.includes(pid) && pid !== nonStriker).map(pid => (
                      <button key={pid} onClick={() => onSelectStriker(pid)} className="inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-neutral-900 shadow-xs hover:border-emerald-500 active:scale-95 transition select-none touch-manipulation">
                        <span className="font-mono text-xs font-black text-emerald-600 flex-shrink-0">#{getPlayerJersey(pid)}</span>
                        <span className="truncate">{getPlayerName(pid)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {needsNonStriker && !isLastManStanding && !needsStriker && (
                <div className="rounded-3xl border border-blue-200 bg-blue-50/10 p-5 space-y-3 animate-slideUp">
                  <h4 className="text-xs font-black uppercase tracking-widest text-blue-800">Assign Non-Striker</h4>
                  <div className="flex flex-wrap gap-2">
                    {availBatPlayerIds.filter(pid => !unavailableBatIds.includes(pid) && pid !== striker).map(pid => (
                      <button key={pid} onClick={() => onSelectNonStriker(pid)} className="inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-bold text-neutral-900 shadow-xs hover:border-blue-500 active:scale-95 transition select-none touch-manipulation">
                        <span className="font-mono text-xs font-black text-blue-600 flex-shrink-0">#{getPlayerJersey(pid)}</span>
                        <span className="truncate">{getPlayerName(pid)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {needsBowler && !needsStriker && (
                <div className="rounded-3xl border border-purple-200 bg-purple-50/10 p-5 space-y-3 animate-slideUp">
                  <h4 className="text-xs font-black uppercase tracking-widest text-purple-800">Select Bowler for Next Over</h4>
                  {previousBowler && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200/50 px-3 py-1.5 text-[10px] font-bold text-amber-800">
                      <AlertTriangle size={12} className="flex-shrink-0" />
                      <span>{getPlayerName(previousBowler)} can't bowl consecutive overs (cricket rule)</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {availBowlPlayerIds.filter(pid => pid !== bowler && pid !== previousBowler).map(pid => (
                      <button key={pid} onClick={() => onSelectBowler(pid)} className="inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-xl border border-purple-200 bg-white px-4 py-2.5 text-xs font-bold text-neutral-900 shadow-xs hover:border-purple-500 active:scale-95 transition select-none touch-manipulation">
                        <span className="font-mono text-xs font-black text-purple-600 flex-shrink-0">#{getPlayerJersey(pid)}</span>
                        <span className="truncate">{getPlayerName(pid)}</span>
                      </button>
                    ))}
                    {availBowlPlayerIds.filter(pid => pid !== bowler && pid !== previousBowler).length === 0 && previousBowler && (
                      <div className="space-y-2 w-full">
                        <div className="text-xs text-amber-700 font-medium">No other bowlers available. You may override:</div>
                        <button onClick={() => onSelectBowler(previousBowler)} className="inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900 shadow-xs hover:border-amber-500 active:scale-95 transition select-none touch-manipulation">
                          <span className="font-mono text-xs font-black text-amber-600 flex-shrink-0">#{getPlayerJersey(previousBowler)}</span>
                          <span className="truncate">{getPlayerName(previousBowler)} (override)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {retiredHurtIds.length > 0 && (needsStriker || needsNonStriker) && (
                <div className="rounded-3xl border border-amber-200 bg-amber-50/10 p-5 space-y-3 animate-slideUp">
                  <h4 className="text-xs font-black uppercase tracking-widest text-amber-800">Recall Retired Hurt Batter</h4>
                  <div className="flex flex-wrap gap-2">
                    {retiredHurtIds.filter(pid => pid !== striker && pid !== nonStriker).map(pid => (
                      <button key={pid} onClick={() => { needsStriker ? onSelectStriker(pid) : onSelectNonStriker(pid); }} className="inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-bold text-neutral-900 shadow-xs hover:border-amber-500 active:scale-95 transition select-none touch-manipulation">
                        <span className="truncate"><HeartPulse size={11} className="inline-flex -mt-0.5 mr-1 text-amber-600" />{getPlayerName(pid)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            (needsStriker || needsNonStriker || needsBowler) && (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 text-center">
                <span className="inline-flex p-3 rounded-full bg-emerald-50 text-emerald-500 mb-3">
                  <RefreshCw size={24} className="animate-spin text-emerald-600" />
                </span>
                <h4 className="text-sm font-black text-neutral-900">Scorer is updating the field...</h4>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto leading-relaxed">Waiting for the scorer to assign the next batter/bowler. The scorecard updates live in real-time.</p>
              </div>
            )
          )}
        </div>
      )}

      {/* Primary Scoring Control Buttons */}
      {canScore && !isComplete && isAdmin && (
        <ScoringControls
          onDeliverBall={handleDeliverBallScrolled}
          onUndoLastBall={onUndoLastBall}
          onShowWicketModal={() => setShowWicketModal(true)}
          onShowNoBallModal={() => setShowNoBallRunsModal(true)}
        />
      )}

      {/* Finished Match Summary Card */}
      {isComplete && (
        <MatchSummaryCard
          match={match}
          allMatches={allMatches}
          isAdmin={isAdmin}
          onContinueSeries={onContinueSeries}
          onEndSeries={onEndSeries}
          onExit={onExit}
        />
      )}

      {/* Over Logs */}
      <OverLogs overHistory={inn.overHistory} helpers={helpers} />

      {/* Live Scorecards */}
      <LiveBattingScorecard batting={inn.batting} striker={striker} nonStriker={nonStriker} extras={inn.extras} helpers={helpers} />
      <LiveBowlingScorecard bowling={inn.bowling} bowler={bowler} helpers={helpers} />

      {/* Modals */}
      {showWicketModal && (
        <WicketModal
          bowler={bowler}
          striker={striker}
          nonStriker={nonStriker}
          fieldingPlayerIds={availBowlPlayerIds}
          helpers={helpers}
          onSubmit={handleWicketSubmit}
          onClose={() => setShowWicketModal(false)}
        />
      )}

      {showNoBallRunsModal && (
        <NoBallRunsModal
          onDeliverBall={handleDeliverBallScrolled}
          onClose={() => setShowNoBallRunsModal(false)}
        />
      )}

      {/* Viewer Footer */}
      {!isAdmin && (
        <div className="pt-6 pb-2 text-center text-xs text-neutral-400 font-semibold tracking-wide border-t border-neutral-100/60 mt-6">
          Made with <Heart size={12} className="inline-flex -mt-0.5 fill-red-500 text-red-500" /> Ranjith Ramesh
        </div>
      )}
    </div>
  );
}
