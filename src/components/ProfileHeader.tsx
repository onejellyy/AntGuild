import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calcLevel, calcAsset, nextLevelAsset } from '../utils/levelCalc';
import { Profile } from '../services/storage/types';
import SettingsModal from './SettingsModal';
import { COLORS, RADIUS } from '../constants/theme';

interface Props {
  profile: Profile;
  onProfileChange?: (updated: Profile) => void; // 하위 호환 유지 (각 화면에서 전달 중)
  showBell?: boolean;
}

export default function ProfileHeader({ profile, showBell = true }: Props) {
  const [settingsVisible, setSettingsVisible] = useState(false);

  const level     = calcLevel(profile.realizedPnl);
  const asset     = calcAsset(profile.realizedPnl);
  const nextAsset = nextLevelAsset(profile.realizedPnl);
  const prevAsset = 1_000_000 * Math.pow(1.03, level);
  const xpProgress = Math.max(0, Math.min(1, (asset - prevAsset) / (nextAsset - prevAsset)));

  return (
    <View style={styles.container}>
      {/* 아바타 (고정 아이콘) */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={26} color={COLORS.textDim} />
        </View>
        <View style={styles.lvBadge}>
          <Text style={styles.lvText}>LV.{level}</Text>
        </View>
      </View>

      {/* 닉네임 / 레벨 바 */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.nickname}>{profile.nickname}</Text>
          <Text style={styles.uid}>#0001</Text>
        </View>

        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${xpProgress * 100}%` as any, backgroundColor: COLORS.primary }]} />
        </View>
        <View style={styles.barLabelRow}>
          <Text style={[styles.barLabel, { color: COLORS.primary }]}>LV.{level}</Text>
          <Text style={styles.barLabel}>
            LV.{level + 1} 까지 {(nextAsset - asset).toLocaleString('ko-KR')}원
          </Text>
        </View>
      </View>

      {/* 설정 버튼 */}
      {showBell && (
        <TouchableOpacity
          style={styles.bell}
          activeOpacity={0.7}
          onPress={() => setSettingsVisible(true)}
        >
          <Ionicons name="settings-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.bgHeader,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lvBadge: {
    position: 'absolute',
    bottom: -7,
    left: '50%',
    transform: [{ translateX: -18 }],
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 36,
    alignItems: 'center',
  },
  lvText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  nickname: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  uid: {
    fontSize: 12,
    color: COLORS.textDim,
  },
  barBg: {
    height: 5,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barLabel: {
    fontSize: 10,
    color: COLORS.textDim,
  },
  bell: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
