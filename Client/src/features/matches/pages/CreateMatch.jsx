import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createMatch } from '../api'
import { fetchMyTeams, fetchTeam } from '../../teams/api'
import Loader from '../../../components/Loader'
import Button from '../../../components/Button'
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

  if (teamsQuery.isLoading) return <Loader label="Loading teams…" />

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
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Create Match</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Set up the fixture, toss and playing XI
          </p>
        </div>
        {step > 1 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
      </div>

      <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        {['Details', 'Toss', 'Playing XI'].map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                step === index + 1
                  ? 'bg-emerald-600 text-white'
                  : step > index + 1
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
              }`}
            >
              {index + 1}
            </span>
            <span
              className={
                step === index + 1
                  ? 'font-medium'
                  : 'text-slate-400 dark:text-slate-500'
              }
            >
              {label}
            </span>
            {index < 2 && <span className="text-slate-300">·</span>}
          </li>
        ))}
      </ol>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </p>
      )}

      {step === 1 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <MatchForm teams={teams} value={form} onChange={setForm} />
          <div className="mt-6 flex justify-end">
            <Button
              disabled={!form.teamAId || !form.teamBId || form.teamAId === form.teamBId}
              onClick={() => setStep(2)}
            >
              Next: Toss
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <TossPanel teams={teams} value={form} onChange={setForm} />
          {form.tossDone && (
            <Button className="mt-6" onClick={() => setStep(3)}>
              Next: Playing XI
            </Button>
          )}
        </section>
      )}

      {step === 3 && (
        <>
          {squadsLoading ? (
            <Loader label="Loading squads…" />
          ) : (
            <PlayingXI teams={xiTeams} value={form} onChange={setForm} />
          )}
          {form.xiDone && (
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSubmit} loading={mutation.isPending} size="lg">
                Create Match
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}