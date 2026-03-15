/**
 * 이미지에서 거래내역 가져오기 유스케이스
 *
 * 흐름:
 * 1. 갤러리에서 이미지 선택 (expo-image-picker)
 * 2. ML Kit Text Recognition으로 거래 내역 OCR (기기 내 처리, 무료)
 * 3. 날짜순(오래된 것부터) 정렬
 * 4. 각 항목 dedupe 체크 → processedNotifications 기반
 * 5. 새 항목만 applyTradeEventUseCase로 적용
 * 6. 결과 반환
 */

import * as ImagePicker from 'expo-image-picker';
import uuid from 'react-native-uuid';
import { parseImageWithMLKit } from '../infrastructure/mlKitOcrService';
import { applyTradeEventUseCase } from '../../notification-trade/application/applyTradeEventUseCase';
import {
  getProcessedNotification,
  saveProcessedNotification,
  getAutoTrades,
} from '../../notification-trade/infrastructure/autoTradeRepository';
import { TradeEvent, ProcessedNotification } from '../../notification-trade/domain/types';
import { ImportResult } from '../domain/types';
import { updateUserPnl, updateRankingRecord } from '../../../services/firestore';

/** 수동 이미지 가져오기 전용 dedupeKey 생성 */
function buildManualDedupeKey(params: {
  symbol: string;
  type: 'BUY' | 'SELL';
  qty: number;
  price: number;
  date: string;
}): string {
  return `manual-image|${params.symbol}|${params.type}|${params.qty}|${params.price}|${params.date}`;
}

export async function importImageTradesUseCase(
  uid: string,
): Promise<ImportResult | null> {
  // 1. 갤러리 권한 요청
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('갤러리 접근 권한이 필요합니다.\n설정에서 사진 권한을 허용해주세요.');
  }

  // 2. 이미지 선택 (다중 선택 가능)
  const pickerResult = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    allowsMultipleSelection: true,
  });

  if (pickerResult.canceled) return null;

  // 3. 선택된 모든 이미지 OCR 처리
  // imageOrder: 이미지 내 줄 순서 (0 = 화면 최상단 = 가장 최신)
  // 같은 날짜일 때 imageOrder 역순(큰 값 먼저)으로 정렬해 오래된 거래를 먼저 처리
  const allTrades: Array<{
    date: string;
    symbol: string;
    type: 'BUY' | 'SELL';
    qty: number;
    price: number;
    brokerId: string;
    imageOrder: number;
  }> = [];

  for (const asset of pickerResult.assets) {
    const parsed = await parseImageWithMLKit(asset.uri);
    const broker = parsed.broker === 'unknown' ? 'manual-import' : parsed.broker;
    parsed.trades.forEach((trade, idx) => {
      allTrades.push({ ...trade, brokerId: broker, imageOrder: idx });
    });
  }

  if (allTrades.length === 0) {
    throw new Error(
      '인식된 거래 내역이 없습니다.\n토스/카카오페이 주문내역 화면 캡쳐인지 확인해주세요.',
    );
  }

  // 4. 날짜순 정렬 (오래된 것부터 처리해야 평균단가가 올바르게 계산됨)
  // 같은 날짜면 이미지에서 아래(큰 인덱스)에 위치한 것이 더 오래된 거래이므로 역순 정렬
  const sorted = allTrades.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return b.imageOrder - a.imageOrder; // 아래쪽(큰 인덱스) = 오래된 거래 → 먼저 처리
  });

  const result: ImportResult = { added: 0, skipped: 0, errors: 0 };
  const now = new Date().toISOString();

  for (const { brokerId, ...trade } of sorted) {
    const dedupeKey = buildManualDedupeKey({
      symbol: trade.symbol,
      type: trade.type,
      qty: trade.qty,
      price: trade.price,
      date: trade.date,
    });

    // 5. 중복 체크 (성공한 항목만 스킵, 이전에 에러난 항목은 재시도)
    const alreadyProcessed = await getProcessedNotification(uid, dedupeKey);
    if (alreadyProcessed?.resultStatus === 'APPLIED') {
      result.skipped++;
      continue;
    }

    // 6. 합성 TradeEvent 생성 (기존 applyTradeEventUseCase 재사용)
    // 이미지에서는 정확한 시각을 알 수 없어 해당 날짜 정오(KST)로 설정
    const executedAt = `${trade.date}T12:00:00.000+09:00`;
    const eventId = uuid.v4() as string;

    const event: TradeEvent = {
      id: eventId,
      brokerId,
      sourcePackage: 'manual-image-import',
      notificationKey: dedupeKey,
      rawTitle: '',
      rawBody: '',
      eventType: trade.type,
      isPartial: false,
      symbol: trade.symbol,
      quantity: trade.qty,
      price: trade.price,
      executedAt,
      detectedAt: now,
      dedupeKey,
      parserVersion: '1.0.0-manual-image',
      status: 'VALID',
    };

    // 7. 적용
    const applyResult = await applyTradeEventUseCase(uid, event);

    const record: ProcessedNotification = {
      id: dedupeKey,
      dedupeKey,
      notificationKey: dedupeKey,
      sourcePackage: 'manual-image-import',
      processedAt: now,
      resultStatus: applyResult.ok ? 'APPLIED' : applyResult.errorCode,
      tradeEventId: eventId,
      ...(applyResult.ok ? {} : { errorReason: applyResult.reason }),
    };

    await saveProcessedNotification(uid, record);

    if (applyResult.ok) {
      result.added++;
    } else {
      result.errors++;
    }
  }

  // 추가된 거래가 있으면 랭킹 반영
  if (result.added > 0) {
    const allAutoTrades = await getAutoTrades(uid);
    const wins   = allAutoTrades.filter(t => t.realizedPnL > 0).length;
    const losses = allAutoTrades.filter(t => t.realizedPnL <= 0).length;
    const totalPnL = allAutoTrades.reduce((s, t) => s + t.realizedPnL, 0);
    await Promise.all([
      updateUserPnl(uid, totalPnL),
      updateRankingRecord(uid, wins, losses),
    ]);
  }

  return result;
}
