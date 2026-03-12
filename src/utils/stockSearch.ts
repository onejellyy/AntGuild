/**
 * 주식 종목 검색 유틸리티
 *
 * 데이터 소스: assets/data/stocks.json (KRX Data Marketplace)
 * 런타임 API 호출 없음 - 완전 로컬 검색
 *
 * 정렬 기준:
 *   1. 접두어(prefix) 매칭 우선
 *   2. 이름 길이 짧은 순
 *   3. 가나다순 (ko-KR locale)
 */

import stocksData from '../../assets/data/stocks.json';

export interface StockItem {
  code: string;
  name_ko: string;
  market: string;
  name_en?: string;
}

// 앱 시작 시 한 번만 로드
const ALL_STOCKS: StockItem[] = (stocksData as any).stocks as StockItem[];

/**
 * 검색어 정규화:
 * - 소문자 변환
 * - 공백 제거
 * - 특수문자 제거: ( ) . - _ , &
 */
export function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/[\s\(\)\.\-\_,&]/g, '');
}

/**
 * 종목 이름으로 자동완성 검색.
 *
 * @param query - 사용자 입력 검색어
 * @param topN  - 반환할 최대 결과 수 (기본 10)
 * @returns 매칭된 StockItem 배열 (정렬 완료)
 */
export function searchStocks(query: string, topN = 10): StockItem[] {
  const q = normalizeQuery(query);
  if (!q) return [];

  const results: Array<{ item: StockItem; isPrefix: boolean }> = [];

  for (const stock of ALL_STOCKS) {
    const normalizedName = normalizeQuery(stock.name_ko);
    const normalizedCode = stock.code;

    // contains match (부분 일치)
    const nameMatch = normalizedName.includes(q);
    const codeMatch = normalizedCode.includes(q);
    const enMatch = stock.name_en ? normalizeQuery(stock.name_en).includes(q) : false;

    if (!nameMatch && !codeMatch && !enMatch) continue;

    // prefix match (접두어 일치)
    const isPrefix =
      normalizedName.startsWith(q) ||
      normalizedCode.startsWith(q) ||
      (stock.name_en ? normalizeQuery(stock.name_en).startsWith(q) : false);

    results.push({ item: stock, isPrefix });
  }

  // 정렬: 1) prefix 우선, 2) 이름 길이 짧은 순, 3) 가나다순
  results.sort((a, b) => {
    if (a.isPrefix !== b.isPrefix) return a.isPrefix ? -1 : 1;
    const lenDiff = a.item.name_ko.length - b.item.name_ko.length;
    if (lenDiff !== 0) return lenDiff;
    return a.item.name_ko.localeCompare(b.item.name_ko, 'ko');
  });

  return results.slice(0, topN).map(r => r.item);
}

/** 코드로 종목 조회 */
export function findStockByCode(code: string): StockItem | undefined {
  return ALL_STOCKS.find(s => s.code === code);
}

/** 이름으로 종목 조회 (정확 일치) */
export function findStockByName(name: string): StockItem | undefined {
  const q = normalizeQuery(name);
  return ALL_STOCKS.find(s => normalizeQuery(s.name_ko) === q);
}

export { ALL_STOCKS };
