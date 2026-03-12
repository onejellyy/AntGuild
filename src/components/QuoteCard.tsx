/**
 * 오늘의 명언 카드 컴포넌트
 *
 * 상태:
 * - 기본: "광고 보고 오늘의 명언 받아보기" 버튼
 * - 로딩: 광고 시청 중 스피너
 * - 공개: 명언 텍스트 + 저자 표시
 *
 * 프리미엄 구독자는 광고 없이 바로 명언 표시
 *
 * 확장 가능 영역 (향후 구현):
 * - 명언 공유 (onShare prop)
 * - 명언 저장 (onSave prop)
 * - 명언 좋아요 (onLike prop)
 * - 카테고리 필터
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { watchRewardedAd } from '../services/ads';
import { getDailyQuote } from '../services/quotes';
import { checkSubscription } from '../services/iap';
import { Quote } from '../utils/quotesLoader';

type CardState = 'locked' | 'loading' | 'revealed';

export default function QuoteCard() {
  const [state, setState] = useState<CardState>('locked');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    checkSubscription().then(setIsPremium).catch(() => {});
  }, []);

  const handleReveal = useCallback(async () => {
    setState('loading');
    try {
      const success = await watchRewardedAd();
      if (!success) {
        setState('locked');
        Alert.alert('알림', '광고 시청을 완료해야 명언을 확인할 수 있습니다.');
        return;
      }
      const daily = await getDailyQuote();
      setQuote(daily);
      setState('revealed');
    } catch {
      setState('locked');
      Alert.alert('오류', '명언을 불러오는 데 실패했습니다.');
    }
  }, []);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="format-quote-open" size={18} color={COLORS.primary} />
        <Text style={styles.title}>오늘의 명언</Text>
        {isPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>PRO</Text>
          </View>
        )}
      </View>

      {state === 'locked' && (
        <TouchableOpacity style={styles.revealBtn} onPress={handleReveal} activeOpacity={0.85}>
          <MaterialCommunityIcons name="play-circle-outline" size={18} color="#ffffff" />
          <Text style={styles.revealBtnText}>
            {isPremium ? '오늘의 명언 보기' : '광고 보고 오늘의 명언 받아보기'}
          </Text>
        </TouchableOpacity>
      )}

      {state === 'loading' && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>광고 시청 중...</Text>
        </View>
      )}

      {state === 'revealed' && quote && (
        <View style={styles.quoteWrap}>
          <Text style={styles.quoteText}>"{quote.text}"</Text>
          <Text style={styles.quoteAuthor}>— {quote.author}</Text>

          {/* 향후 확장: 공유 / 저장 버튼 영역 */}
          {/* <View style={styles.actions}>
            <TouchableOpacity onPress={() => onShare?.(quote)}>
              <MaterialCommunityIcons name="share-variant" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSave?.(quote)}>
              <MaterialCommunityIcons name="bookmark-outline" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View> */}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
    flex: 1,
  },
  premiumBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  revealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  revealBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  quoteWrap: {
    gap: 8,
  },
  quoteText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  quoteAuthor: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'right',
  },
});
