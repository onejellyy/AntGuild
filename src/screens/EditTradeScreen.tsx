/**
 * EditTradeScreen - 거래 기록 수정 화면
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getTradeEntries, recalcAndSave, updateTradeEntry,
  getProfile, saveProfile,
} from '../services/storage';
import { TradeEntry } from '../services/storage/types';
import { validateEntries } from '../utils/tradeCalc';
import StockAutocomplete from '../components/StockAutocomplete';
import { COLORS, RADIUS, FONTS } from '../constants/theme';
import { RootStackParamList } from '../../App';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'EditTrade'>;
type RoutePropType = RouteProp<RootStackParamList, 'EditTrade'>;

export default function EditTradeScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { entry: originalEntry } = route.params;

  const [type, setType] = useState<'BUY' | 'SELL'>(originalEntry.type);
  const [stockCode, setStockCode] = useState(originalEntry.stock_code);
  const [stockName, setStockName] = useState(originalEntry.stock_name);
  const [priceStr, setPriceStr] = useState(String(originalEntry.price));
  const [qtyStr, setQtyStr] = useState(String(originalEntry.qty));
  const [note, setNote] = useState(originalEntry.note ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!stockName.trim()) {
      Alert.alert('오류', '종목명을 입력하세요.');
      return;
    }
    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
      Alert.alert('오류', '단가는 0보다 큰 숫자여야 합니다.');
      return;
    }
    const qty = parseInt(qtyStr, 10);
    if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      Alert.alert('오류', '수량은 1 이상의 정수여야 합니다.');
      return;
    }

    const updatedEntry: TradeEntry = {
      ...originalEntry,
      type,
      stock_code: stockCode,
      stock_name: stockName.trim(),
      price,
      qty,
      note: note.trim() || undefined,
    };

    const allEntries = await getTradeEntries();
    const withUpdated = allEntries.map(e => e.id === updatedEntry.id ? updatedEntry : e);
    const validationError = validateEntries(withUpdated);
    if (validationError) {
      Alert.alert('수량 오류', validationError);
      return;
    }

    setSaving(true);
    try {
      const newRealizedPnl = await recalcAndSave(updatedEntry);
      const profile = await getProfile();
      if (profile) {
        await saveProfile({ ...profile, realizedPnl: newRealizedPnl });
      }

      Alert.alert('저장 완료', '거래 기록이 수정되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('오류', '저장 중 문제가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }, [type, stockCode, stockName, priceStr, qtyStr, note, originalEntry, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.primary} />
          <Text style={styles.backText}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>거래 기록 수정</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* 종목명 */}
      <View style={styles.stockSection}>
        <Text style={styles.label}>종목명</Text>
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
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

          {/* 유형 선택 */}
          <View style={styles.section}>
            <Text style={styles.label}>유형</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'BUY' && styles.typeBuyActive]}
                onPress={() => setType('BUY')}
              >
                <Text style={[styles.typeBtnText, type === 'BUY' && styles.typeActiveText]}>
                  매수 (BUY)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'SELL' && styles.typeSellActive]}
                onPress={() => setType('SELL')}
              >
                <Text style={[styles.typeBtnText, type === 'SELL' && styles.typeActiveText]}>
                  매도 (SELL)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 단가 */}
          <View style={styles.section}>
            <Text style={styles.label}>단가 (원)</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={priceStr}
                onChangeText={setPriceStr}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textDim}
                placeholder="0"
              />
            </View>
          </View>

          {/* 수량 */}
          <View style={styles.section}>
            <Text style={styles.label}>수량 (주)</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={qtyStr}
                onChangeText={setQtyStr}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textDim}
                placeholder="0"
              />
            </View>
          </View>

          {/* 메모 */}
          <View style={styles.section}>
            <Text style={styles.label}>메모 (선택)</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={note}
                onChangeText={setNote}
                placeholderTextColor={COLORS.textDim}
                placeholder="메모를 입력하세요"
                multiline
              />
            </View>
          </View>

          {/* 안내 */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.primary} />
            <Text style={styles.infoText}>
              수정 후 전체 거래 기록이 FIFO 방식으로 재계산됩니다.
              보유 포지션과 실현 손익이 업데이트됩니다.
            </Text>
          </View>

          {/* 저장 버튼 */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>저장하기</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  stockSection: {
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 999,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 70,
  },
  backText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  body: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  section: { gap: 8 },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  typeBuyActive: {
    backgroundColor: `${COLORS.green}18`,
    borderColor: COLORS.green,
  },
  typeSellActive: {
    backgroundColor: `${COLORS.red}18`,
    borderColor: COLORS.red,
  },
  typeBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textDim },
  typeActiveText: { color: COLORS.textPrimary },
  inputBox: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: `${COLORS.primary}08`,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: 'rgba(25,127,230,0.4)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
