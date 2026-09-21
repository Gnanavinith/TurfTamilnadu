import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createMatch } from '../api'
import { fetchMyTeams, fetchTeam } from '../../teams/api'
import MatchForm from '../components/MatchForm'
import TossPanel from '../components/TossPanel'
import PlayingXI from '../components/PlayingXI'

const INITIAL_STATE = {
  teamAId: '',
  teamBId: '',
  overs: 10,
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
    mutationFn: createMatch,
    onSuccess: ({ data }) => {
      const id = data?.match?.id ?? data?.id
      navigate(id ? `/live/${id}` : '/matches')
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

  const payload = {
    teamAId: form.teamAId,
    teamBId: form.teamBId,
    overs: form.overs,
    scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
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
    mutation.mutate(payload)
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
              disabled={!form.teamAId || !form.teamBId || form.teamAId === form.teamBId}
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