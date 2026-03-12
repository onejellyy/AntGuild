import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator, Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getCurrentUid, signInWithGoogle } from '../services/auth';
import { createUser, getUser } from '../services/firestore';
import { COLORS, FONTS, RADIUS } from '../constants/theme';
import { LeagueKey, LEAGUES, LEAGUE_KEYS } from '../constants/leagues';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
type Step = 'nickname' | 'league';

export default function LoginScreen({ navigation }: Props) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<Step>('nickname');
  const [modalNickname, setModalNickname] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<LeagueKey | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const modalInputRef = useRef<TextInput>(null);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle();
      if (!user) return;
      const existing = await getUser(user.uid);
      if (existing?.nickname) {
        navigation.replace('MainTabs');
      } else {
        setStep('nickname');
        setModalNickname('');
        setSelectedLeague(null);
        setShowModal(true);
        setTimeout(() => modalInputRef.current?.focus(), 300);
      }
    } catch (e: any) {
      Alert.alert('오류', `Google 로그인에 실패했습니다.\n${e.message ?? ''}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleNicknameNext = () => {
    const trimmed = modalNickname.trim();
    if (trimmed.length < 1 || trimmed.length > 12) {
      Alert.alert('오류', '닉네임은 1~12자 사이여야 합니다.');
      return;
    }
    setStep('league');
  };

  const handleCreate = async () => {
    if (!selectedLeague) {
      Alert.alert('오류', '리그를 선택해 주세요.');
      return;
    }
    setModalLoading(true);
    try {
      const uid = getCurrentUid();
      if (!uid) throw new Error('인증 정보 없음');
      await createUser(uid, modalNickname.trim(), selectedLeague);
      setShowModal(false);
      navigation.replace('MainTabs');
    } catch (e) {
      Alert.alert('오류', '계정 생성에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 배경 블롭 */}
      <View style={styles.blobTop} />

      {/* 로고 */}
      <View style={styles.logoOuter}>
        <View style={styles.logoInner}>
          <MaterialCommunityIcons name="trending-up" size={40} color="#fff" />
        </View>
      </View>

      {/* 타이틀 */}
      <Text style={styles.title}>개미단</Text>
      <Text style={styles.desc}>계정으로 로그인하세요</Text>

      {/* Google 로그인 버튼 */}
      <TouchableOpacity
        style={styles.googleBtn}
        onPress={handleGoogleSignIn}
        activeOpacity={0.85}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <ActivityIndicator color={COLORS.textSecondary} size="small" />
        ) : (
          <>
            <MaterialCommunityIcons name="google" size={20} color="#DB4437" />
            <Text style={styles.googleBtnText}>Google로 계속하기</Text>
          </>
        )}
      </TouchableOpacity>

      {/* 온보딩 모달 */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBox}>
            {/* 스텝 인디케이터 */}
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={[styles.stepLine, step === 'league' && styles.stepLineActive]} />
              <View style={[styles.stepDot, step === 'league' && styles.stepDotActive]} />
            </View>
            <Text style={styles.stepLabel}>
              {step === 'nickname' ? '1 / 2  닉네임 설정' : '2 / 2  리그 선택'}
            </Text>

            {step === 'nickname' ? (
              /* ── Step 1: 닉네임 ── */
              <>
                <View style={styles.modalIconWrap}>
                  <MaterialCommunityIcons name="account-edit" size={32} color={COLORS.primary} />
                </View>
                <Text style={styles.modalTitle}>닉네임 설정</Text>
                <Text style={styles.modalDesc}>
                  게임에서 사용할 닉네임을 입력하세요 (1~12자)
                </Text>
                <TextInput
                  ref={modalInputRef}
                  style={styles.modalInput}
                  value={modalNickname}
                  onChangeText={setModalNickname}
                  placeholder="닉네임"
                  placeholderTextColor={COLORS.textDim}
                  maxLength={12}
                  returnKeyType="done"
                  onSubmitEditing={handleNicknameNext}
                />
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={handleNicknameNext}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalBtnText}>다음</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ── Step 2: 리그 선택 ── */
              <>
                <View style={styles.modalIconWrap}>
                  <MaterialCommunityIcons name="flag-variant" size={32} color={COLORS.primary} />
                </View>
                <Text style={styles.modalTitle}>리그 선택</Text>
                <Text style={styles.modalDesc}>
                  참여할 리그를 선택하세요{'\n'}가입 후에는 변경할 수 없습니다
                </Text>

                <View style={styles.leagueList}>
                  {LEAGUE_KEYS.map(key => {
                    const lg = LEAGUES[key];
                    const isSelected = selectedLeague === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.leagueCard,
                          isSelected && { borderColor: lg.color, backgroundColor: `${lg.color}12` },
                        ]}
                        onPress={() => setSelectedLeague(key)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.leagueDot, { backgroundColor: lg.color }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.leagueName, isSelected && { color: lg.color }]}>
                            {lg.label}
                          </Text>
                          <Text style={styles.leagueFullName}>{lg.fullName}</Text>
                        </View>
                        {isSelected && (
                          <MaterialCommunityIcons name="check-circle" size={20} color={lg.color} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => setStep('nickname')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.backBtnText}>이전</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, { flex: 1 }, modalLoading && { opacity: 0.5 }, !selectedLeague && { opacity: 0.4 }]}
                    onPress={handleCreate}
                    activeOpacity={0.85}
                    disabled={modalLoading || !selectedLeague}
                  >
                    {modalLoading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.modalBtnText}>시작하기</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    gap: 16,
  },
  blobTop: {
    position: 'absolute',
    top: '-15%',
    left: '-10%',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(25,127,230,0.10)',
  },
  logoOuter: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 5,
  },
  logoInner: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  desc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 10,
    minWidth: 260,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  // Step indicator
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginBottom: 2,
  },
  stepDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepLine: {
    width: 32, height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  stepLineActive: { backgroundColor: COLORS.primary },
  stepLabel: {
    fontSize: 11,
    color: COLORS.textDim,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
  },
  modalDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalInput: {
    width: '100%',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  // League selection
  leagueList: { width: '100%', gap: 8 },
  leagueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  leagueDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  leagueName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  leagueFullName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  // Buttons
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  backBtn: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.lg,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: 'rgba(25,127,230,0.4)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  modalBtnText: {
    fontSize: 16,
    fontFamily: FONTS.display,
    color: '#ffffff',
  },
});
