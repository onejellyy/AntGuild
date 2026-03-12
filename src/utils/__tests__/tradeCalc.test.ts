/**
 * Unit tests: tradeCalc.ts
 *
 * Run: npx jest src/utils/__tests__/tradeCalc.test.ts
 */

import { recalcFromTradeEntries, validateEntries } from '../tradeCalc';
import { TradeEntry } from '../../services/storage/types';

// ─────────────────────────────────────────────────────────────
// 테스트 헬퍼
// ─────────────────────────────────────────────────────────────
let entryIdCounter = 0;
function makeEntry(overrides: Partial<TradeEntry> & Pick<TradeEntry, 'type' | 'price' | 'qty'>): TradeEntry {
  entryIdCounter++;
  return {
    id: `entry-${entryIdCounter}`,
    stock_code: '005930',
    stock_name: '삼성전자',
    datetime: new Date(1000 * entryIdCounter).toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  entryIdCounter = 0;
});

// ─────────────────────────────────────────────────────────────
// recalcFromTradeEntries
// ─────────────────────────────────────────────────────────────
describe('recalcFromTradeEntries', () => {
  test('빈 배열 → 빈 결과', () => {
    const { positions, trades, realizedPnl } = recalcFromTradeEntries([]);
    expect(positions).toEqual([]);
    expect(trades).toEqual([]);
    expect(realizedPnl).toBe(0);
  });

  test('매수만 있으면 보유 포지션 생성, 거래 기록 없음', () => {
    const entries = [makeEntry({ type: 'BUY', price: 10000, qty: 10 })];
    const { positions, trades, realizedPnl } = recalcFromTradeEntries(entries);
    expect(positions).toHaveLength(1);
    expect(positions[0].qty).toBe(10);
    expect(positions[0].buyPrice).toBe(10000);
    expect(trades).toHaveLength(0);
    expect(realizedPnl).toBe(0);
  });

  test('FIFO: 전량 매도 → 포지션 소진, 이익 계산', () => {
    const entries = [
      makeEntry({ type: 'BUY', price: 10000, qty: 10 }),
      makeEntry({ type: 'SELL', price: 12000, qty: 10 }),
    ];
    const { positions, trades, realizedPnl } = recalcFromTradeEntries(entries);
    expect(positions).toHaveLength(0);
    expect(trades).toHaveLength(1);
    expect(trades[0].profit).toBeCloseTo(20000); // (12000-10000)*10
    expect(trades[0].result).toBe('WIN');
    expect(realizedPnl).toBeCloseTo(20000);
  });

  test('FIFO: 손실 거래', () => {
    const entries = [
      makeEntry({ type: 'BUY', price: 10000, qty: 10 }),
      makeEntry({ type: 'SELL', price: 8000, qty: 10 }),
    ];
    const { trades, realizedPnl } = recalcFromTradeEntries(entries);
    expect(trades[0].profit).toBeCloseTo(-20000);
    expect(trades[0].result).toBe('LOSE');
    expect(realizedPnl).toBeCloseTo(-20000);
  });

  test('FIFO: 부분 매도 → 남은 포지션 유지', () => {
    const entries = [
      makeEntry({ type: 'BUY', price: 10000, qty: 10 }),
      makeEntry({ type: 'SELL', price: 12000, qty: 4 }),
    ];
    const { positions, trades, realizedPnl } = recalcFromTradeEntries(entries);
    expect(positions).toHaveLength(1);
    expect(positions[0].qty).toBe(6);
    expect(trades).toHaveLength(1);
    expect(trades[0].qty).toBe(4);
    expect(trades[0].profit).toBeCloseTo(8000); // (12000-10000)*4
    expect(realizedPnl).toBeCloseTo(8000);
  });

  test('FIFO: 여러 lot 에서 매도 (첫 번째 lot 먼저 소진)', () => {
    const entries = [
      makeEntry({ type: 'BUY', price: 10000, qty: 5 }),  // lot1: 5주 @ 10000
      makeEntry({ type: 'BUY', price: 15000, qty: 5 }),  // lot2: 5주 @ 15000
      makeEntry({ type: 'SELL', price: 12000, qty: 7 }), // lot1 전량 + lot2 에서 2주
    ];
    const { positions, trades, realizedPnl } = recalcFromTradeEntries(entries);
    // 남은 포지션: lot2 에서 3주 @ 15000
    expect(positions).toHaveLength(1);
    expect(positions[0].qty).toBe(3);
    expect(positions[0].buyPrice).toBe(15000);
    // 이익: lot1 5주: (12000-10000)*5=10000, lot2 2주: (12000-15000)*2=-6000
    expect(realizedPnl).toBeCloseTo(4000);
  });

  test('FIFO: 여러 종목 각각 독립적으로 처리', () => {
    const entries = [
      makeEntry({ type: 'BUY', price: 10000, qty: 10, stock_name: '삼성전자', stock_code: '005930' }),
      { id: 'e2', type: 'BUY' as const, price: 50000, qty: 5, stock_name: 'NAVER', stock_code: '035420', datetime: new Date(2000).toISOString() },
      makeEntry({ type: 'SELL', price: 12000, qty: 10, stock_name: '삼성전자', stock_code: '005930' }),
    ];
    const { positions, trades, realizedPnl } = recalcFromTradeEntries(entries);
    // 삼성전자 전량 매도, NAVER 5주 보유
    expect(positions).toHaveLength(1);
    expect(positions[0].symbolName).toBe('NAVER');
    expect(trades).toHaveLength(1);
    expect(realizedPnl).toBeCloseTo(20000);
  });

  test('datetime 순서에 무관하게 입력 배열 정렬 후 처리', () => {
    // SELL 이 BUY 보다 배열 앞에 있어도 datetime 이 나중이면 BUY 먼저 처리
    const t1 = new Date(1000).toISOString();
    const t2 = new Date(2000).toISOString();
    const entries: TradeEntry[] = [
      { id: 's1', type: 'SELL', stock_code: '005930', stock_name: '삼성전자', price: 12000, qty: 10, datetime: t2 },
      { id: 'b1', type: 'BUY', stock_code: '005930', stock_name: '삼성전자', price: 10000, qty: 10, datetime: t1 },
    ];
    const { positions, trades, realizedPnl } = recalcFromTradeEntries(entries);
    expect(trades).toHaveLength(1);
    expect(realizedPnl).toBeCloseTo(20000);
    expect(positions).toHaveLength(0);
  });

  test('매도 수량이 보유보다 많으면 가능한 만큼만 매도', () => {
    const entries = [
      makeEntry({ type: 'BUY', price: 10000, qty: 5 }),
      makeEntry({ type: 'SELL', price: 12000, qty: 10 }), // 5주만 존재
    ];
    const { positions, trades, realizedPnl } = recalcFromTradeEntries(entries);
    expect(trades[0].qty).toBe(5); // 5주만 매도
    expect(positions).toHaveLength(0);
    expect(realizedPnl).toBeCloseTo(10000);
  });

  test('평균 매수가 계산 검증', () => {
    const entries = [
      makeEntry({ type: 'BUY', price: 10000, qty: 5 }),
      makeEntry({ type: 'BUY', price: 20000, qty: 5 }),
      makeEntry({ type: 'SELL', price: 15000, qty: 10 }),
    ];
    const { trades } = recalcFromTradeEntries(entries);
    // FIFO: 첫 lot 10000*5=50000, 두번째 lot 20000*5=100000
    // 총 매도비용 150000/10 = 15000 평균
    // 이익: (15000-10000)*5 + (15000-20000)*5 = 25000 - 25000 = 0
    expect(trades[0].profit).toBeCloseTo(0);
  });
});

