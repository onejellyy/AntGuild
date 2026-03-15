import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../App';
import { COLORS, RADIUS } from '../../../constants/theme';
import {
  isNotificationAccessEnabled,
  openNotificationAccessSettings,
} from '../infrastructure/notificationListenerBridge';

type Props = NativeStackScreenProps<RootStackParamList, 'NotificationPermission'>;

export default function NotificationPermissionScreen({ navigation }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  const checkPermission = useCallback(async () => {
    const result = await isNotificationAccessEnabled();
    setEnabled(result);
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkPermission();
    }, [checkPermission]),
  );

  const handleOpenSettings = () => {
    openNotificationAccessSettings();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>자동 투자기록</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 상단 아이콘 */}
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name="bell-ring-outline"
            size={48}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.title}>증권사 체결 알림 기반{'\n'}자동 투자기록</Text>

        {/* 권한 상태 배지 */}
        <View
          style={[
            styles.statusBadge,
            enabled === true && styles.statusBadgeOn,
            enabled === false && styles.statusBadgeOff,
          ]}
        >
          {enabled === null ? (
            <ActivityIndicator size="small" color={COLORS.textDim} />
          ) : (
            <>
              <MaterialCommunityIcons
                name={enabled ? 'check-circle-outline' : 'close-circle-outline'}
                size={18}
                color={enabled ? COLORS.green : COLORS.red}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: enabled ? COLORS.green : COLORS.red },
                ]}
              >
                {enabled ? '알림 접근 권한 허용됨' : '알림 접근 권한 미허용'}
              </Text>
            </>
          )}
        </View>

        {/* 기능 안내 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>이 기능은 무엇인가요?</Text>
          {[
            '토스증권, 카카오페이증권의 체결 알림을 읽어 매수/매도 기록을 자동으로 생성합니다.',
            '수동으로 종목·수량·단가를 입력하지 않아도 됩니다.',
            '알림 수신 시 즉시 반영되며, 별도 확인 단계는 없습니다.',
          ].map((text, i) => (
            <View key={i} style={styles.bulletRow}>
              <MaterialCommunityIcons
                name="check"
                size={15}
                color={COLORS.primary}
                style={{ marginTop: 1 }}
              />
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* 읽는 데이터 안내 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>어떤 데이터를 읽나요?</Text>
          {[
            '알림 제목 및 본문 (종목명, 수량, 체결단가 추출용)',
            '알림 발송 시각',
            '발신 앱 패키지명 (증권사 앱 식별용)',
          ].map((text, i) => (
            <View key={i} style={styles.bulletRow}>
              <MaterialCommunityIcons
                name="information-outline"
                size={15}
                color={COLORS.textDim}
                style={{ marginTop: 1 }}
              />
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}
          <Text style={styles.cardNote}>
            체결과 무관한 알림은 수집하지 않습니다.
          </Text>
        </View>

        {/* 주의사항 */}
        <View style={[styles.card, styles.cardWarning]}>
          <Text style={[styles.cardTitle, { color: COLORS.amber }]}>
            꼭 읽어주세요
          </Text>
          {[
            '자동 생성된 투자기록은 수정 및 삭제가 불가능합니다.',
            '기능을 끄더라도 이미 생성된 기록은 유지됩니다.',
            '알림 접근 권한은 언제든 시스템 설정에서 해제할 수 있습니다.',
          ].map((text, i) => (
            <View key={i} style={styles.bulletRow}>
              <MaterialCommunityIcons
                name="alert-outline"
                size={15}
                color={COLORS.amber}
                style={{ marginTop: 1 }}
              />
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* 지원 증권사 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>지원 증권사</Text>
          {[
            { name: '토스증권', icon: 'bank-outline' },
            { name: '카카오페이증권', icon: 'bank-outline' },
          ].map(item => (
            <View key={item.name} style={styles.brokerRow}>
              <MaterialCommunityIcons
                name={item.icon as any}
                size={16}
                color={COLORS.textSecondary}
              />
              <Text style={styles.brokerName}>{item.name}</Text>
            </View>
          ))}
        </View>

        {/* 버튼 영역 */}
        {!enabled && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleOpenSettings}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="cog-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>알림 접근 설정 열기</Text>
          </TouchableOpacity>
        )}

        {enabled && (
          <View style={styles.enabledNotice}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={COLORS.green}
            />
            <Text style={styles.enabledNoticeText}>
              권한이 허용되어 있습니다.{'\n'}앱이 실행 중이거나 백그라운드 상태일 때 체결 알림을 자동으로 기록합니다.
            </Text>
          </View>
        )}

        {/* 기록 보기 버튼 */}
        {enabled && (
          <View style={styles.viewBtnGroup}>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => navigation.navigate('AutoHoldings')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="chart-areaspline" size={18} color={COLORS.primary} />
              <Text style={styles.viewBtnText}>보유 종목 보기</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.textDim} />
            </TouchableOpacity>
            <View style={styles.viewBtnDivider} />
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => navigation.navigate('AutoTrades')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="chart-timeline-variant" size={18} color={COLORS.primary} />
              <Text style={styles.viewBtnText}>전적 보기</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.textDim} />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.settingsLinkBtn}
          onPress={handleOpenSettings}
          activeOpacity={0.7}
        >
          <Text style={styles.settingsLinkText}>시스템 알림 접근 설정 바로가기</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={16}
            color={COLORS.textDim}
          />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 34, height: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 17, fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 48,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 88, height: 88,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 22, fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgInput,
    alignSelf: 'center',
    minWidth: 180,
    minHeight: 40,
  },
  statusBadgeOn: { backgroundColor: `${COLORS.green}15` },
  statusBadgeOff: { backgroundColor: `${COLORS.red}10` },
  statusText: { fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 10,
  },
  cardWarning: {
    borderColor: `${COLORS.amber}50`,
    backgroundColor: `${COLORS.amber}06`,
  },
  cardTitle: {
    fontSize: 14, fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
  },
  bulletText: {
    flex: 1, fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  cardNote: {
    fontSize: 12, color: COLORS.textDim,
    marginTop: 4,
  },
  brokerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  brokerName: {
    fontSize: 14, color: COLORS.textSecondary,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    shadowColor: 'rgba(25,127,230,0.4)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1, shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    fontSize: 16, fontWeight: '700', color: '#fff',
  },
  enabledNotice: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10,
    backgroundColor: `${COLORS.green}10`,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: `${COLORS.green}30`,
  },
  enabledNoticeText: {
    flex: 1, fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  viewBtnGroup: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  viewBtnText: {
    flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary,
  },
  viewBtnDivider: {
    height: 1, backgroundColor: COLORS.border, marginHorizontal: 16,
  },
  settingsLinkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 8,
  },
  settingsLinkText: {
    fontSize: 13, color: COLORS.textDim,
    textDecorationLine: 'underline',
  },
});
