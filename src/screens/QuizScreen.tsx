/**
 * 투자 상식 퀴즈 화면
 * - 300문제 중 10문제 랜덤 출제
 * - 선택 즉시 정답/오답 피드백
 * - 10문제 완료 후 결과 화면으로 이동
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { RootStackParamList } from '../../App';
import quizData from '../assets/data/quiz.json';

export interface QuizQuestion {
  id: number;
  category: string;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
}

type Nav = NativeStackNavigationProp<RootStackParamList, 'InvestmentQuiz'>;

const QUESTIONS_PER_SESSION = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizScreen() {
  const navigation = useNavigation<Nav>();

  const [questions] = useState<QuizQuestion[]>(() =>
    shuffle(quizData as QuizQuestion[]).slice(0, QUESTIONS_PER_SESSION),
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>(Array(QUESTIONS_PER_SESSION).fill(-1));
  const [selected, setSelected] = useState<number | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const current = questions[currentIdx];
  const isAnswered = selected !== null;
  const isLast = currentIdx === QUESTIONS_PER_SESSION - 1;

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelected(idx);
    const next = [...userAnswers];
    next[currentIdx] = idx;
    setUserAnswers(next);
  };

  const handleNext = () => {
    if (isLast) {
      navigation.replace('QuizResult', {
        questions,
        userAnswers,
      });
      return;
    }

    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setCurrentIdx(i => i + 1);
      setSelected(null);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const getChoiceStyle = (idx: number) => {
    if (!isAnswered) return styles.choice;
    if (idx === current.answer) return [styles.choice, styles.choiceCorrect];
    if (idx === selected && idx !== current.answer) return [styles.choice, styles.choiceWrong];
    return [styles.choice, styles.choiceDim];
  };

  const getChoiceTextStyle = (idx: number) => {
    if (!isAnswered) return styles.choiceText;
    if (idx === current.answer) return [styles.choiceText, styles.choiceTextCorrect];
    if (idx === selected && idx !== current.answer) return [styles.choiceText, styles.choiceTextWrong];
    return [styles.choiceText, styles.choiceTextDim];
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>투자 상식 퀴즈</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 진행 바 */}
      <View style={styles.progressWrap}>
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentIdx + (isAnswered ? 1 : 0)) / QUESTIONS_PER_SESSION) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{currentIdx + 1} / {QUESTIONS_PER_SESSION}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* 카테고리 + 문제 */}
          <View style={styles.questionCard}>
            <Text style={styles.categoryBadge}>{current.category}</Text>
            <Text style={styles.questionText}>{current.question}</Text>
          </View>

          {/* 선택지 */}
          <View style={styles.choiceList}>
            {current.choices.map((choice, idx) => (
              <TouchableOpacity
                key={idx}
                style={getChoiceStyle(idx)}
                onPress={() => handleSelect(idx)}
                activeOpacity={isAnswered ? 1 : 0.75}
              >
                <View style={styles.choiceLabel}>
                  <Text style={[
                    styles.choiceLabelText,
                    isAnswered && idx === current.answer && styles.choiceLabelCorrect,
                    isAnswered && idx === selected && idx !== current.answer && styles.choiceLabelWrong,
                  ]}>
                    {String.fromCharCode(65 + idx)}
                  </Text>
                </View>
                <Text style={getChoiceTextStyle(idx)}>{choice}</Text>
                {isAnswered && idx === current.answer && (
                  <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.green} />
                )}
                {isAnswered && idx === selected && idx !== current.answer && (
                  <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.sell} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* 정답/오답 표시 */}
          {isAnswered && (
            <View style={[
              styles.resultBanner,
              selected === current.answer ? styles.resultBannerCorrect : styles.resultBannerWrong,
            ]}>
              <MaterialCommunityIcons
                name={selected === current.answer ? 'check-circle-outline' : 'close-circle-outline'}
                size={20}
                color={selected === current.answer ? COLORS.green : COLORS.sell}
              />
              <Text style={[
                styles.resultText,
                { color: selected === current.answer ? COLORS.green : COLORS.sell },
              ]}>
                {selected === current.answer ? '정답입니다!' : '오답입니다'}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* 다음 버튼 */}
      {isAnswered && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {isLast ? '결과 보기' : '다음 문제'}
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressBg: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDim,
    minWidth: 36,
    textAlign: 'right',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  questionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: 20,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: `${COLORS.primary}12`,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 24,
  },

  choiceList: { gap: 10 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  choiceCorrect: {
    borderColor: COLORS.green,
    backgroundColor: `${COLORS.green}0D`,
  },
  choiceWrong: {
    borderColor: COLORS.sell,
    backgroundColor: `${COLORS.sell}0D`,
  },
  choiceDim: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    opacity: 0.6,
  },
  choiceLabel: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceLabelText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  choiceLabelCorrect: { color: COLORS.green },
  choiceLabelWrong: { color: COLORS.sell },
  choiceText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  choiceTextCorrect: { color: COLORS.green, fontWeight: '700' },
  choiceTextWrong: { color: COLORS.sell },
  choiceTextDim: { color: COLORS.textDim },

  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 14,
    borderRadius: RADIUS.md,
  },
  resultBannerCorrect: { backgroundColor: `${COLORS.green}15` },
  resultBannerWrong: { backgroundColor: `${COLORS.sell}0D` },
  resultText: { fontSize: 14, fontWeight: '700' },

  footer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 15,
  },
  nextBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
