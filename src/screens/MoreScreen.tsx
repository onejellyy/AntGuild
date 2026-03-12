import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { RootStackParamList } from '../../App';

type MoreRoute = keyof Pick<
  RootStackParamList,
  'QuoteContent' | 'InvestmentTipContent' | 'IPOChallenge' | 'StartInvesting' | 'AffiliateProducts'
>;

interface MenuItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  iconBg: string;
  route: MoreRoute;
}

const CONTENT_MENU: MenuItem[] = [
  {
    id: 'quote',
    title: '오늘의 명언',
    description: '투자 고수들의 한마디로 하루를 시작하세요',
    icon: 'format-quote-open',
    iconColor: '#197fe6',
    iconBg: 'rgba(25,127,230,0.1)',
    route: 'QuoteContent',
  },
  {
    id: 'investment-tip',
    title: '오늘의 투자상식',
    description: '투자 초보도 쉽게 이해하는 핵심 개념',
    icon: 'lightbulb-outline',
    iconColor: '#f59e0b',
    iconBg: 'rgba(245,158,11,0.1)',
    route: 'InvestmentTipContent',
  },
  {
    id: 'ipo-challenge',
    title: '공모주 도전하기',
    description: '투자 초보도 쉽게 시도하는 공모주 청약',
    icon: 'rocket-launch-outline',
    iconColor: '#10b981',
    iconBg: 'rgba(16,185,129,0.1)',
    route: 'IPOChallenge',
  },
  {
    id: 'start-investing',
    title: '투자 시작하기',
    description: '아직 증권 계좌가 없는 예비 개미를 위한 쉽고 빠른 계좌 개설하기',
    icon: 'bank-outline',
    iconColor: '#8b5cf6',
    iconBg: 'rgba(139,92,246,0.1)',
    route: 'StartInvesting',
  },
];

const AFFILIATE_MENU: MenuItem[] = [
  {
    id: 'affiliate-products',
    title: '개미단 특가 상품',
    description: '개인 투자자 필수 아이템 총망라',
    icon: 'tag-multiple-outline',
    iconColor: '#f97316',
    iconBg: 'rgba(249,115,22,0.1)',
    route: 'AffiliateProducts',
  },
];

function MenuList({ items }: { items: MenuItem[] }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.menuList}>
      {items.map((item, index) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.menuItem,
            index === items.length - 1 && styles.menuItemLast,
          ]}
          onPress={() => navigation.navigate(item.route)}
          activeOpacity={0.75}
        >
          <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
            <MaterialCommunityIcons name={item.icon} size={24} color={item.iconColor} />
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Text style={styles.menuDesc}>{item.description}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textDim} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function MoreScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>더보기</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>콘텐츠</Text>
          <MenuList items={CONTENT_MENU} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>제휴</Text>
          <MenuList items={AFFILIATE_MENU} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDim,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  menuList: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    gap: 3,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  menuDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
