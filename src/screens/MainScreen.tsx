import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import uuid from 'react-native-uuid';
import {
  getProfile, saveProfile, addPosition,
  getPositions, savePositions, addTrade,
  addTradeEntry,
  USE_FIREBASE,
} from '../services/storage';
import { Profile, Position, Trade, TradeEntry } from '../services/storage/types';
import { calcAsset, calcLevel } from '../utils/levelCalc';
import { getCurrentUid } from '../services/auth';
import { updateRankingRecord, getTrades as getFirestoreTrades } from '../services/firestore';
import { formatWon, formatProfit, formatRate } from '../utils/formatters';
import ProfileHeader from '../components/ProfileHeader';
import StockAutocomplete from '../components/StockAutocomplete';
import { COLORS, RADIUS } from '../constants/theme';

type Mode = 'BUY' | 'SELL';

export default function MainScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mode, setMode] = useState<Mode>('BUY');

  const [stockCode, setStockCode] = useState('');
  const [stockName, setStockName] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [qtyStr, setQtyStr] = useState('');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const p = await getProfile();
        setProfile(p);
      })();
    }, [])
  );

  const resetInputs = () => {
    setStockCode('');
    setStockName('');
    setPriceStr('');
    setQtyStr('');
  };

  const estimatedAmount =
    (parseFloat(priceStr) || 0) * (parseFloat(qtyStr) || 0);

  const handleBuy = async () => {
    const price = parseFloat(priceStr);
    const qty = parseInt(qtyStr, 10);
    if (!stockName.trim()) { Alert.alert('오류', '종목명을 입력하세요.'); return; }
    if (isNaN(price) || price <= 0) { Alert.alert('오류', '올바른 단가를 입력하세요.'); return; }
    if (isNaN(qty) || qty <= 0) { Alert.alert('오류', '수량은 1 이상의 정수를 입력하세요.'); return; }

    const now = new Date().toISOString();
    try {
      const entry: TradeEntry = {
        id: uuid.v4() as string,
        type: 'BUY',
        stock_code: stockCode,
        stock_name: stockName.trim(),
        price,
        qty,
        datetime: now,
      };
      await addTradeEntry(entry);

      const pos: Position = {
        id: uuid.v4() as string,
        symbolName: stockName.trim(),
        buyPrice: price,
        qty,
        boughtAt: now,
        status: 'OPEN',
      };
      await addPosition(pos);

      Alert.alert('매수 완료', `${pos.symbolName} ${qty}주 @ ${formatWon(price)}원`);
      resetInputs();
    } catch (e: any) {
      Alert.alert('매수 실패', e?.message ?? '오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleSell = async () => {
    const sellPrice = parseFloat(priceStr);
    const sellQty = parseInt(qtyStr, 10);
    if (!stockName.trim()) { Alert.alert('오류', '종목명을 입력하세요.'); return; }
    if (isNaN(sellPrice) || sellPrice <= 0) { Alert.alert('오류', '올바른 매도 단가를 입력하세요.'); return; }
    if (isNaN(sellQty) || sellQty <= 0) { Alert.alert('오류', '수량은 1 이상의 정수를 입력하세요.'); return; }

    const positions = await getPositions();
    const open = positions
      .filter(p => p.symbolName === stockName.trim() && p.status === 'OPEN' && p.qty > 0)
      .sort((a, b) => new Date(a.boughtAt).getTime() - new Date(b.boughtAt).getTime());

    const totalOpenQty = open.reduce((s, p) => s + p.qty, 0);
    if (totalOpenQty < sellQty) {
      Alert.alert('오류', `보유 수량 부족 (보유: ${totalOpenQty}주, 요청: ${sellQty}주)`);
      return;
    }

    const now = new Date().toISOString();
    const entry: TradeEntry = {
      id: uuid.v4() as string,
      type: 'SELL',
      stock_code: stockCode,
      stock_name: stockName.trim(),
      price: sellPrice,
      qty: sellQty,
      datetime: now,
    };
    await addTradeEntry(entry);

    let remaining = sellQty;
    let totalProfit = 0;
    let totalBuyCost = 0;
    const updatedPositions = [...positions];

    for (const pos of open) {
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
      symbolName: stockName.trim(),
      buyPrice: avgBuyPrice,
      sellPrice,
      qty: sellQty,
      profit: totalProfit,
      profitRate,
      result: totalProfit > 0 ? 'WIN' : 'LOSE',
      tradedAt: now,
    };
    await addTrade(trade);

    if (profile) {
      const updated: Profile = {
        ...profile,
        realizedPnl: profile.realizedPnl + totalProfit,
      };
      await saveProfile(updated);
      setProfile(updated);

      if (USE_FIREBASE) {
        const uid = getCurrentUid();
        if (uid) {
          const allTrades = await getFirestoreTrades(uid);
          const wins = allTrades.filter(t => t.result === 'WIN').length;
          const losses = allTrades.filter(t => t.result === 'LOSE').length;
          await updateRankingRecord(uid, wins, losses);
        }
      }
    }

    Alert.alert('매도 완료', `${stockName.trim()}\n${formatProfit(totalProfit)} (${formatRate(profitRate)})`);
    resetInputs();
  };

  if (!profile) return null;

  const isBuy = mode === 'BUY';
  const asset = calcAsset(profile.realizedPnl);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 배경 블롭 */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      <ProfileHeader profile={profile} onProfileChange={setProfile} />

      {/* 종목명 */}
      <View style={styles.stockSection}>
        <Text style={styles.fieldLabel}>종목명</Text>
        <StockAutocomplete
          value={stockName}
          onSelect={(code, name) => {
            setStockCode(code);
            setStockName(name);
          }}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {/* 단가 / 수량 */}
          <View style={styles.twoCol}>
            <View style={styles.colWrap}>
              <Text style={styles.fieldLabel}>단가</Text>
              <View style={styles.numCard}>
                <MaterialCommunityIcons name="currency-usd" size={18} color={COLORS.primary} />
                <TextInput
                  style={styles.numInput}
                  value={priceStr}
                  onChangeText={setPriceStr}
                  placeholder="0"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.colWrap}>
              <Text style={styles.fieldLabel}>수량</Text>
              <View style={styles.numCard}>
                <MaterialCommunityIcons name="layers-outline" size={18} color={COLORS.primary} />
                <TextInput
                  style={styles.numInput}
                  value={qtyStr}
                  onChangeText={setQtyStr}
                  placeholder="0"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* 매수/매도 버튼 */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.mainBtn,
              isBuy ? styles.buyBtn : styles.sellBtn,
              pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
            ]}
            onPress={isBuy ? handleBuy : handleSell}
          >
            <Text style={styles.mainBtnText}>
              {isBuy ? '( BUY )' : '( SELL )'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.toggleBtn, pressed && { opacity: 0.8 }]}
            onPress={() => setMode(isBuy ? 'SELL' : 'BUY')}
          >
            <MaterialCommunityIcons name="swap-vertical" size={24} color={COLORS.textSecondary} />
            <Text style={styles.toggleLabel}>{isBuy ? '매도' : '매수'}</Text>
          </Pressable>
        </View>

        {/* 요약 카드 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>예상 결제 금액</Text>
            <View style={styles.summaryAmtRow}>
              <Text style={styles.summaryUnit}>₩</Text>
              <Text style={styles.summaryAmt}>
                {estimatedAmount > 0 ? estimatedAmount.toLocaleString('ko-KR') : '0'}
              </Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>가용 자산</Text>
            <Text style={styles.summaryAsset}>₩ {asset.toLocaleString('ko-KR')}</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  flex: { flex: 1 },
  blobTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(25,127,230,0.08)',
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: 80,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(25,127,230,0.06)',
  },
  stockSection: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    zIndex: 999,
    elevation: 10,
  },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  body: {
    padding: 20,
    gap: 20,
    paddingBottom: 12,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  colWrap: {
    flex: 1,
    gap: 8,
  },
  numCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  numInput: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },

  // 버튼
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  mainBtn: {
    flex: 1,
    height: 68,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtn: {
    backgroundColor: '#ef4444',
    shadowColor: 'rgba(239,68,68,0.4)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  sellBtn: {
    backgroundColor: COLORS.primary,
    shadowColor: 'rgba(25,127,230,0.4)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  mainBtnText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 3,
  },
  toggleBtn: {
    width: 68,
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
    paddingVertical: 8,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  toggleLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },

  // 요약 카드
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 24,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryCol: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textDim,
    fontWeight: '600',
  },
  summaryAmtRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  summaryUnit: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  summaryAmt: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.divider,
    marginHorizontal: 16,
  },
  summaryAsset: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
