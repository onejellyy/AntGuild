import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { RootStackParamList } from '../../App';

type ContentRoute = keyof Pick<RootStackParamList, 'QuoteContent' | 'InvestmentTipContent'>;

interface ContentMenuItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  iconBg: string;
  route: ContentRoute;
}

// To add new content: just add an item here.
const CONTENT_MENU: ContentMenuItem[] = [
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
];

export default function MoreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>더보기</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 콘텐츠 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>콘텐츠</Text>
          <View style={styles.menuList}>
            {CONTENT_MENU.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index === CONTENT_MENU.length - 1 && styles.menuItemLast,
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
