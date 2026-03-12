/**
 * FIFO 기반 거래 재계산 유틸리티
 *
 * Accounting method: FIFO (선입선출)
 * - 매수 주문은 시간 순서대로 대기열에 쌓임
 * - 매도 시 가장 먼저 매수한 주식부터 소진
 *
 * 사용 방법:
 *   const { positions, trades, realizedPnl } = recalcFromTradeEntries(entries);
 */

import uuid from 'react-native-uuid';
import { TradeEntry, Position, Trade } from '../services/storage/types';

/** FIFO 대기열의 개별 매수 로트 */
interface Lot {
  price: number;
  qty: number;
  datetime: string;
  stock_name: string;
  lot_id: string; // 원본 TradeEntry.id (포지션 추적용)
}

/**
 * TradeEntries 배열로부터 FIFO 방식으로 포지션과 거래 기록을 재계산.
 *
 * @param entries - 모든 매수/매도 TradeEntry (순서 무관, 내부에서 datetime 정렬)
 * @returns positions: 현재 보유 포지션, trades: 체결된 거래, realizedPnl: 실현 손익 합계
 */
export function recalcFromTradeEntries(entries: TradeEntry[]): {
  positions: Position[];
  trades: Trade[];
  realizedPnl: number;
} {
  // datetime 오름차순 정렬 (FIFO 보장)
  const sorted = [...entries].sort(
    (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );

  // 종목별 FIFO 대기열: key = stock_code || stock_name
  const queues = new Map<string, Lot[]>();

  const trades: Trade[] = [];
  let realizedPnl = 0;

  const getKey = (e: TradeEntry) => e.stock_code || e.stock_name;

  for (const entry of sorted) {
    const key = getKey(entry);

    if (entry.type === 'BUY') {
      if (!queues.has(key)) queues.set(key, []);
      queues.get(key)!.push({
        price: entry.price,
        qty: entry.qty,
        datetime: entry.datetime,
        stock_name: entry.stock_name,
        lot_id: entry.id,
      });
    } else {
      // SELL: FIFO 매칭
      const queue = queues.get(key) ?? [];
      let remaining = entry.qty;
      let totalProfit = 0;
      let totalBuyCost = 0;
      let actualSoldQty = 0;

      while (remaining > 0 && queue.length > 0) {
        const lot = queue[0];
        const used = Math.min(remaining, lot.qty);
        totalProfit += (entry.price - lot.price) * used;
        totalBuyCost += lot.price * used;
        remaining -= used;
        actualSoldQty += used;
        lot.qty -= used;
        if (lot.qty === 0) queue.shift();
      }

      // 매도 수량이 보유 수량을 초과하면 초과분은 무시 (일관성 규칙: 불가능한 매도는 가능한 범위까지만)
      if (actualSoldQty > 0) {
        const avgBuyPrice = totalBuyCost / actualSoldQty;
        const profitRate = ((entry.price - avgBuyPrice) / avgBuyPrice) * 100;

        trades.push({
          id: uuid.v4() as string,
          symbolName: entry.stock_name,
          buyPrice: avgBuyPrice,
          sellPrice: entry.price,
          qty: actualSoldQty,
          profit: totalProfit,
          profitRate,
          result: totalProfit >= 0 ? 'WIN' : 'LOSE',
          tradedAt: entry.datetime,
        });

        realizedPnl += totalProfit;
      }
    }
  }

  // 남은 로트 → 보유 포지션으로 변환
  const positions: Position[] = [];
  for (const queue of queues.values()) {
    for (const lot of queue) {
      if (lot.qty > 0) {
        positions.push({
          id: lot.lot_id,
          symbolName: lot.stock_name,
          buyPrice: lot.price,
          qty: lot.qty,
          boughtAt: lot.datetime,
          status: 'OPEN',
        });
      }
    }
  }

  return { positions, trades, realizedPnl };
}

/**
 * 편집 후 검증: 매도 수량이 해당 종목의 총 보유 가능 수량을 초과하는지 확인.
 *
 * @param entries - 수정될 entry 를 포함한 전체 TradeEntry 목록
 * @returns null = 유효, string = 오류 메시지
 */
export function validateEntries(entries: TradeEntry[]): string | null {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );

  const holdings = new Map<string, number>(); // key → available qty
  const getKey = (e: TradeEntry) => e.stock_code || e.stock_name;

  for (const entry of sorted) {
    const key = getKey(entry);
    const current = holdings.get(key) ?? 0;
    if (entry.type === 'BUY') {
      holdings.set(key, current + entry.qty);
    } else {
      if (current < entry.qty) {
        return `${entry.stock_name}: 매도 수량(${entry.qty})이 보유 수량(${current})을 초과합니다.`;
      }
      holdings.set(key, current - entry.qty);
    }
  }
  return null;
}
