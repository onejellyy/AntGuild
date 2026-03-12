import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────
// Firebase 프로젝트 설정값
// Firebase Console → 프로젝트 설정 → 내 앱 → SDK 설정에서 복사
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyD6iIuPHXv4UnmEsrsPOo19yfWcIdSF-_s",
  authDomain: "begmanki.firebaseapp.com",
  projectId: "begmanki",
  storageBucket: "begmanki.firebasestorage.app",
  messagingSenderId: "1091141517798",
  appId: "1:1091141517798:web:c9d7cd93c982dbf40d5627",
  measurementId: "G-VPW6YJS8GB",
};

// getReactNativePersistence는 Metro가 react-native 조건으로 해석하는 RN 빌드에만 존재.
// TypeScript(Node resolver)에서는 타입이 없으므로 require로 로드.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (s: typeof ReactNativeAsyncStorage) => unknown;
};

// 앱이 중복 초기화되지 않도록 처리
const isFirstInit = getApps().length === 0;
export const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// AsyncStorage에 세션을 저장해 앱 재시작 후에도 로그인 유지
export const auth = isFirstInit
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage) as any,
    })
  : getAuth(app);

export const db = getFirestore(app);
