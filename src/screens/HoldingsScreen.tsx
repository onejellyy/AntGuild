/**
 * HoldingsScreen - 보유 종목 화면
 */

import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ListRenderItemInfo,
  TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import uuid from 'react-native-uuid';
import { getPositions, getProfile, saveProfile, savePositions, addTrade, addTradeEntry, getTradeEntries, recalcAndSave, USE_FIREBASE } from '../services/storage';
import { Position, Profile, TradeEntry, Trade } from '../services/storage/types';
import { getCurrentUid } from '../services/auth';
import { updateRankingRecord, getTrades as getFirestoreTrades } from '../services/firestore';
import { formatWon, formatDate, formatProfit, formatRate } from '../utils/formatters';
import ProfileHeader from '../components/ProfileHeader';
import { COLORS, RADIUS } from '../constants/theme';

interface HoldingGroup {
  stock_name: string;
  stock_code: string;
  totalQty: number;
  avgPrice: number;
  positions: Position[];
}

function groupPositions(positions: Position[]): HoldingGroup[] {
  const map = new Map<string, HoldingGroup>();
  for (const pos of positions) {
    const key = pos.symbolName;
    if (!map.has(key)) {
      map.set(key, { stock_name: pos.symbolName, stock_code: '', totalQty: 0, avgPrice: 0, positions: [] });
    }
    const g = map.get(key)!;
    g.positions.push(pos);
  }

  const result: HoldingGroup[] = [];
  for (const g of map.values()) {
    const totalCost = g.positions.reduce((s, p) => s + p.buyPrice * p.qty, 0);
    const totalQty = g.positions.reduce((s, p) => s + p.qty, 0);
    result.push({ ...g, totalQty, avgPrice: totalQty > 0 ? totalCost / totalQty : 0 });
  }

  result.sort((a, b) => {
    const latestA = Math.max(...a.positions.map(p => new Date(p.boughtAt).getTime()));
    const latestB = Math.max(...b.positions.map(p => new Date(p.boughtAt).getTime()));
    return latestB - latestA;
  });

  return result;
}

