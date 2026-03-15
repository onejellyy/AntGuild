/**
 * 퀴즈 결과 화면
 * - 점수 표시 (X/10)
 * - [광고보고 해설 보기] → 보상형 광고 시청 후 QuizExplanation
 * - [광고보고 새로운 문제 풀기] → 보상형 광고 시청 후 새 QuizScreen
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { RootStackParamList } from '../../App';
import { watchRewardedAd } from '../services/ads';

type Nav = NativeStackNavigationProp<RootStackParamList, 'QuizResult'>;
type Route = RouteProp<RootStackParamList, 'QuizResult'>;

const SCORE_MESSAGES = [
  { min: 10, text: '완벽해요! 🏆', sub: '주식 고수 인증!' },
  { min: 8,  text: '훌륭해요! 🎉', sub: '투자 감각이 뛰어나시네요' },
  { min: 6,  text: '잘 하셨어요! 👍', sub: '조금만 더 공부하면 완벽할 거예요' },
  { min: 4,  text: '좋아요! 📚', sub: '해설을 보면서 부족한 부분을 채워보세요' },
  { min: 0,  text: '아직 배울 게 많아요 💪', sub: '해설을 보며 개념을 익혀보세요' },
];

export default function QuizResultScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { questions, userAnswers } = params;

  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [loadingNew, setLoadingNew] = useState(false);

  const score = userAnswers.filter((ans, i) => ans === questions[i].answer).length;
  const msg = SCORE_MESSAGES.find(m => score >= m.min)!;

  const handleExplanation = async () => {
    setLoadingExplanation(true);
    try {
      const watched = await watchRewardedAd('quizExplanation');
      if (!watched) {
        Alert.alert('광고 시청 필요', '해설을 보려면 광고를 끝까지 시청해야 합니다.');
        return;
      }
      navigation.navigate('QuizExplanation', { questions, userAnswers });
    } catch {
      Alert.alert('오류', '광고를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoadingExplanation(false);
    }
  };

  const handleNewQuiz = async () => {
    setLoadingNew(true);
    try {
      const watched = await watchRewardedAd('quizNewQuestion');
      if (!watched) {
        Alert.alert('광고 시청 필요', '새 문제를 풀려면 광고를 끝까지 시청해야 합니다.');
        return;
      }
      navigation.replace('InvestmentQuiz');
    } catch {
      Alert.alert('오류', '광고를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoadingNew(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>

        {/* 점수 카드 */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>최종 점수</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreNum}>{score}</Text>
            <Text style={styles.scoreTotal}> / 10</Text>
          </View>

          {/* 원형 점수 시각화 */}
          <View style={styles.dotRow}>
            {questions.map((q, i) => {
              const correct = userAnswers[i] === q.answer;
              return (
                <View
                  key={i}
                  style={[styles.dot, correct ? styles.dotCorrect : styles.dotWrong]}
                />
              );
            })}
          </View>

          <Text style={styles.scoreMsg}>{msg.text}</Text>
          <Text style={styles.scoreSub}>{msg.sub}</Text>
        </View>

        {/* 통계 */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: COLORS.green }]}>{score}</Text>
            <Text style={styles.statLabel}>정답</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: COLORS.sell }]}>{10 - score}</Text>
            <Text style={styles.statLabel}>오답</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: COLORS.primary }]}>{score * 10}%</Text>
            <Text style={styles.statLabel}>정답률</Text>
          </View>
        </View>

        {/* 버튼 */}
        <View style={styles.btnGroup}>
          <TouchableOpacity
            style={styles.btnExplanation}
            onPress={handleExplanation}
            disabled={loadingExplanation || loadingNew}
            activeOpacity={0.8}
          >
            {loadingExplanation ? (
              <ActivityIndicator size={18} color={COLORS.amber} />
            ) : (
              <MaterialCommunityIcons name="play-circle-outline" size={20} color={COLORS.amber} />
            )}
            <Text style={styles.btnExplanationText}>광고보고 해설 보기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnNew}
            onPress={handleNewQuiz}
            disabled={loadingExplanation || loadingNew}
            activeOpacity={0.8}
          >
            {loadingNew ? (
              <ActivityIndicator size={18} color={COLORS.primary} />
            ) : (
              <MaterialCommunityIcons name="play-circle-outline" size={20} color={COLORS.primary} />
            )}
            <Text style={styles.btnNewText}>광고보고 새로운 문제 풀기</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 20,
  },

  scoreCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 3,
  },
  scoreLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  scoreNum: {
    fontSize: 72,
    fontWeight: '800',
    color: COLORS.primary,
    lineHeight: 80,
  },
  scoreTotal: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textDim,
    paddingBottom: 10,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 4,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: RADIUS.full,
  },
  dotCorrect: { backgroundColor: COLORS.green },
  dotWrong: { backgroundColor: COLORS.sell },
  scoreMsg: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  scoreSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: COLORS.textDim, fontWeight: '600' },

  btnGroup: { gap: 12 },

  btnExplanation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.amber}15`,
    borderWidth: 1.5,
    borderColor: COLORS.amber,
  },
  btnExplanationText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.amber,
  },

  btnNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  btnNewText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
