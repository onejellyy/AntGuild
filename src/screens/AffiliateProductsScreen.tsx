import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';

interface Product {
  id: string;
  title: string;
  description: string;
  url: string; // 쿠팡파트너스 링크
}

// TODO: 실제 쿠팡파트너스 링크로 교체
const PRODUCTS: Product[] = [
  // 예시 구조 — 링크 확정 후 채워주세요
  // {
  //   id: '1',
  //   title: '상품명',
  //   description: '상품 설명',
  //   url: 'https://coupa.ng/...',
  // },
];

export default function AffiliateProductsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>개미단 특가 상품</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.subtitleRow}>
        <MaterialCommunityIcons name="tag-multiple-outline" size={16} color="#f97316" />
        <Text style={styles.subtitle}>개인 투자자 필수 아이템 총망라</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {PRODUCTS.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="tag-multiple-outline" size={48} color={COLORS.textDim} />
            <Text style={styles.emptyText}>준비 중입니다</Text>
          </View>
        ) : (
          <View style={styles.productList}>
            {PRODUCTS.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => Linking.openURL(product.url)}
                activeOpacity={0.75}
              >
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle}>{product.title}</Text>
                  <Text style={styles.productDesc}>{product.description}</Text>
                </View>
                <MaterialCommunityIcons name="open-in-new" size={18} color={COLORS.textDim} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.disclaimer}>
          이 페이지의 일부 링크는 쿠팡파트너스 제휴 링크로, 구매 시 일정 수수료를 제공받을 수 있습니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  body: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textDim,
    fontWeight: '600',
  },
  productList: {
    gap: 12,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 3,
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  productDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.textDim,
    lineHeight: 18,
    textAlign: 'center',
    paddingTop: 8,
  },
});
