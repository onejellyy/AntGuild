/**
 * 광고 서비스 (react-native-google-mobile-ads)
 *
 * 광고 유형:
 * 1. Interstitial (전면 광고) - 특정 화면 진입 시 자동 노출, 노출 간격 제어
 * 2. Rewarded (보상형 광고) - 오늘의 명언 / 오늘의 투자상식 잠금 해제
 *
 * 프리미엄 구독자는 모든 광고가 제거됩니다.
 */

import {
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { checkSubscription } from '../iap';

// ─────────────────────────────────────────────
// 광고 단위 ID
// ─────────────────────────────────────────────

const IS_DEV = __DEV__;

const AD_UNITS = {
  interstitial: {
    ranking:  IS_DEV ? TestIds.INTERSTITIAL : 'ca-app-pub-7094140389853787/1790531996',
    antGroup: IS_DEV ? TestIds.INTERSTITIAL : 'ca-app-pub-7094140389853787/9229892520',
  },
  rewarded: {
    quote:         IS_DEV ? TestIds.REWARDED : 'ca-app-pub-7094140389853787/5677660322',
    investmentTip: IS_DEV ? TestIds.REWARDED : 'ca-app-pub-7094140389853787/2552803535',
  },
};

// ─────────────────────────────────────────────
// Interstitial (전면 광고)
// ─────────────────────────────────────────────

/** 전면 광고 최소 노출 간격 (ms) — 3분 */
const INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000;

/** 마지막 전면 광고 노출 시각 (앱 세션 내 메모리 유지) */
let lastInterstitialAt = 0;

/**
 * 전면 광고를 노출합니다.
 * - 프리미엄 구독자이면 즉시 반환
 * - 마지막 노출로부터 INTERSTITIAL_COOLDOWN_MS 미경과 시 건너뜀
 *
 * @param placement 'ranking' | 'antGroup'
 * @returns 광고가 실제로 노출되었으면 true, 건너뛰었으면 false
 */
export async function showInterstitialAd(
  placement: keyof typeof AD_UNITS.interstitial = 'ranking'
): Promise<boolean> {
  const isPremium = await checkSubscription();
  if (isPremium) return false;

  const now = Date.now();
  if (now - lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) return false;

  return new Promise(resolve => {
    const ad = InterstitialAd.createForAdRequest(AD_UNITS.interstitial[placement]);

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      ad.show();
    });

    const unsubClose = ad.addAdEventListener(AdEventType.CLOSED, () => {
      unsubLoaded();
      unsubClose();
      unsubError();
      lastInterstitialAt = Date.now();
      resolve(true);
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      unsubLoaded();
      unsubClose();
      unsubError();
      resolve(false);
    });

    ad.load();
  });
}

/**
 * 전면 광고를 노출할 수 있는지 확인합니다.
 */
export async function canShowInterstitial(): Promise<boolean> {
  const isPremium = await checkSubscription();
  if (isPremium) return false;
  return Date.now() - lastInterstitialAt >= INTERSTITIAL_COOLDOWN_MS;
}

// ─────────────────────────────────────────────
// Rewarded (보상형 광고)
// ─────────────────────────────────────────────

/**
 * 보상형 광고를 시청합니다.
 * - 프리미엄 구독자이면 광고 없이 즉시 성공 반환
 *
 * @param placement 'quote' | 'investmentTip'
 * @returns 광고 시청 완료(또는 프리미엄 통과) 시 true, 실패/취소 시 false
 */
export async function watchRewardedAd(
  placement: keyof typeof AD_UNITS.rewarded = 'quote'
): Promise<boolean> {
  const isPremium = await checkSubscription();
  if (isPremium) return true;

  return new Promise(resolve => {
    const ad = RewardedAd.createForAdRequest(AD_UNITS.rewarded[placement]);

    let rewarded = false;

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      ad.show();
    });

    const unsubReward = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      rewarded = true;
    });

    const unsubClose = ad.addAdEventListener(AdEventType.CLOSED, () => {
      unsubLoaded();
      unsubReward();
      unsubClose();
      unsubError();
      resolve(rewarded);
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      unsubLoaded();
      unsubReward();
      unsubClose();
      unsubError();
      resolve(false);
    });

    ad.load();
  });
}

// ─────────────────────────────────────────────
// 쿨다운 초기화 (개발용)
// ─────────────────────────────────────────────

export function resetInterstitialCooldown(): void {
  lastInterstitialAt = 0;
}
