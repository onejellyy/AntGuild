import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, addDoc, writeBatch,
  query, orderBy, limit, onSnapshot, where,
  serverTimestamp, Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  UserDoc, PositionDoc, TradeDoc, RankingDoc, TradeEntryDoc,
  GroupDoc, GroupMemberDoc, JoinRequestDoc, GroupRankingDoc,
  LeagueKey,
} from './types';
import { calcLevel } from '../../utils/levelCalc';

// ─────────────────────────────────────────────────────────────
// User (프로필)
// ─────────────────────────────────────────────────────────────
export async function getUser(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function createUser(uid: string, nickname: string, league: LeagueKey): Promise<UserDoc> {
  const now = new Date().toISOString();
  const user: UserDoc = {
    uid,
    nickname,
    avatarUri: null,
    baseMoney: 1_000_000,
    realizedPnl: 0,
    level: 0,
    league,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, 'users', uid), user);

  // 랭킹 초기 문서 생성
  await setDoc(doc(db, 'ranking', uid), {
    uid,
    nickname,
    level: 0,
    wins: 0,
    losses: 0,
    realizedPnl: 0,
    league,
    updatedAt: now,
  } satisfies RankingDoc);

  return user;
}

export async function updateUserPrivacy(
  uid: string,
  showTrades: boolean,
  showHoldings: boolean,
): Promise<void> {
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid), { showTrades, showHoldings, updatedAt: now });
  batch.update(doc(db, 'ranking', uid), { showTrades, showHoldings, updatedAt: now });
  await batch.commit();
}

export async function updateUserAvatar(uid: string, avatarUri: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    avatarUri,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateUserPnl(
  uid: string,
  realizedPnl: number,
): Promise<void> {
  const level = calcLevel(realizedPnl);
  const totalAsset = 1_000_000 + realizedPnl;
  const now = new Date().toISOString();

  // Get user's groupId
  const userSnap = await getDoc(doc(db, 'users', uid));
  const currentUser = userSnap.exists() ? (userSnap.data() as UserDoc) : null;
  const groupId = currentUser?.groupId;

  const userUpdate = { realizedPnl, level, updatedAt: now };
  const rankUpdate = { realizedPnl, level, updatedAt: now };

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid), userUpdate);
  batch.update(doc(db, 'ranking', uid), rankUpdate);
  if (groupId) {
    batch.update(doc(db, 'groups', groupId, 'members', uid), { totalAsset });
  }
  await batch.commit();

  if (groupId) {
    await _recalcGroupTotalAsset(groupId);
  }
}

// ─────────────────────────────────────────────────────────────
// Positions (보유 포지션)
// ─────────────────────────────────────────────────────────────
export async function getPositions(uid: string): Promise<PositionDoc[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'positions'));
  return snap.docs.map(d => d.data() as PositionDoc);
}

export async function addPosition(uid: string, pos: PositionDoc): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'positions', pos.id), pos);
}

export async function updatePosition(uid: string, pos: PositionDoc): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'positions', pos.id), pos);
}

export async function updatePositions(uid: string, positions: PositionDoc[]): Promise<void> {
  const batch = writeBatch(db);
  for (const pos of positions) {
    batch.set(doc(db, 'users', uid, 'positions', pos.id), pos);
  }
  await batch.commit();
}

// ─────────────────────────────────────────────────────────────
// Trades (매도 기록)
// ─────────────────────────────────────────────────────────────
export async function getTrades(uid: string): Promise<TradeDoc[]> {
  const q = query(
    collection(db, 'users', uid, 'trades'),
    orderBy('tradedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as TradeDoc);
}

export async function addTrade(uid: string, trade: TradeDoc): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'trades', trade.id), trade);
}

export async function updateRankingRecord(
  uid: string,
  wins: number,
  losses: number
): Promise<void> {
  await updateDoc(doc(db, 'ranking', uid), {
    wins,
    losses,
    updatedAt: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────
// Ranking (실시간 구독)
// ─────────────────────────────────────────────────────────────

/** 개미 랭킹: LP(랭크 포인트) 기준 */
export function subscribeRanking(
  callback: (entries: RankingDoc[]) => void,
  count = 50
): Unsubscribe {
  const q = query(
    collection(db, 'ranking'),
    orderBy('rankPoints', 'desc'),
    limit(count)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => d.data() as RankingDoc));
  });
}

