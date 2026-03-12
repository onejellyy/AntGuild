import React, { useCallback, useState } from 'react';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Modal, Alert, ActivityIndicator, ScrollView,
  ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getProfile } from '../services/storage';
import { getCurrentUid } from '../services/auth';
import { Profile } from '../services/storage/types';
import {
  getUserGroupInfo, createGroup, searchGroups, applyToGroup,
  getJoinRequests, approveJoinRequest, rejectJoinRequest,
  leaveGroup, dissolveGroup, subscribeGroupMembers,
} from '../services/firestore';
import { GroupDoc, GroupMemberDoc, JoinRequestDoc } from '../services/firestore/types';
import ProfileHeader from '../components/ProfileHeader';
import { COLORS, RADIUS, FONTS } from '../constants/theme';
import { LeagueKey, LEAGUES, LEAGUE_KEYS } from '../constants/leagues';
import { formatWon } from '../utils/formatters';
import { calcLevel } from '../utils/levelCalc';

const MIN_LEVEL_CREATE = 10;

export default function AntGroupScreen() {
  useInterstitialAd('antGroup');

  const [profile, setProfile] = useState<Profile | null>(null);
  const [group, setGroup] = useState<GroupDoc | null>(null);
  const [myMember, setMyMember] = useState<GroupMemberDoc | null>(null);
  const [members, setMembers] = useState<GroupMemberDoc[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequestDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Search modal state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GroupDoc[]>([]);
  const [searching, setSearching] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  const myUid = getCurrentUid();

  useFocusEffect(
    useCallback(() => {
      let unsub: (() => void) | null = null;

      const load = async () => {
        setLoading(true);
        const p = await getProfile();
        setProfile(p);

        if (!myUid) { setLoading(false); return; }

        const info = await getUserGroupInfo(myUid);
        if (info) {
          setGroup(info.group);
          setMyMember(info.member);

          // Subscribe to member list
          unsub = subscribeGroupMembers(info.group.id, (ms) => {
            setMembers(ms.sort((a, b) => b.totalAsset - a.totalAsset));
          });

          // Load join requests if leader
          if (info.member.role === 'leader') {
            const reqs = await getJoinRequests(info.group.id);
            setJoinRequests(reqs);
          }
        } else {
          setGroup(null);
          setMyMember(null);
          setMembers([]);
          setJoinRequests([]);
        }
        setLoading(false);
      };

      load();
      return () => { unsub?.(); };
    }, [myUid])
  );

  // ── Create Group ─────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createName.trim()) {
      Alert.alert('오류', '개미단 이름을 입력하세요.');
      return;
    }
    if (!profile || !myUid) return;

    setCreating(true);
    try {
      const newGroup = await createGroup(
        myUid,
        profile.nickname,
        createName.trim(),
        createDesc.trim(),
        profile.realizedPnl,
        profile.league ?? 'baek',
      );
      setGroup(newGroup);
      setMyMember({ uid: myUid, nickname: profile.nickname, role: 'leader', totalAsset: 1_000_000 + profile.realizedPnl, joinedAt: new Date().toISOString() });
      setShowCreate(false);
      setCreateName('');
      setCreateDesc('');
    } catch {
      Alert.alert('오류', '개미단 창설에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  // ── Search & Apply ───────────────────────────────────────────

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchGroups(searchQuery.trim());
    // Only show groups matching the user's league
    const myLeague = profile?.league ?? 'baek';
    setSearchResults(results.filter(g => g.league === myLeague));
    setSearching(false);
  };

  const handleApply = async (g: GroupDoc) => {
    if (!profile || !myUid) return;
    setApplying(g.id);
    try {
      await applyToGroup(g.id, myUid, profile.nickname);
      Alert.alert('신청 완료', `${g.name}에 가입 신청했습니다. 단장의 승인을 기다려주세요.`);
    } catch {
      Alert.alert('오류', '가입 신청에 실패했습니다.');
    } finally {
      setApplying(null);
    }
  };

  // ── Join Request Actions ─────────────────────────────────────

  const handleApprove = async (req: JoinRequestDoc) => {
    if (!group || !myUid) return;
    if (group.memberCount >= 10) {
      Alert.alert('정원 초과', '개미단 정원(10명)이 가득 찼습니다.');
      return;
    }
    try {
      // Get applicant's realizedPnl from ranking
      await approveJoinRequest(group.id, req.uid, req.nickname, 0); // totalAsset calc inside
      setJoinRequests(prev => prev.filter(r => r.uid !== req.uid));
      Alert.alert('승인', `${req.nickname}님을 개미단에 영입했습니다.`);
    } catch {
      Alert.alert('오류', '승인 처리에 실패했습니다.');
    }
  };

  const handleReject = async (req: JoinRequestDoc) => {
    if (!group) return;
    try {
      await rejectJoinRequest(group.id, req.uid);
      setJoinRequests(prev => prev.filter(r => r.uid !== req.uid));
    } catch {
      Alert.alert('오류', '거절 처리에 실패했습니다.');
    }
  };

  // ── Leave / Dissolve ─────────────────────────────────────────

  const handleLeave = () => {
    Alert.alert('개미단 탈퇴', '개미단을 탈퇴하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴', style: 'destructive',
        onPress: async () => {
          if (!group || !myUid) return;
          await leaveGroup(group.id, myUid);
          setGroup(null);
          setMyMember(null);
          setMembers([]);
        },
      },
    ]);
  };

  const handleDissolve = () => {
    Alert.alert('개미단 해산', '개미단을 해산하시겠습니까? 모든 단원이 탈퇴됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '해산', style: 'destructive',
        onPress: async () => {
          if (!group || !myUid) return;
          await dissolveGroup(group.id, myUid);
          setGroup(null);
          setMyMember(null);
          setMembers([]);
        },
      },
    ]);
  };

  // ── Render ───────────────────────────────────────────────────

  const userLevel = profile ? calcLevel(profile.realizedPnl) : 0;
  const canCreate = userLevel >= MIN_LEVEL_CREATE;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {profile && <ProfileHeader profile={profile} onProfileChange={setProfile} />}
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  // ── No group: lobby ──────────────────────────────────────────
  if (!group) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {profile && <ProfileHeader profile={profile} onProfileChange={setProfile} />}
        <View style={styles.lobby}>
          <MaterialCommunityIcons name="account-group" size={60} color={COLORS.border} />
          <Text style={styles.lobbyTitle}>개미단</Text>
          <Text style={styles.lobbySub}>동료 트레이더들과 팀을 결성하세요{'\n'}최대 10명, 팀 자산 합산 랭킹!</Text>

          <View style={styles.lobbyBtns}>
            <TouchableOpacity
              style={[styles.lobbyBtn, styles.lobbyBtnPrimary, !canCreate && styles.lobbyBtnDisabled]}
              onPress={() => canCreate ? setShowCreate(true) : Alert.alert('레벨 부족', `개미단 창설은 레벨 ${MIN_LEVEL_CREATE} 이상부터 가능합니다.\n현재 레벨: ${userLevel}`)}
            >
              <MaterialCommunityIcons name="flag-plus" size={22} color={canCreate ? '#fff' : COLORS.textDim} />
              <Text style={[styles.lobbyBtnText, { color: canCreate ? '#fff' : COLORS.textDim }]}>개미단 창설</Text>
              {!canCreate && (
                <Text style={styles.lobbyBtnSub}>Lv.{MIN_LEVEL_CREATE}+ 필요</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.lobbyBtn, styles.lobbyBtnSecondary]}
              onPress={() => setShowSearch(true)}
            >
              <MaterialCommunityIcons name="magnify" size={22} color={COLORS.primary} />
              <Text style={[styles.lobbyBtnText, { color: COLORS.primary }]}>개미단 찾기</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Create modal */}
        <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
          <View style={styles.overlay}>
            <SafeAreaView style={styles.sheet} edges={['bottom']}>
              <View style={styles.handle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>개미단 창설</Text>
                <TouchableOpacity onPress={() => setShowCreate(false)} hitSlop={12}><Text style={styles.closeTxt}>✕</Text></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.modalBody}>
                <Text style={styles.inputLabel}>개미단 이름</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={createName}
                    onChangeText={setCreateName}
                    placeholder="예: 강남불패단"
                    placeholderTextColor={COLORS.textDim}
                    maxLength={20}
                  />
                </View>
                <Text style={styles.inputLabel}>소개 (선택)</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={[styles.input, { minHeight: 60 }]}
                    value={createDesc}
                    onChangeText={setCreateDesc}
                    placeholder="개미단 소개를 입력하세요"
                    placeholderTextColor={COLORS.textDim}
                    multiline
                    maxLength={100}
                  />
                </View>
                {/* 개미단 규모 (리그) — 유저 리그에 자동 설정, 나머지 비활성 */}
                <Text style={styles.inputLabel}>개미단 규모</Text>
                <View style={styles.leagueSelectRow}>
                  {LEAGUE_KEYS.map(key => {
                    const lg = LEAGUES[key];
                    const isMyLeague = (profile?.league ?? 'baek') === key;
                    return (
                      <View
                        key={key}
                        style={[
                          styles.leagueOption,
                          isMyLeague && { borderColor: lg.color, backgroundColor: `${lg.color}12` },
                          !isMyLeague && styles.leagueOptionDisabled,
                        ]}
                      >
                        <View style={[styles.leagueDotSm, { backgroundColor: isMyLeague ? lg.color : COLORS.border }]} />
                        <Text style={[styles.leagueOptionTxt, isMyLeague && { color: lg.color }]}>
                          {lg.shortLabel}
                        </Text>
                        {isMyLeague && (
                          <MaterialCommunityIcons name="check" size={14} color={lg.color} />
                        )}
                      </View>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={[styles.primaryBtn, creating && { opacity: 0.6 }]}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>창설하기</Text>}
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Search modal */}
        <Modal visible={showSearch} animationType="slide" transparent onRequestClose={() => setShowSearch(false)}>
          <View style={styles.overlay}>
            <SafeAreaView style={styles.sheet} edges={['bottom']}>
              <View style={styles.handle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>개미단 찾기</Text>
                <TouchableOpacity onPress={() => setShowSearch(false)} hitSlop={12}><Text style={styles.closeTxt}>✕</Text></TouchableOpacity>
              </View>
              <View style={styles.searchRow}>
                <View style={[styles.inputBox, { flex: 1 }]}>
                  <TextInput
                    style={styles.input}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="개미단 이름 검색"
                    placeholderTextColor={COLORS.textDim}
                    onSubmitEditing={handleSearch}
                  />
                </View>
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                  <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              {searching ? (
                <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
              ) : (
                <FlatList
                  data={searchResults}
                  keyExtractor={item => item.id}
                  contentContainerStyle={{ padding: 12, gap: 8 }}
                  ListEmptyComponent={<Text style={styles.emptyText}>{searchQuery ? '검색 결과가 없습니다.' : '개미단 이름을 검색하세요.'}</Text>}
                  renderItem={({ item }: ListRenderItemInfo<GroupDoc>) => (
                    <View style={styles.searchResultCard}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.groupName}>{item.name}</Text>
                        {item.description ? <Text style={styles.groupDesc}>{item.description}</Text> : null}
                        <Text style={styles.groupMeta}>단장: {item.leaderNickname} · {item.memberCount}/10명 · 시총 {formatWon(item.totalAsset)}원</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.applyBtn, applying === item.id && { opacity: 0.6 }]}
                        onPress={() => handleApply(item)}
                        disabled={applying !== null}
                      >
                        {applying === item.id
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={styles.applyBtnText}>가입 신청</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                />
              )}
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── In-group dashboard ───────────────────────────────────────
  const isLeader = myMember?.role === 'leader';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {profile && <ProfileHeader profile={profile} onProfileChange={setProfile} />}

      <ScrollView contentContainerStyle={styles.dashboard}>
        {/* Group header card */}
        <View style={styles.groupCard}>
          <View style={styles.groupCardTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.groupTitleRow}>
                <Text style={styles.groupCardName}>{group.name}</Text>
                {isLeader && (
                  <View style={styles.leaderBadge}>
                    <Text style={styles.leaderBadgeText}>단장</Text>
                  </View>
                )}
                {group.league && (() => {
                  const lg = LEAGUES[group.league];
                  return (
                    <View style={[styles.leaderBadge, { backgroundColor: `${lg.color}12`, borderColor: `${lg.color}40` }]}>
                      <Text style={[styles.leaderBadgeText, { color: lg.color }]}>{lg.shortLabel}</Text>
                    </View>
                  );
                })()}
              </View>
              {group.description ? <Text style={styles.groupCardDesc}>{group.description}</Text> : null}
            </View>
          </View>
          <View style={styles.groupStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatWon(group.totalAsset)}원</Text>
              <Text style={styles.statLabel}>개미단 시총</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{group.memberCount} / 10</Text>
              <Text style={styles.statLabel}>단원 수</Text>
            </View>
          </View>
        </View>

        {/* Join requests (leader only) */}
        {isLeader && joinRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>가입 신청 ({joinRequests.length})</Text>
            {joinRequests.map(req => (
              <View key={req.uid} style={styles.requestCard}>
                <Text style={styles.requestNickname}>{req.nickname}</Text>
                <View style={styles.requestBtns}>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(req)}>
                    <Text style={styles.approveBtnText}>승인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(req)}>
                    <Text style={styles.rejectBtnText}>거절</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Member list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>단원 목록</Text>
          {members.map((m, idx) => (
            <View key={m.uid} style={styles.memberRow}>
              <Text style={styles.memberRank}>#{idx + 1}</Text>
              <View style={{ flex: 1, gap: 1 }}>
                <View style={styles.memberNameRow}>
                  <Text style={[styles.memberNickname, m.uid === myUid && { color: COLORS.primary }]}>
                    {m.nickname}{m.uid === myUid ? '  (나)' : ''}
                  </Text>
                  {m.role === 'leader' && (
                    <View style={styles.leaderBadgeSm}><Text style={styles.leaderBadgeSmText}>단장</Text></View>
                  )}
                </View>
              </View>
              <Text style={styles.memberAsset}>{formatWon(m.totalAsset)}원</Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {isLeader ? (
            <TouchableOpacity style={styles.dissolveBtn} onPress={handleDissolve}>
              <Text style={styles.dissolveBtnText}>개미단 해산</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
              <Text style={styles.leaveBtnText}>개미단 탈퇴</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Lobby
  lobby: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 16,
  },
  lobbyTitle: {
    fontSize: 26, fontFamily: FONTS.display,
    color: COLORS.textPrimary, marginTop: 8,
  },
  lobbySub: {
    fontSize: 14, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 20,
  },
  lobbyBtns: { width: '100%', gap: 12, marginTop: 8 },
  lobbyBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 20,
    borderRadius: RADIUS.lg, gap: 10,
    shadowColor: '#c8d0e0', shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6, shadowRadius: 6, elevation: 3,
  },
  lobbyBtnPrimary: { backgroundColor: COLORS.primary },
  lobbyBtnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: COLORS.primary,
  },
  lobbyBtnDisabled: { backgroundColor: COLORS.bgInput, borderWidth: 0 },
  lobbyBtnText: { fontSize: 16, fontWeight: '700', flex: 1 },
  lobbyBtnSub: { fontSize: 11, color: COLORS.textDim },

  // Overlay / Sheet
  overlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    maxHeight: '85%', minHeight: '50%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: COLORS.border,
    borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  closeTxt: { fontSize: 18, color: COLORS.textDim },
  modalBody: { padding: 20, gap: 16 },

  // Inputs
  inputLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  inputBox: {
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#c8d0e0', shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
  },
  input: { fontSize: 15, color: COLORS.textPrimary },
  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: 'rgba(25,127,230,0.4)', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 6,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  // League selector (in create modal)
  leagueSelectRow: { flexDirection: 'row', gap: 8, width: '100%' },
  leagueOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border,
  },
  leagueOptionDisabled: { opacity: 0.4 },
  leagueDotSm: { width: 7, height: 7, borderRadius: 4 },
  leagueOptionTxt: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },

  // Search
  searchRow: { flexDirection: 'row', gap: 8, padding: 12 },
  searchBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center',
  },
  emptyText: { textAlign: 'center', color: COLORS.textDim, fontSize: 14, marginTop: 32 },
  searchResultCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#c8d0e0', shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
  },
  groupName: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  groupDesc: { fontSize: 13, color: COLORS.textSecondary },
  groupMeta: { fontSize: 11, color: COLORS.textDim, marginTop: 2 },
  applyBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  applyBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Dashboard
  dashboard: { padding: 12, gap: 12, paddingBottom: 32 },
  groupCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: 18,
    shadowColor: '#c8d0e0', shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 3, gap: 14,
  },
  groupCardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  groupTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  groupCardName: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  groupCardDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  leaderBadge: {
    backgroundColor: `${COLORS.primary}18`, borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: `${COLORS.primary}40`,
  },
  leaderBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  groupStats: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  statDivider: { width: 1, height: 32, backgroundColor: COLORS.border },

  // Sections
  section: {
    backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: 16,
    shadowColor: '#c8d0e0', shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 3, gap: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },

  // Join requests
  requestCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  requestNickname: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  requestBtns: { flexDirection: 'row', gap: 8 },
  approveBtn: {
    backgroundColor: `${COLORS.green}18`, borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: `${COLORS.green}40`,
  },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.green },
  rejectBtn: {
    backgroundColor: `${COLORS.red}18`, borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: `${COLORS.red}40`,
  },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.red },

  // Members
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  memberRank: { fontSize: 12, fontWeight: '700', color: COLORS.textDim, width: 22 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberNickname: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  leaderBadgeSm: {
    backgroundColor: `${COLORS.primary}18`, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  leaderBadgeSmText: { fontSize: 9, fontWeight: '700', color: COLORS.primary },
  memberAsset: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },

  // Action buttons
  actionRow: { paddingVertical: 8 },
  leaveBtn: {
    borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.red,
  },
  leaveBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.red },
  dissolveBtn: {
    borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center',
    backgroundColor: `${COLORS.red}12`, borderWidth: 1, borderColor: `${COLORS.red}40`,
  },
  dissolveBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.red },
});
