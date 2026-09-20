import { describe, it, expect } from 'vitest'
import {
  formatOvers,
  overNumber,
  ballInOver,
  isInningsEnded,
  rotateStrike,
  shouldRotateForRun,
  calculateRunRate,
  legalBallsPerOver,
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