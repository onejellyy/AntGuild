/**
 * Mock 인앱 결제 서비스 — 광고 제거 월정액 ($3/month)
 * 실제 IAP SDK (ex. expo-in-app-purchases / react-native-iap) 연동 시 이 파일만 교체.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_KEY = '@begmanki_premium';

export const IAP_PRODUCT_ID = 'com.begmanki.premium.monthly';
export const IAP_PRICE_LABEL = '$3.00 / 월';

export async function checkSubscription(): Promise<boolean> {
  const val = await AsyncStorage.getItem(PREMIUM_KEY);
  return val === 'true';
}

/**
 * Mock 구독 구매.
 * 실제 환경에서는 IAP SDK로 결제 후 영수증 검증 후 저장.
 */
export async function purchaseSubscription(): Promise<boolean> {
  // Mock: 바로 성공 처리
  await AsyncStorage.setItem(PREMIUM_KEY, 'true');
  return true;
}

export async function restoreSubscription(): Promise<boolean> {
  const val = await AsyncStorage.getItem(PREMIUM_KEY);
  return val === 'true';
}