export default function HoldingsScreen() {
  const [holdingGroups, setHoldingGroups] = useState<HoldingGroup[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<HoldingGroup | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [sellPriceStr, setSellPriceStr] = useState('');
  const [sellQtyStr, setSellQtyStr] = useState('');
  const [selling, setSelling] = useState(false);

  const loadData = useCallback(async () => {
    const [all, p] = await Promise.all([getPositions(), getProfile()]);
    const open = all.filter(p => p.status === 'OPEN' && p.qty > 0);
    setHoldingGroups(groupPositions(open));
    setProfile(p);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const openActionSheet = (group: HoldingGroup) => {
    setSelectedGroup(group);
    setActionSheetVisible(true);
  };

  const closeActionSheet = () => {
    setActionSheetVisible(false);
    setSelectedGroup(null);
  };

  const openSellModal = () => {
    setActionSheetVisible(false);
    setSellPriceStr('');
    setSellQtyStr('');
    setSellModalVisible(true);
  };

  const closeSellModal = () => {
    setSellModalVisible(false);
    setSellPriceStr('');
    setSellQtyStr('');
  };

  const handleSell = async () => {
    if (!selectedGroup || !profile) return;

    const sellPrice = parseFloat(sellPriceStr);
    if (isNaN(sellPrice) || sellPrice <= 0) {
      Alert.alert('오류', '단가는 0보다 큰 숫자여야 합니다.');
      return;
    }
    const sellQty = parseInt(sellQtyStr, 10);
    if (isNaN(sellQty) || sellQty <= 0 || !Number.isInteger(sellQty)) {
      Alert.alert('오류', '수량은 1 이상의 정수여야 합니다.');
      return;
    }
    if (sellQty > selectedGroup.totalQty) {
      Alert.alert('수량 초과', `보유 수량(${selectedGroup.totalQty}주)을 초과할 수 없습니다.`);
      return;
    }

    setSelling(true);
    try {
      const now = new Date().toISOString();

      const entry: TradeEntry = {
        id: uuid.v4() as string,
        type: 'SELL',
        stock_code: selectedGroup.stock_code,
        stock_name: selectedGroup.stock_name,
        price: sellPrice,
        qty: sellQty,
        datetime: now,
      };
      await addTradeEntry(entry);

      const allPositions = await getPositions();
      const openLots = allPositions
        .filter(p => p.symbolName === selectedGroup.stock_name && p.status === 'OPEN' && p.qty > 0)
        .sort((a, b) => new Date(a.boughtAt).getTime() - new Date(b.boughtAt).getTime());

      let remaining = sellQty;
      let totalProfit = 0;
      let totalBuyCost = 0;
      const updatedPositions = [...allPositions];

      for (const pos of openLots) {
        if (remaining <= 0) break;
        const idx = updatedPositions.findIndex(p => p.id === pos.id);
        const used = Math.min(remaining, pos.qty);
        totalProfit += (sellPrice - pos.buyPrice) * used;
        totalBuyCost += pos.buyPrice * used;
        remaining -= used;
        if (used >= pos.qty) {
          updatedPositions[idx] = { ...pos, status: 'CLOSED', qty: 0 };
        } else {
          updatedPositions[idx] = { ...pos, qty: pos.qty - used };
        }
      }

      await savePositions(updatedPositions);

      const avgBuyPrice = totalBuyCost / sellQty;
      const profitRate = ((sellPrice - avgBuyPrice) / avgBuyPrice) * 100;

      const trade: Trade = {
        id: uuid.v4() as string,
        symbolName: selectedGroup.stock_name,
        buyPrice: avgBuyPrice,
        sellPrice,
        qty: sellQty,
        profit: totalProfit,
        profitRate,
        result: totalProfit > 0 ? 'WIN' : 'LOSE',
        tradedAt: now,
      };
      await addTrade(trade);

      const updatedProfile: Profile = {
        ...profile,
        realizedPnl: profile.realizedPnl + totalProfit,
      };
      await saveProfile(updatedProfile);
      setProfile(updatedProfile);

      if (USE_FIREBASE) {
        const uid = getCurrentUid();
        if (uid) {
          const allTrades = await getFirestoreTrades(uid);
          const wins = allTrades.filter(t => t.result === 'WIN').length;
          const losses = allTrades.filter(t => t.result === 'LOSE').length;
          await updateRankingRecord(uid, wins, losses);
        }
      }

      closeSellModal();
      setSelectedGroup(null);
      await loadData();

      Alert.alert('매도 완료', `${selectedGroup.stock_name}\n${formatProfit(totalProfit)} (${formatRate(profitRate)})`);
    } catch (e) {
      Alert.alert('오류', '매도 처리 중 문제가 발생했습니다.');
    } finally {
      setSelling(false);
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<HoldingGroup>) => {
    const evalAmt = item.avgPrice * item.totalQty;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openActionSheet(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardIconWrap}>
          <MaterialCommunityIcons name="chart-areaspline" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.symbol}>{item.stock_name}</Text>
          {item.stock_code ? <Text style={styles.stockCode}>{item.stock_code}</Text> : null}
          <Text style={styles.detail}>
            {item.totalQty}주 · 평균 {formatWon(item.avgPrice)}원
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.evalAmt}>{formatWon(evalAmt)}원</Text>
          <Text style={styles.tapHint}>탭하여 매도</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const totalEval = holdingGroups.reduce((s, g) => s + g.avgPrice * g.totalQty, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {profile && (
        <ProfileHeader profile={profile} onProfileChange={setProfile} />
      )}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>보유 종목 {holdingGroups.length}개</Text>
        <Text style={styles.totalAmt}>평가 합계 {formatWon(totalEval)}원</Text>
      </View>

      {holdingGroups.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="wallet-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyText}>보유 중인 종목이 없습니다.</Text>
          <Text style={styles.emptySubText}>매수 탭에서 종목을 추가하세요.</Text>
        </View>
      ) : (
        <FlatList
          data={holdingGroups}
          keyExtractor={item => item.stock_name}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      {/* 하단 액션 시트 */}
      <Modal
        visible={actionSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={closeActionSheet}
      >
        <Pressable style={styles.backdrop} onPress={closeActionSheet} />
        <View style={styles.actionSheet}>
          {selectedGroup && (
            <>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{selectedGroup.stock_name}</Text>
              <Text style={styles.sheetSub}>
                보유 {selectedGroup.totalQty}주 | 평균 {formatWon(selectedGroup.avgPrice)}원
              </Text>
              <TouchableOpacity style={styles.sellActionBtn} onPress={openSellModal}>
                <Text style={styles.sellActionBtnText}>매도하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeActionSheet}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* 매도 입력 모달 */}
      <Modal
        visible={sellModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeSellModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeSellModal} />
        <View style={styles.modalSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.modalTitle}>
            {selectedGroup?.stock_name} 매도
          </Text>
          {selectedGroup && (
            <Text style={styles.modalSub}>
              보유 수량: {selectedGroup.totalQty}주
            </Text>
          )}

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>매도 단가 (원)</Text>
            <View style={styles.modalInputBox}>
              <TextInput
                style={styles.modalInput}
                value={sellPriceStr}
                onChangeText={setSellPriceStr}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.textDim}
                autoFocus
              />
            </View>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>수량 (주)</Text>
            <View style={styles.modalInputBox}>
              <TextInput
                style={styles.modalInput}
                value={sellQtyStr}
                onChangeText={setSellQtyStr}
                keyboardType="numeric"
                placeholder={`최대 ${selectedGroup?.totalQty ?? 0}주`}
                placeholderTextColor={COLORS.textDim}
              />
            </View>
          </View>

          {sellPriceStr && sellQtyStr ? (
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>예상 매도 금액</Text>
              <Text style={styles.previewAmt}>
                {formatWon((parseFloat(sellPriceStr) || 0) * (parseInt(sellQtyStr) || 0))}원
              </Text>
            </View>
          ) : null}

          <View style={styles.modalBtnRow}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={closeSellModal}
              disabled={selling}
            >
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmBtn, selling && { opacity: 0.6 }]}
              onPress={handleSell}
              disabled={selling}
            >
              {selling
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.modalConfirmText}>매도 확인</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  totalLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  totalAmt: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '700' },
  list: { paddingVertical: 8, paddingHorizontal: 12, gap: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
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
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 3 },
  symbol: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  stockCode: { fontSize: 11, color: COLORS.primary },
  detail: { fontSize: 13, color: COLORS.textSecondary },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  evalAmt: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  tapHint: { fontSize: 11, color: COLORS.amber, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  emptySubText: { fontSize: 13, color: COLORS.textDim },

  // 액션 시트
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)' },
  actionSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 8,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  sheetSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  sellActionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  sellActionBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  cancelBtn: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.lg,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },

  // 매도 모달
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 24,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  modalSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: -8 },
  modalSection: { gap: 8 },
  modalLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  modalInputBox: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  modalInput: { fontSize: 16, color: COLORS.textPrimary },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewLabel: { fontSize: 13, color: COLORS.textDim },
  previewAmt: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  modalBtnRow: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  modalConfirmBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalConfirmText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
