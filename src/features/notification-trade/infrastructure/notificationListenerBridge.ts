/**
 * 네이티브 NotificationListenerService ↔ JS 브리지
 *
 * 사용법:
 *   const unsub = addBrokerNotificationListener(callback);
 *   // 컴포넌트 언마운트 시 unsub() 호출
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { RawNotificationEvent } from '../domain/types';

const { NotificationTradeModule } = NativeModules;

let _emitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter | null {
  if (Platform.OS !== 'android') return null;
  if (!NotificationTradeModule) return null;
  if (!_emitter) {
    _emitter = new NativeEventEmitter(NotificationTradeModule);
  }
  return _emitter;
}

/** 브로커 알림 수신 리스너 등록. 반환값은 구독 해제 함수 */
export function addBrokerNotificationListener(
  callback: (event: RawNotificationEvent) => void,
): () => void {
  const emitter = getEmitter();
  if (!emitter) return () => {};

  const sub = emitter.addListener('BrokerNotificationReceived', callback);
  return () => sub.remove();
}

/** 알림 접근 권한 허용 여부 확인 */
export async function isNotificationAccessEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android' || !NotificationTradeModule) {
    return false;
  }
  try {
    return await NotificationTradeModule.isNotificationAccessEnabled();
  } catch {
    return false;
  }
}

/** 시스템 알림 접근 설정 화면 열기 */
export function openNotificationAccessSettings(): void {
  if (Platform.OS !== 'android' || !NotificationTradeModule) return;
  NotificationTradeModule.openNotificationAccessSettings();
}

/** 현재 상태바에 표시 중인 브로커 알림 목록 조회 */
export async function getActiveNotifications(): Promise<RawNotificationEvent[]> {
  if (Platform.OS !== 'android' || !NotificationTradeModule) return [];
  try {
    return await NotificationTradeModule.getActiveNotifications();
  } catch {
    return [];
  }
}
