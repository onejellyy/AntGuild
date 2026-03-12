/**
 * 오늘의 투자상식 서비스
 * - 날짜 시드 기반 결정론적 선택
 * - AsyncStorage 일별 캐싱
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InvestmentTip, INVESTMENT_TIPS } from '../../data/investmentTips';

const TIP_CACHE_KEY = '@begmanki_daily_tip';

interface TipCache {
  date: string;
  tipId: string;
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickIndexForDate(dateStr: string, total: number): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return hash % total;
}

export function getAllTips(): InvestmentTip[] {
  return INVESTMENT_TIPS;
}

export async function getDailyTip(): Promise<InvestmentTip> {
  const tips = getAllTips();
  const today = getTodayString();

  try {
    const cached = await AsyncStorage.getItem(TIP_CACHE_KEY);
    if (cached) {
      const parsed: TipCache = JSON.parse(cached);
      if (parsed.date === today) {
        const found = tips.find(t => t.id === parsed.tipId);
        if (found) return found;
      }
    }
  } catch {}

  const idx = pickIndexForDate(today, tips.length);
  const selected = tips[idx];

  try {
    await AsyncStorage.setItem(TIP_CACHE_KEY, JSON.stringify({ date: today, tipId: selected.id }));
  } catch {}

  return selected;
}

export async function clearTipCache(): Promise<void> {
  await AsyncStorage.removeItem(TIP_CACHE_KEY);
}
