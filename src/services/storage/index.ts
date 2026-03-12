/**
 * 통합 스토리지 서비스
 * USE_FIREBASE = true  → Firestore
 * USE_FIREBASE = false → AsyncStorage (로컬)
 *
 * TradeEntry 가 원본 기록. 수정 시 전체 재계산(FIFO) 후 positions/trades 덮어씀.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile, Position, Trade, TradeEntry } from './types';
import { getCurrentUid } from '../auth';
import * as FS from '../firestore';
export { updateUserPrivacy } from '../firestore';
import { recalcFromTradeEntries } from '../../utils/tradeCalc';

export { Profile, Position, Trade, TradeEntry };

export const USE_FIREBASE = true;

const KEYS = {
  PROFILE: 'storage.profile',
  POSITIONS: 'storage.positions',
  TRADES: 'storage.trades',
  TRADE_ENTRIES: 'storage.tradeEntries',
};

// ──────────────────────────────────────────────
// Profile
// ──────────────────────────────────────────────
export async function getProfile(): Promise<Profile | null> {
  if (USE_FIREBASE) {
    const uid = getCurrentUid();
    if (!uid) return null;
    const user = await FS.getUser(uid);
    if (!user) return null;
    return {
      id: 'local',
      nickname: user.nickname,
      avatarUri: user.avatarUri,
      baseMoney: user.baseMoney,
      realizedPnl: user.realizedPnl,
      league: user.league ?? 'baek',
      groupId: user.groupId,
      showTrades: user.showTrades ?? true,
      showHoldings: user.showHoldings ?? true,
      createdAt: user.createdAt,
    };
  }
  const raw = await AsyncStorage.getItem(KEYS.PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export async function saveProfile(profile: Profile): Promise<void> {
  if (USE_FIREBASE) {
    const uid = getCurrentUid();
    if (!uid) return;
    await FS.updateUserPnl(uid, profile.realizedPnl);
    return;
  }
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

// ──────────────────────────────────────────────
// Positions
// ──────────────────────────────────────────────
export async function getPositions(): Promise<Position[]> {
  if (USE_FIREBASE) {
    const uid = getCurrentUid();
    if (!uid) return [];
    return await FS.getPositions(uid) as Position[];
  }
  const raw = await AsyncStorage.getItem(KEYS.POSITIONS);
  return raw ? JSON.parse(raw) : [];
}

export async function savePositions(positions: Position[]): Promise<void> {
  if (USE_FIREBASE) {
    const uid = getCurrentUid();
    if (!uid) return;
    await FS.updatePositions(uid, positions as any);
    return;
  }
  await AsyncStorage.setItem(KEYS.POSITIONS, JSON.stringify(positions));
}

export async function addPosition(pos: Position): Promise<void> {
  if (USE_FIREBASE) {
    const uid = getCurrentUid();
    if (!uid) return;
    await FS.addPosition(uid, pos as any);
    return;
  }
  const positions = await getPositions();
  positions.push(pos);
  await AsyncStorage.setItem(KEYS.POSITIONS, JSON.stringify(positions));
}

// ──────────────────────────────────────────────
// Trades
// ──────────────────────────────────────────────
export async function getTrades(): Promise<Trade[]> {
  if (USE_FIREBASE) {
    const uid = getCurrentUid();
    if (!uid) return [];
    return await FS.getTrades(uid) as Trade[];
  }
  const raw = await AsyncStorage.getItem(KEYS.TRADES);
  return raw ? JSON.parse(raw) : [];
}

export async function addTrade(trade: Trade): Promise<void> {
  if (USE_FIREBASE) {
    const uid = getCurrentUid();
    if (!uid) return;
    await FS.addTrade(uid, trade as any);
    return;
  }
  const trades = await getTrades();
  trades.unshift(trade);
  await AsyncStorage.setItem(KEYS.TRADES, JSON.stringify(trades));
}

// ──────────────────────────────────────────────
// TradeEntries (개별 매수/매도 원본 기록)
// ──────────────────────────────────────────────
export async function getTradeEntries(): Promise<TradeEntry[]> {
  if (USE_FIREBASE) {
    const uid = getCurrentUid();
    if (!uid) return [];
    return await FS.getTradeEntries(uid) as TradeEntry[];
  }
  const raw = await AsyncStorage.getItem(KEYS.TRADE_ENTRIES);
  const all: TradeEntry[] = raw ? JSON.parse(raw) : [];
  return all.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
}

export async function addTradeEntry(entry: TradeEntry): Promise<void> {
  if (USE_FIREBASE) {
    const uid = getCurrentUid();
    if (!uid) return;
    await FS.addTradeEntry(uid, entry as any);
    return;
  }
  const entries = await getTradeEntries();
  entries.push(entry);
  await AsyncStorage.setItem(KEYS.TRADE_ENTRIES, JSON.stringify(entries));
}

export async function updateTradeEntry(entry: TradeEntry): Promise<void> {
  if (USE_FIREBASE) {
    const uid = getCurrentUid();
    if (!uid) return;
    await FS.updateTradeEntry(uid, entry as any);
    return;
  }
  const entries = await getTradeEntries();
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx !== -1) {
    entries[idx] = entry;
    await AsyncStorage.setItem(KEYS.TRADE_ENTRIES, JSON.stringify(entries));
  }
}

export async function deleteTradeEntry(entryId: string): Promise<void> {
  if (USE_FIREBASE) {
    const uid = getCurrentUid();
    if (!uid) return;
    await FS.deleteTradeEntry(uid, entryId);
    return;
  }
  const entries = await getTradeEntries();
  const filtered = entries.filter(e => e.id !== entryId);
  await AsyncStorage.setItem(KEYS.TRADE_ENTRIES, JSON.stringify(filtered));
}

/**
 * TradeEntries 전체를 FIFO 로 재계산하고 positions/trades/profile 을 갱신.
 * editedEntry 가 있으면 그 항목을 업데이트한 뒤 재계산.
 * Returns: new realizedPnl
 */
export async function recalcAndSave(editedEntry?: TradeEntry): Promise<number> {
  if (editedEntry) {
    await updateTradeEntry(editedEntry);
  }

  const entries = await getTradeEntries();
  const { positions, trades, realizedPnl } = recalcFromTradeEntries(entries);

  if (USE_FIREBASE) {
    const uid = getCurrentUid();
    if (!uid) return realizedPnl;
    await FS.replacePositionsAndTrades(uid, positions as any, trades as any, realizedPnl);
    return realizedPnl;
  }

  // 로컬 스토리지 업데이트
  await AsyncStorage.setItem(KEYS.POSITIONS, JSON.stringify(positions));
  await AsyncStorage.setItem(KEYS.TRADES, JSON.stringify(trades));

  const profile = await getProfile();
  if (profile) {
    const updated = { ...profile, realizedPnl };
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(updated));
  }
  return realizedPnl;
}

// ──────────────────────────────────────────────
// Clear All
// ──────────────────────────────────────────────
export async function clearAll(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.PROFILE);
  await AsyncStorage.removeItem(KEYS.POSITIONS);
  await AsyncStorage.removeItem(KEYS.TRADES);
  await AsyncStorage.removeItem(KEYS.TRADE_ENTRIES);
}
