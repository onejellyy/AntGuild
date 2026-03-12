/**
 * 숫자를 한국 원화 형식으로 포맷
 * 예: 1234567 → "1,234,567"
 */
export function formatWon(value: number): string {
  return Math.round(value).toLocaleString('ko-KR');
}

/**
 * 수익률 포맷
 * 예: 5.234 → "+5.23%", -3.1 → "-3.10%"
 */
export function formatRate(rate: number): string {
  const sign = rate >= 0 ? '+' : '';
  return `${sign}${rate.toFixed(2)}%`;
}

/**
 * 손익 포맷 (부호 포함)
 * 예: 12345 → "+12,345원", -5000 → "-5,000원"
 */
export function formatProfit(profit: number): string {
  const sign = profit >= 0 ? '+' : '';
  return `${sign}${formatWon(profit)}원`;
}

/**
 * 타임스탬프를 날짜 문자열로
 */
export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${h}:${min}`;
}
