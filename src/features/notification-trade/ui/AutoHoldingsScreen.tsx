/**
 * 자동 투자기록 — 보유 종목 화면
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ListRenderItemInfo,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../App';
import { COLORS, RADIUS } from '../../../constants/theme';
import { formatWon } from '../../../utils/formatters';
import { subscribeAutoHoldings } from '../infrastructure/autoTradeRepository';
import { PortfolioHolding } from '../domain/types';
import { getCurrentUid } from '../../../services/auth';

const BROKER_LABELS: Record<string, string> = {
  'toss-securities': '토스증권',
  'kakaopay-securities': '카카오페이증권',
};

type Props = NativeStackScreenProps<RootStackParamList, 'AutoHoldings'>;

export default function AutoHoldingsScreen({ navigation }: Props) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = getCurrentUid();
    if (!uid) { setLoading(false); return; }

    const unsub = subscribeAutoHoldings(uid, (data) => {
      const sorted = [...data].sort(
        (a, b) => new Date(b.lastBuyAt).getTime() - new Date(a.lastBuyAt).getTime(),
      );
      setHoldings(sorted);
      setLoading(false);
    });
    return unsub;
  }, []);

  const totalBuy = holdings.reduce((s, h) => s + h.totalBuyAmount, 0);

  const renderItem = ({ item }: ListRenderItemInfo<PortfolioHolding>) => (
    <View style={styles.card}>
      <View style={styles.cardIconWrap}>
        <MaterialCommunityIcons name="chart-areaspline" size={22} color={COLORS.primary} />
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.symbol}>{item.symbol}</Text>
          {item.symbolCode ? (
            <Text style={styles.stockCode}>{item.symbolCode}</Text>
          ) : null}
        </View>
        <Text style={styles.detail}>
          {item.quantity}주 · 평균 {formatWon(item.averageBuyPrice)}원
        </Text>
        <Text style={styles.brokerBadge}>
          {BROKER_LABELS[item.brokerId] ?? item.brokerId}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.totalAmt}>{formatWon(item.totalBuyAmount)}원</Text>
        <Text style={styles.totalAmtLabel}>총 매수금액</Text>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>자동기록 보유종목</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>보유 종목 {holdings.length}개</Text>
        <Text style={styles.summaryAmt}>총 매수 {formatWon(totalBuy)}원</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : holdings.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="wallet-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyText}>자동기록된 보유 종목이 없습니다.</Text>
          <Text style={styles.emptySubText}>증권사 체결 알림을 받으면 자동으로 기록됩니다.</Text>
        </View>
      ) : (
        <FlatList
          data={holdings}
          keyExtractor={item => item.symbol}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  summaryAmt: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '700' },
  list: { paddingVertical: 8, paddingHorizontal: 12, gap: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 2,
  },
  cardIconWrap: {
    width: 44, height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 3 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  symbol: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  stockCode: { fontSize: 11, color: COLORS.primary },
  detail: { fontSize: 13, color: COLORS.textSecondary },
  brokerBadge: { fontSize: 11, color: COLORS.textDim, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 3 },
  totalAmt: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  totalAmtLabel: { fontSize: 11, color: COLORS.textDim },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  emptySubText: { fontSize: 13, color: COLORS.textDim, textAlign: 'center', paddingHorizontal: 32 },
});
