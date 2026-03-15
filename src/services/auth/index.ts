import {
  onAuthStateChanged, User,
  GoogleAuthProvider, signInWithCredential,
  signOut, deleteUser,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../../config/firebase';

const UID_KEY = 'auth.uid';

/**
 * Google Sign-In 초기 설정.
 * webClientId: Firebase Console → Authentication → Sign-in method → Google
 *              → Web SDK 구성 → 웹 클라이언트 ID
 */
export function configureGoogleSignIn(webClientId: string) {
  GoogleSignin.configure({ webClientId });
}

/**
 * 앱 시작 시 호출.
 * Firebase가 이전 Google 세션을 복원할 때까지 대기 (최대 5초).
 * 복원된 유저가 있으면 반환, 없으면 null.
 */
export async function waitForAuthRestore(): Promise<User | null> {
  return new Promise<User | null>((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (user) {
        AsyncStorage.setItem(UID_KEY, user.uid);
      }
      resolve(user);
    });
    setTimeout(() => resolve(null), 5000);
  });
}

/**
 * Google 계정으로 Firebase 로그인.
 * 성공 시 User 반환, 취소 시 null 반환.
 */
export async function signInWithGoogle(): Promise<User | null> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  if (response.type !== 'success') return null;

  const idToken = response.data.idToken;
  if (!idToken) throw new Error('Google ID token을 받지 못했습니다.');

  const googleCredential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, googleCredential);
  await AsyncStorage.setItem(UID_KEY, result.user.uid);
  return result.user;
}

/** 현재 로그인된 유저 UID (동기 반환) */
export function getCurrentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signOutUser(): Promise<void> {
  await GoogleSignin.signOut();
  await signOut(auth);
  await AsyncStorage.removeItem(UID_KEY);
}

export async function deleteCurrentUser(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인된 사용자가 없습니다.');
  await deleteUser(user);
  await GoogleSignin.signOut();
  await signOut(auth);
  await AsyncStorage.removeItem(UID_KEY);
}
