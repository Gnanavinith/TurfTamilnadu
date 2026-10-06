import { describe, it, expect } from 'vitest'
import {
  formatOvers,
  overNumber,
  ballInOver,
  isInningsEnded,
  rotateStrike,
  shouldRotateForRun,
  shouldRotateForDelivery,
  calculateRunRate,
  legalBallsPerOver,
  deriveCreaseState,
  describeBall,
} from '../src/modules/scoring/scoring.utils.js'

describe('formatOvers', () => {
  it('renders legal ball counts as overs with a single decimal', () => {
    expect(formatOvers(0)).toBe('0.0')
    expect(formatOvers(6)).toBe('1.0')
    expect(formatOvers(13)).toBe('2.1')
    expect(formatOvers(59)).toBe('9.5')
  })
})

describe('delivery numbering', () => {
  it('numbers balls within an over (1-based)', () => {
    expect(overNumber(0)).toBe(1)
    expect(overNumber(5)).toBe(1)
    expect(overNumber(6)).toBe(2)
    expect(overNumber(59)).toBe(10)
  })

  it('tracks the ball position inside the over', () => {
    expect(ballInOver(0)).toBe(1)
    expect(ballInOver(5)).toBe(6)
    expect(ballInOver(6)).toBe(1)
    expect(ballInOver(13)).toBe(2)
  })
})

describe('legal overs helper', () => {
  it('computes max legal balls for an over limit', () => {
    expect(legalBallsPerOver(1)).toBe(6)
    expect(legalBallsPerOver(20)).toBe(120)
  })
})

describe('isInningsEnded', () => {
  it('ends when the over limit is reached', () => {
    expect(isInningsEnded({ legalBalls: 60, wickets: 4, maxLegalBalls: 60 })).toBe(true)
  })

  it('ends on 10 wickets regardless of overs', () => {
    expect(isInningsEnded({ legalBalls: 12, wickets: 10, maxLegalBalls: 60 })).toBe(true)
  })

  it('keeps an innings alive otherwise', () => {
    expect(isInningsEnded({ legalBalls: 10, wickets: 2, maxLegalBalls: 60 })).toBe(false)
    expect(isInningsEnded({ legalBalls: 0, wickets: 0, maxLegalBalls: 60 })).toBe(false)
  })
})

describe('strike rotation', () => {
  it('rotates after odd runs', () => {
    expect(shouldRotateForRun(1)).toBe(true)
    expect(shouldRotateForRun(3)).toBe(true)
    expect(shouldRotateForRun(2)).toBe(false)
    expect(shouldRotateForRun(4)).toBe(false)
  })

  it('swaps striker and non-striker', () => {
    expect(rotateStrike('A', 'B')).toEqual({ strikerId: 'B', nonStrikerId: 'A' })
  })
})

describe('calculateRunRate', () => {
  it('measures runs per legal over', () => {
    expect(calculateRunRate(80, 40)).toBe(12)
    expect(calculateRunRate(0, 0)).toBe(0)
  })
})

const XI = ['a', 'b', 'c']

describe('shouldRotateForDelivery', () => {
  it('rotates on odd runs off the bat', () => {
    expect(shouldRotateForDelivery({ batterRuns: 1 })).toBe(true)
    expect(shouldRotateForDelivery({ batterRuns: 3 })).toBe(true)
    expect(shouldRotateForDelivery({ batterRuns: 4 })).toBe(false)
    expect(shouldRotateForDelivery({ batterRuns: 6 })).toBe(false)
  })

  it('rotates on odd byes and leg byes', () => {
    expect(shouldRotateForDelivery({ extraType: 'bye', extraRuns: 1 })).toBe(true)
    expect(shouldRotateForDelivery({ extraType: 'leg_bye', extraRuns: 2 })).toBe(false)
  })

  it('rotates on a wide only when the total added is odd', () => {
    expect(shouldRotateForDelivery({ extraType: 'wide', extraRuns: 1 })).toBe(true)
    expect(shouldRotateForDelivery({ extraType: 'wide', extraRuns: 2 })).toBe(false)
  })

  it('counts the no-ball penalty when deciding rotation', () => {
    // 1 off the bat + the no-ball penalty = 2, so the ends stay put.
    expect(shouldRotateForDelivery({ batterRuns: 1, extraType: 'no_ball', extraRuns: 1 })).toBe(
      false,
    )
    expect(shouldRotateForDelivery({ batterRuns: 2, extraType: 'no_ball', extraRuns: 1 })).toBe(
      true,
    )
  })
})

