/**
 * 거래 이벤트 적용 유스케이스
 *
 * 규칙:
 * A. BUY  → 보유 종목 생성/갱신 (평균단가 재계산)
 * B. SELL → 보유 종목에서 차감 + 전적 생성 (locked)
 * C. 매도 수량 > 보유 수량 → OVERSELL 에러
 * D. 매도인데 보유 없음 → NO_HOLDING 에러
 */

import uuid from 'react-native-uuid';
import {
  TradeEvent,
  PortfolioHolding,
  AutoTradeRecord,
  ApplyResult,
} from '../domain/types';
import {
  getAutoHolding,
  saveAutoHolding,
  deleteAutoHolding,
  addAutoTrade,
} from '../infrastructure/autoTradeRepository';

export async function applyTradeEventUseCase(
  uid: string,
  event: TradeEvent,
): Promise<ApplyResult> {
  if (event.eventType === 'BUY') {
    return applyBuy(uid, event);
  } else if (event.eventType === 'SELL') {
    return applySell(uid, event);
  }
  return { ok: false, reason: 'event_type_unknown', errorCode: 'ERROR' };
}

// ─── 매수 처리 ─────────────────────────────────────────────────

async function applyBuy(uid: string, event: TradeEvent): Promise<ApplyResult> {
  const now = new Date().toISOString();
  const existing = await getAutoHolding(uid, event.symbol);

  let holding: PortfolioHolding;

  if (!existing) {
    // 신규 보유 종목 생성
    holding = {
      id: event.symbol,
      userId: uid,
      brokerId: event.brokerId,
      symbol: event.symbol,
      ...(event.symbolCode !== undefined && { symbolCode: event.symbolCode }),
      quantity: event.quantity,
      averageBuyPrice: event.price,
      totalBuyAmount: event.price * event.quantity,
      lastBuyAt: event.executedAt,
      createdAt: now,
      updatedAt: now,
      sourceType: 'AUTO_NOTIFICATION',
    };
  } else {
    // 추가 매수 → 평균단가 재계산
    const newTotalAmount =
      existing.totalBuyAmount + event.price * event.quantity;
    const newQuantity = existing.quantity + event.quantity;
    const newAvg = newTotalAmount / newQuantity;

    holding = {
      ...existing,
      quantity: newQuantity,
      averageBuyPrice: newAvg,
      totalBuyAmount: newTotalAmount,
      lastBuyAt: event.executedAt,
      updatedAt: now,
    };
  }

  await saveAutoHolding(uid, holding);
  return { ok: true, type: 'BUY_APPLIED', holding };
}

// ─── 매도 처리 ─────────────────────────────────────────────────

async function applySell(uid: string, event: TradeEvent): Promise<ApplyResult> {
  const now = new Date().toISOString();
  const holding = await getAutoHolding(uid, event.symbol);

  if (!holding) {
    return {
      ok: false,
      reason: `no_holding_for_symbol:${event.symbol}`,
      errorCode: 'NO_HOLDING',
    };
  }

  if (event.quantity > holding.quantity) {
    return {
      ok: false,
      reason: `oversell:have=${holding.quantity},sell=${event.quantity}`,
      errorCode: 'OVERSELL',
    };
  }

  // 실현손익 계산 (평균단가 방식)
  const realizedPnL =
    (event.price - holding.averageBuyPrice) * event.quantity;
  const realizedPnLRate =
    (realizedPnL / (holding.averageBuyPrice * event.quantity)) * 100;

  const isPartialSell = event.quantity < holding.quantity;

  const trade: AutoTradeRecord = {
    id: uuid.v4() as string,
    userId: uid,
    brokerId: event.brokerId,
    symbol: event.symbol,
    ...(event.symbolCode !== undefined && { symbolCode: event.symbolCode }),
    sellQuantity: event.quantity,
    buyMatchedPrice: holding.averageBuyPrice,
    sellPrice: event.price,
    realizedPnL,
    realizedPnLRate,
    sellExecutedAt: event.executedAt,
    matchMethod: 'AVERAGE_COST',
    sourceTradeEventId: event.id,
    createdAt: now,
    sourceType: 'AUTO_NOTIFICATION',
    isPartialSell,
    locked: true,
  };

  await addAutoTrade(uid, trade);

  // 보유 종목 갱신
  const remainingQty = holding.quantity - event.quantity;
  let updatedHolding: PortfolioHolding | null = null;

  if (remainingQty <= 0) {
    // 전량매도 → 보유 종목 제거
    await deleteAutoHolding(uid, event.symbol);
  } else {
    // 부분매도 → 수량 차감 (averageBuyPrice 유지, totalBuyAmount 비례 감소)
    updatedHolding = {
      ...holding,
      quantity: remainingQty,
      totalBuyAmount: holding.averageBuyPrice * remainingQty,
      updatedAt: now,
    };
    await saveAutoHolding(uid, updatedHolding);
  }

  return { ok: true, type: 'SELL_APPLIED', trade, holding: updatedHolding };
}
