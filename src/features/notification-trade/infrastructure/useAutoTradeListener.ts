/**
 * 자동 투자기록 리스너 훅
 * MainTabs 컴포넌트에 마운트하여 앱 실행 중 항상 알림을 수신합니다.
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';
import { getCurrentUid } from '../../../services/auth';
import { addBrokerNotificationListener } from './notificationListenerBridge';
import { processNotificationUseCase } from '../application/processNotificationUseCase';

export function useAutoTradeListener() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const unsub = addBrokerNotificationListener(async (event) => {
      const uid = getCurrentUid();
      if (!uid) return;
      try {
        await processNotificationUseCase(uid, event);
      } catch (e) {
        if (__DEV__) console.error('[AutoTrade] listener error', e);
      }
    });

    return unsub;
  }, []);
}