describe('describeBall', () => {
  it('renders plain runs', () => {
    expect(describeBall({ batterRuns: 4 }).token).toBe('4')
    expect(describeBall({ batterRuns: 0, runs: 0 }).token).toBe('0')
  })

  it('renders extras with their run count', () => {
    expect(describeBall({ extraType: 'wide', extraRuns: 1 }).token).toBe('Wd')
    expect(describeBall({ extraType: 'wide', extraRuns: 3 }).token).toBe('Wd+2')
    expect(describeBall({ extraType: 'no_ball', extraRuns: 1 }).token).toBe('Nb')
    expect(describeBall({ batterRuns: 2, extraType: 'no_ball', extraRuns: 1 }).token).toBe('Nb+2')
    expect(describeBall({ extraType: 'bye', extraRuns: 1 }).token).toBe('B1')
    expect(describeBall({ extraType: 'leg_bye', extraRuns: 4 }).token).toBe('Lb4')
  })

  it('renders wickets, including runs completed on a run out', () => {
    expect(describeBall({ wicket: { type: 'bowled' } }).token).toBe('W')
    expect(describeBall({ batterRuns: 1, wicket: { type: 'run_out' } }).token).toBe('1+W')
  })
})

describe('deriveCreaseState', () => {
  it('opens with the first two batters from the XI', () => {
    const state = deriveCreaseState([], { xi: XI })
    expect(state.strikerId).toBe('a')
    expect(state.nonStrikerId).toBe('b')
    expect(state.bowlerId).toBeNull()
  })

  it('rotates the strike after odd runs', () => {
    const state = deriveCreaseState([{ batterRuns: 1, isLegal: true, bowlerId: 'x' }], { xi: XI })
    expect(state.strikerId).toBe('b')
    expect(state.nonStrikerId).toBe('a')
  })

  it('swaps ends and forces a new bowler at the end of an over', () => {
    const balls = Array.from({ length: 6 }, () => ({ batterRuns: 0, isLegal: true, bowlerId: 'x' }))
    const state = deriveCreaseState(balls, { xi: XI })
    expect(state.strikerId).toBe('b')
    expect(state.nonStrikerId).toBe('a')
    expect(state.bowlerId).toBeNull()
    expect(state.previousBowlerId).toBe('x')
    expect(state.legalBalls).toBe(6)
    expect(state.thisOverBalls).toBe(0)
  })

  it('does not count a wide towards the over', () => {
    const balls = [
      { extraType: 'wide', extraRuns: 1, isLegal: false, bowlerId: 'x' },
      { batterRuns: 0, isLegal: true, bowlerId: 'x' },
    ]
    const state = deriveCreaseState(balls, { xi: XI })
    expect(state.legalBalls).toBe(1)
    expect(state.extras.wide).toBe(1)
    expect(state.bowlerId).toBe('x')
  })

  it('empties the striker slot on a wicket and marks the batter unavailable', () => {
    const state = deriveCreaseState(
      [{ batterRuns: 0, isLegal: true, bowlerId: 'x', wicket: { type: 'bowled', batterId: 'a' } }],
      { xi: XI },
    )
    expect(state.strikerId).toBeNull()
    expect(state.dismissed).toEqual(['a'])
    expect(state.availableBatters).toEqual(['c'])
    expect(state.wickets).toBe(1)
  })

  it('splits extras into their buckets', () => {
    const state = deriveCreaseState(
      [
        { extraType: 'wide', extraRuns: 2, isLegal: false, bowlerId: 'x' },
        { extraType: 'no_ball', extraRuns: 1, isLegal: false, bowlerId: 'x' },
        { extraType: 'bye', extraRuns: 1, isLegal: true, bowlerId: 'x' },
        { extraType: 'leg_bye', extraRuns: 3, isLegal: true, bowlerId: 'x' },
      ],
      { xi: XI },
    )
    expect(state.extras).toEqual({ wide: 2, noBall: 1, bye: 1, legBye: 3 })
  })
})