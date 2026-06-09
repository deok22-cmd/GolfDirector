# ⛳ 골프총무 (Golf Director)

해외 골프 여행 총무를 위한 **회원제 비용 N빵 계산기**.
경비를 쉽게 입력 → 실시간 환율로 1인당 자동 계산 → 카톡으로 정산 전달. 모바일에서도 편하게.

> 자세한 기획은 [`기획안.md`](기획안.md) 참고.

## 핵심 기능
- 회원가입/로그인 → **내 여행을 계정에 저장**(어디서나 조회·수정·삭제)
- 여행마다: **국가 선택 → 그 나라 화폐+원화 자동**, 항목·금액 빠른 입력(Enter로 다음 행)
- **실시간 환율 자동**(+수동 수정), 항목별 **1인 / 팀(N빵)** 자동 분배
- **1인당·일행 합계 실시간** + **카톡 정산 문구 복사**
- 무료 (향후 광고 + 고급 기능 유료)

## 실행 방법
1. **`골프총무-실행.bat` 더블클릭** — 처음 한 번만 자동 준비(설치 + 설정).
2. 검은 창은 켜둔 채, 브라우저에서 **회원가입 → 여행 만들기**.
   (주소: `http://localhost:8787`)

수동 실행:
```bash
cd backend
npm install
cp .env.example .env     # PowerShell: Copy-Item .env.example .env
# .env 의 JWT_SECRET 를 아무 긴 무작위 문자열로
npm start                # http://localhost:8787
```

## 구조
```
backend/    Node·Express — 인증(JWT) + 사용자별 여행 CRUD + (향후)AI, 프론트 서빙
  server.js / auth.js / db.js(JSON 저장) / anthropic.js·schema.js(AI, 선택)
frontend/   모바일 우선 웹앱
  index.html + main.js   ← 메인(로그인 / 여행목록 / 여행편집 계산기)
  mockData.js            환율 폴백·통화기호·국가 카탈로그
  dashboard.html·app.js  [레거시] 매트릭스 보기
extension/  [레거시/선택] 크롬 익스텐션(멀티모달 수집)
```

## 다음 단계
- **클라우드 배포**(Render/Railway 등) → 총무는 URL 접속만, 그 후 Google AdSense 적용
- JSON 저장 → 실DB, 비밀번호 재설정/구글 로그인
- 유료: 견적서 사진/PDF **AI 자동 입력**, 엑셀 내보내기, 개인별 지출 정산
