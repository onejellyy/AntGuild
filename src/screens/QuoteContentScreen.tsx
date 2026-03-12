import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import DailyContentViewer from '../components/DailyContentViewer';
import { getDailyQuote } from '../services/quotes';
import { Quote } from '../utils/quotesLoader';

export default function QuoteContentScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>오늘의 명언</Text>
        <View style={styles.backBtn} /> {/* spacer */}
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleRow}>
        <MaterialCommunityIcons name="format-quote-open" size={16} color={COLORS.primary} />
        <Text style={styles.subtitle}>투자 고수들의 한마디로 오늘 하루를 시작해보세요</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <DailyContentViewer<Quote>
          contentType="quote"
          adPlacement="quote"
          adButtonLabel="광고 보고 오늘의 명언 받아보기"
          freeButtonLabel="오늘의 명언 보기"
          fetchContent={getDailyQuote}
          renderContent={(quote) => (
            <View style={styles.quoteCard}>
              <MaterialCommunityIcons name="format-quote-open" size={32} color={COLORS.primary} style={{ marginBottom: 8 }} />
              <Text style={styles.quoteText}>{quote.text}</Text>
              <View style={styles.authorRow}>
                <View style={styles.authorDivider} />
                <Text style={styles.authorText}>{quote.author}</Text>
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
  quoteCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 4, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 4,
    minHeight: 180,
    justifyContent: 'center',
  },
  quoteText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 30,
    marginBottom: 20,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'flex-end',
  },
  authorDivider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
  },
  authorText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
