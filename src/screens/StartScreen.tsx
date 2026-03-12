import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { getProfile, USE_FIREBASE } from '../services/storage';
import { getCurrentUid } from '../services/auth';
import { getUser } from '../services/firestore';
import { COLORS, FONTS, RADIUS } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Start'>;

export default function StartScreen({ navigation }: Props) {
  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.2, duration: 900, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [blink]);

  const handleTap = async () => {
    if (USE_FIREBASE) {
      const uid = getCurrentUid();
      if (uid) {
        const user = await getUser(uid);
        if (user?.nickname) {
          navigation.replace('MainTabs');
          return;
        }
      }
      navigation.replace('Login');
    } else {
      const profile = await getProfile();
      if (profile?.nickname) {
        navigation.replace('MainTabs');
      } else {
        navigation.replace('Login');
      }
    }
  };

  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={handleTap}>
      {/* 배경 블롭 */}
      <View style={styles.blobTopLeft} />
      <View style={styles.blobBottomRight} />

      {/* 로고 */}
      <View style={styles.logoOuter}>
        <View style={styles.logoInner}>
          <MaterialCommunityIcons name="trending-up" size={52} color="#fff" />
        </View>
      </View>

      {/* 타이틀 */}
      <Text style={styles.title}>개미단</Text>
      <Text style={styles.subtitle}>투자 기록 & 커뮤니티</Text>

      {/* 탭 힌트 */}
      <Animated.View style={[styles.tapContainer, { opacity: blink }]}>
        <MaterialCommunityIcons name="gesture-tap" size={18} color={COLORS.primary} />
        <Text style={styles.tap}>TAP TO START</Text>
      </Animated.View>
    </TouchableOpacity>
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
    top: '-8%',
    left: '-8%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(25,127,230,0.10)',
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: '-8%',
    right: '-8%',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(25,127,230,0.15)',
  },
  logoOuter: {
    width: 130,
    height: 130,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  logoInner: {
    width: 86,
    height: 86,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 44,
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 15,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
    marginBottom: 64,
  },
  tapContainer: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tap: {
    fontFamily: FONTS.displayBold,
    fontSize: 14,
    color: COLORS.primary,
    letterSpacing: 2,
  },
});
