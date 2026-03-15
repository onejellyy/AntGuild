import { BrokerRule, RawNotificationEvent, ParsedNotificationFields } from '../../domain/types';
import { resolveSymbol } from '../symbolNormalizer';

/**
 * 카카오페이증권 브로커 룰
 *
 * 알림 예시:
 *   "[매수체결] 삼성전자 10주 체결가 70,000원"
 *   "[매도체결] 카카오 5주 체결가 65,000원"
 *   "[부분체결] 삼성전자 3주(10주 중) 체결가 70,000원"
 *   "[매수체결] 삼성전자 70,000원 × 10주"
 */

// 태그 패턴: [매수체결], [매도체결], [부분체결] 등
const TAG_RE = /\[([^\]]+)\]/;

// 종목명 + 수량
const SYMBOL_QTY_RE = /([\uAC00-\uD7A3A-Za-z0-9·&\s]{1,20}?)\s+(\d[\d,]*)주/;

// 가격×수량 역순 패턴: "70,000원 × 10주" 또는 "10주 × 70,000원"
const PRICE_TIMES_QTY_RE = /([\d,]+)원\s*[×xX]\s*(\d[\d,]*)주/;
const QTY_TIMES_PRICE_RE = /(\d[\d,]*)주\s*[×xX]\s*([\d,]+)원/;

const PRICE_CONTEXT_RE = /(?:체결가|체결단가|단가|주당)[^\d]*([\d,]+)원/;
const PRICE_FALLBACK_RE = /([\d,]+)원/;

const PARTIAL_RE = /부분/;

function parseText(text: string): ParsedNotificationFields | null {
  let quantity: number | null = null;
  let price: number | null = null;

  // 패턴 A: 가격 × 수량 역순
  const timesMatch = PRICE_TIMES_QTY_RE.exec(text);
  if (timesMatch) {
    price = parseInt(timesMatch[1].replace(/,/g, ''), 10);
    quantity = parseInt(timesMatch[2].replace(/,/g, ''), 10);
  }

  // 패턴 B: 수량 × 가격
  if (!timesMatch) {
    const reverseMatch = QTY_TIMES_PRICE_RE.exec(text);
    if (reverseMatch) {
      quantity = parseInt(reverseMatch[1].replace(/,/g, ''), 10);
      price = parseInt(reverseMatch[2].replace(/,/g, ''), 10);
    }
  }

  // 패턴 C: 일반 "종목명 N주 ... 가격원"
  if (quantity === null || price === null) {
    const symbolMatch = SYMBOL_QTY_RE.exec(text);
    if (!symbolMatch) return null;
    quantity = parseInt(symbolMatch[2].replace(/,/g, ''), 10);
    const priceMatch = PRICE_CONTEXT_RE.exec(text) ?? PRICE_FALLBACK_RE.exec(text);
    if (!priceMatch) return null;
    price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
  }

  if (!quantity || quantity <= 0 || !price || price <= 0) return null;

  // 종목명 추출: 태그 제거 후 첫 번째 한글 덩어리
  const withoutTag = text.replace(TAG_RE, '').trim();
  const symbolMatch =
    SYMBOL_QTY_RE.exec(withoutTag) ??
    /([\uAC00-\uD7A3A-Za-z0-9·&]+)/.exec(withoutTag);
  const rawSymbol = symbolMatch?.[1]?.trim();
  if (!rawSymbol) return null;

  const resolved = resolveSymbol(rawSymbol);
  const isPartial = PARTIAL_RE.test(text);

  return {
    eventType: 'UNKNOWN',
    symbol: resolved.canonicalName,
    symbolCode: resolved.code,
    quantity,
    price,
    isPartial,
  };
}

export const kakaopaySecuritiesRule: BrokerRule = {
  brokerId: 'kakaopay-securities',
  displayName: '카카오페이증권',
  packageNames: [
    'com.kakaopay.invest',
    'com.kakao.kakaopay',
    'com.kakaopay.app',
  ],
  includeKeywords: ['체결', '매수', '매도', '구매', '판매', '성공'],
  excludeKeywords: ['주문접수', '주문정정', '정정', '주문취소', '취소', '예약', '미체결'],
  buyExpressions: [
    '매수체결', '매수완료', '매수', '매입체결', '매입완료',
    '구매완료', '구매체결', '구매성공', '구매 성공',
  ],
  sellExpressions: [
    '매도체결', '매도완료', '매도', '판매완료',
    '판매체결', '판매성공', '판매 성공',
  ],
  parseNotification(event: RawNotificationEvent): ParsedNotificationFields | null {
    const combined = [event.body, event.subText, event.title]
      .filter(Boolean)
      .join(' ');
    return parseText(combined);
  },
};
