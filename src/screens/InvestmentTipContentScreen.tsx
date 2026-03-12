import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import DailyContentViewer from '../components/DailyContentViewer';
import { getDailyTip } from '../services/investmentTips';
import { InvestmentTip } from '../data/investmentTips';

const CATEGORY_LABELS: Record<InvestmentTip['category'], string> = {
  valuation: '밸류에이션',
  profitability: '수익성',
  market: '시장',
  technical: '기술적분석',
  economics: '경제',
  trading: '트레이딩',
  product: '금융상품',
  risk: '리스크',
};

const CATEGORY_COLORS: Record<InvestmentTip['category'], string> = {
  valuation: '#197fe6',
  profitability: '#22c55e',
  market: '#8b5cf6',
  technical: '#f59e0b',
  economics: '#ef4444',
  trading: '#06b6d4',
  product: '#ec4899',
  risk: '#64748b',
};

export default function InvestmentTipContentScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>오늘의 투자상식</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.subtitleRow}>
        <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#f59e0b" />
        <Text style={styles.subtitle}>투자 초보도 쉽게 이해하는 핵심 개념</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <DailyContentViewer<InvestmentTip>
          contentType="investment-tip"
          adPlacement="investmentTip"
          adButtonLabel="광고 보고 오늘의 투자상식 보기"
          freeButtonLabel="오늘의 투자상식 보기"
          fetchContent={getDailyTip}
          renderContent={(tip) => (
            <View>
              <View style={styles.tipCard}>
                {/* Category Badge */}
                <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[tip.category] + '18' }]}>
                  <Text style={[styles.categoryText, { color: CATEGORY_COLORS[tip.category] }]}>
                    {CATEGORY_LABELS[tip.category]}
                  </Text>
                </View>

                {/* Title */}
                <Text style={styles.tipTitle}>{tip.title}</Text>

                {/* Summary */}
                <Text style={styles.tipSummary}>{tip.summary}</Text>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Content */}
                <Text style={styles.tipContent}>{tip.content}</Text>
              </View>
            </View>
          )}
        />
      </ScrollView>
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
  body: {
    flexGrow: 1,
    padding: 20,
  },
  tipCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 4, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 4,
    gap: 12,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tipTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  tipSummary: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 4,
  },
  tipContent: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 26,
    fontWeight: '400',
  },
});
