export const BALLS_PER_OVER = 6

export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
}

export const PLAYER_ROLES = {
  BATTER: 'batter',
  BOWLER: 'bowler',
  ALL_ROUNDER: 'all_rounder',
  WICKET_KEEPER: 'wicket_keeper',
}

export const WICKET_TYPES = [
  'bowled',
  'caught',
  'lbw',
  'run_out',
  'stumped',
  'hit_wicket',
  'retired',
]

export const EXTRAS = {
  WIDE: 'wide',
  NO_BALL: 'no_ball',
  BYE: 'bye',
  LEG_BYE: 'leg_bye',
}

export const MAX_SQUAD_SIZE = 15
export const XI_SIZE = 11
export const OVER_OPTIONS = [5, 10, 15, 20]
export const MIN_OVERS = 1
export const MAX_OVERS = 50
export const CUSTOM_OVERS = 'custom'

export const START_MODES = {
  NOW: 'now',
  SCHEDULED: 'scheduled',
}

export const START_MODE_OPTIONS = [
  { value: START_MODES.NOW, label: 'Start now' },
  { value: START_MODES.SCHEDULED, label: 'Schedule for later' },
]

export const MATCH_TYPES = {
  SINGLE: 'single',
  TOURNAMENT: 'tournament',
}

export const MATCH_TYPE_OPTIONS = [
  { value: MATCH_TYPES.SINGLE, label: 'Single match' },
  { value: MATCH_TYPES.TOURNAMENT, label: 'Tournament match' },
]

export const STATUS_LABELS = {
  [MATCH_STATUS.SCHEDULED]: 'Scheduled',
  [MATCH_STATUS.LIVE]: 'Live',
  [MATCH_STATUS.COMPLETED]: 'Completed',
  [MATCH_STATUS.ABANDONED]: 'Abandoned',
}