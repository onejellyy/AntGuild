import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';

type TabConfig = {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconActive: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
};

const TAB_CONFIG: Record<string, TabConfig> = {
  Main: {
    label: '거래',
    icon: 'swap-horizontal',
    iconActive: 'swap-horizontal',
    color: COLORS.primary,
  },
  Trades: {
    label: '전적 기록',
    icon: 'book-open-outline',
    iconActive: 'book-open',
    color: COLORS.tabTrades,
  },
  Holdings: {
    label: '보유 종목',
    icon: 'wallet-outline',
    iconActive: 'wallet',
    color: COLORS.tabHoldings,
  },
  Ranking: {
    label: '랭킹',
    icon: 'trophy-outline',
    iconActive: 'trophy',
    color: COLORS.tabRanking,
  },
  AntGroup: {
    label: '개미단',
    icon: 'account-group-outline',
    iconActive: 'account-group',
    color: COLORS.tabMarket,
  },
  More: {
    label: '더보기',
    icon: 'dots-grid',
    iconActive: 'dots-grid',
    color: '#64748b',
  },
};

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const cfg = TAB_CONFIG[route.name] ?? {
            label: route.name,
            icon: 'circle-outline',
            iconActive: 'circle',
            color: COLORS.primary,
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={onPress}
              activeOpacity={0.7}
            >
              {/* 활성 탭: 컬러 아이콘 */}
              <MaterialCommunityIcons
                name={isFocused ? cfg.iconActive : cfg.icon}
                size={24}
                color={isFocused ? cfg.color : COLORS.textDim}
              />
              <Text style={[styles.label, isFocused && { color: cfg.color }]}>
                {cfg.label}
              </Text>
              {isFocused && <View style={[styles.dot, { backgroundColor: cfg.color }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: RADIUS.xl,
    paddingHorizontal: 4,
    paddingVertical: 8,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  label: {
    fontSize: 9,
    color: COLORS.textDim,
    fontWeight: '600',
    textAlign: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