// ─────────────────────────────────────────────────────────────
// validateEntries
// ─────────────────────────────────────────────────────────────
describe('validateEntries', () => {
  test('유효한 항목 → null 반환', () => {
    const entries = [
      makeEntry({ type: 'BUY', price: 10000, qty: 10 }),
      makeEntry({ type: 'SELL', price: 12000, qty: 5 }),
    ];
    expect(validateEntries(entries)).toBeNull();
  });

  test('매도 수량이 보유보다 많으면 오류 메시지 반환', () => {
    const entries = [
      makeEntry({ type: 'BUY', price: 10000, qty: 5 }),
      makeEntry({ type: 'SELL', price: 12000, qty: 10 }),
    ];
    const result = validateEntries(entries);
    expect(result).not.toBeNull();
    expect(result).toContain('삼성전자');
    expect(result).toContain('10');
    expect(result).toContain('5');
  });

  test('전량 매도는 유효', () => {
    const entries = [
      makeEntry({ type: 'BUY', price: 10000, qty: 10 }),
      makeEntry({ type: 'SELL', price: 12000, qty: 10 }),
    ];
    expect(validateEntries(entries)).toBeNull();
  });

  test('매도 후 추가 매수 후 매도는 유효', () => {
    const entries = [
      makeEntry({ type: 'BUY', price: 10000, qty: 5 }),
      makeEntry({ type: 'SELL', price: 12000, qty: 5 }),
      makeEntry({ type: 'BUY', price: 11000, qty: 10 }),
      makeEntry({ type: 'SELL', price: 13000, qty: 10 }),
    ];
    expect(validateEntries(entries)).toBeNull();
  });

  test('빈 배열은 유효', () => {
    expect(validateEntries([])).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// 재계산 후 수치 정확성 (수정 시나리오)
// ─────────────────────────────────────────────────────────────
describe('edit record recalculation', () => {
  test('매수 단가 수정 후 손익 재계산', () => {
    const original: TradeEntry[] = [
      { id: 'b1', type: 'BUY', stock_code: '005930', stock_name: '삼성전자', price: 10000, qty: 10, datetime: new Date(1000).toISOString() },
      { id: 's1', type: 'SELL', stock_code: '005930', stock_name: '삼성전자', price: 12000, qty: 10, datetime: new Date(2000).toISOString() },
    ];

    // 매수가를 8000원으로 수정
    const edited = original.map(e =>
      e.id === 'b1' ? { ...e, price: 8000 } : e
    );

    const { realizedPnl } = recalcFromTradeEntries(edited);
    // (12000 - 8000) * 10 = 40000
    expect(realizedPnl).toBeCloseTo(40000);
  });

  test('매수 수량 수정 후 포지션 재계산', () => {
    const entries: TradeEntry[] = [
      { id: 'b1', type: 'BUY', stock_code: '005930', stock_name: '삼성전자', price: 10000, qty: 5, datetime: new Date(1000).toISOString() },
    ];

    // 수량을 10주로 수정
    const edited = entries.map(e => e.id === 'b1' ? { ...e, qty: 10 } : e);
    const { positions } = recalcFromTradeEntries(edited);
    expect(positions[0].qty).toBe(10);
  });
});
