# 🥑 미래기술캠퍼스 저탄고지 식단 추천 메일링 서비스

매일 평일 오전 8시에 삼성 미래기술캠퍼스 구내식당 메뉴를 분석하여, **저탄고지(키토) 다이어트에 적합한 메뉴를 추천**하는 이메일을 자동 발송합니다.

## ✨ 기능

- 🍽️ **아침** (테이크아웃), **점심/저녁** (테이크인 + 테이크아웃) 전체 메뉴 수집
- 📊 영양 정보 기반 저탄고지 적합도 점수 계산 (0~100점)
- 🥇🥈🥉 식사별 상위 3개 추천 메뉴 선별
- 📧 프리미엄 다크 테마 HTML 이메일 발송
- ⏰ GitHub Actions로 매일 평일 KST 08:00 자동 실행

## 🔧 설정 방법

### 1. Gmail 앱 비밀번호 생성

1. [Google 계정 보안](https://myaccount.google.com/security) 접속
2. 2단계 인증 활성화 (이미 되어 있으면 건너뛰기)
3. [앱 비밀번호](https://myaccount.google.com/apppasswords) 페이지에서 새 비밀번호 생성
4. 앱 이름: `welplan-keto-mailer`
5. 생성된 16자리 비밀번호를 복사

### 2. GitHub Repository Secrets 설정

GitHub 레포의 **Settings → Secrets and variables → Actions**에서 3개의 시크릿을 추가:

| Secret 이름 | 값 | 예시 |
|---|---|---|
| `SMTP_USER` | Gmail 주소 | `yourname@gmail.com` |
| `SMTP_PASS` | Gmail 앱 비밀번호 | `abcd efgh ijkl mnop` |
| `EMAIL_TO` | 수신자 이메일 | `hanalmir@gmail.com` |

### 3. GitHub Actions 활성화

레포를 push하면 워크플로우가 자동 등록됩니다.  
수동 실행: **Actions → Daily Keto Menu Recommendation → Run workflow**

## 🖥️ 로컬 실행

```bash
# 의존성 설치
npm install

# .env 파일 생성
cp .env.example .env
# .env 파일에 Gmail 설정 입력

# 이메일 발송 (평일만)
npm start

# 이메일 발송 없이 미리보기 (preview.html 생성)
npm run dry-run

# 주말에도 강제 실행
node src/index.js --force --dry-run
```

## 📊 저탄고지 점수 계산 기준

| 요소 | 가중치 | 설명 |
|---|---|---|
| 지방 비율 | +50 | 전체 칼로리 중 지방 비율이 높을수록 |
| 단백질 비율 | +35 | 전체 칼로리 중 단백질 비율이 높을수록 |
| 탄수화물 비율 | -55 | 전체 칼로리 중 탄수화물 비율이 높을수록 감점 |
| 탄수화물 절대량 | ±15 | ≤20g 보너스, ≥130g 페널티 |
| 당류 | -10 | 20g 초과 시 감점 |

### 등급

- 🥇 **매우 적합** (70점 이상) — 저탄고지에 매우 적합
- 🥈 **적합** (50~69점) — 약간의 조정으로 적합
- 🥉 **보통** (30~49점) — 탄수화물이 다소 높음
- ⚠️ **부적합** (29점 이하) — 탄수화물 과다

## 📁 프로젝트 구조

```
welplan-keto-mailer/
├── .github/workflows/
│   └── daily-keto-menu.yml    # GitHub Actions 스케줄
├── src/
│   ├── index.js               # 메인 실행 스크립트
│   ├── fetcher.js             # welplan API 데이터 수집
│   ├── parser.js              # 마크다운 파싱
│   ├── scorer.js              # 저탄고지 점수 계산
│   ├── emailBuilder.js        # HTML 이메일 생성
│   └── mailer.js              # Gmail SMTP 발송
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🙏 크레딧

- 메뉴 데이터: [welplan.pmh.codes](https://welplan.pmh.codes) ([pmh-only/welplan2](https://github.com/pmh-only/welplan2))
- 삼성웰스토리 / 신세계푸드 PlanEAT Choice
