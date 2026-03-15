import { BrokerRule, RawNotificationEvent } from '../../domain/types';
import { tossSecuritiesRule } from './tossSecuritiesRule';
import { kakaopaySecuritiesRule } from './kakaopaySecuritiesRule';

/**
 * 지원 브로커 룰 레지스트리
 * 새 증권사 추가 시 이 배열에만 push
 */
export const BROKER_RULES: BrokerRule[] = [
  tossSecuritiesRule,
  kakaopaySecuritiesRule,
];

/** 패키지명 기반 브로커 감지 */
export function detectBroker(sourcePackage: string): BrokerRule | null {
  return (
    BROKER_RULES.find(rule => rule.packageNames.includes(sourcePackage)) ?? null
  );
}

/** 지원 대상 패키지명 전체 목록 (Native 필터링용) */
export const ALL_BROKER_PACKAGES: string[] = BROKER_RULES.flatMap(
  r => r.packageNames,
);

/** 키워드 필터 통과 여부 확인 */
export function passesKeywordFilter(
  event: RawNotificationEvent,
  rule: BrokerRule,
): boolean {
  const text = `${event.title} ${event.body} ${event.subText ?? ''}`;

  // 제외 키워드 우선
  for (const kw of rule.excludeKeywords) {
    if (text.includes(kw)) return false;
  }

  // 포함 키워드 중 하나라도 존재해야 통과
  return rule.includeKeywords.some(kw => text.includes(kw));
}
