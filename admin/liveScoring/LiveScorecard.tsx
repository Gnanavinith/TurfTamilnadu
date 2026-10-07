import React from 'react';
import { sr, economy, ovStr } from '../../../utils/cricket';
import { getBallBadgeStyles, getLiveWicketDesc } from './helpers';
import { PlayerHelpers } from './types';

interface OverLogsProps {
  overHistory: string[][];
  helpers: PlayerHelpers;
}

export function OverLogs({ overHistory, helpers }: OverLogsProps) {
  if (overHistory.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Over Logs</h3>
      <div className="rounded-2xl border border-neutral-200/80 bg-white overflow-hidden divide-y divide-neutral-100">
        {[...overHistory].reverse().map((ovBalls, i, arr) => {
          const currentOverNum = arr.length - i;
          const overRuns = ovBalls.reduce((s, b) => {
            if (b === 'W') return s;
            if (b.includes('+W')) return s + (Number(b.split('+W')[0]) || 0);
            if (b === 'Wd' || b === 'Nb') return s + 1;
            if (b.startsWith('Wd+')) return s + 1 + Number(b.slice(3));
            if (b.startsWith('Nb+')) return s + 1 + Number(b.slice(3));
            if (b.startsWith('Lb')) return s + Number(b.slice(2));
            if (b.startsWith('B') && b.length <= 2) return s + Number(b.slice(1));
            return s + (Number(b) || 0);
          }, 0);
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-xs">
              <span className="font-bold text-neutral-400 min-w-[36px] font-mono">Ov {currentOverNum}</span>
              <div className="flex flex-wrap gap-1.5 flex-1">
                {ovBalls.map((b, bIdx) => (
                  <span
                    key={bIdx}
                    className={`flex h-6 min-w-6 items-center justify-center rounded-md font-mono text-[10px] font-bold px-0.5 ${getBallBadgeStyles(b)}`}
                  >
                    {b}
                  </span>
                ))}
              </div>
              <span className="font-mono text-[10px] font-bold text-neutral-500 flex-shrink-0">{overRuns}r</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface LiveBattingScorecardProps {
  batting: any[];
  striker: string | null;
  nonStriker: string | null;
  extras: { wide: number; noBall: number; bye: number; legBye: number };
  helpers: PlayerHelpers;
}

export function LiveBattingScorecard({ batting, striker, nonStriker, extras, helpers }: LiveBattingScorecardProps) {
  const { getPlayerName } = helpers;
  if (batting.length === 0) return null;

  const totalExtras = extras.wide + extras.noBall + extras.bye + extras.legBye;

  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Live Batting Scorecard</h3>
      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white">
        <div className="grid grid-cols-[1fr_36px_36px_28px_28px_44px] border-b border-neutral-100 bg-neutral-50 px-4 py-2 text-right text-[9px] font-black uppercase tracking-wider text-neutral-400">
          <div className="text-left">Batter</div>
          <div>R</div>
          <div>B</div>
          <div>4s</div>
          <div>6s</div>
          <div>S/R</div>
        </div>
        <div className="divide-y divide-neutral-100">
          {batting.map(b => {
            const isActive = b.pid === striker || b.pid === nonStriker;
            return (
              <div
                key={b.pid}
                className={`grid grid-cols-[1fr_36px_36px_28px_28px_44px] items-center px-4 py-2 text-right text-xs ${
                  isActive ? 'bg-emerald-50/20 font-semibold' : 'text-neutral-500'
                }`}
              >
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-neutral-900 font-bold">{getPlayerName(b.pid)}</span>
                    {b.pid === striker && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Striker"></span>}
                    {b.pid === nonStriker && <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" title="Non-striker"></span>}
                  </div>
                  {(b.out || b.retiredHurt) && (
                    <div className="text-[10px] text-neutral-400 font-semibold mt-0.5 leading-none">
                      {getLiveWicketDesc(b, getPlayerName)}
                    </div>
                  )}
                </div>
                <div className={`font-mono ${isActive ? 'font-black text-neutral-900' : ''}`}>{b.runs}</div>
                <div className="font-mono">{b.balls}</div>
                <div className="font-mono">{b.fours}</div>
                <div className="font-mono">{b.sixes}</div>
                <div className="font-mono text-neutral-400">{sr(b.runs, b.balls)}</div>
              </div>
            );
          })}
        </div>

        {totalExtras > 0 && (
          <div className="bg-neutral-50/60 px-4 py-1.5 border-t border-neutral-100 text-[10px] font-semibold text-neutral-500 flex justify-between">
            <span>Extras</span>
            <span className="font-mono font-bold text-neutral-700">
              {totalExtras} <span className="font-normal text-neutral-400">(Wd {extras.wide}, Nb {extras.noBall}, B {extras.bye}, Lb {extras.legBye})</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface LiveBowlingScorecardProps {
  bowling: any[];
  bowler: string | null;
  helpers: PlayerHelpers;
}

export function LiveBowlingScorecard({ bowling, bowler, helpers }: LiveBowlingScorecardProps) {
  const { getPlayerName } = helpers;
  if (bowling.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Live Bowling Scorecard</h3>
      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white">
        <div className="grid grid-cols-[1fr_40px_35px_35px_40px] border-b border-neutral-100 bg-neutral-50 px-4 py-2 text-right text-[9px] font-black uppercase tracking-wider text-neutral-400">
          <div className="text-left">Bowler</div>
          <div>Overs</div>
          <div>Runs</div>
          <div>Wkts</div>
          <div>Econ</div>
        </div>
        <div className="divide-y divide-neutral-100">
          {bowling.map(b => {
            const isActive = b.pid === bowler;
            return (
              <div
                key={b.pid}
                className={`grid grid-cols-[1fr_40px_35px_35px_40px] items-center px-4 py-2 text-right text-xs ${
                  isActive ? 'bg-blue-50/20 font-semibold' : 'text-neutral-500'
                }`}
              >
                <div className="text-left min-w-0 flex items-center gap-1">
                  <span className="truncate">{getPlayerName(b.pid)}</span>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>}
                </div>
                <div className="font-mono">{ovStr(b.overs, b.balls)}</div>
                <div className="font-mono">{b.runs}</div>
                <div className={`font-mono ${b.wickets > 0 ? 'font-bold text-emerald-600' : ''}`}>{b.wickets}</div>
                <div className="font-mono text-neutral-400">{economy(b.runs, b.overs, b.balls)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
