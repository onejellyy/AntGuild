export type LeagueKey = 'baek' | 'cheon' | 'eok';

export const LEAGUES: Record<LeagueKey, {
  label: string;
  shortLabel: string;
  fullName: string;
  color: string;
}> = {
  baek:  { label: '백키 리그', shortLabel: '백키', fullName: '백만원 키우기', color: '#22c55e' },
  cheon: { label: '천키 리그', shortLabel: '천키', fullName: '천만원 키우기', color: '#f59e0b' },
  eok:   { label: '억키 리그', shortLabel: '억키', fullName: '일억원 키우기', color: '#8b5cf6' },
};

export const LEAGUE_KEYS: LeagueKey[] = ['baek', 'cheon', 'eok'];
