import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calcLevel, calcAsset, nextLevelAsset } from '../utils/levelCalc';
import { getAvatar } from '../constants/avatars';
import { saveProfile } from '../services/storage';
import { Profile } from '../services/storage/types';
import { updateUserAvatar } from '../services/firestore';
import { getCurrentUid } from '../services/auth';
import { USE_FIREBASE } from '../services/storage';
import AvatarPickerModal from './AvatarPickerModal';
import SettingsModal from './SettingsModal';
import { COLORS, RADIUS } from '../constants/theme';

interface Props {
  profile: Profile;
  onProfileChange?: (updated: Profile) => void;
  showBell?: boolean;
}

export default function ProfileHeader({ profile, onProfileChange, showBell = true }: Props) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const level     = calcLevel(profile.realizedPnl);
  const asset     = calcAsset(profile.realizedPnl);
  const nextAsset = nextLevelAsset(profile.realizedPnl);
  const prevAsset = 1_000_000 * Math.pow(1.03, level);
  const xpProgress = Math.max(0, Math.min(1, (asset - prevAsset) / (nextAsset - prevAsset)));

  const isHttpAvatar = profile.avatarUri?.startsWith('http') ?? false;
  const avatar       = isHttpAvatar ? null : getAvatar(profile.avatarUri);

  const handleSelectAvatar = async (uriOrId: string) => {
    const updated: Profile = { ...profile, avatarUri: uriOrId };
    await saveProfile(updated);
    if (USE_FIREBASE) {
      const uid = getCurrentUid();
      if (uid) await updateUserAvatar(uid, uriOrId);
    }
    onProfileChange?.(updated);
  };

  return (
    <View style={styles.container}>
      {/* 아바타 */}
      <TouchableOpacity
        style={styles.avatarWrap}
        activeOpacity={0.75}
        onPress={() => setPickerVisible(true)}
      >
        <View style={styles.avatar}>
          {isHttpAvatar ? (
            <Image source={{ uri: profile.avatarUri! }} style={styles.avatarImg} resizeMode="cover" />
          ) : avatar ? (
            <Image source={avatar.source} style={styles.avatarImg} resizeMode="cover" />
          ) : (
            <Ionicons name="person" size={26} color={COLORS.textDim} />
          )}
        </View>
        <View style={styles.editBadge}>
          <Ionicons name="pencil" size={9} color="#fff" />
        </View>
        <View style={styles.lvBadge}>
          <Text style={styles.lvText}>LV.{level}</Text>
        </View>
      </TouchableOpacity>

      {/* 닉네임 / 랭크 / 바 */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.nickname}>{profile.nickname}</Text>
          <Text style={styles.uid}>#0001</Text>
        </View>

        {/* 레벨 XP 바 */}
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

      <AvatarPickerModal
        visible={pickerVisible}
        currentId={profile.avatarUri}
        onSelect={handleSelectAvatar}
        onClose={() => setPickerVisible(false)}
      />
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
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  editBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
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
