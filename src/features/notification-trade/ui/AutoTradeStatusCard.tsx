/**
 * 자동 투자기록 상태 카드
 * HoldingsScreen 또는 TradesScreen 상단에 삽입 가능
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, RADIUS } from '../../../constants/theme';
import { isNotificationAccessEnabled } from '../infrastructure/notificationListenerBridge';

export default function AutoTradeStatusCard() {
  const navigation = useNavigation<any>();
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    isNotificationAccessEnabled().then(setEnabled);
  }, []);

  if (enabled === null) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={COLORS.textDim} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, enabled ? styles.cardOn : styles.cardOff]}
      onPress={() => navigation.navigate('NotificationPermission')}
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons
        name={enabled ? 'bell-ring-outline' : 'bell-off-outline'}
        size={20}
        color={enabled ? COLORS.primary : COLORS.textDim}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, !enabled && styles.titleOff]}>
          {enabled ? '자동 투자기록 활성화됨' : '자동 투자기록 꺼짐'}
        </Text>
        <Text style={styles.sub}>
          {enabled
            ? '증권사 체결 알림을 자동으로 기록합니다'
            : '설정하면 체결 알림을 자동으로 기록합니다'}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={16}
        color={COLORS.textDim}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: 12, alignItems: 'center',
  },
  card: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12,
    marginHorizontal: 16, marginVertical: 8,
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  cardOn: {
    backgroundColor: `${COLORS.primary}08`,
    borderColor: `${COLORS.primary}30`,
  },
  cardOff: {
    backgroundColor: COLORS.bgInput,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 13, fontWeight: '700',
    color: COLORS.primary,
  },
  titleOff: { color: COLORS.textSecondary },
  sub: {
    fontSize: 12, color: COLORS.textDim, marginTop: 1,
  },
});
