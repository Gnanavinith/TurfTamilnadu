import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchMyTeams } from '../features/teams/api'

// A side can only be picked once it has a couple of bodies; one player cannot
// field an XI. Kept in step with the server's playingXI minimum.
const MIN_SQUAD = 2

/**
 * The guided first-run path for a brand new account: create a team, add players,
 * then start a match. Each step reflects real state, so it doubles as progress
 * tracking once the admin is partway through.
 */
export default function GettingStarted({
  teams = [],
  isLoading = false,
  onCreateTeam,
  onAddPlayer,
}) {
  // Only fetch when we have no teams to work from, so an existing account that
  // navigates here never pays for the query.
  const needsTeams = teams.length === 0 && !isLoading
  const { data, isFetching } = useQuery({
    queryKey: ['teams', 'getting-started'],
    queryFn: fetchMyTeams,
    enabled: needsTeams,
  })

  const resolved = teams.length > 0 ? teams : (data?.data ?? [])
  const readyTeams = resolved.filter((team) => (team.members ?? 0) >= MIN_SQUAD)
  const playingTeams = readyTeams.slice(0, 2)
  const canPlay = playingTeams.length >= 2

  const steps = [
    {
      label: 'Create your team',
      detail: 'Name the squad and pick a city. It starts with you as the admin.',
      done: resolved.length > 0,
      // When the host page can open its own create-team sheet, do that instead
      // of navigating away and leaving the admin to hunt for the button.
      action: onCreateTeam ? (
        <button type="button" className="gs-btn" onClick={onCreateTeam}>
          {resolved.length > 0 ? 'Manage teams' : 'Create team'}
        </button>
      ) : (
        <Link to="/teams" className="gs-btn">
          {resolved.length > 0 ? 'Manage teams' : 'Create team'}
        </Link>
      ),
    },
    {
      label: 'Add players to the team',
      detail: 'Give each player a name and a jersey number so the scorecard reads properly.',
      done: resolved.length > 0 && resolved.some((team) => (team.members ?? 0) >= MIN_SQUAD),
      action: onAddPlayer ? (
        <button type="button" className="gs-btn" onClick={onAddPlayer}>
          Add players
        </button>
      ) : (
        <Link to="/players" className="gs-btn">
          Add players
        </Link>
      ),
    },
    {
      label: 'Start a match',
      detail: canPlay
        ? `${playingTeams.map((team) => team.name).join(' vs ')} — set the overs and toss.`
        : `Needs two teams with at least ${MIN_SQUAD} players. You have ${playingTeams.length} ready.`,
      done: false,
      // Gated: stays disabled until both sides can actually field a team.
      locked: !canPlay,
      action: (
        <Link
          to="/matches/create"
          className={`gs-btn gs-btn-primary${canPlay ? '' : ' is-disabled'}`}
          aria-disabled={!canPlay}
          onClick={(event) => {
            // pointer-events:none covers the mouse; this also blocks keyboard
            // activation, which a link would otherwise still allow.
            if (!canPlay) event.preventDefault()
          }}
        >
          Start a match
        </Link>
      ),
    },
  ]

  const doneCount = steps.filter((step) => step.done).length
  const percent = Math.round((doneCount / steps.length) * 100)

  return (
    <section className="gs-card">
      <header className="gs-header">
        <span className="gs-eyebrow">Getting started</span>
        <h2>Let&apos;s get your first match on the board</h2>
        <p>Three quick steps. Everything stays private to your account until you play.</p>

        <div
          className="gs-progress"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="gs-progress-bar" style={{ width: `${percent}%` }} />
        </div>
        {!isLoading && !isFetching && (
          <span className="gs-progress-label">
            {doneCount} of {steps.length} completed
          </span>
        )}
      </header>

      <ol className="gs-steps">
        {steps.map((step, index) => {
          const state = step.done ? 'done' : step.locked ? 'locked' : 'next'
          return (
            <li key={step.label} className={`gs-step is-${state}`}>
              <span className="gs-step-no" aria-hidden="true">
                {step.done ? (
                  <svg
                    viewBox="0 0 20 20"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 10.5l4 4 8-9" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <div className="gs-step-body">
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </div>
              <div className="gs-step-action">{step.action}</div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
