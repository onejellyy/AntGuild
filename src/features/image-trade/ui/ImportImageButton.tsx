import React, { useState } from 'react';
import {
  TouchableOpacity, Text, Modal, View,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../../constants/theme';
import { importImageTradesUseCase } from '../application/importImageTradesUseCase';
import { getCurrentUid } from '../../../services/auth';

interface Props {
  onImportDone?: () => void;
}

export default function ImportImageButton({ onImportDone }: Props) {
  const [showGuide, setShowGuide] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleOpenGallery = async () => {
    setShowGuide(false);
    setProcessing(true);
    try {
      const uid = getCurrentUid();
      if (!uid) return;

      const result = await importImageTradesUseCase(uid);

      if (result === null) {
        // 사용자가 취소
        return;
      }

      const lines: string[] = [];
      if (result.added > 0) lines.push(`✅ ${result.added}건 추가됨`);
      if (result.skipped > 0) lines.push(`⏭ ${result.skipped}건 중복 건너뜀`);
      if (result.errors > 0) lines.push(`⚠️ ${result.errors}건 처리 실패\n(보유 종목 없이 매도된 경우 등)`);
      if (lines.length === 0) lines.push('추가된 내역이 없습니다.');

      Alert.alert('가져오기 완료', lines.join('\n'), [
        { text: '확인', onPress: onImportDone },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '이미지를 처리하지 못했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowGuide(true)}
        disabled={processing}
        style={styles.btn}
        hitSlop={10}
      >
        {processing ? (
          <ActivityIndicator size={14} color={COLORS.amber} />
        ) : (
          <MaterialCommunityIcons name="image-plus" size={16} color={COLORS.amber} />
        )}
        <Text style={styles.btnText}>{processing ? '분석 중...' : '수동 전적 갱신'}</Text>
      </TouchableOpacity>

      <Modal
        visible={showGuide}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuide(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <MaterialCommunityIcons
              name="image-search-outline"
              size={36}
              color={COLORS.amber}
              style={{ alignSelf: 'center', marginBottom: 8 }}
            />
            <Text style={styles.title}>거래내역 사진 불러오기</Text>
            <Text style={styles.desc}>
              아래 앱의 주문내역 화면을 캡쳐한 사진을{'\n'}여러 장 한번에 선택할 수 있습니다.
            </Text>

            <View style={styles.guideBox}>
              <Text style={styles.guideItem}>
                📱{'  '}토스 앱 → 증권 → 주문내역 → 캡쳐
              </Text>
              <Text style={styles.guideItem}>
                📱{'  '}카카오페이 → 증권 → 주문내역 → 캡쳐
              </Text>
            </View>

            <Text style={styles.note}>
              이미 기록된 내역은 중복으로 추가되지 않습니다.
            </Text>

            <View style={styles.btnRow}>
              <TouchableOpacity
                onPress={() => setShowGuide(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleOpenGallery}
                style={styles.confirmBtn}
              >
                <MaterialCommunityIcons name="image-multiple" size={15} color="#fff" />
                <Text style={styles.confirmText}>갤러리 열기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.amber}18`,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.amber,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  desc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  guideBox: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 8,
  },
  guideItem: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  note: {
    fontSize: 11,
    color: COLORS.textDim,
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
