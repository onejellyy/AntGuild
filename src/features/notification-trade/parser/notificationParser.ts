import uuid from 'react-native-uuid';
import { RawNotificationEvent, TradeEvent } from '../domain/types';
import { detectBroker, passesKeywordFilter } from './brokerRules';
import { buildDedupeKey } from './dedupeKeyBuilder';

export const CURRENT_PARSER_VERSION = '1.1.0';

export type ParseResult =
  | { ok: true; event: TradeEvent }
  | { ok: false; reason: string };

/**
 * eventType 판별: 브로커별 buyExpressions / sellExpressions 우선
 * 매수/매도 표현이 동시에 감지되면 UNKNOWN (모호한 알림)
 */
function resolveEventType(
  text: string,
  buyExpressions: string[],
  sellExpressions: string[],
): 'BUY' | 'SELL' | 'UNKNOWN' {
  // 긴 표현식 우선 매칭 (부분 문자열 오감지 방지)
  const sortedBuy = [...buyExpressions].sort((a, b) => b.length - a.length);
  const sortedSell = [...sellExpressions].sort((a, b) => b.length - a.length);

  const isBuy = sortedBuy.some((expr) => text.includes(expr));
  const isSell = sortedSell.some((expr) => text.includes(expr));

  if (isBuy && !isSell) return 'BUY';
  if (isSell && !isBuy) return 'SELL';
  return 'UNKNOWN';
}

export function parseNotification(raw: RawNotificationEvent): ParseResult {
  // 1. 브로커 감지
  const rule = detectBroker(raw.sourcePackage);
  if (!rule) {
    return { ok: false, reason: `unsupported_package:${raw.sourcePackage}` };
  }

  // 2. 키워드 필터
  if (!passesKeywordFilter(raw, rule)) {
    return { ok: false, reason: 'keyword_filter_excluded' };
  }

  // 3. 브로커별 파싱 (종목명/수량/가격 추출, eventType=UNKNOWN 반환)
  const parsed = rule.parseNotification(raw);
  if (!parsed) {
    return { ok: false, reason: 'parse_failed' };
  }

  // 4. eventType 판별 (buyExpressions/sellExpressions 기반)
  const fullText = [raw.title, raw.body, raw.subText].filter(Boolean).join(' ');
  const eventType = resolveEventType(
    fullText,
    rule.buyExpressions,
    rule.sellExpressions,
  );

  if (eventType === 'UNKNOWN') {
    return { ok: false, reason: 'event_type_unknown' };
  }

  // 5. 핵심 필드 검증
  if (!parsed.symbol || parsed.symbol.length < 1) {
    return { ok: false, reason: 'symbol_missing' };
  }
  if (!parsed.quantity || parsed.quantity <= 0) {
    return { ok: false, reason: 'quantity_invalid' };
  }
  if (!parsed.price || parsed.price <= 0) {
    return { ok: false, reason: 'price_invalid' };
  }

  const now = new Date().toISOString();
  const dedupeKey = buildDedupeKey(raw);

  const event: TradeEvent = {
    id: uuid.v4() as string,
    brokerId: rule.brokerId,
    sourcePackage: raw.sourcePackage,
    notificationKey: raw.notificationKey,
    rawTitle: raw.title,
    rawBody: raw.body,
    eventType,
    isPartial: parsed.isPartial,
    symbol: parsed.symbol,
    symbolCode: parsed.symbolCode,
    quantity: parsed.quantity,
    price: parsed.price,
    totalAmount: parsed.price * parsed.quantity,
    executedAt: new Date(raw.postedAt).toISOString(),
    detectedAt: now,
    dedupeKey,
    parserVersion: CURRENT_PARSER_VERSION,
    rawSnapshot: __DEV__ ? `${raw.title}|${raw.body}` : undefined,
    status: 'VALID',
  };

  return { ok: true, event };
}
