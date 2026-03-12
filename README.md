명# 1,000,000 WON RPG

모바일 주식 가상 매수/매도 RPG 게임 앱.
React Native (Expo) + TypeScript + AsyncStorage 기반. 서버 없음, 완전 로컬 동작.

---

## UI 스크린샷 참고 폴더

**📁 `/reference-ui/screens/`** 에 UI 스크린샷을 넣어주세요.

| 파일명          | 화면             |
|----------------|-----------------|
| `Loading.png`  | 로딩 화면        |
| `Start.png`    | 시작 화면        |
| `Login.png`    | 로그인 화면      |
| `Main_Buy.png` | 메인 화면 (매수) |
| `Main_Sell.png`| 메인 화면 (매도) |
| `Trades.png`   | 전적 기록 화면   |
| `Holdings.png` | 보유 종목 화면   |
| `Ranking.png`  | 랭킹 화면        |
| `Market.png`   | 시장분석 화면    |

> 이 폴더의 이미지는 앱에 직접 import되지 않습니다. 레이아웃/색상 참고용입니다.

---

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 시작

```bash
npx expo start
```

- Android 기기/에뮬레이터: `a` 키 또는 Expo Go 앱으로 QR 스캔
- iOS 기기: Expo Go 앱으로 QR 스캔 (macOS 필요)
- 웹 브라우저: `w` 키

### 3. Android APK 빌드 (선택)

```bash
npx expo run:android
```

---

## 게임 규칙 요약

| 항목        | 내용                                              |
|------------|--------------------------------------------------|
| 시작 자산   | 1,000,000원 (BASE)                               |
| 현재 자산   | BASE + 누적 실현손익                              |
| 레벨 공식   | `floor(log(ASSET/BASE) / log(1.03))`             |
| 레벨 업     | 자산 3% 상승마다 1레벨                            |
| 승리 조건   | 매도 시 실현손익 > 0                              |
| 패배 조건   | 매도 시 실현손익 ≤ 0                              |
| 매도 방식   | FIFO (동일 종목 중 가장 오래된 포지션부터 매도)   |

---

## 프로젝트 구조

```
begmanki/
├── reference-ui/
│   └── screens/          ← UI 스크린샷 넣는 곳
├── src/
│   ├── screens/
│   │   ├── LoadingScreen.tsx
│   │   ├── StartScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── MainScreen.tsx     ← 매수/매도 토글
│   │   ├── TradesScreen.tsx   ← 전적 기록
│   │   ├── HoldingsScreen.tsx ← 보유 종목
│   │   ├── RankingScreen.tsx  ← 랭킹
│   │   └── MarketScreen.tsx   ← 시장분석
│   ├── components/
│   │   ├── ProfileHeader.tsx  ← 닉네임/레벨 헤더
│   │   └── CustomTabBar.tsx   ← 삼각 포인터 탭 바
│   ├── services/
│   │   └── storage/
│   │       ├── index.ts       ← AsyncStorage CRUD
│   │       └── types.ts       ← 데이터 모델 타입
│   └── utils/
│       ├── levelCalc.ts       ← 레벨 계산 공식
│       ├── formatters.ts      ← 숫자/날짜 포맷
│       └── dummyRanking.ts    ← 더미 랭킹 데이터
├── App.tsx                    ← 내비게이션 루트
└── app.json
```

---

## 데이터 저장 키 (AsyncStorage)

| 키                  | 내용          |
|--------------------|--------------|
| `storage.profile`  | 내 프로필     |
| `storage.positions`| 보유 포지션   |
| `storage.trades`   | 전적 기록     |
