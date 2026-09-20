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

export const STATUS_LABELS = {
  [MATCH_STATUS.SCHEDULED]: 'Scheduled',
  [MATCH_STATUS.LIVE]: 'Live',
  [MATCH_STATUS.COMPLETED]: 'Completed',
  [MATCH_STATUS.ABANDONED]: 'Abandoned',
}