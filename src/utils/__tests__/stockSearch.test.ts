/**
 * Unit tests: stockSearch.ts
 *
 * Run: npx jest src/utils/__tests__/stockSearch.test.ts
 */

import { normalizeQuery, searchStocks, findStockByCode, findStockByName } from '../stockSearch';

// ─────────────────────────────────────────────────────────────
// normalizeQuery
// ─────────────────────────────────────────────────────────────
describe('normalizeQuery', () => {
  test('소문자 변환', () => {
    expect(normalizeQuery('NAVER')).toBe('naver');
  });

  test('공백 제거', () => {
    expect(normalizeQuery('삼성 전자')).toBe('삼성전자');
  });

  test('특수문자 제거: () . - _ , &', () => {
    expect(normalizeQuery('KT&G')).toBe('ktg');
    expect(normalizeQuery('JYP Ent.')).toBe('jypent');
    expect(normalizeQuery('LG(전자)')).toBe('lg전자');
    expect(normalizeQuery('SK-하이닉스')).toBe('sk하이닉스');
  });

  test('빈 문자열', () => {
    expect(normalizeQuery('')).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────
// searchStocks
// ─────────────────────────────────────────────────────────────
describe('searchStocks', () => {
  test('빈 쿼리는 빈 배열 반환', () => {
    expect(searchStocks('')).toEqual([]);
  });

  test('삼성 검색 → 삼성 관련 종목 반환', () => {
    const results = searchStocks('삼성');
    expect(results.length).toBeGreaterThan(0);
    results.forEach(r => {
      expect(r.name_ko).toContain('삼성');
    });
  });

  test('코드 검색 (005930) → 삼성전자', () => {
    const results = searchStocks('005930');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].code).toBe('005930');
    expect(results[0].name_ko).toBe('삼성전자');
  });

  test('최대 N개 반환', () => {
    const results = searchStocks('SK', 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  test('prefix match 가 contains match 보다 앞에 위치', () => {
    // '삼성전자' 는 '삼성'으로 시작 (prefix) → 먼저 와야 함
    // '삼성바이오로직스' 도 삼성으로 시작
    const results = searchStocks('삼성전');
    expect(results.length).toBeGreaterThan(0);
    // 삼성전자가 첫 번째여야 함 (prefix + shorter name)
    expect(results[0].name_ko).toBe('삼성전자');
  });

  test('영문 검색 (samsung)', () => {
    const results = searchStocks('samsung');
    expect(results.length).toBeGreaterThan(0);
    const hasEnglishMatch = results.some(
      r => r.name_en && r.name_en.toLowerCase().includes('samsung')
    );
    expect(hasEnglishMatch).toBe(true);
  });

  test('대소문자 무관', () => {
    const lower = searchStocks('naver');
    const upper = searchStocks('NAVER');
    expect(lower.map(r => r.code)).toEqual(upper.map(r => r.code));
  });

  test('공백 포함 검색 (lg 전자)', () => {
    const results = searchStocks('lg 전자');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.name_ko === 'LG전자')).toBe(true);
  });

  test('결과 정렬: prefix > 이름 길이 > 가나다순', () => {
    const results = searchStocks('카카오');
    // 카카오 (6글자) 가 카카오뱅크 (6글자), 카카오게임즈 (8글자) 보다 앞
    if (results.length >= 2) {
      const firstLen = results[0].name_ko.length;
      const secondLen = results[1].name_ko.length;
      expect(firstLen).toBeLessThanOrEqual(secondLen);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// findStockByCode / findStockByName
// ─────────────────────────────────────────────────────────────
describe('findStockByCode', () => {
  test('존재하는 코드 반환', () => {
    const stock = findStockByCode('005930');
    expect(stock).toBeDefined();
    expect(stock!.name_ko).toBe('삼성전자');
  });

  test('존재하지 않는 코드 → undefined', () => {
    expect(findStockByCode('999999')).toBeUndefined();
  });
});

describe('findStockByName', () => {
  test('정확한 이름으로 검색', () => {
    const stock = findStockByName('삼성전자');
    expect(stock).toBeDefined();
    expect(stock!.code).toBe('005930');
  });

  test('존재하지 않는 이름 → undefined', () => {
    expect(findStockByName('없는종목XYZ')).toBeUndefined();
  });
});
