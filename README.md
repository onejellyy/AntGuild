# 개미단 (AntGuild)

모바일 주식 가상 매수/매도 RPG 게임 앱.
1,000,000원으로 시작해서 실제 종목을 가상으로 거래하며 자산을 불리고, 전 세계 유저와 랭킹을 경쟁한다.

**React Native (Expo) + TypeScript + Firebase (Auth / Firestore)**

---

## 게임 규칙

| 항목 | 내용 |
|------|------|
| 시작 자산 | 1,000,000원 (고정) |
| 현재 자산 | 시작 자산 + 누적 실현손익 |
| 레벨 공식 | `floor(log(현재자산 / 시작자산) / log(1.03))` |
| 레벨 업 | 자산 3% 상승마다 1레벨 |
| 승리 조건 | 매도 시 실현손익 > 0 |
| 패배 조건 | 매도 시 실현손익 ≤ 0 |
| 매도 방식 | FIFO (동일 종목 중 가장 오래된 포지션부터 매도) |

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | React Native 0.83.2 + Expo ~55.0.4 |
| 언어 | TypeScript ~5.9.2 |
| 인증 | Firebase Auth + Google Sign-In |
| DB | Cloud Firestore |
| 로컬 저장 | AsyncStorage (오프라인 fallback) |
| 네비게이션 | React Navigation (native-stack + bottom-tabs) |
| 광고 | Google Mobile Ads (AdMob) |
| 빌드 | EAS (Expo Application Services) |
| 테스트 | Jest + jest-expo |

---

## 프로젝트 구조

```
begmanki/
├── src/
│   ├── screens/
│   │   ├── LoadingScreen.tsx          # 앱 초기화
│   │   ├── StartScreen.tsx            # 스플래시/인트로
│   │   ├── LoginScreen.tsx            # 구글 로그인
│   │   ├── MainScreen.tsx             # 매수/매도 토글
│   │   ├── TradesScreen.tsx           # 전적 기록 (승/패)
│   │   ├── HoldingsScreen.tsx         # 보유 종목
│   │   ├── RankingScreen.tsx          # 글로벌 랭킹
│   │   ├── AntGroupScreen.tsx         # 개미단 (그룹)
│   │   ├── MarketScreen.tsx           # 시장분석 (WIP)
│   │   ├── MoreScreen.tsx             # 설정/프로필
│   │   ├── EditTradeScreen.tsx        # 거래 수정/삭제
│   │   ├── QuoteContentScreen.tsx     # 오늘의 명언
│   │   └── InvestmentTipContentScreen.tsx  # 투자 팁
│   ├── components/
│   │   ├── ProfileHeader.tsx          # 닉네임/레벨 헤더
│   │   ├── CustomTabBar.tsx           # 커스텀 탭 바
│   │   ├── StockAutocomplete.tsx      # 종목 검색 자동완성
│   │   ├── AvatarPickerModal.tsx      # 아바타 선택
│   │   ├── UserProfileModal.tsx       # 유저 프로필 모달
│   │   ├── SettingsModal.tsx          # 설정 모달
│   │   ├── QuoteCard.tsx              # 명언 카드
│   │   ├── DailyContentViewer.tsx     # 일일 콘텐츠 뷰어
│   │   └── RankText.tsx               # 랭크 표시 텍스트
│   ├── services/
│   │   ├── auth/                      # 구글 로그인 / Firebase Auth
│   │   ├── firestore/                 # Firestore CRUD + 타입
│   │   ├── storage/                   # Firebase ↔ AsyncStorage 추상화
│   │   ├── quotes/                    # 오늘의 명언 서비스
│   │   ├── investmentTips/            # 투자 팁 서비스
│   │   ├── ads/                       # AdMob 래퍼
│   │   └── iap/                       # 인앱결제 (WIP)
│   ├── config/
│   │   └── firebase.ts                # Firebase 초기화
│   ├── constants/
│   │   ├── theme.ts                   # 색상/폰트/디자인 토큰
│   │   ├── leagues.ts                 # 리그 정의 (브론즈~플래티넘)
│   │   └── avatars.ts                 # 아바타 목록
│   ├── utils/
│   │   ├── tradeCalc.ts               # FIFO 포지션/손익 계산
│   │   ├── levelCalc.ts               # 레벨 공식
│   │   ├── rankCalc.ts                # 랭크 포인트 계산
│   │   ├── formatters.ts              # 숫자/날짜 포맷
│   │   ├── stockSearch.ts             # 종목 검색
│   │   └── quotesLoader.ts            # 명언 데이터 로더
│   ├── hooks/
│   │   └── useInterstitialAd.ts       # 전면광고 커스텀 훅
│   └── data/
│       └── investmentTips.ts          # 투자 팁 정적 데이터
├── assets/
│   ├── branding/                      # 앱 아이콘 / 스플래시
│   ├── avatars/                       # 유저 아바타 이미지
│   └── data/
│       └── stocks.json                # KRX 종목 리스트
├── data/
│   └── quotes/
│       └── quotes.csv                 # 명언 데이터
├── scripts/
│   └── import-krx-csv.js             # KRX CSV → stocks.json 변환 스크립트
├── reference-ui/                      # UI 레퍼런스 (앱 미포함)
├── NeedToFix/                         # 버그 스크린샷 대기 폴더
├── Fixed/                             # 수정 완료 스크린샷 폴더
├── App.tsx                            # 내비게이션 루트
├── app.json                           # Expo 앱 설정
├── eas.json                           # EAS 빌드 설정
├── firebase.json                      # Firebase 설정
└── firestore.rules                    # Firestore 보안 규칙
```

