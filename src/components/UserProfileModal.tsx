import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTrades, getPositions } from '../services/firestore';
import { TradeDoc, PositionDoc } from '../services/firestore/types';
import { RankingDoc } from '../services/firestore/types';
import { formatProfit, formatRate, formatDate, formatWon } from '../utils/formatters';
import { COLORS, RADIUS } from '../constants/theme';

interface Props {
  visible: boolean;
  user: RankingDoc | null;
  onClose: () => void;
}

type TabKey = 'trades' | 'holdings';

export default function UserProfileModal({ visible, user, onClose }: Props) {
  const [tab, setTab] = useState<TabKey>('trades');
  const [trades, setTrades] = useState<TradeDoc[]>([]);
  const [positions, setPositions] = useState<PositionDoc[]>([]);
  const [loading, setLoading] = useState(false);

  const tradesPublic = user?.showTrades !== false;
  const holdingsPublic = user?.showHoldings !== false;

  useEffect(() => {
    if (!visible || !user) return;
    setTab('trades');
    setTrades([]);
    setPositions([]);
  }, [visible, user]);

  useEffect(() => {
    if (!visible || !user) return;
    if (!tradesPublic && !holdingsPublic) return;
    setLoading(true);
    Promise.all([
      tradesPublic ? getTrades(user.uid) : Promise.resolve([]),
      holdingsPublic ? getPositions(user.uid) : Promise.resolve([]),
    ]).then(([t, p]) => {
      setTrades((t as TradeDoc[]).slice(0, 20));
      setPositions((p as PositionDoc[]).filter(pos => pos.status === 'OPEN' && pos.qty > 0));
    }).finally(() => setLoading(false));
  }, [visible, user, tradesPublic, holdingsPublic]);

  const renderTrade = ({ item }: ListRenderItemInfo<TradeDoc>) => {
    const isWin = item.result === 'WIN';
    return (
      <View style={[styles.tradeCard, { borderLeftColor: isWin ? COLORS.green : COLORS.red }]}>
        <View style={styles.cardLeft}>
          <View style={[styles.typeBadge, { backgroundColor: isWin ? `${COLORS.green}18` : `${COLORS.red}18` }]}>
            <Text style={[styles.result, { color: isWin ? COLORS.green : COLORS.red }]}>
              {isWin ? 'WIN' : 'LOSE'}
            </Text>
          </View>
          <Text style={styles.vsText}>{item.symbolName}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.profit, { color: isWin ? COLORS.green : COLORS.red }]}>
            {formatProfit(item.profit)}
          </Text>
          <Text style={[styles.rate, { color: isWin ? COLORS.green : COLORS.red }]}>
            ({formatRate(item.profitRate)})
          </Text>
          <Text style={styles.dateText}>{formatDate(item.tradedAt)}</Text>
        </View>
      </View>
    );
  };

  const renderPosition = ({ item }: ListRenderItemInfo<PositionDoc>) => {
    const evalAmt = item.buyPrice * item.qty;
    return (
      <View style={styles.posCard}>
        <View style={styles.posTop}>
          <View style={{ gap: 4, flex: 1 }}>
            <Text style={styles.symbol}>{item.symbolName}</Text>
            <Text style={styles.posDetail}>
              {item.qty}주 &nbsp; 평균 {formatWon(item.buyPrice)}원
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 3 }}>
            <Text style={styles.evalAmt}>{formatWon(evalAmt)}원</Text>
          </View>
        </View>
        <Text style={styles.dateText}>{formatDate(item.boughtAt)}</Text>
      </View>
    );
  };

  if (!user) return null;

  const isTradesTab = tab === 'trades';
  const isCurrentTabLocked = isTradesTab ? !tradesPublic : !holdingsPublic;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          {/* 핸들 */}
          <View style={styles.handle} />

          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.nickname}>{user.nickname}</Text>
            </View>
            <View style={styles.recordRow}>
              <Text style={styles.winsText}>{user.wins}승</Text>
              <Text style={styles.slashText}> / </Text>
              <Text style={styles.lossesText}>{user.losses}패</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 탭 */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'trades' && styles.tabActive]}
              onPress={() => setTab('trades')}
            >
              <Text style={[styles.tabTxt, tab === 'trades' && styles.tabTxtActive]}>
                최근 전적
              </Text>
              {!tradesPublic && (
                <MaterialCommunityIcons name="lock" size={13} color={COLORS.textDim} style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'holdings' && styles.tabActive]}
              onPress={() => setTab('holdings')}
            >
              <Text style={[styles.tabTxt, tab === 'holdings' && styles.tabTxtActive]}>
                보유 종목
              </Text>
              {!holdingsPublic && (
                <MaterialCommunityIcons name="lock" size={13} color={COLORS.textDim} style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
          </View>

          {/* 콘텐츠 */}
          {isCurrentTabLocked ? (
            <View style={styles.locked}>
              <MaterialCommunityIcons name="lock-outline" size={40} color={COLORS.border} />
              <Text style={styles.lockedText}>비공개 설정된 정보입니다.</Text>
            </View>
          ) : loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          ) : isTradesTab ? (
            trades.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>전적이 없습니다.</Text>
              </View>
            ) : (
              <FlatList
                data={trades}
                keyExtractor={item => item.id}
                renderItem={renderTrade}
                contentContainerStyle={{ paddingVertical: 8 }}
              />
            )
          ) : (
            positions.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>보유 종목이 없습니다.</Text>
              </View>
            ) : (
              <FlatList
                data={positions}
                keyExtractor={item => item.id}
                renderItem={renderPosition}
                contentContainerStyle={{ gap: 1 }}
              />
            )
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '80%',
    minHeight: '50%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: COLORS.border,
    borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12,
  },
  headerLeft: { flex: 1, gap: 3 },
  nickname: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  recordRow: { flexDirection: 'row', alignItems: 'center' },
  winsText: { fontSize: 14, fontWeight: '700', color: COLORS.green },
  slashText: { fontSize: 14, color: COLORS.textDim },
  lossesText: { fontSize: 14, fontWeight: '700', color: COLORS.red },
  closeBtn: { padding: 6 },
  closeTxt: { fontSize: 18, color: COLORS.textDim },

  // Tabs
  tabs: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabTxt: { fontSize: 14, fontWeight: '600', color: COLORS.textDim },
  tabTxtActive: { color: COLORS.primary },

  // Locked
  locked: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  lockedText: { fontSize: 14, color: COLORS.textDim, fontWeight: '600' },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  emptyText: { fontSize: 15, color: COLORS.textDim },

  // Trade card
  tradeCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    marginHorizontal: 12, marginVertical: 4,
    backgroundColor: '#ffffff', borderRadius: RADIUS.lg, borderLeftWidth: 3,
    shadowColor: '#c8d0e0', shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
  },
  typeBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.sm, alignSelf: 'flex-start',
  },
  cardLeft: { gap: 6 },
  result: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  vsText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '700' },
  cardRight: { alignItems: 'flex-end', gap: 3 },
  profit: { fontSize: 15, fontWeight: '800' },
  rate: { fontSize: 13, fontWeight: '600' },
  dateText: { fontSize: 11, color: COLORS.textDim, marginTop: 2 },

  // Position card
  posCard: {
    backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 14,
    marginHorizontal: 12, marginVertical: 4, borderRadius: RADIUS.lg,
    shadowColor: '#c8d0e0', shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2, gap: 6,
  },
  posTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  symbol: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  posDetail: { fontSize: 13, color: COLORS.textSecondary },
  evalAmt: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
});
