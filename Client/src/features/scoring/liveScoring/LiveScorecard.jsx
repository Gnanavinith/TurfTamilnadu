import { dismissalText } from '../cricket'
import { economy, ovStr, overRuns, sr, getBallBadgeStyles } from './helpers'

/**
 * Ball-by-ball, over by over, newest over first — which is how a scorer or a
 * spectator reads a chase.
 */
export function OverLogs({ overHistory = [] }) {
  if (overHistory.length === 0) return null

  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-black tracking-wider text-neutral-400 uppercase">
        Over Logs
      </h3>
      <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white">
        {[...overHistory].reverse().map((ovBalls, i, arr) => {
          const currentOverNum = arr.length - i

          return (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-xs">
              <span className="min-w-[36px] font-mono font-bold text-neutral-400">
                Ov {currentOverNum}
              </span>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {ovBalls.map((ball, bIdx) => (
                  <span
                    key={bIdx}
                    className={`ball-badge flex h-6 min-w-6 items-center justify-center rounded-md px-0.5 font-mono text-[10px] ${getBallBadgeStyles(ball.token)}`}
                  >
                    {ball.token}
                  </span>
                ))}
              </div>
              <span className="flex-shrink-0 font-mono text-[10px] font-bold text-neutral-500">
                {overRuns(ovBalls)}r
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Who is batting, with the two ends marked and dismissals spelled out. */
export function LiveBattingScorecard({ batting = [], striker, nonStriker, extras, helpers }) {
  const { getPlayerName } = helpers
  if (batting.length === 0) return null

  const breakdown = extras ?? {}
  const totalExtras =
    (breakdown.wide ?? 0) + (breakdown.noBall ?? 0) + (breakdown.bye ?? 0) + (breakdown.legBye ?? 0)

  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-black tracking-wider text-neutral-400 uppercase">
        Live Batting Scorecard
      </h3>
      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white">
        <div className="grid grid-cols-[1fr_36px_36px_28px_28px_44px] border-b border-neutral-100 bg-neutral-50 px-4 py-2 text-right text-[9px] font-black tracking-wider text-neutral-400 uppercase">
          <div className="text-left">Batter</div>
          <div>R</div>
          <div>B</div>
          <div>4s</div>
          <div>6s</div>
          <div>S/R</div>
        </div>
        <div className="divide-y divide-neutral-100">
          {batting.map((entry) => {
            const pid = String(entry.userId)
            const isStriker = pid === String(striker)
            const isNonStriker = pid === String(nonStriker)
            const isActive = isStriker || isNonStriker
            const out = dismissalText(entry)

            return (
              <div
                key={pid}
                className={`grid grid-cols-[1fr_36px_36px_28px_28px_44px] items-center px-4 py-2 text-right text-xs ${
                  isActive ? 'bg-emerald-50/20 font-semibold' : 'text-neutral-500'
                }`}
              >
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-bold text-neutral-900">
                      {entry.name ?? getPlayerName(pid)}
                    </span>
                    {isStriker && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                        title="Striker"
                      />
                    )}
                    {isNonStriker && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-neutral-300"
                        title="Non-striker"
                      />
                    )}
                  </div>
                  {out && (
                    <div className="mt-0.5 text-[10px] leading-none font-semibold text-neutral-400">
                      {out}
                    </div>
                  )}
                </div>
                <div className={`font-mono ${isActive ? 'font-black text-neutral-900' : ''}`}>
                  {entry.runs ?? 0}
                </div>
                <div className="font-mono">{entry.balls ?? 0}</div>
                <div className="font-mono">{entry.fours ?? 0}</div>
                <div className="font-mono">{entry.sixes ?? 0}</div>
                <div className="font-mono text-neutral-400">
                  {sr(entry.runs ?? 0, entry.balls ?? 0)}
                </div>
              </div>
            )
          })}
        </div>

        {totalExtras > 0 && (
          <div className="flex justify-between border-t border-neutral-100 bg-neutral-50/60 px-4 py-1.5 text-[10px] font-semibold text-neutral-500">
            <span>Extras</span>
            <span className="font-mono font-bold text-neutral-700">
              {totalExtras}{' '}
              <span className="font-normal text-neutral-400">
                (Wd {breakdown.wide ?? 0}, Nb {breakdown.noBall ?? 0}, B {breakdown.bye ?? 0}, Lb{' '}
                {breakdown.legBye ?? 0})
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/** Who has bowled, with the over in progress marked. */
export function LiveBowlingScorecard({ bowling = [], bowler, helpers }) {
  const { getPlayerName } = helpers
  if (bowling.length === 0) return null

  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-black tracking-wider text-neutral-400 uppercase">
        Live Bowling Scorecard
      </h3>
      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white">
        <div className="grid grid-cols-[1fr_40px_35px_35px_40px] border-b border-neutral-100 bg-neutral-50 px-4 py-2 text-right text-[9px] font-black tracking-wider text-neutral-400 uppercase">
          <div className="text-left">Bowler</div>
          <div>Overs</div>
          <div>Runs</div>
          <div>Wkts</div>
          <div>Econ</div>
        </div>
        <div className="divide-y divide-neutral-100">
          {bowling.map((entry) => {
            const pid = String(entry.userId)
            const isActive = pid === String(bowler)

            return (
              <div
                key={pid}
                className={`grid grid-cols-[1fr_40px_35px_35px_40px] items-center px-4 py-2 text-right text-xs ${
                  isActive ? 'bg-blue-50/20 font-semibold' : 'text-neutral-500'
                }`}
              >
                <div className="flex min-w-0 items-center gap-1 text-left">
                  <span className="truncate">{entry.name ?? getPlayerName(pid)}</span>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                </div>
                <div className="font-mono">{ovStr(entry.balls ?? 0)}</div>
                <div className="font-mono">{entry.runs ?? 0}</div>
                <div
                  className={`font-mono ${
                    (entry.wickets ?? 0) > 0 ? 'font-bold text-emerald-600' : ''
                  }`}
                >
                  {entry.wickets ?? 0}
                </div>
                <div className="font-mono text-neutral-400">
                  {economy(entry.runs ?? 0, entry.balls ?? 0)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}