/**
 * 자동 투자기록 저장소 (Firestore)
 *
 * 컬렉션:
 *   /users/{uid}/autoHoldings/{symbol}         → PortfolioHolding
 *   /users/{uid}/autoTrades/{id}               → AutoTradeRecord
 *   /users/{uid}/processedNotifications/{key}  → ProcessedNotification
 */

import {
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, query, orderBy,
  onSnapshot, Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import {
  PortfolioHolding,
  AutoTradeRecord,
  ProcessedNotification,
} from '../domain/types';

// ─── AutoHoldings ───────────────────────────────────────────────

export async function getAutoHolding(
  uid: string,
  symbol: string,
): Promise<PortfolioHolding | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'autoHoldings', symbol));
  return snap.exists() ? (snap.data() as PortfolioHolding) : null;
}

export async function saveAutoHolding(
  uid: string,
  holding: PortfolioHolding,
): Promise<void> {
  // Firestore는 undefined 값 거부 → undefined 필드 제거
  const cleaned = Object.fromEntries(
    Object.entries(holding).filter(([, v]) => v !== undefined),
  );
  await setDoc(doc(db, 'users', uid, 'autoHoldings', holding.symbol), cleaned);
}

export async function deleteAutoHolding(
  uid: string,
  symbol: string,
): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'autoHoldings', symbol));
}

export function subscribeAutoHoldings(
  uid: string,
  onChange: (holdings: PortfolioHolding[]) => void,
): Unsubscribe {
  const ref = collection(db, 'users', uid, 'autoHoldings');
  return onSnapshot(ref, snap => {
    const holdings = snap.docs.map(d => d.data() as PortfolioHolding);
    onChange(holdings);
  });
}

// ─── AutoTrades ─────────────────────────────────────────────────

export async function addAutoTrade(
  uid: string,
  trade: AutoTradeRecord,
): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'autoTrades', trade.id), trade);
}

export function subscribeAutoTrades(
  uid: string,
  onChange: (trades: AutoTradeRecord[]) => void,
): Unsubscribe {
  const ref = query(
    collection(db, 'users', uid, 'autoTrades'),
    orderBy('sellExecutedAt', 'desc'),
  );
  return onSnapshot(ref, snap => {
    const trades = snap.docs.map(d => d.data() as AutoTradeRecord);
    onChange(trades);
  });
}

export async function getAutoTrades(uid: string): Promise<AutoTradeRecord[]> {
  const snap = await getDocs(
    query(
      collection(db, 'users', uid, 'autoTrades'),
      orderBy('sellExecutedAt', 'desc'),
    ),
  );
  return snap.docs.map(d => d.data() as AutoTradeRecord);
}

// ─── ProcessedNotifications (중복 방지) ─────────────────────────

export async function getProcessedNotification(
  uid: string,
  dedupeKey: string,
): Promise<ProcessedNotification | null> {
  const snap = await getDoc(
    doc(db, 'users', uid, 'processedNotifications', dedupeKey),
  );
  return snap.exists() ? (snap.data() as ProcessedNotification) : null;
}

export async function saveProcessedNotification(
  uid: string,
  record: ProcessedNotification,
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid, 'processedNotifications', record.dedupeKey),
    record,
  );
}
