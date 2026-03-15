/**
 * 자동 투자기록 — 자동 전적 화면
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ListRenderItemInfo,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../App';
import { COLORS, RADIUS } from '../../../constants/theme';
import { formatWon, formatRate, formatProfit, formatDate } from '../../../utils/formatters';
import { subscribeAutoTrades } from '../infrastructure/autoTradeRepository';
import { AutoTradeRecord } from '../domain/types';
import { getCurrentUid } from '../../../services/auth';

const BROKER_LABELS: Record<string, string> = {
  'toss-securities': '토스증권',
  'kakaopay-securities': '카카오페이증권',
};

type Props = NativeStackScreenProps<RootStackParamList, 'AutoTrades'>;

export default function AutoTradesScreen({ navigation }: Props) {
  const [trades, setTrades] = useState<AutoTradeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = getCurrentUid();
    if (!uid) { setLoading(false); return; }

    const unsub = subscribeAutoTrades(uid, (data) => {
      setTrades(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const totalPnL = trades.reduce((s, t) => s + t.realizedPnL, 0);
  const wins = trades.filter(t => t.realizedPnL > 0).length;
  const losses = trades.filter(t => t.realizedPnL <= 0).length;

  const renderItem = ({ item }: ListRenderItemInfo<AutoTradeRecord>) => {
    const isWin = item.realizedPnL > 0;
    return (
      <View style={[styles.card, isWin ? styles.cardWin : styles.cardLose]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.symbol}>{item.symbol}</Text>
            {item.symbolCode ? (
              <Text style={styles.stockCode}>{item.symbolCode}</Text>
            ) : null}
            {item.isPartialSell && (
              <View style={styles.partialBadge}>
                <Text style={styles.partialBadgeText}>부분</Text>
              </View>
            )}
          </View>
          <Text style={[styles.pnl, { color: isWin ? COLORS.buy : COLORS.sell }]}>
            {formatProfit(item.realizedPnL)}
          </Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>매수 평균</Text>
            <Text style={styles.priceVal}>{formatWon(item.buyMatchedPrice)}원</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={14} color={COLORS.textDim} />
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>매도가</Text>
            <Text style={styles.priceVal}>{formatWon(item.sellPrice)}원</Text>
          </View>
          <View style={styles.qtyWrap}>
            <Text style={styles.qty}>{item.sellQuantity}주</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>
            {BROKER_LABELS[item.brokerId] ?? item.brokerId}
          </Text>
          <Text style={[styles.rate, { color: isWin ? COLORS.buy : COLORS.sell }]}>
            {item.realizedPnLRate != null ? formatRate(item.realizedPnLRate) : ''}
          </Text>
          <Text style={styles.footerText}>{formatDate(item.sellExecutedAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>자동기록 전적</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>총 {trades.length}건</Text>
          <Text style={styles.summarySubLabel}>
            <Text style={{ color: COLORS.buy }}>{wins}승</Text>
            {' '}
            <Text style={{ color: COLORS.sell }}>{losses}패</Text>
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>실현 손익</Text>
          <Text style={[styles.summaryPnL, { color: totalPnL >= 0 ? COLORS.buy : COLORS.sell }]}>
            {formatProfit(totalPnL)}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : trades.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="chart-timeline-variant" size={48} color={COLORS.border} />
          <Text style={styles.emptyText}>자동기록된 전적이 없습니다.</Text>
          <Text style={styles.emptySubText}>매도 체결 알림이 수신되면 전적이 자동으로 생성됩니다.</Text>
        </View>
      ) : (
        <FlatList
          data={trades}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 17, fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 3 },
  summaryDivider: { width: 1, height: 32, backgroundColor: COLORS.border },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  summarySubLabel: { fontSize: 13, fontWeight: '700' },
  summaryPnL: { fontSize: 14, fontWeight: '800' },
  list: { paddingVertical: 8, paddingHorizontal: 12, gap: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 10,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 3,
  },
  cardWin: { borderLeftColor: COLORS.buy },
  cardLose: { borderLeftColor: COLORS.sell },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  symbol: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  stockCode: { fontSize: 11, color: COLORS.primary },
  partialBadge: {
    backgroundColor: `${COLORS.amber}20`,
    borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  partialBadgeText: { fontSize: 10, color: COLORS.amber, fontWeight: '700' },
  pnl: { fontSize: 15, fontWeight: '800' },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  priceRow: { flex: 1, alignItems: 'center', gap: 2 },
  priceLabel: { fontSize: 10, color: COLORS.textDim },
  priceVal: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  qtyWrap: {
    backgroundColor: `${COLORS.primary}12`,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  qty: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { fontSize: 11, color: COLORS.textDim },
  rate: { fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  emptySubText: { fontSize: 13, color: COLORS.textDim, textAlign: 'center', paddingHorizontal: 32 },
});
