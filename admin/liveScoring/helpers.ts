import { Player } from '../../../types';

export function createPlayerHelpers(players: Player[]) {
  const getPlayerName = (pid: string) => {
    const p = players.find(x => x.id === pid);
    return p ? p.name : 'Unknown Player';
  };

  const getPlayerJersey = (pid: string) => {
    const p = players.find(x => x.id === pid);
    return p ? p.jerseyNo : '#';
  };

  const getPlayerRole = (pid: string) => {
    const p = players.find(x => x.id === pid);
    return p ? p.role : '';
  };

  return { getPlayerName, getPlayerJersey, getPlayerRole };
}

export function getLiveWicketDesc(
  b: { out: boolean; retiredHurt?: boolean; wicketDetail?: { type: string; bowlerId?: string; helperId?: string } },
  getPlayerName: (pid: string) => string
) {
  if (b.retiredHurt) return 'Retired Hurt';
  if (!b.out) return '';
  if (!b.wicketDetail) return 'Out';
  const { type, bowlerId, helperId } = b.wicketDetail;
  const bowlerName = bowlerId ? getPlayerName(bowlerId) : '';
  const helperName = helperId ? getPlayerName(helperId) : '';

  switch (type) {
    case 'Bowled':
      return `b ${bowlerName}`;
    case 'Caught':
      if (helperId && helperId === bowlerId) return `c & b ${bowlerName}`;
      return helperName ? `c ${helperName} b ${bowlerName}` : `c & b ${bowlerName}`;
    case 'LBW':
      return `lbw b ${bowlerName}`;
    case 'Stumped':
      return helperName ? `st ${helperName} b ${bowlerName}` : `st b ${bowlerName}`;
    case 'Run Out':
      return helperName ? `run out (${helperName})` : `run out`;
    case 'Hit Wicket':
      return `hit wicket b ${bowlerName}`;
    case 'Retired':
      return 'retired';
    default:
      return 'out';
  }
}

export function getBallBadgeStyles(val: string) {
  if (val === 'W' || val.includes('+W') || val.includes('W+')) {
    return 'bg-red-500 text-white font-black';
  }
  if (val.startsWith('Nb+')) {
    return 'bg-amber-100 text-amber-800 border border-amber-200 font-bold';
  }
  if (val.startsWith('Wd+')) {
    return 'bg-amber-100 text-amber-800 border border-amber-200 font-bold';
  }
  if (val.startsWith('B') && val.length <= 2 && val !== 'B') {
    return 'bg-sky-50 text-sky-700 border border-sky-200 font-bold';
  }
  if (val.startsWith('Lb')) {
    return 'bg-sky-50 text-sky-700 border border-sky-200 font-bold';
  }
  switch (val) {
    case '0':
      return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
    case '1':
    case '2':
    case '3':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case '4':
      return 'bg-emerald-500 text-neutral-950 font-black';
    case '6':
      return 'bg-purple-600 text-white font-black';
    case 'W':
      return 'bg-red-500 text-white font-black';
    case 'Wd':
    case 'Nb':
      return 'bg-amber-100 text-amber-800 border border-amber-200 font-bold';
    default:
      return 'bg-neutral-100 text-neutral-600';
  }
}

export function getMatchWinnerId(m: { status: string; innings: { runs: number }[]; battingFirstId: string; fieldingFirstId: string }) {
  if (m.status !== 'complete') return null;
  const r1 = m.innings[0].runs;
  const r2 = m.innings[1].runs;
  if (r1 > r2) return m.battingFirstId;
  if (r2 > r1) return m.fieldingFirstId;
  return null;
}
