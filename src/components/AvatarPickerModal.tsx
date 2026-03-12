import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ListRenderItemInfo,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { AVATARS, AvatarDef } from '../constants/avatars';
import { COLORS, RADIUS } from '../constants/theme';
import { uploadProfileImage } from '../services/storage/uploadImage';
import { getCurrentUid } from '../services/auth';

interface Props {
  visible: boolean;
  currentId: string | null;
  onSelect: (uriOrId: string) => void;
  onClose: () => void;
}

const ITEM_SIZE = 80;
const NUM_COLS = 4;

export default function AvatarPickerModal({ visible, currentId, onSelect, onClose }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleGalleryPick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.\n설정에서 허용해 주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });

    if (result.canceled || !result.assets[0]) return;

    const localUri = result.assets[0].uri;
    setUploading(true);
    try {
      const uid = getCurrentUid();
      if (!uid) throw new Error('로그인 필요');
      const downloadUrl = await uploadProfileImage(uid, localUri);
      onSelect(downloadUrl);
      onClose();
    } catch (e) {
      Alert.alert('오류', '이미지 업로드에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setUploading(false);
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<AvatarDef>) => {
    const isSelected = item.id === currentId;
    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.itemSelected]}
        activeOpacity={0.75}
        onPress={() => {
          onSelect(item.id);
          onClose();
        }}
      >
        <Image source={item.source} style={styles.itemImg} resizeMode="cover" />
        {isSelected && (
          <View style={styles.itemCheck}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          {/* 핸들 */}
          <View style={styles.handle} />

          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>프로필 이미지 선택</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} disabled={uploading}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 갤러리 선택 버튼 */}
          <TouchableOpacity
            style={styles.galleryBtn}
            onPress={handleGalleryPick}
            activeOpacity={0.8}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <ActivityIndicator size="small" color={COLORS.teal} />
                <Text style={styles.galleryBtnText}>업로드 중...</Text>
              </>
            ) : (
              <>
                <Ionicons name="image-outline" size={22} color={COLORS.teal} />
                <Text style={styles.galleryBtnText}>갤러리에서 선택</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} style={{ marginLeft: 'auto' }} />
              </>
            )}
          </TouchableOpacity>

          {/* 프리셋 아바타 목록 */}
          {AVATARS.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>기본 아바타</Text>
              <FlatList
                data={AVATARS}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                numColumns={NUM_COLS}
                contentContainerStyle={styles.grid}
              />
            </>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    minHeight: 200,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeTxt: {
    fontSize: 18,
    color: COLORS.textDim,
  },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  galleryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionLabel: {
    fontSize: 12,
    color: COLORS.textDim,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
    letterSpacing: 0.5,
  },
  grid: {
    padding: 12,
    gap: 10,
  },
  item: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: 6,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: COLORS.bgInput,
  },
  itemSelected: {
    borderColor: COLORS.teal,
  },
  itemImg: {
    width: '100%',
    height: '100%',
  },
  itemCheck: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 11,
    color: '#000',
    fontWeight: '900',
  },
});
