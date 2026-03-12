import { LeagueKey } from '../../constants/leagues';
export type { LeagueKey };

// Firestore 컬렉션/문서 구조 정의
// /users/{uid}                        → UserDoc
// /users/{uid}/positions/{id}         → PositionDoc
// /users/{uid}/trades/{id}            → TradeDoc
// /ranking/{uid}                      → RankingDoc
// /groups/{groupId}                   → GroupDoc
// /groups/{groupId}/members/{uid}     → GroupMemberDoc
// /groups/{groupId}/joinRequests/{uid}→ JoinRequestDoc
// /groupRanking/{groupId}             → GroupRankingDoc

export interface UserDoc {
  uid: string;
  nickname: string;
  avatarUri: string | null;
  baseMoney: number;
  realizedPnl: number;
  level: number;          // levelCalc 결과 저장(랭킹 조회 최적화)
  league: LeagueKey;      // 가입 시 선택한 리그 (영구)
  groupId?: string;       // 소속 개미단 ID
  showTrades?: boolean;   // 전적 공개 여부 (기본 true)
  showHoldings?: boolean; // 보유 종목 공개 여부 (기본 true)
  createdAt: string;
  updatedAt: string;
}

export interface PositionDoc {
  id: string;
  symbolName: string;
  buyPrice: number;
  qty: number;
  boughtAt: string;
  status: 'OPEN' | 'CLOSED';
}

export interface TradeDoc {
  id: string;
  symbolName: string;
  buyPrice: number;
  sellPrice: number;
  qty: number;
  profit: number;
  profitRate: number;
  result: 'WIN' | 'LOSE';
  tradedAt: string;
}

export interface RankingDoc {
  uid: string;
  nickname: string;
  level: number;
  wins: number;
  losses: number;
  realizedPnl: number;
  league: LeagueKey;      // 가입 시 선택한 리그
  groupId?: string;       // 소속 개미단 ID
  showTrades?: boolean;   // 전적 공개 여부 (기본 true)
  showHoldings?: boolean; // 보유 종목 공개 여부 (기본 true)
  updatedAt: string;
}

// ─── 개미단 관련 타입 ──────────────────────────────────────────

export interface GroupDoc {
  id: string;
  name: string;
  description: string;
  league: LeagueKey;      // 개미단 리그
  leaderId: string;
  leaderNickname: string;
  memberCount: number;    // max 10
  totalAsset: number;     // 전체 단원 자산 합계
  createdAt: string;
  updatedAt: string;
}

export interface GroupMemberDoc {
  uid: string;
  nickname: string;
  role: 'leader' | 'member';
  totalAsset: number;
  joinedAt: string;
}

export interface JoinRequestDoc {
  uid: string;
  nickname: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface GroupRankingDoc {
  groupId: string;
  name: string;
  league: LeagueKey;      // 개미단 리그
  leaderId: string;
  leaderNickname: string;
  memberCount: number;
  totalAsset: number;
  updatedAt: string;
}

/** Firestore 저장용 개별 매수/매도 기록 */
export interface TradeEntryDoc {
  id: string;
  type: 'BUY' | 'SELL';
  stock_code: string;
  stock_name: string;
  price: number;
  qty: number;
  datetime: string;
  note?: string;
}
