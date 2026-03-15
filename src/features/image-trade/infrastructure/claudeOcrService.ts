/**
 * Claude Vision API를 통해 주문내역 캡쳐 이미지에서 거래 내역을 추출합니다.
 */

import { ANTHROPIC_API_KEY } from '../../../config/anthropic';
import { ImageParseResult } from '../domain/types';

const SYSTEM_PROMPT = `당신은 한국 증권 앱의 주문내역 화면 캡쳐 이미지에서 거래 데이터를 추출하는 전문가입니다.
지시에 따라 정확히 JSON만 반환하고 다른 텍스트는 일절 포함하지 마세요.`;

const USER_PROMPT = `이 이미지는 한국 증권 앱(토스증권 또는 카카오페이증권)의 주문내역 화면 캡쳐입니다.

이미지에서 모든 거래 내역을 추출하여 JSON으로 반환하세요.

추출 규칙:
1. 날짜 헤더(예: "2026년 2월 6일") 기준으로 아래 항목들의 날짜를 파악합니다
2. "구매 완료" 또는 "매수 체결" → type: "BUY"
3. "판매 완료" 또는 "매도 체결" → type: "SELL"
4. qty: "N주"에서 N (정수)
5. price: "주당 N원"에서 N (숫자만, 콤마 제거)
6. 주식명이 잘려서 일부만 보이거나 가격이 없는 항목은 건너뜁니다
7. 브로커 판단: 카카오페이증권=kakaopay-securities, 토스증권=toss-securities, 모를 경우=unknown

반드시 아래 JSON 형식만 반환하세요 (추가 텍스트 없이):
{"broker":"kakaopay-securities","trades":[{"date":"2026-02-06","symbol":"삼표시멘트","type":"BUY","qty":17,"price":20350}]}`;

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, options);
    if (response.status !== 529 && response.status !== 503) return response;
    if (attempt < retries - 1) {
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    } else {
      return response;
    }
  }
  throw new Error('요청 실패');
}

export async function parseImageWithClaude(
  base64: string,
  mimeType: string,
): Promise<ImageParseResult> {
  const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64,
              },
            },
            {
              type: 'text',
              text: USER_PROMPT,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 529 || response.status === 503) {
      throw new Error('현재 서버가 혼잡해요. 잠시 후 다시 시도해주세요.');
    }
    const errText = await response.text();
    throw new Error(`Claude API 오류 (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text: string = data.content?.[0]?.text ?? '';

  // JSON 블록 추출 (```json ... ``` 또는 { ... } 형태 모두 처리)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('이미지에서 거래 내역을 인식하지 못했습니다. 주문내역 화면 캡쳐인지 확인해주세요.');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as ImageParseResult;
    if (!Array.isArray(parsed.trades)) {
      throw new Error('응답 형식이 올바르지 않습니다.');
    }
    return parsed;
  } catch {
    throw new Error('이미지 분석 결과를 처리하지 못했습니다. 다시 시도해주세요.');
  }
}
