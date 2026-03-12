import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS } from '../constants/theme';
import { getCurrentUid } from '../services/auth';
import { deleteCurrentUser, signOutUser } from '../services/auth';
import { deleteUserFirestoreData } from '../services/firestore';
import { clearAll, getProfile, updateUserPrivacy } from '../services/storage';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface SettingRow {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

export default function SettingsModal({ visible, onClose }: Props) {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [showTrades, setShowTrades] = useState(true);
  const [showHoldings, setShowHoldings] = useState(true);

  useEffect(() => {
    if (!visible) return;
    getProfile().then(p => {
      if (!p) return;
      setShowTrades(p.showTrades !== false);
      setShowHoldings(p.showHoldings !== false);
    });
  }, [visible]);

  const handlePrivacyToggle = async (field: 'showTrades' | 'showHoldings', value: boolean) => {
    const uid = getCurrentUid();
    if (!uid) return;
    const nextTrades = field === 'showTrades' ? value : showTrades;
    const nextHoldings = field === 'showHoldings' ? value : showHoldings;
    if (field === 'showTrades') setShowTrades(value);
    else setShowHoldings(value);
    try {
      await updateUserPrivacy(uid, nextTrades, nextHoldings);
    } catch {
      // 실패 시 롤백
      if (field === 'showTrades') setShowTrades(!value);
      else setShowHoldings(!value);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 삭제',
      '계정을 삭제하면 모든 거래 기록, 랭킹, 프로필이 영구적으로 삭제됩니다.\n\n정말 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    const uid = getCurrentUid();
    if (!uid) {
      Alert.alert('오류', '로그인 정보를 찾을 수 없습니다.');
      return;
    }

    setLoading(true);
    try {
      // Firestore 데이터 삭제
      await deleteUserFirestoreData(uid);
      // 로컬 스토리지 초기화
      await clearAll();
      // Firebase Auth 계정 삭제
      await deleteCurrentUser();

      onClose();
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Start' }] })
      );
    } catch (e: any) {
      if (e?.code === 'auth/requires-recent-login') {
        Alert.alert(
          '재로그인 필요',
          '계정 삭제를 위해 다시 로그인해 주세요. 로그아웃 후 재로그인하면 삭제할 수 있습니다.',
          [{ text: '확인' }]
        );
      } else {
        Alert.alert('오류', '계정 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        onPress: async () => {
          try {
            await clearAll();
            await signOutUser();
            onClose();
            navigation.dispatch(
              CommonActions.reset({ index: 0, routes: [{ name: 'Start' }] })
            );
          } catch {
            Alert.alert('오류', '로그아웃 중 오류가 발생했습니다.');
          }
        },
      },
    ]);
  };

  const sections: { title: string; rows: SettingRow[] }[] = [
    {
      title: '알림',
      rows: [
        { icon: 'notifications-outline', label: '푸시 알림', value: '켜짐' },
        { icon: 'mail-outline', label: '이메일 알림', value: '꺼짐' },
      ],
    },
    {
      title: '게임',
      rows: [
        { icon: 'trophy-outline', label: '리그 정보', value: '백 리그' },
        { icon: 'bar-chart-outline', label: '수익률 표시', value: '퍼센트' },
      ],
    },
    {
      title: '정보',
      rows: [
        { icon: 'document-text-outline', label: '이용약관' },
        { icon: 'shield-checkmark-outline', label: '개인정보처리방침' },
        { icon: 'information-circle-outline', label: '버전', value: '1.0.0' },
      ],
    },
    {
      title: '계정',
      rows: [
        { icon: 'log-out-outline', label: '로그아웃', onPress: handleSignOut },
        { icon: 'trash-outline', label: '계정 삭제', onPress: handleDeleteAccount, danger: true },
      ],
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>설정</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {sections.map(section => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.card}>
                {section.rows.map((row, idx) => (
                  <TouchableOpacity
                    key={row.label}
                    style={[
                      styles.row,
                      idx < section.rows.length - 1 && styles.rowBorder,
                    ]}
                    activeOpacity={row.onPress ? 0.65 : 1}
                    onPress={row.onPress}
                    disabled={!row.onPress}
                  >
                    <View style={[styles.iconWrap, row.danger && styles.iconWrapDanger]}>
                      <Ionicons
                        name={row.icon as any}
                        size={18}
                        color={row.danger ? COLORS.red : COLORS.primary}
                      />
                    </View>
                    <Text style={[styles.rowLabel, row.danger && styles.rowLabelDanger]}>
                      {row.label}
                    </Text>
                    <View style={styles.rowRight}>
                      {row.value && (
                        <Text style={styles.rowValue}>{row.value}</Text>
                      )}
                      {row.onPress && !row.value && (
                        <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* 공개 범위 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>공개 범위</Text>
            <View style={styles.card}>
              <View style={[styles.row, styles.rowBorder]}>
                <View style={styles.iconWrap}>
                  <Ionicons name="trophy-outline" size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.rowLabel}>전적 공개하기</Text>
                <Switch
                  value={showTrades}
                  onValueChange={v => handlePrivacyToggle('showTrades', v)}
                  trackColor={{ false: COLORS.border, true: `${COLORS.primary}80` }}
                  thumbColor={showTrades ? COLORS.primary : '#fff'}
                />
              </View>
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <Ionicons name="bar-chart-outline" size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.rowLabel}>보유 종목 공개하기</Text>
                <Switch
                  value={showHoldings}
                  onValueChange={v => handlePrivacyToggle('showHoldings', v)}
                  trackColor={{ false: COLORS.border, true: `${COLORS.primary}80` }}
                  thumbColor={showHoldings ? COLORS.primary : '#fff'}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>계정 삭제 중...</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: 16, gap: 20, paddingBottom: 40 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: `${COLORS.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDanger: {
    backgroundColor: `${COLORS.red}12`,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  rowLabelDanger: {
    color: COLORS.red,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowValue: {
    fontSize: 14,
    color: COLORS.textDim,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