/** 개미 랭킹: 총 자산(realizedPnl) 기준, 리그 필터 */
export function subscribeAssetRanking(
  callback: (entries: RankingDoc[]) => void,
  league?: LeagueKey,
  count = 50
): Unsubscribe {
  const q = league
    ? query(
        collection(db, 'ranking'),
        where('league', '==', league),
        orderBy('realizedPnl', 'desc'),
        limit(count)
      )
    : query(
        collection(db, 'ranking'),
        orderBy('realizedPnl', 'desc'),
        limit(count)
      );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => d.data() as RankingDoc));
  }, err => {
    const { Alert } = require('react-native');
    Alert.alert('랭킹 에러', `${err.code}\n${err.message}`);
  });
}

// ─────────────────────────────────────────────────────────────
// TradeEntries (개별 매수/매도 기록 - 수정 가능한 원본)
// /users/{uid}/tradeEntries/{id}
// ─────────────────────────────────────────────────────────────

export async function getTradeEntries(uid: string): Promise<TradeEntryDoc[]> {
  const q = query(
    collection(db, 'users', uid, 'tradeEntries'),
    orderBy('datetime', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as TradeEntryDoc);
}

export async function addTradeEntry(uid: string, entry: TradeEntryDoc): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'tradeEntries', entry.id), entry);
}

export async function updateTradeEntry(uid: string, entry: TradeEntryDoc): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'tradeEntries', entry.id), entry);
}

export async function deleteTradeEntry(uid: string, entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'tradeEntries', entryId));
}

/**
 * 전체 재계산 후 저장: 기존 positions, trades 를 지우고
 * tradeEntries 로부터 재계산된 데이터로 덮어씀.
 * realizedPnl 만 업데이트 (rankPoints 는 그대로 유지).
 */
export async function replacePositionsAndTrades(
  uid: string,
  positions: PositionDoc[],
  trades: TradeDoc[],
  newRealizedPnl: number
): Promise<void> {
  // 1) 기존 positions 모두 삭제
  const oldPosSnap = await getDocs(collection(db, 'users', uid, 'positions'));
  // 2) 기존 trades 모두 삭제
  const oldTradeSnap = await getDocs(collection(db, 'users', uid, 'trades'));

  // Firestore batch: 최대 500 ops per batch
  // 두 개의 batch 로 분리 처리
  const batch1 = writeBatch(db);
  oldPosSnap.docs.forEach(d => batch1.delete(d.ref));
  oldTradeSnap.docs.forEach(d => batch1.delete(d.ref));
  await batch1.commit();

  const batch2 = writeBatch(db);
  for (const pos of positions) {
    batch2.set(doc(db, 'users', uid, 'positions', pos.id), pos);
  }
  for (const trade of trades) {
    batch2.set(doc(db, 'users', uid, 'trades', trade.id), trade);
  }
  await batch2.commit();

  // 3) 사용자 프로필 realizedPnl 업데이트
  await updateUserPnl(uid, newRealizedPnl);
}

// ─────────────────────────────────────────────────────────────
// 개미단 (Groups)
// ─────────────────────────────────────────────────────────────

async function _recalcGroupTotalAsset(groupId: string): Promise<void> {
  const membersSnap = await getDocs(collection(db, 'groups', groupId, 'members'));
  const totalAsset = membersSnap.docs.reduce(
    (sum, d) => sum + ((d.data() as GroupMemberDoc).totalAsset ?? 0), 0
  );
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.update(doc(db, 'groups', groupId), { totalAsset, updatedAt: now });
  batch.update(doc(db, 'groupRanking', groupId), { totalAsset, updatedAt: now });
  await batch.commit();
}

