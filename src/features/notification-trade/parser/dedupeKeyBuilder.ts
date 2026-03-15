import { RawNotificationEvent, TradeEvent } from '../domain/types';

/**
 * 중복 방지용 dedupeKey 생성
 *
 * 전략:
 * - notificationKey가 있으면 1차 식별자로 사용
 * - title + body 정규화 해시 + postedAt 분 단위 반올림 조합
 * - 동일 알림이 시스템에 의해 약간 다른 timestamp로 재전달되어도 같은 키 생성
 */

/** 텍스트 정규화: 공백/개행/콤마 통일 */
function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/,/g, '')
    .trim()
    .toLowerCase();
}

/** 문자열 → 간단한 해시 (충돌 허용 수준, dedupe 전용) */
function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/** postedAt을 1분 단위로 반올림 (미세 타임스탬프 차이 흡수) */
function roundToMinute(ms: number): number {
  return Math.round(ms / 60_000) * 60_000;
}

export function buildDedupeKey(event: RawNotificationEvent): string {
  const textHash = simpleHash(
    normalizeText(`${event.title}::${event.body}`),
  );
  const timeSlot = roundToMinute(event.postedAt);
  return `${event.sourcePackage}|${textHash}|${timeSlot}`;
}

/** TradeEvent에서 이미 계산된 dedupeKey 재사용 */
export function tradeEventDedupeKey(event: TradeEvent): string {
  return event.dedupeKey;
}
