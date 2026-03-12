import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { watchRewardedAd } from '../services/ads';
import { checkSubscription } from '../services/iap';

type ViewerState = 'checking' | 'locked' | 'loading' | 'revealed';

interface DailyContentViewerProps<T> {
  contentType: string;                           // unlock 캐시 키, e.g. 'quote'
  adPlacement: 'quote' | 'investmentTip';        // 광고 단위 구분
  adButtonLabel: string;
  freeButtonLabel: string;
  fetchContent: () => Promise<T>;
  renderContent: (content: T) => React.ReactNode;
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyContentViewer<T>({
  contentType,
  adPlacement,
  adButtonLabel,
  freeButtonLabel,
  fetchContent,
  renderContent,
}: DailyContentViewerProps<T>): React.ReactElement {
  const [viewerState, setViewerState] = useState<ViewerState>('checking');
  const [content, setContent] = useState<T | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  const unlockKey = `@begmanki_unlocked_${contentType}_${getTodayString()}`;

  useEffect(() => {
    (async () => {
      const [premium, unlocked] = await Promise.all([
        checkSubscription().catch(() => false),
        AsyncStorage.getItem(unlockKey).then(v => v === 'true').catch(() => false),
      ]);
      setIsPremium(premium);
      if (premium || unlocked) {
        try {
          const data = await fetchContent();
          setContent(data);
          setViewerState('revealed');
        } catch {
          setViewerState('locked');
        }
      } else {
        setViewerState('locked');
      }
    })();
  }, []);

  const handleReveal = useCallback(async () => {
    setViewerState('loading');
    try {
      const success = await watchRewardedAd(adPlacement);
      if (!success) {
        setViewerState('locked');
        Alert.alert('알림', '광고 시청을 완료해야 내용을 확인할 수 있습니다.');
        return;
      }
      const data = await fetchContent();
      await AsyncStorage.setItem(unlockKey, 'true').catch(() => {});
      setContent(data);
      setViewerState('revealed');
    } catch {
      setViewerState('locked');
      Alert.alert('오류', '내용을 불러오는 데 실패했습니다.');
    }
  }, [fetchContent, unlockKey]);

  if (viewerState === 'checking') {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (viewerState === 'locked') {
    return (
      <View style={styles.lockedBox}>
        <MaterialCommunityIcons name="lock-outline" size={40} color={COLORS.textDim} style={{ marginBottom: 16 }} />
        <TouchableOpacity style={styles.revealBtn} onPress={handleReveal} activeOpacity={0.85}>
          <MaterialCommunityIcons name="play-circle-outline" size={18} color="#ffffff" />
          <Text style={styles.revealBtnText}>
            {isPremium ? freeButtonLabel : adButtonLabel}
          </Text>
        </TouchableOpacity>
        {!isPremium && (
          <Text style={styles.hintText}>광고 제거 구독 시 광고 없이 바로 볼 수 있어요</Text>
        )}
      </View>
    );
  }

  if (viewerState === 'loading') {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>잠시만요...</Text>
      </View>
    );
  }

  // revealed
  return (
    <View style={styles.revealedBox}>
      {content !== null && renderContent(content)}
    </View>
  );
}

const styles = StyleSheet.create({
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 180,
  },
  lockedBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 180,
    paddingHorizontal: 24,
  },
  revealedBox: {
    flex: 1,
  },
  revealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 340,
  },
  revealBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textDim,
    textAlign: 'center',
    marginTop: 4,
  },
});