export async function createGroup(
  uid: string,
  nickname: string,
  name: string,
  description: string,
  currentRealizedPnl: number,
  league: LeagueKey
): Promise<GroupDoc> {
  const now = new Date().toISOString();
  const totalAsset = 1_000_000 + currentRealizedPnl;
  const groupRef = doc(collection(db, 'groups'));
  const groupId = groupRef.id;

  const group: GroupDoc = {
    id: groupId,
    name,
    description,
    league,
    leaderId: uid,
    leaderNickname: nickname,
    memberCount: 1,
    totalAsset,
    createdAt: now,
    updatedAt: now,
  };

  const member: GroupMemberDoc = {
    uid,
    nickname,
    role: 'leader',
    totalAsset,
    joinedAt: now,
  };

  const groupRanking: GroupRankingDoc = {
    groupId,
    name,
    league,
    leaderId: uid,
    leaderNickname: nickname,
    memberCount: 1,
    totalAsset,
    updatedAt: now,
  };

  const batch = writeBatch(db);
  batch.set(groupRef, group);
  batch.set(doc(db, 'groups', groupId, 'members', uid), member);
  batch.set(doc(db, 'groupRanking', groupId), groupRanking);
  batch.update(doc(db, 'users', uid), { groupId, updatedAt: now });
  batch.update(doc(db, 'ranking', uid), { groupId, updatedAt: now });
  await batch.commit();

  return group;
}

export async function getGroup(groupId: string): Promise<GroupDoc | null> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  return snap.exists() ? (snap.data() as GroupDoc) : null;
}

export async function getUserGroupInfo(
  uid: string
): Promise<{ group: GroupDoc; member: GroupMemberDoc } | null> {
  const userSnap = await getDoc(doc(db, 'users', uid));
  const user = userSnap.exists() ? (userSnap.data() as UserDoc) : null;
  if (!user?.groupId) return null;

  const [groupSnap, memberSnap] = await Promise.all([
    getDoc(doc(db, 'groups', user.groupId)),
    getDoc(doc(db, 'groups', user.groupId, 'members', uid)),
  ]);
  if (!groupSnap.exists()) return null;
  return {
    group: groupSnap.data() as GroupDoc,
    member: memberSnap.exists() ? (memberSnap.data() as GroupMemberDoc) : { uid, nickname: user.nickname, role: 'member', totalAsset: 1_000_000 + user.realizedPnl, joinedAt: '' },
  };
}

export async function searchGroups(name: string): Promise<GroupDoc[]> {
  // Simple: get all groups (up to 50) and filter client-side
  const q = query(collection(db, 'groups'), orderBy('name'), limit(50));
  const snap = await getDocs(q);
  const lower = name.toLowerCase();
  return snap.docs
    .map(d => d.data() as GroupDoc)
    .filter(g => g.name.toLowerCase().includes(lower) && g.memberCount < 10);
}

export async function applyToGroup(
  groupId: string,
  uid: string,
  nickname: string
): Promise<void> {
  const request: JoinRequestDoc = {
    uid,
    nickname,
    requestedAt: new Date().toISOString(),
    status: 'pending',
  };
  await setDoc(doc(db, 'groups', groupId, 'joinRequests', uid), request);
}

export async function getJoinRequests(groupId: string): Promise<JoinRequestDoc[]> {
  const q = query(
    collection(db, 'groups', groupId, 'joinRequests'),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as JoinRequestDoc);
}

export async function approveJoinRequest(
  groupId: string,
  applicantUid: string,
  applicantNickname: string,
  applicantRealizedPnl: number
): Promise<void> {
  const now = new Date().toISOString();
  const totalAsset = 1_000_000 + applicantRealizedPnl;
  const member: GroupMemberDoc = {
    uid: applicantUid,
    nickname: applicantNickname,
    role: 'member',
    totalAsset,
    joinedAt: now,
  };

  // Get current member count
  const groupSnap = await getDoc(doc(db, 'groups', groupId));
  const group = groupSnap.data() as GroupDoc;

  const batch = writeBatch(db);
  batch.set(doc(db, 'groups', groupId, 'members', applicantUid), member);
  batch.update(doc(db, 'groups', groupId, 'joinRequests', applicantUid), { status: 'approved' });
  batch.update(doc(db, 'groups', groupId), { memberCount: (group.memberCount ?? 0) + 1, updatedAt: now });
  batch.update(doc(db, 'groupRanking', groupId), { memberCount: (group.memberCount ?? 0) + 1, updatedAt: now });
  batch.update(doc(db, 'users', applicantUid), { groupId, updatedAt: now });
  batch.update(doc(db, 'ranking', applicantUid), { groupId, updatedAt: now });
  await batch.commit();

  await _recalcGroupTotalAsset(groupId);
}

