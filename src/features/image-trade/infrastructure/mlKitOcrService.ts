/**
 * Google ML Kit Text Recognition 기반 이미지 OCR
 * - 완전 무료, 기기 내에서 처리 (네트워크 불필요)
 * - 한국어 지원
 */

import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';
import { ImageParseResult, ParsedImageTrade } from '../domain/types';

// ── 정규식 ──────────────────────────────────────────────
const DATE_RE = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/;
const CANCEL_RE = /취소\s*완료|주문\s*취소|매수\s*취소|매도\s*취소|구매\s*취소|판매\s*취소|취소/;
const BUY_RE  = /매수체결|매수완료|매수|구매완료|구매체결|구매\s*완료|구매\s*성공/;
const SELL_RE = /매도체결|매도완료|매도|판매완료|판매체결|판매\s*완료|판매\s*성공/;
const QTY_RE  = /(\d[\d,]*)\s*주/;

// 원화 가격
const PRICE_PER_SHARE_KRW_RE = /주당\s*([\d,]+)\s*원/;
const PRICE_EXEC_KRW_RE      = /(?:체결단가|체결가)[^\d]*([\d,]+)\s*원/;
const PRICE_FALLBACK_KRW_RE  = /([\d,]+)\s*원/;

// 달러 가격 ($123.45 | 주당 $123.45 | 123.45달러 | USD 123.45)
const PRICE_PER_SHARE_USD_RE = /주당\s*\$\s*([\d,]+(?:\.\d+)?)/;
const PRICE_EXEC_USD_RE      = /(?:체결단가|체결가)[^\d]*\$\s*([\d,]+(?:\.\d+)?)/;
const PRICE_USD_SYMBOL_RE    = /\$\s*([\d,]+(?:\.\d+)?)/;
const PRICE_USD_KR_RE        = /([\d,]+(?:\.\d+)?)\s*달러/;
const PRICE_USD_TEXT_RE      = /USD\s*([\d,]+(?:\.\d+)?)/i;
// ────────────────────────────────────────────────────────

/** 가격 추출 (원화만 인식. 달러 가격은 null 반환 → 거래 기록 제외) */
function parsePrice(text: string): number | null {
  // 달러 표기가 있으면 즉시 null (기록 제외)
  if (
    PRICE_PER_SHARE_USD_RE.test(text) ||
    PRICE_EXEC_USD_RE.test(text) ||
    PRICE_USD_SYMBOL_RE.test(text) ||
    PRICE_USD_KR_RE.test(text) ||
    PRICE_USD_TEXT_RE.test(text)
  ) {
    return null;
  }

  const krwMatch =
    PRICE_PER_SHARE_KRW_RE.exec(text) ??
    PRICE_EXEC_KRW_RE.exec(text) ??
    PRICE_FALLBACK_KRW_RE.exec(text);
  if (krwMatch) {
    const v = parseInt((krwMatch[1] ?? '').replace(/,/g, ''), 10);
    return v > 0 ? v : null;
  }

  return null;
}

