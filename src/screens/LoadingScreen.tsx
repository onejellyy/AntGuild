import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import { waitForAuthRestore } from '../services/auth';
import { USE_FIREBASE } from '../services/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Loading'>;

export default function LoadingScreen({ navigation }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1400,
      useNativeDriver: false,
    }).start();

    const init = async () => {
      if (USE_FIREBASE) {
        try {
          await waitForAuthRestore();
        } catch (e) {
          console.warn('Firebase auth error:', e);
        }
      }
      setTimeout(() => navigation.replace('Start'), 1400);
    };
    init();
  }, [navigation]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* 배경 블롭 */}
      <View style={styles.blobTopLeft} />
      <View style={styles.blobBottomRight} />

      {/* 로고 */}
      <View style={styles.logoOuter}>
        <View style={styles.logoInner}>
          <MaterialCommunityIcons name="trending-up" size={48} color="#fff" />
        </View>
      </View>

      {/* 타이틀 */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>개미단</Text>
        <Text style={styles.subtitle}>투자 기록 & 커뮤니티</Text>
      </View>

      {/* 프로그레스 */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>자산 로딩 중...</Text>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.copyright}>
          © 2024 Premium Asset Management. All rights reserved.
        </Text>
      </View>

      {/* 하단 보안 텍스트 */}
      <View style={styles.secureRow}>
        <MaterialCommunityIcons name="shield-check" size={14} color={COLORS.textDim} />
        <Text style={styles.secureText}>SECURE & PRIVATE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  blobTopLeft: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(25,127,230,0.10)',
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: '-10%',
    right: '-10%',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(25,127,230,0.15)',
  },
  logoOuter: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  logoInner: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(25,127,230,0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 48,
    gap: 6,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 40,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 15,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  progressSection: {
    width: '100%',
    maxWidth: 280,
    gap: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: FONTS.displayBold,
  },
  progressPct: {
    fontSize: 13,
    color: COLORS.primary,
    fontFamily: FONTS.display,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  copyright: {
    fontSize: 10,
    color: COLORS.textDim,
    textAlign: 'center',
    marginTop: 4,
  },
  secureRow: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    opacity: 0.5,
  },
  secureText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontFamily: FONTS.displayBold,
    letterSpacing: 1,
  },
});
