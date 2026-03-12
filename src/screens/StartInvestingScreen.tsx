import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export default function StartInvestingScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>투자 시작하기</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.subtitleRow}>
        <MaterialCommunityIcons name="bank-outline" size={16} color="#8b5cf6" />
        <Text style={styles.subtitle}>아직 증권 계좌가 없는 예비 개미를 위한 쉽고 빠른 계좌 개설하기</Text>
      </View>

      {/* TODO: 증권사 계좌 개설 안내 콘텐츠 구현 */}
      <View style={styles.placeholder}>
        <MaterialCommunityIcons name="bank-outline" size={48} color={COLORS.textDim} />
        <Text style={styles.placeholderText}>준비 중입니다</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  placeholderText: {
    fontSize: 15,
    color: COLORS.textDim,
    fontWeight: '600',
  },
});
