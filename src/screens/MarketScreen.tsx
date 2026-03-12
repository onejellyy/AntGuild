import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getProfile } from '../services/storage';
import { Profile } from '../services/storage/types';
import ProfileHeader from '../components/ProfileHeader';
import { COLORS, FONTS } from '../constants/theme';

export default function MarketScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const p = await getProfile();
        setProfile(p);
      })();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {profile && (
        <ProfileHeader profile={profile} onProfileChange={setProfile} />
      )}
      <View style={styles.body}>
        <MaterialCommunityIcons name="chart-line" size={52} color={COLORS.border} />
        <Text style={styles.text}>업데이트 예정</Text>
        <Text style={styles.sub}>시장 분석 기능이 곧 추가됩니다.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  sub: {
    fontSize: 13,
    color: COLORS.textDim,
  },
});