function toDateStr(y: string, m: string, d: string): string {
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function extractSymbol(text: string): string | null {
  const cleaned = text
    .replace(DATE_RE, '')
    .replace(BUY_RE, '')
    .replace(SELL_RE, '')
    .replace(/\d[\d,]*주/g, '')
    .replace(/주당\s*[\d,]+원/g, '')
    .replace(/(?:체결단가|체결가)[^\d]*[\d,]+원/g, '')
    .replace(/[\d,]+원/g, '')
    // 달러 표기 제거
    .replace(/주당\s*\$\s*[\d,.]+/g, '')
    .replace(/(?:체결단가|체결가)[^\d]*\$\s*[\d,.]+/g, '')
    .replace(/\$\s*[\d,.]+/g, '')
    .replace(/[\d,.]+\s*달러/g, '')
    .replace(/USD\s*[\d,.]+/gi, '')
    .replace(/[\/·×xX\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const symbolMatch =
    /([\uAC00-\uD7A3A-Za-z][\uAC00-\uD7A3A-Za-z0-9·&]{1,18})/.exec(cleaned) ??
    /([\uAC00-\uD7A3A-Za-z0-9]{2,})/.exec(cleaned);
  const symbol = symbolMatch?.[1]?.trim();
  return symbol && symbol.length >= 2 ? symbol : null;
}

/**
 * 토스증권 스타일: 가격이 같은 줄 또는 인접 줄에 있음
 */
function parseTradeLine(text: string, date: string): ParsedImageTrade | null {
  if (CANCEL_RE.test(text)) return null;
  const isBuy  = BUY_RE.test(text);
  const isSell = SELL_RE.test(text);
  if (!isBuy && !isSell) return null;

  const qtyMatch = QTY_RE.exec(text);
  if (!qtyMatch) return null;
  const qty = parseInt(qtyMatch[1].replace(/,/g, ''), 10);
  if (!qty || qty <= 0) return null;

  const price = parsePrice(text);
  if (!price) return null;

  const symbol = extractSymbol(text);
  if (!symbol) return null;

  return { date, symbol, type: isBuy ? 'BUY' : 'SELL', qty, price };
}

/**
 * 카카오페이 스타일: "주당 N원" 가격들이 하단 별도 섹션에 모여있음.
 * 2-pass 방식: 거래 항목 수집 → 가격 수집 → 순서대로 매칭
 */
function parseKakaopayLines(lines: string[]): ParsedImageTrade[] {
  // 문서 전체에서 첫 날짜를 찾아 기본값으로 사용 (날짜 라벨 이전 항목 처리용)
  let currentDate = '';
  for (const line of lines) {
    const m = DATE_RE.exec(line);
    if (m) { currentDate = toDateStr(m[1], m[2], m[3]); break; }
  }

  const partials: { symbol: string; type: 'BUY' | 'SELL'; qty: number; date: string }[] = [];
  const prices: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 날짜 헤더
    const dateMatch = DATE_RE.exec(line);
    if (dateMatch) {
      currentDate = toDateStr(dateMatch[1], dateMatch[2], dateMatch[3]);
      continue;
    }

    // 가격 줄 (주당 N원) — 하단 섹션에서 수집 (달러 가격은 제외)
    if (PRICE_PER_SHARE_KRW_RE.test(line)) {
      const p = parsePrice(line);
      if (p) { prices.push(p); continue; }
    }

    if (!currentDate) continue;

    // 취소 내역 무시
    if (CANCEL_RE.test(line)) continue;

    // 2줄 합산: "종목명\nN주 구매/판매 완료" 형태
    if (i + 1 < lines.length) {
      const combined = [line, lines[i + 1]].join(' ');
      if (CANCEL_RE.test(combined)) { i += 1; continue; }
      const isBuy  = BUY_RE.test(combined);
      const isSell = SELL_RE.test(combined);
      if (isBuy || isSell) {
        const qtyMatch = QTY_RE.exec(combined);
        if (qtyMatch) {
          const qty = parseInt(qtyMatch[1].replace(/,/g, ''), 10);
          const symbol = extractSymbol(combined) ?? extractSymbol(line);
          if (qty > 0 && symbol) {
            partials.push({ symbol, type: isBuy ? 'BUY' : 'SELL', qty, date: currentDate });
            i += 1; // 다음 줄 소비
            continue;
          }
        }
      }
    }

    // 1줄: 종목명+qty+action이 한 줄인 경우
    const isBuy1  = BUY_RE.test(line);
    const isSell1 = SELL_RE.test(line);
    if (isBuy1 || isSell1) {
      const qtyMatch = QTY_RE.exec(line);
      if (qtyMatch) {
        const qty = parseInt(qtyMatch[1].replace(/,/g, ''), 10);
        const symbol = extractSymbol(line);
        if (qty > 0 && symbol) {
          partials.push({ symbol, type: isBuy1 ? 'BUY' : 'SELL', qty, date: currentDate });
          continue;
        }
      }
    }
  }

  // 순서 매칭: partials[i] ↔ prices[i]
  return partials
    .slice(0, prices.length)
    .map((t, idx) => ({ ...t, price: prices[idx] }))
    .filter(t => t.price > 0);
}

export async function parseImageWithMLKit(uri: string): Promise<ImageParseResult> {
  const result = await TextRecognition.recognize(uri, TextRecognitionScript.KOREAN);
  const fullText = result.text ?? '';

  if (fullText.trim().length < 10) {
    throw new Error(
      '이미지에서 텍스트를 인식하지 못했습니다.\n더 선명한 이미지를 사용해주세요.',
    );
  }

  // 브로커 판별
  let broker: ImageParseResult['broker'] = 'unknown';
  const isKakaopay = /구매\s*완료|판매\s*완료/.test(fullText);
  if (isKakaopay) {
    broker = 'kakaopay-securities';
  } else if (/체결단가|매수체결|매도체결/.test(fullText)) {
    broker = 'toss-securities';
  }

  const lines = fullText.split(/\n+/).map(l => l.trim()).filter(Boolean);

  let trades: ParsedImageTrade[];

  if (isKakaopay) {
    // 카카오페이: 가격이 하단에 분리되어 있으므로 2-pass 매칭
    trades = parseKakaopayLines(lines);
  } else {
    // 토스 등: 가격이 인접 줄에 있으므로 기존 방식
    trades = [];
    let currentDate = '';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const dateMatch = DATE_RE.exec(line);
      if (dateMatch) {
        currentDate = toDateStr(dateMatch[1], dateMatch[2], dateMatch[3]);
        continue;
      }
      if (!currentDate) continue;

      let trade = parseTradeLine(line, currentDate);
      if (trade) { trades.push(trade); continue; }

      if (i + 1 < lines.length) {
        trade = parseTradeLine([line, lines[i + 1]].join(' '), currentDate);
        if (trade) { trades.push(trade); i += 1; continue; }
      }

      if (i + 2 < lines.length) {
        trade = parseTradeLine([line, lines[i + 1], lines[i + 2]].join(' '), currentDate);
        if (trade) { trades.push(trade); i += 2; }
      }
    }
  }

  return { broker, trades };
}
