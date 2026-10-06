import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createMatch, startMatch } from '../api'
import { getErrorMessage } from '../../../lib/axios'
import { fetchMyTeams, fetchTeam } from '../../teams/api'
import MatchForm from '../components/MatchForm'
import TossPanel from '../components/TossPanel'
import PlayingXI from '../components/PlayingXI'
import { MATCH_TYPES, MIN_OVERS, MAX_OVERS, START_MODES } from '../../../utils/constants'

const INITIAL_STATE = {
  teamAId: '',
  teamBId: '',
  matchType: MATCH_TYPES.SINGLE,
  tournamentName: '',
  oversChoice: '10',
  overs: 10,
  startMode: START_MODES.SCHEDULED,
  scheduledAt: '',
  tossWinnerId: '',
  tossDecision: '',
  tossDone: false,
  teamAXI: [],
  teamBXI: [],
  xiDone: false,
}

export default function CreateMatch() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_STATE)
  const [error, setError] = useState('')

  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: fetchMyTeams })

  const teamAQuery = useQuery({
    queryKey: ['team', form.teamAId],
    queryFn: () => fetchTeam(form.teamAId),
    enabled: Boolean(form.teamAId),
  })
  const teamBQuery = useQuery({
    queryKey: ['team', form.teamBId],
    queryFn: () => fetchTeam(form.teamBId),
    enabled: Boolean(form.teamBId),
  })

  const mutation = useMutation({
    mutationFn: async ({ startNow, ...body }) => {
      const created = await createMatch(body)
      const id = created?.data?.match?.id ?? created?.data?.id
      // "Start now" goes straight to a live match instead of a scheduled one.
      if (id && startNow) await startMatch(id)
      return id
    },
    onSuccess: (id, variables) => {
      if (!id) {
        navigate('/matches')
        return
      }
      // "Start now" is already live, so drop the scorer straight into scoring.
      navigate(variables?.startNow ? `/scoring/${id}` : `/live/${id}`)
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'Could not create the match'))
    },
  })

  const teams = teamsQuery.data?.data ?? []

  if (teamsQuery.isLoading) {
    return (
      <div className="g-screen">
        <div className="g-skel" />
        <div className="g-skel" />
        <div className="g-skel" />
      </div>
    )
  }

  const squadsById = new Map()
  for (const detail of [teamAQuery.data?.data, teamBQuery.data?.data]) {
    if (detail?.id) squadsById.set(String(detail.id), detail.squad ?? [])
  }
  const xiTeams = teams.map((team) => {
    const squad = squadsById.get(String(team.id))
    return squad ? { ...team, squad } : team
  })
  const squadsLoading =
    (Boolean(form.teamAId) && teamAQuery.isPending) ||
    (Boolean(form.teamBId) && teamBQuery.isPending)

  const oversValid =
    Number.isInteger(Number(form.overs)) &&
    Number(form.overs) >= MIN_OVERS &&
    Number(form.overs) <= MAX_OVERS
  const tournamentName = (form.tournamentName ?? '').trim()
  const tournamentValid =
    form.matchType !== MATCH_TYPES.TOURNAMENT || tournamentName.length >= 2
  const startMode = form.startMode ?? START_MODES.SCHEDULED
  const startNow = startMode === START_MODES.NOW
  const detailsValid =
    Boolean(form.teamAId) &&
    Boolean(form.teamBId) &&
    form.teamAId !== form.teamBId &&
    oversValid &&
    tournamentValid &&
    (startNow || Boolean(form.scheduledAt))

  const payload = {
    teamAId: form.teamAId,
    teamBId: form.teamBId,
    matchType: form.matchType ?? MATCH_TYPES.SINGLE,
    tournamentName:
      form.matchType === MATCH_TYPES.TOURNAMENT ? tournamentName : undefined,
    overs: Number(form.overs),
    // "Start now" still needs a scheduledAt: it is required and marks the
    // intended start, which for an immediate match is the current moment.
    scheduledAt: startNow
      ? new Date().toISOString()
      : form.scheduledAt
        ? new Date(form.scheduledAt).toISOString()
        : undefined,
    toss: {
      winnerTeamId: form.tossWinnerId,
      decision: form.tossDecision,
    },
    playingXI: {
      teamA: form.teamAXI,
      teamB: form.teamBXI,
    },
  }

  const handleSubmit = () => {
    setError('')
    mutation.mutate({ ...payload, startNow })
  }

  return (
    <div className="g-screen">
      <div className="g-hello">
        <small>New fixture</small>
        <h1>
          Create <em>match</em>
        </h1>
      </div>

      <div className="g-seg" role="list" aria-label="Steps">
        {['Details', 'Toss', 'Playing XI'].map((label, index) => (
          <button
            key={label}
            type="button"
            role="listitem"
            aria-selected={step === index + 1}
            disabled
          >
            {index + 1}. {label}
          </button>
        ))}
      </div>

      {error && <div className="g-alert g-alert-error">{error}</div>}

      {step === 1 && (
        <div className="g-panel">
          <MatchForm teams={teams} value={form} onChange={setForm} />
          <div className="g-btn-row" style={{ marginTop: 18 }}>
            <button
              type="button"
              className="g-btn"
              disabled={!detailsValid}
              onClick={() => setStep(2)}
            >
              Next: Toss
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="g-panel">
          <TossPanel teams={teams} value={form} onChange={setForm} />
          <div className="g-btn-row" style={{ marginTop: 18 }}>
            <button type="button" className="g-btn g-btn-ghost" onClick={() => setStep(1)}>
              Back
            </button>
            {form.tossDone && (
              <button type="button" className="g-btn" onClick={() => setStep(3)}>
                Next: Playing XI
              </button>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <>
          {squadsLoading ? (
            <div>
              {[0, 1, 2].map((i) => (
                <div key={i} className="g-skel" />
              ))}
            </div>
          ) : (
            <PlayingXI teams={xiTeams} value={form} onChange={setForm} />
          )}
          <div className="g-btn-row" style={{ marginTop: 18 }}>
            <button type="button" className="g-btn g-btn-ghost" onClick={() => setStep(2)}>
              Back
            </button>
            {form.xiDone && (
              <button
                type="button"
                className="g-btn"
                onClick={handleSubmit}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Creating…' : 'Create match'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}