/**
 * 알림 기반 자동 투자기록 시스템 — 도메인 타입 정의
 */

// ─── 원시 알림 이벤트 (네이티브 → JS) ─────────────────────────
export interface RawNotificationEvent {
  sourcePackage: string;
  notificationKey: string;
  title: string;
  body: string;
  subText?: string;
  postedAt: number; // Unix ms
}

// ─── 브로커 룰 ─────────────────────────────────────────────────
export interface ParsedNotificationFields {
  eventType: 'BUY' | 'SELL' | 'UNKNOWN';
  symbol: string;
  quantity: number;
  price: number;
  isPartial: boolean;
  symbolCode?: string;
}

export interface BrokerRule {
  brokerId: string;
  displayName: string;
  packageNames: string[];
  /**
   * 1차 필터: 이 키워드 중 하나라도 있으면 파싱 시도
   * (excludeKeywords가 없는 경우에 한함)
   */
  includeKeywords: string[];
  /**
   * 제외 우선 키워드: 하나라도 있으면 즉시 무시
   */
  excludeKeywords: string[];
  /**
   * 브로커별 매수 표현식 목록
   * 예: ["매수체결", "매수완료", "구매성공", "매입체결"]
   * 이 목록으로 eventType=BUY 판별 (notificationParser에서 사용)
   */
  buyExpressions: string[];
  /**
   * 브로커별 매도 표현식 목록
   * 예: ["매도체결", "매도완료", "판매성공", "매출체결"]
   */
  sellExpressions: string[];
  /** 브로커별 파싱 함수. 파싱 불가 시 null 반환 */
  parseNotification: (event: RawNotificationEvent) => ParsedNotificationFields | null;
}

// ─── 정규화된 거래 이벤트 ───────────────────────────────────────
export type TradeEventStatus = 'VALID' | 'IGNORED' | 'DUPLICATE' | 'ERROR';

export interface TradeEvent {
  id: string;                       // uuid
  brokerId: string;
  sourcePackage: string;
  notificationKey: string;
  rawTitle: string;
  rawBody: string;
  eventType: 'BUY' | 'SELL' | 'UNKNOWN';
  isPartial: boolean;
  symbol: string;
  symbolCode?: string;
  quantity: number;
  price: number;
  totalAmount?: number;
  executedAt: string;               // ISO — postedAt 기반
  detectedAt: string;               // 앱이 수신한 시각
  dedupeKey: string;
  parserVersion: string;
  parseConfidence?: number;         // 0~1
  rawSnapshot?: string;             // 디버깅용 원문
  status: TradeEventStatus;
}

// ─── 보유 종목 ─────────────────────────────────────────────────
export interface PortfolioHolding {
  id: string;                       // = symbol (e.g. "삼성전자")
  userId: string;
  brokerId: string;
  symbol: string;
  symbolCode?: string;
  quantity: number;
  averageBuyPrice: number;
  totalBuyAmount: number;
  lastBuyAt: string;
  createdAt: string;
  updatedAt: string;
  sourceType: 'AUTO_NOTIFICATION';
}

// ─── 자동 전적 (매도 시 생성, locked) ──────────────────────────
export type MatchMethod = 'AVERAGE_COST' | 'FIFO';

export interface AutoTradeRecord {
  id: string;
  userId: string;
  brokerId: string;
  symbol: string;
  symbolCode?: string;
  sellQuantity: number;
  buyMatchedPrice: number;         // averageBuyPrice at time of sell
  sellPrice: number;
  realizedPnL: number;             // (sellPrice - buyMatchedPrice) * sellQuantity
  realizedPnLRate?: number;        // realizedPnL / (buyMatchedPrice * sellQuantity) * 100
  buyExecutedAt?: string;
  sellExecutedAt: string;
  matchMethod: MatchMethod;
  sourceTradeEventId: string;
  createdAt: string;
  sourceType: 'AUTO_NOTIFICATION';
  isPartialSell: boolean;
  locked: true;
}

// ─── 처리 이력 (중복 방지) ─────────────────────────────────────
export type ProcessResult =
  | 'APPLIED'
  | 'IGNORED'
  | 'DUPLICATE'
  | 'ERROR'
  | 'NO_HOLDING'
  | 'OVERSELL';

export interface ProcessedNotification {
  id: string;                       // = dedupeKey
  dedupeKey: string;
  notificationKey: string;
  sourcePackage: string;
  processedAt: string;
  resultStatus: ProcessResult;
  tradeEventId?: string;
  errorReason?: string;
}

// ─── applyTradeEvent 결과 ───────────────────────────────────────
export type ApplyResult =
  | { ok: true; type: 'BUY_APPLIED'; holding: PortfolioHolding }
  | { ok: true; type: 'SELL_APPLIED'; trade: AutoTradeRecord; holding: PortfolioHolding | null }
  | { ok: false; reason: string; errorCode: ProcessResult };
