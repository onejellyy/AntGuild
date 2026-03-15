import { BrokerRule, RawNotificationEvent, ParsedNotificationFields } from '../../domain/types';
import { resolveSymbol } from '../symbolNormalizer';

/**
 * 토스증권 브로커 룰
 *
 * 알림 예시:
 *   "삼성전자 10주 매수체결 / 체결단가 70,000원"
 *   "카카오 5주 매도체결 / 체결단가 65,000원"
 *   "삼성전자 3주 부분체결 (10주 중 3주) / 체결단가 70,000원"
 */

// 종목명 + 수량: 한글/영문/숫자 조합, 최대 20자, 이후 N주
const SYMBOL_QTY_RE = /([\uAC00-\uD7A3A-Za-z0-9·&\s]{1,20}?)\s+(\d[\d,]*)주/;

// 가격: 체결단가/체결가 컨텍스트 우선 → 없으면 첫 번째 xxx원
const PRICE_CONTEXT_RE = /(?:체결단가|체결가|단가|주당)[^\d]*([\d,]+)원/;
const PRICE_FALLBACK_RE = /([\d,]+)원/;

const PARTIAL_RE = /부분/;

function parseText(text: string): ParsedNotificationFields | null {
  const symbolMatch = SYMBOL_QTY_RE.exec(text);
  if (!symbolMatch) return null;

  const rawSymbol = symbolMatch[1].trim();
  const quantity = parseInt(symbolMatch[2].replace(/,/g, ''), 10);
  if (!rawSymbol || isNaN(quantity) || quantity <= 0) return null;

  const priceMatch = PRICE_CONTEXT_RE.exec(text) ?? PRICE_FALLBACK_RE.exec(text);
  if (!priceMatch) return null;
  const price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
  if (isNaN(price) || price <= 0) return null;

  // 종목명 정규화
  const resolved = resolveSymbol(rawSymbol);

  const isPartial = PARTIAL_RE.test(text);

  // eventType은 notificationParser에서 buyExpressions/sellExpressions로 판별
  return {
    eventType: 'UNKNOWN',
    symbol: resolved.canonicalName,
    symbolCode: resolved.code,
    quantity,
    price,
    isPartial,
  };
}

export const tossSecuritiesRule: BrokerRule = {
  brokerId: 'toss-securities',
  displayName: '토스증권',
  packageNames: [
    'com.tossinvest.android',
    'viva.republica.toss',
  ],
  includeKeywords: ['체결', '매수', '매도', '구매', '판매', '성공'],
  excludeKeywords: ['주문접수', '주문정정', '정정', '주문취소', '취소', '예약', '미체결'],
  buyExpressions: [
    '매수체결', '매수완료', '매수', '매입체결', '매입완료', '구매완료', '구매체결',
    '구매성공', '구매 성공',
  ],
  sellExpressions: [
    '매도체결', '매도완료', '매도', '판매완료', '판매체결',
    '판매성공', '판매 성공',
  ],
  parseNotification(event: RawNotificationEvent): ParsedNotificationFields | null {
    const combined = [event.body, event.subText, event.title]
      .filter(Boolean)
      .join(' ');
    return parseText(combined);
  },
};
