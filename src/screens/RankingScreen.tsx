import React, { useCallback, useEffect, useState } from 'react';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import {
  View, Text, FlatList, StyleSheet, ListRenderItemInfo,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getProfile } from '../services/storage';
import { subscribeAssetRanking, subscribeGroupRanking } from '../services/firestore';
import { getCurrentUid } from '../services/auth';
import { RankingDoc, GroupRankingDoc } from '../services/firestore/types';
import { Profile } from '../services/storage/types';
import ProfileHeader from '../components/ProfileHeader';
import UserProfileModal from '../components/UserProfileModal';
import { COLORS, RADIUS } from '../constants/theme';
import { LeagueKey, LEAGUES, LEAGUE_KEYS } from '../constants/leagues';
import { formatWon } from '../utils/formatters';

const MEDAL_COLOR = ['#f59e0b', '#94a3b8', '#cd7c4e'];
type MainTab = 'player' | 'group';

export default function RankingScreen() {
  useInterstitialAd('ranking');

  const [mainTab, setMainTab] = useState<MainTab>('player');
  const [leagueTab, setLeagueTab] = useState<LeagueKey>('baek');
  const [playerList, setPlayerList] = useState<RankingDoc[]>([]);
  const [groupList, setGroupList] = useState<GroupRankingDoc[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedUser, setSelectedUser] = useState<RankingDoc | null>(null);
  const myUid = getCurrentUid();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const p = await getProfile();
        setProfile(p);
        // Default league tab to user's own league
        if (p?.league) setLeagueTab(p.league);
      })();
    }, [])
  );

  useEffect(() => {
    const unsubPlayer = subscribeAssetRanking(entries => setPlayerList(entries), leagueTab);
    const unsubGroup = subscribeGroupRanking(entries => setGroupList(entries), leagueTab);
    return () => { unsubPlayer(); unsubGroup(); };
  }, [leagueTab]);

  // ── Player row ────────────────────────────────────────────────
  const renderPlayer = ({ item, index }: ListRenderItemInfo<RankingDoc>) => {
    const rank = index + 1;
    const isTop3 = rank <= 3;
    const isMe = item.uid === myUid;
    const totalAsset = 1_000_000 + (item.realizedPnl ?? 0);

    const row = (
      <View style={[styles.row, isMe && styles.rowMe]}>
        <View style={[styles.medalBox, isTop3 && { backgroundColor: `${MEDAL_COLOR[rank - 1]}18` }]}>
          {isTop3
            ? <Text style={styles.medalEmoji}>{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</Text>
            : <Text style={[styles.rankNum, { color: COLORS.textDim }]}>{rank}</Text>}
        </View>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="account" size={20} color={COLORS.textDim} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.nickname, isMe && { color: COLORS.primary }]}>
            {item.nickname}{isMe ? '  (나)' : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={styles.assetText}>{formatWon(totalAsset)}원</Text>
          <Text style={styles.record}>{item.wins}승 {item.losses}패</Text>
        </View>
      </View>
    );

    if (isMe) return row;
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedUser(item)}>
        {row}
      </TouchableOpacity>
    );
  };

  // ── Group row ────────────────────────────────────────────────
  const renderGroup = ({ item, index }: ListRenderItemInfo<GroupRankingDoc>) => {
    const rank = index + 1;
    const isTop3 = rank <= 3;
    return (
      <View style={styles.row}>
        <View style={[styles.medalBox, isTop3 && { backgroundColor: `${MEDAL_COLOR[rank - 1]}18` }]}>
          {isTop3
            ? <Text style={styles.medalEmoji}>{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</Text>
            : <Text style={[styles.rankNum, { color: COLORS.textDim }]}>{rank}</Text>}
        </View>
        <View style={[styles.avatar, { backgroundColor: `${COLORS.tabMarket}18` }]}>
          <MaterialCommunityIcons name="account-group" size={18} color={COLORS.tabMarket} />
        </View>
        <View style={styles.info}>
          <Text style={styles.nickname}>{item.name}</Text>
          <Text style={styles.groupLeader}>단장: {item.leaderNickname}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={styles.assetText}>{formatWon(item.totalAsset)}원</Text>
          <Text style={styles.record}>{item.memberCount}명</Text>
        </View>
      </View>
    );
  };

  const data = mainTab === 'player' ? playerList : groupList;
  const isEmpty = data.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {profile && <ProfileHeader profile={profile} onProfileChange={setProfile} />}

      {/* Main tabs */}
      <View style={styles.mainTabs}>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === 'player' && styles.mainTabActive]}
          onPress={() => setMainTab('player')}
        >
          <Text style={[styles.mainTabTxt, mainTab === 'player' && styles.mainTabTxtActive]}>
            개미 랭킹
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === 'group' && styles.mainTabActive]}
          onPress={() => setMainTab('group')}
        >
          <Text style={[styles.mainTabTxt, mainTab === 'group' && styles.mainTabTxtActive]}>
            개미단 랭킹
          </Text>
        </TouchableOpacity>
      </View>

      {/* League sub-tabs */}
      <View style={styles.leagueTabs}>
        {LEAGUE_KEYS.map(key => {
          const lg = LEAGUES[key];
          const isActive = leagueTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.leagueTab, isActive && { borderBottomColor: lg.color }]}
              onPress={() => setLeagueTab(key)}
            >
              <View style={[styles.leagueDot, { backgroundColor: isActive ? lg.color : COLORS.border }]} />
              <Text style={[styles.leagueTabTxt, isActive && { color: lg.color, fontWeight: '700' }]}>
                {lg.shortLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isEmpty ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons
            name={mainTab === 'player' ? 'trophy-outline' : 'account-group-outline'}
            size={52}
            color={COLORS.border}
          />
          <Text style={styles.emptyTitle}>
            {LEAGUES[leagueTab].label} 랭킹 집계 중
          </Text>
          <Text style={styles.emptyDesc}>
            {mainTab === 'player'
              ? `아직 ${LEAGUES[leagueTab].label}에 등록된 플레이어가 없습니다.`
              : `아직 ${LEAGUES[leagueTab].shortLabel} 개미단이 없습니다.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data as any[]}
          keyExtractor={item => item.uid ?? item.groupId}
          renderItem={mainTab === 'player' ? renderPlayer as any : renderGroup as any}
          contentContainerStyle={styles.list}
        />
      )}

      <UserProfileModal
        visible={selectedUser !== null}
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  // Main tabs
  mainTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#fff',
  },
  mainTab: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  mainTabActive: { borderBottomColor: COLORS.primary },
  mainTabTxt: { fontSize: 14, fontWeight: '600', color: COLORS.textDim },
  mainTabTxtActive: { color: COLORS.primary },

  // League sub-tabs
  leagueTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingHorizontal: 4,
  },
  leagueTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  leagueDot: { width: 7, height: 7, borderRadius: 4 },
  leagueTabTxt: { fontSize: 13, fontWeight: '600', color: COLORS.textDim },

  list: { paddingVertical: 8, paddingHorizontal: 12, gap: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#ffffff', borderRadius: RADIUS.lg, gap: 10,
    shadowColor: '#c8d0e0', shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
  },
  rowMe: {
    backgroundColor: `${COLORS.primary}08`,
    borderWidth: 1, borderColor: `${COLORS.primary}30`,
  },
  medalBox: {
    width: 40, height: 40, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgInput, alignItems: 'center', justifyContent: 'center',
  },
  medalEmoji: { fontSize: 22 },
  rankNum: { fontSize: 16, fontWeight: '800' },
  avatar: {
    width: 40, height: 40, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  nickname: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  groupLeader: { fontSize: 12, color: COLORS.textSecondary },
  assetText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  record: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textSecondary },
  emptyDesc: {
    fontSize: 13, color: COLORS.textDim, textAlign: 'center', lineHeight: 20,
  },
});
