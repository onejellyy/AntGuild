// ─────────────────────────────────────────────────────────────
// Rank system  (별개의 포인트 시스템 — 레벨과 무관)
//
// rankPoints (0–∞) 기반.
// 수익률에 따라 매도마다 LP 증감, 최솟값 0.
//
// Iron III → Diamond I : 21 divisions × 100 pts each  (0–2099)
// Master threshold      : 2100
// Master      LP 0–499  : 2100–2599
// Grandmaster LP 500–999: 2600–3099
// Challenger  LP 1000+  : 3100+
// ─────────────────────────────────────────────────────────────

export interface RankInfo {
  /** e.g. "Gold II", "Master", "Challenger" */
  displayName: string;
  /** Text fill color */
  fill: string;
  /** Text stroke / outline color */
  stroke: string;
  /** Points within the current division (0–99) or LP for Master+ */
  divPoints: number;
  /** Max points for progress bar (100 for divisions, 500/500/∞ for master tiers) */
  divMax: number;
}

interface TierDef {
  name: string;
  fill: string;
  stroke: string;
}

const TIERS: TierDef[] = [
  { name: 'Iron',     fill: '#6E6E6E', stroke: '#2B2B2B' },
  { name: 'Bronze',   fill: '#8C6239', stroke: '#3B2412' },
  { name: 'Silver',   fill: '#C0C8D3', stroke: '#5A6675' },
  { name: 'Gold',     fill: '#D4AF37', stroke: '#6B4E00' },
  { name: 'Platinum', fill: '#2EC4B6', stroke: '#0E6F68' },
  { name: 'Emerald',  fill: '#00A86B', stroke: '#004D33' },
  { name: 'Diamond',  fill: '#4FC3F7', stroke: '#1B4F72' },
];

const DIVISIONS = ['III', 'II', 'I'] as const;
const MASTER_THRESHOLD = TIERS.length * DIVISIONS.length * 100; // 2100

/**
 * profitRate: (sellPrice - buyPrice) / buyPrice * 100
 *
 * 승리: +80 기본, 수익률 구간마다 +5
 *   0~5%: +80 / 5~10%: +85 / 10~20%: +90 / 20~30%: +95 / 30%+: +100
 *
 * 패배: -10 기본, 손실률 구간마다 -3 추가
 *   0~5%: -10 / 5~10%: -13 / 10~20%: -16 / 20~30%: -19 / 30%+: -22
 */
export function calcLpChange(profitRate: number): number {
  const abs = Math.abs(profitRate);
  let bracket: number;
  if (abs < 5)       bracket = 0;
  else if (abs < 10) bracket = 1;
  else if (abs < 20) bracket = 2;
  else if (abs < 30) bracket = 3;
  else               bracket = 4;

  if (profitRate >= 0) {
    return 80 + bracket * 5;
  } else {
    return -(10 + bracket * 3);
  }
}

export function getRankInfo(rankPoints: number): RankInfo {
  const pts = Math.max(0, rankPoints);

  if (pts < MASTER_THRESHOLD) {
    const tierIdx   = Math.min(Math.floor(pts / 300), TIERS.length - 1);
    const divIdx    = Math.min(Math.floor((pts % 300) / 100), 2);
    const tier      = TIERS[tierIdx];
    const division  = DIVISIONS[divIdx];
    return {
      displayName: `${tier.name} ${division}`,
      fill:        tier.fill,
      stroke:      tier.stroke,
      divPoints:   pts % 100,
      divMax:      100,
    };
  }

  const lp = pts - MASTER_THRESHOLD;
  if (lp < 500) {
    return { displayName: 'Master',      fill: '#A970FF', stroke: '#4B0082', divPoints: lp,       divMax: 500  };
  }
  if (lp < 1000) {
    return { displayName: 'Grandmaster', fill: '#FF5A5F', stroke: '#7A0C10', divPoints: lp - 500, divMax: 500  };
  }
  return   { displayName: 'Challenger',  fill: '#2EC7FF', stroke: '#FFD700', divPoints: lp - 1000,divMax: 1000 };
}
