import { LeagueKey } from '../../constants/leagues';
export type { LeagueKey };

export interface Profile {
  id: 'local';
  nickname: string;
  avatarUri: string | null;
  baseMoney: number; // 1_000_000 고정
  realizedPnl: number;
  league: LeagueKey;  // 가입 시 선택한 리그 (영구)
  groupId?: string;   // 소속 개미단 ID
  showTrades?: boolean;   // 전적 공개 여부 (기본 true)
  showHoldings?: boolean; // 보유 종목 공개 여부 (기본 true)
  createdAt: string;
}

export interface Position {
  id: string;
  symbolName: string;
  buyPrice: number;
  qty: number;
  boughtAt: string;
  status: 'OPEN' | 'CLOSED';
}

export interface Trade {
  id: string;
  symbolName: string;
  buyPrice: number;
  sellPrice: number;
  qty: number;
  profit: number;      // (sellPrice - buyPrice) * qty
  profitRate: number;  // (sellPrice - buyPrice) / buyPrice * 100
  result: 'WIN' | 'LOSE';
  tradedAt: string;
}

/**
 * TradeEntry: 개별 매수/매도 이벤트 (수정 가능한 원본 기록)
 * - 매수(BUY)와 매도(SELL) 이벤트를 각각 저장
 * - 이 기록들로부터 보유 포지션과 실현 손익을 재계산 가능
 * - Accounting method: FIFO (선입선출)
 */
export interface TradeEntry {
  id: string;
  type: 'BUY' | 'SELL';
  stock_code: string;   // KRX 6자리 코드 (자동완성으로 선택 시 채워짐)
  stock_name: string;   // 한글 종목명
  price: number;        // 단가
  qty: number;          // 수량 (정수)
  datetime: string;     // ISO timestamp
  note?: string;        // 메모 (선택)
}

export interface RankingEntry {
  id: string;
  nickname: string;
  level: number;
  recentRecordText: string; // 예: "15승 2패"
}
