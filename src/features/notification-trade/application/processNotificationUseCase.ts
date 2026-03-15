/**
 * 알림 처리 오케스트레이터
 *
 * 흐름:
 * 1. parseNotification (브로커 감지 + 필터 + 파싱)
 * 2. dedupe 체크
 * 3. applyTradeEventUseCase (BUY/SELL 반영)
 * 4. ProcessedNotification 저장
 */

import uuid from 'react-native-uuid';
import { RawNotificationEvent, ProcessedNotification } from '../domain/types';
import { parseNotification } from '../parser/notificationParser';
import { applyTradeEventUseCase } from './applyTradeEventUseCase';
import {
  getProcessedNotification,
  saveProcessedNotification,
} from '../infrastructure/autoTradeRepository';

export async function processNotificationUseCase(
  uid: string,
  raw: RawNotificationEvent,
): Promise<void> {
  const now = new Date().toISOString();

  // 1. 파싱
  const parseResult = parseNotification(raw);

  if (!parseResult.ok) {
    // 파싱 실패는 조용히 무시 (지원 안하는 앱, 광고 알림 등)
    if (__DEV__) {
      console.log('[AutoTrade] parse skipped:', parseResult.reason, raw.body);
    }
    return;
  }

  const event = parseResult.event;

  // 2. dedupe 체크
  const existing = await getProcessedNotification(uid, event.dedupeKey);
  if (existing) {
    if (__DEV__) {
      console.log('[AutoTrade] duplicate skipped:', event.dedupeKey);
    }
    return;
  }

  // 3. 처리 시작 — 먼저 DUPLICATE 방지용 자리 선점
  const pendingRecord: ProcessedNotification = {
    id: event.dedupeKey,
    dedupeKey: event.dedupeKey,
    notificationKey: event.notificationKey,
    sourcePackage: event.sourcePackage,
    processedAt: now,
    resultStatus: 'APPLIED',
    tradeEventId: event.id,
  };

  // 4. 거래 적용
  const applyResult = await applyTradeEventUseCase(uid, event);

  const record: ProcessedNotification = applyResult.ok
    ? { ...pendingRecord, resultStatus: 'APPLIED' }
    : {
        ...pendingRecord,
        resultStatus: applyResult.errorCode,
        errorReason: applyResult.reason,
      };

  await saveProcessedNotification(uid, record);

  if (__DEV__) {
    console.log('[AutoTrade]', record.resultStatus, event.symbol, event.eventType, event.quantity, '@', event.price);
  }
}