---

## Firestore 구조

```
/users/{uid}
  ├── nickname, avatarUri, baseMoney, realizedPnl, level, league
  ├── showTrades, showHoldings (프라이버시)
  ├── groupId
  ├── /positions/{id}        # 보유 포지션
  ├── /trades/{id}           # 완료된 거래 (전적)
  └── /tradeEntries/{id}     # 원본 매수/매도 입력 (수정 가능)

/ranking/{uid}               # 빠른 랭킹 조회용 역정규화

/groups/{groupId}
  ├── name, description, league, leaderId
  ├── memberCount, totalAsset
  ├── /members/{uid}         # 멤버 목록
  └── /joinRequests/{uid}    # 가입 신청

/groupRanking/{groupId}      # 그룹 랭킹용 역정규화
```

---

## 구현 현황

### 완료
- 구글 로그인 / Firebase Auth 연동
- 매수/매도 UI + FIFO 손익 계산
- 거래 수정 및 삭제 (전체 재계산)
- 레벨/리그 시스템
- 글로벌 랭킹 (실시간 구독)
- 개미단 그룹 생성/가입/탈퇴/강퇴/해산
- 아바타 선택 + 프라이버시 설정
- 오늘의 명언 / 투자 팁 일일 콘텐츠
- EAS 빌드 설정 (dev / preview / production)
- Jest 유닛 테스트 (tradeCalc, stockSearch)

### 진행 중 / 미완성
- MarketScreen (시장분석) — 껍데기만 존재
- 인앱결제 (iap/index.ts) — 스켈레톤
- 광고 (AdMob) — 의존성 연결, 본격 적용 미완

---

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npx expo start

# Android APK 빌드
eas build --profile preview --platform android
```

---

## 버그 수정 워크플로우

1. 에러 발생 → 스크린샷을 `NeedToFix/`에 넣기
2. Claude에게 알려주기 → 코드 수정 후 스크린샷을 `Fixed/`로 이동
3. 승인 → `Fixed/` 파일 전부 삭제

> `NeedToFix/`, `Fixed/` 폴더는 `.gitignore`에 포함되어 있습니다.
