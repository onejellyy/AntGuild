const BASE = 1_000_000;

/**
 * 현재 자산으로 레벨 계산
 * level = floor(log(ASSET / BASE) / log(1.03))
 * ASSET < BASE 이면 0으로 clamp
 */
export function calcLevel(realizedPnl: number): number {
  const asset = BASE + realizedPnl;
  if (asset < BASE) return 0;
  const level = Math.floor(Math.log(asset / BASE) / Math.log(1.03));
  return Math.max(0, level);
}

/**
 * 현재 자산 계산
 */
export function calcAsset(realizedPnl: number): number {
  return BASE + realizedPnl;
}

/**
 * 다음 레벨까지 필요한 자산
 */
export function nextLevelAsset(realizedPnl: number): number {
  const level = calcLevel(realizedPnl);
  return BASE * Math.pow(1.03, level + 1);
}
