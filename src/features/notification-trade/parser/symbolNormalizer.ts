/**
 * 종목명 정규화 파이프라인
 *
 * 처리 순서:
 * 1. 6자리 코드 제거  ("삼성전자005930" → "삼성전자")
 * 2. 공백 정규화      ("삼성 전자"     → "삼성전자")
 * 3. 특수문자 제거    ("(우)" 등)
 * 4. stocks.json 정확 일치 → 코드까지 획득
 * 5. 정확 일치 실패 시 전방 일치 → 후보 중 가장 짧은 것 선택
 * 6. 끝까지 실패하면 정규화된 이름 그대로 사용
 */

import stocksData from '../../../../assets/data/stocks.json';

export interface ResolvedSymbol {
  /** stocks.json 기준 공식 종목명 */
  canonicalName: string;
  /** KRX 6자리 코드 (확인된 경우) */
  code?: string;
}

// ─── 내부 인덱스 (초기화 1회) ──────────────────────────────────

interface StockEntry {
  code: string;
  name: string;
  searchKeys: string[];
}

let _index: Map<string, StockEntry> | null = null;
let _list: StockEntry[] | null = null;

function buildIndex(): Map<string, StockEntry> {
  if (_index) return _index;

  const map = new Map<string, StockEntry>();
  const rawStocks = (stocksData as any).stocks as Array<{
    code: string;
    name_ko: string;
    search_keys: string[];
  }>;

  for (const s of rawStocks) {
    const entry: StockEntry = {
      code: s.code,
      name: s.name_ko,
      searchKeys: s.search_keys ?? [],
    };
    // 정규화된 이름으로 인덱싱
    map.set(normalizeWhitespace(s.name_ko), entry);
    // search_keys도 인덱싱
    for (const key of s.search_keys) {
      if (!map.has(key)) map.set(key, entry);
    }
  }

  _index = map;
  _list = rawStocks.map((s) => ({
    code: s.code,
    name: s.name_ko,
    searchKeys: s.search_keys ?? [],
  }));
  return map;
}

// ─── 정규화 유틸 ────────────────────────────────────────────────

/** 공백 제거 + 소문자 (인덱스 검색용) */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase();
}

/** 6자리 숫자 코드 제거 (종목명 말미에 붙는 경우) */
function stripTrailingCode(text: string): string {
  return text.replace(/\d{6}$/, '').trim();
}

/**
 * 말미 괄호 내용을 유지하되 괄호 기호만 제거 ("삼성전자(우)" → "삼성전자우")
 * 우선주 매핑 시 먼저 시도 — stocks.json에 "삼성전자우"가 별도 항목으로 존재
 */
function collapseTrailingParens(text: string): string {
  return text.replace(/[\(（]([^\)）]+)[\)）]\s*$/, '$1').trim();
}

/** 괄호 및 일반적인 접미사 전체 제거 ("(우)", "(2우B)", "[ETF]" 등) */
function stripSuffix(text: string): string {
  return text.replace(/[\[\(（][^\]\)）]*[\]\)）]/g, '').trim();
}

// ─── 공개 API ───────────────────────────────────────────────────

/**
 * 알림에서 추출한 종목명을 정규화하고 stocks.json과 매핑합니다.
 *
 * @param raw 브로커 파서가 추출한 원시 종목명 (예: "삼성전자005930", "삼성 전자")
 * @returns 정규화된 종목명 + 코드 (미확인 시 code=undefined)
 */
export function resolveSymbol(raw: string): ResolvedSymbol {
  const index = buildIndex();

  // 단계별 정규화 시도
  // collapseTrailingParens를 stripSuffix보다 먼저 시도:
  //   "삼성전자(우)" → "삼성전자우" (우선주 stocks.json 항목과 매핑)
  //   stripSuffix는 매핑 실패 시 최후 수단 ("삼성전자" 보통주로 폴백)
  const base = raw.trim();
  const codeStripped = stripTrailingCode(base);
  const candidates = [
    base,
    codeStripped,
    collapseTrailingParens(base),
    collapseTrailingParens(codeStripped),
    stripSuffix(base),
    stripSuffix(codeStripped),
  ];

  for (const candidate of candidates) {
    const key = normalizeWhitespace(candidate);
    if (!key) continue;

    // 1. 정확 일치
    const exact = index.get(key);
    if (exact) {
      return { canonicalName: exact.name, code: exact.code };
    }
  }

  // 2. 전방 일치 (정규화 후 기준)
  const normalizedRaw = normalizeWhitespace(stripTrailingCode(raw.trim()));
  if (_list && normalizedRaw.length >= 2) {
    const prefixMatches = _list.filter((s) =>
      normalizeWhitespace(s.name).startsWith(normalizedRaw),
    );
    if (prefixMatches.length > 0) {
      // 가장 짧은 이름 선택 (예: "삼성" → "삼성전자"보다 정확한 게 없으면 첫 번째)
      const best = prefixMatches.reduce((a, b) =>
        a.name.length <= b.name.length ? a : b,
      );
      return { canonicalName: best.name, code: best.code };
    }
  }

  // 3. 매핑 실패 → 정규화된 이름 그대로 사용
  const fallback = stripTrailingCode(raw.trim());
  return { canonicalName: fallback.length > 0 ? fallback : raw.trim() };
}
