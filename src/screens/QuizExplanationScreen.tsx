/**
 * 퀴즈 해설 화면
 * - 10문제 전체 해설 표시
 * - 각 문제의 모든 보기와 정답/오답 표시
 * - 하단 [새로운 문제 풀기] 버튼 (광고 없음)
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList, 'QuizExplanation'>;
type Route = RouteProp<RootStackParamList, 'QuizExplanation'>;

export default function QuizExplanationScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { questions, userAnswers } = params;

  const score = userAnswers.filter((ans, i) => ans === questions[i].answer).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>전체 해설</Text>
        <View style={styles.headerScore}>
          <Text style={styles.headerScoreText}>{score}/10</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {questions.map((q, qIdx) => {
          const userAns = userAnswers[qIdx];
          const isCorrect = userAns === q.answer;

          return (
            <View key={q.id} style={[styles.card, isCorrect ? styles.cardCorrect : styles.cardWrong]}>
              {/* 문제 번호 + 정오 */}
              <View style={styles.cardHeader}>
                <View style={styles.numBadge}>
                  <Text style={styles.numBadgeText}>{qIdx + 1}</Text>
                </View>
                <Text style={styles.categoryText}>{q.category}</Text>
                <View style={[styles.resultBadge, isCorrect ? styles.resultBadgeCorrect : styles.resultBadgeWrong]}>
                  <MaterialCommunityIcons
                    name={isCorrect ? 'check' : 'close'}
                    size={12}
                    color={isCorrect ? COLORS.green : COLORS.sell}
                  />
                  <Text style={[styles.resultBadgeText, { color: isCorrect ? COLORS.green : COLORS.sell }]}>
                    {isCorrect ? '정답' : '오답'}
                  </Text>
                </View>
              </View>

              {/* 문제 */}
              <Text style={styles.questionText}>{q.question}</Text>

              {/* 보기 */}
              <View style={styles.choiceList}>
                {q.choices.map((choice, cIdx) => {
                  const isAnswer = cIdx === q.answer;
                  const isUserWrong = cIdx === userAns && !isAnswer;

                  return (
                    <View
                      key={cIdx}
                      style={[
                        styles.choice,
                        isAnswer && styles.choiceCorrect,
                        isUserWrong && styles.choiceWrong,
                      ]}
                    >
                      <Text style={[
                        styles.choiceLabel,
                        isAnswer && styles.choiceLabelCorrect,
                        isUserWrong && styles.choiceLabelWrong,
                      ]}>
                        {String.fromCharCode(65 + cIdx)}
                      </Text>
                      <Text style={[
                        styles.choiceText,
                        isAnswer && styles.choiceTextCorrect,
                        isUserWrong && styles.choiceTextWrong,
                      ]}>
                        {choice}
                      </Text>
                      {isAnswer && (
                        <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.green} />
                      )}
                      {isUserWrong && (
                        <MaterialCommunityIcons name="close-circle" size={16} color={COLORS.sell} />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* 해설 */}
              <View style={styles.explanationBox}>
                <View style={styles.explanationHeader}>
                  <MaterialCommunityIcons name="lightbulb-outline" size={15} color={COLORS.amber} />
                  <Text style={styles.explanationLabel}>해설</Text>
                </View>
                <Text style={styles.explanationText}>{q.explanation}</Text>
              </View>
            </View>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* 새 문제 풀기 버튼 (광고 없음) */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.newQuizBtn}
          onPress={() => navigation.replace('InvestmentQuiz')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
          <Text style={styles.newQuizBtnText}>새로운 문제 풀기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerScore: {
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerScoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },

  scrollContent: { padding: 16, gap: 16 },

  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: COLORS.border,
  },
  cardCorrect: { borderLeftColor: COLORS.green },
  cardWrong: { borderLeftColor: COLORS.sell },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  numBadge: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  categoryText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDim,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  resultBadgeCorrect: { backgroundColor: `${COLORS.green}15` },
  resultBadgeWrong: { backgroundColor: `${COLORS.sell}10` },
  resultBadgeText: { fontSize: 11, fontWeight: '700' },

  questionText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 22,
  },

  choiceList: { gap: 7 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  choiceCorrect: {
    backgroundColor: `${COLORS.green}0D`,
    borderColor: COLORS.green,
  },
  choiceWrong: {
    backgroundColor: `${COLORS.sell}0A`,
    borderColor: COLORS.sell,
  },
  choiceLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDim,
    width: 16,
    textAlign: 'center',
  },
  choiceLabelCorrect: { color: COLORS.green },
  choiceLabelWrong: { color: COLORS.sell },
  choiceText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  choiceTextCorrect: { color: COLORS.green, fontWeight: '700' },
  choiceTextWrong: { color: COLORS.sell },

  explanationBox: {
    backgroundColor: `${COLORS.amber}0D`,
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 6,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.amber,
  },
  explanationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  footer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  newQuizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.md,
    paddingVertical: 15,
  },
  newQuizBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
