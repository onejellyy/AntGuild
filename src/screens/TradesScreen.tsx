import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ListRenderItemInfo, TouchableOpacity, LayoutAnimation,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTradeEntries, getTrades, getProfile } from '../services/storage';
import { TradeEntry, Trade, Profile } from '../services/storage/types';
import { formatWon, formatProfit, formatRate, formatDate } from '../utils/formatters';
import ProfileHeader from '../components/ProfileHeader';
import { COLORS, RADIUS } from '../constants/theme';
import { RootStackParamList } from '../../App';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

interface TradeGroup {
  id: string;           // SELL entry id
  symbolName: string;
  result: 'WIN' | 'LOSE';
  profit: number;
  profitRate: number;
  tradedAt: string;     // SELL datetime
  sellEntry: TradeEntry;
  relatedBuys: TradeEntry[];
}

function buildTradeGroups(entries: TradeEntry[], trades: Trade[]): TradeGroup[] {
  const sellEntries = entries.filter(e => e.type === 'SELL');
  const buyEntries  = entries.filter(e => e.type === 'BUY');

  return sellEntries
    .map(sell => {
      const stockKey = sell.stock_code || sell.stock_name;
      const relatedBuys = buyEntries.filter(
        b => (b.stock_code || b.stock_name) === stockKey
      );

      // 매도 datetime과 symbolName으로 Trade 매칭
      const matched = trades.find(
        t => t.symbolName === sell.stock_name && t.tradedAt === sell.datetime
      );

      return {
        id: sell.id,
        symbolName: sell.stock_name,
        result: (matched?.result ?? (matched ? matched.result : sell.price > 0 ? 'WIN' : 'LOSE')) as 'WIN' | 'LOSE',
        profit: matched?.profit ?? 0,
        profitRate: matched?.profitRate ?? 0,
        tradedAt: sell.datetime,
        sellEntry: sell,
        relatedBuys,
      };
    })
    .sort((a, b) => new Date(b.tradedAt).getTime() - new Date(a.tradedAt).getTime());
}

export default function TradesScreen() {
  const [groups, setGroups] = useState<TradeGroup[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigation = useNavigation<NavProp>();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [entries, trades, p] = await Promise.all([
          getTradeEntries(),
          getTrades(),
          getProfile(),
        ]);
        setGroups(buildTradeGroups(entries, trades));
        setProfile(p);
      })();
    }, [])
  );

  const winCount  = groups.filter(g => g.result === 'WIN').length;
  const loseCount = groups.filter(g => g.result === 'LOSE').length;

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(prev => (prev === id ? null : id));
  };

  const renderEntry = (entry: TradeEntry) => {
    const isBuy = entry.type === 'BUY';
    return (
      <View
        key={entry.id}
        style={[styles.entryRow, { borderLeftColor: isBuy ? COLORS.green : COLORS.sell }]}
      >
        <View style={[styles.entryBadge, isBuy ? styles.buyBg : styles.sellBg]}>
          <Text style={[styles.entryBadgeText, { color: isBuy ? COLORS.green : COLORS.sell }]}>
            {isBuy ? 'BUY' : 'SELL'}
          </Text>
        </View>
        <View style={styles.entryInfo}>
          <Text style={styles.entryPrice}>{formatWon(entry.price)}원 × {entry.qty}주</Text>
          <Text style={styles.entryDate}>{formatDate(entry.datetime)}</Text>
          {entry.note ? <Text style={styles.entryNote}>{entry.note}</Text> : null}
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('EditTrade', { entry })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="pencil-outline" size={18} color={COLORS.textDim} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderGroup = ({ item }: ListRenderItemInfo<TradeGroup>) => {
    const isWin     = item.result === 'WIN';
    const isExpanded = expandedId === item.id;
    const allEntries = [...item.relatedBuys, item.sellEntry].sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    return (
      <View style={styles.groupWrap}>
        {/* 메인 WIN/LOSE 카드 */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={[styles.card, { borderLeftColor: isWin ? COLORS.green : COLORS.red }]}
          onPress={() => toggleExpand(item.id)}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.resultBadge, isWin ? styles.winBg : styles.loseBg]}>
              <Text style={[styles.resultText, { color: isWin ? COLORS.green : COLORS.red }]}>
                {isWin ? 'WIN' : 'LOSE'}
              </Text>
            </View>
            <Text style={styles.stockName}>{item.symbolName}</Text>
          </View>

          <View style={styles.cardRight}>
            <Text style={[styles.profitText, { color: isWin ? COLORS.green : COLORS.red }]}>
              {formatProfit(item.profit)}
            </Text>
            <Text style={[styles.rateText, { color: isWin ? COLORS.green : COLORS.red }]}>
              ({formatRate(item.profitRate)})
            </Text>
            <Text style={styles.dateText}>{formatDate(item.tradedAt)}</Text>
          </View>

          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={COLORS.textDim}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>

        {/* 확장: BUY/SELL 상세 */}
        {isExpanded && (
          <View style={styles.expandedWrap}>
            <Text style={styles.expandedLabel}>매수/매도 내역</Text>
            {allEntries.map(e => renderEntry(e))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {profile && (
        <ProfileHeader profile={profile} onProfileChange={setProfile} />
      )}

      <View style={styles.summary}>
        <Text style={[styles.summaryText, { color: COLORS.green }]}>● {winCount}승</Text>
        <Text style={styles.summaryDot}>/</Text>
        <Text style={[styles.summaryText, { color: COLORS.red }]}>● {loseCount}패</Text>
      </View>

      {groups.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="book-open-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyText}>아직 거래 기록이 없습니다.</Text>
          <Text style={styles.emptySubText}>매도 완료 후 기록됩니다.</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => item.id}
          renderItem={renderGroup}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  summaryText: { fontSize: 13, fontWeight: '700' },
  summaryDot: { fontSize: 13, color: COLORS.textDim },

  list: { paddingVertical: 8, paddingHorizontal: 12, gap: 8 },

  groupWrap: { gap: 0 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    borderLeftWidth: 3,
    gap: 12,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLeft: { gap: 4, flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 3 },

  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  winBg:  { backgroundColor: `${COLORS.green}18` },
  loseBg: { backgroundColor: `${COLORS.red}18` },
  resultText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  stockName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  profitText: { fontSize: 15, fontWeight: '800' },
  rateText: { fontSize: 13, fontWeight: '600' },
  dateText: { fontSize: 11, color: COLORS.textDim, marginTop: 2 },

  // 확장 영역
  expandedWrap: {
    backgroundColor: COLORS.bgInput,
    marginTop: 2,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  expandedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  entryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  buyBg:  { backgroundColor: `${COLORS.green}18` },
  sellBg: { backgroundColor: `${COLORS.sell}18` },
  entryBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  entryInfo: { flex: 1, gap: 2 },
  entryPrice: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  entryDate: { fontSize: 11, color: COLORS.textDim },
  entryNote: { fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic' },
  editBtn: { padding: 6 },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  emptySubText: { fontSize: 13, color: COLORS.textDim },
});
