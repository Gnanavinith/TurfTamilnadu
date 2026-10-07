import React, { useState } from 'react';
import { motion } from 'motion/react';
import { WicketType, PlayerHelpers } from './types';

interface WicketModalProps {
  bowler: string | null;
  striker: string | null;
  nonStriker: string | null;
  fieldingPlayerIds: string[];
  helpers: PlayerHelpers;
  onSubmit: (wicketType: WicketType, bowlerId: string | undefined, helperId: string | undefined, outPlayerId: string | undefined, runOutRuns: number | undefined) => void;
  onClose: () => void;
}

export default function WicketModal({ bowler, striker, nonStriker, fieldingPlayerIds, helpers, onSubmit, onClose }: WicketModalProps) {
  const { getPlayerName, getPlayerJersey } = helpers;
  const [wicketType, setWicketType] = useState<WicketType>('Bowled');
  const [wicketFielderId, setWicketFielderId] = useState('');
  const [wicketOutPlayerId, setWicketOutPlayerId] = useState(striker || '');
  const [runOutRuns, setRunOutRuns] = useState(0);

  const handleSubmit = () => {
    onSubmit(
      wicketType,
      bowler || undefined,
      wicketFielderId || undefined,
      wicketOutPlayerId || striker || undefined,
      wicketType === 'Run Out' ? runOutRuns : undefined
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-xs modal-overlay">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-white rounded-3xl border border-neutral-200 p-6 shadow-2xl space-y-4 text-left modal-content"
      >
        <div>
          <h3 className="text-lg font-black text-neutral-950">Record Wicket</h3>
          <p className="text-xs text-neutral-500 mt-1">Specify how the wicket fell and who contributed.</p>
        </div>

        {/* Out Batter selection */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">Who is Out?</label>
          <div className="grid grid-cols-2 gap-2">
            {striker && (
              <button
                type="button"
                onClick={() => setWicketOutPlayerId(striker)}
                className={`rounded-xl border p-2.5 text-xs font-bold text-center transition ${
                  wicketOutPlayerId === striker ? 'border-red-500 bg-red-50 text-red-700' : 'border-neutral-200 hover:bg-neutral-50 text-neutral-800'
                }`}
              >
                Striker: {getPlayerName(striker)}
              </button>
            )}
            {nonStriker && (
              <button
                type="button"
                onClick={() => setWicketOutPlayerId(nonStriker)}
                className={`rounded-xl border p-2.5 text-xs font-bold text-center transition ${
                  wicketOutPlayerId === nonStriker ? 'border-red-500 bg-red-50 text-red-700' : 'border-neutral-200 hover:bg-neutral-50 text-neutral-800'
                }`}
              >
                Non-Striker: {getPlayerName(nonStriker)}
              </button>
            )}
          </div>
        </div>

        {/* Wicket Type selection */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">Wicket Type</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket'] as const).map(type => (
              <button
                type="button"
                key={type}
                onClick={() => {
                  setWicketType(type);
                  if (type !== 'Caught' && type !== 'Run Out' && type !== 'Stumped') setWicketFielderId('');
                }}
                className={`rounded-xl border py-2 text-[11px] font-black text-center transition ${
                  wicketType === type ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Bowler Name (Read-Only Info) */}
        {wicketType !== 'Run Out' && bowler && (
          <div className="rounded-xl bg-neutral-50 p-2.5 border border-neutral-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-500">Wicket Credited To:</span>
            <span className="font-extrabold text-neutral-800">{getPlayerName(bowler)}</span>
          </div>
        )}

        {/* Helper Fielder Dropdown */}
        {['Caught', 'Run Out', 'Stumped'].includes(wicketType) && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
              {wicketType === 'Caught' ? 'Who caught it?' : wicketType === 'Stumped' ? 'Who stumped it?' : 'Who threw/assisted?'} (Fielder)
            </label>
            <select
              value={wicketFielderId}
              onChange={(e) => setWicketFielderId(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-800 bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">-- Select Fielder --</option>
              {fieldingPlayerIds.map(pid => (
                <option key={pid} value={pid}>#{getPlayerJersey(pid)} {getPlayerName(pid)}</option>
              ))}
            </select>
          </div>
        )}

        {/* Completed Runs for Run Out */}
        {wicketType === 'Run Out' && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
              Completed runs on this ball before run out:
            </label>
            <div className="flex gap-2">
              {([0, 1, 2, 3] as const).map(num => (
                <button
                  type="button"
                  key={num}
                  onClick={() => setRunOutRuns(num)}
                  className={`flex-1 rounded-xl border py-2 text-xs font-bold text-center transition ${
                    runOutRuns === num ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  {num} {num === 1 ? 'Run' : 'Runs'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-xs font-bold text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 transition">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className="flex-1 rounded-xl bg-red-500 py-2.5 text-xs font-bold text-white hover:bg-red-600 active:scale-95 transition">
            Confirm Wicket
          </button>
        </div>
      </motion.div>
    </div>
  );
}