export async function rejectJoinRequest(groupId: string, applicantUid: string): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId, 'joinRequests', applicantUid), { status: 'rejected' });
}

export async function leaveGroup(groupId: string, uid: string): Promise<void> {
  const now = new Date().toISOString();
  const groupSnap = await getDoc(doc(db, 'groups', groupId));
  const group = groupSnap.data() as GroupDoc;

  const batch = writeBatch(db);
  batch.delete(doc(db, 'groups', groupId, 'members', uid));
  batch.update(doc(db, 'groups', groupId), { memberCount: Math.max(0, (group.memberCount ?? 1) - 1), updatedAt: now });
  batch.update(doc(db, 'groupRanking', groupId), { memberCount: Math.max(0, (group.memberCount ?? 1) - 1), updatedAt: now });
  batch.update(doc(db, 'users', uid), { groupId: null, updatedAt: now });
  batch.update(doc(db, 'ranking', uid), { groupId: null, updatedAt: now });
  await batch.commit();

  await _recalcGroupTotalAsset(groupId);
}

export async function dissolveGroup(groupId: string, leaderId: string): Promise<void> {
  const now = new Date().toISOString();

  // Clear groupId for all members
  const membersSnap = await getDocs(collection(db, 'groups', groupId, 'members'));
  const batch = writeBatch(db);
  membersSnap.docs.forEach(d => {
    const m = d.data() as GroupMemberDoc;
    batch.update(doc(db, 'users', m.uid), { groupId: null, updatedAt: now });
    batch.update(doc(db, 'ranking', m.uid), { groupId: null, updatedAt: now });
    batch.delete(d.ref);
  });
  batch.delete(doc(db, 'groups', groupId));
  batch.delete(doc(db, 'groupRanking', groupId));
  await batch.commit();
}

/**
 * 계정 탈퇴: 해당 유저의 Firestore 데이터 전부 삭제.
 * 그룹 리더라면 그룹 해산, 일반 멤버면 탈퇴 처리 후 삭제.
 */
export async function deleteUserFirestoreData(uid: string): Promise<void> {
  // 1) 그룹 처리
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (userSnap.exists()) {
    const user = userSnap.data() as UserDoc;
    if (user.groupId) {
      const groupSnap = await getDoc(doc(db, 'groups', user.groupId));
      if (groupSnap.exists()) {
        const group = groupSnap.data() as GroupDoc;
        if (group.leaderId === uid) {
          await dissolveGroup(user.groupId, uid);
        } else {
          await leaveGroup(user.groupId, uid);
        }
      }
    }
  }

  // 2) 서브컬렉션 삭제
  const subCollections = [
    'positions', 'trades', 'tradeEntries',
    'autoTrades', 'autoHoldings', 'processedNotifications',
  ];
  for (const col of subCollections) {
    const snap = await getDocs(collection(db, 'users', uid, col));
    if (snap.docs.length > 0) {
      const b = writeBatch(db);
      snap.docs.forEach(d => b.delete(d.ref));
      await b.commit();
    }
  }

  // 3) ranking 문서, user 문서 삭제
  const b2 = writeBatch(db);
  b2.delete(doc(db, 'ranking', uid));
  b2.delete(doc(db, 'users', uid));
  await b2.commit();
}

export async function getGroupMembers(groupId: string): Promise<GroupMemberDoc[]> {
  const snap = await getDocs(collection(db, 'groups', groupId, 'members'));
  return snap.docs.map(d => d.data() as GroupMemberDoc);
}

export function subscribeGroupMembers(
  groupId: string,
  callback: (members: GroupMemberDoc[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'groups', groupId, 'members'), snap => {
    callback(snap.docs.map(d => d.data() as GroupMemberDoc));
  });
}

export function subscribeGroupRanking(
  callback: (entries: GroupRankingDoc[]) => void,
  league?: LeagueKey,
  count = 50
): Unsubscribe {
  const q = league
    ? query(
        collection(db, 'groupRanking'),
        where('league', '==', league),
        orderBy('totalAsset', 'desc'),
        limit(count)
      )
    : query(
        collection(db, 'groupRanking'),
        orderBy('totalAsset', 'desc'),
        limit(count)
      );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => d.data() as GroupRankingDoc));
  });
}
