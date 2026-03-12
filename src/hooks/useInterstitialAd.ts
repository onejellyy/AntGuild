import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { showInterstitialAd } from '../services/ads';

type Placement = 'ranking' | 'antGroup';

export function useInterstitialAd(placement: Placement): void {
  useFocusEffect(
    useCallback(() => {
      showInterstitialAd(placement).catch(() => {});
    }, [placement])
  );
}
