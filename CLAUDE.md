# CLAUDE.md — 골프총무 (Golf Director) 프로젝트 컨텍스트

> 이 파일은 **다른 PC에서 작업을 이어가기 위한 휴대용 기억장치**입니다.
> Claude Code는 프로젝트를 열 때 이 파일을 자동으로 읽습니다. (로컬 `.claude` 메모리는 PC 간 이동되지 않으므로, 모든 맥락은 여기에 기록합니다.)
> **새 PC에서 시작할 때**: "골프총무 프로젝트 이어서 진행할게. CLAUDE.md 읽고 현재 상태 요약해줘"라고 말하면 됩니다.

---

## 1. 프로젝트 개요
- **서비스명**: 골프총무 (Golf Director)
- **목적**: 해외 골프 여행 총무(Group Leader)의 "일정별 견적 비교" + "과거/미래 골프 자산 관리"를 돕는 도구
- **타겟**: 4인 내외 해외 골프 여행을 기획·결제·정산하는 30~50대 총무
- **개발환경**: Google Antigravity IDE / 크롬 익스텐션(MV3) + 웹 대시보드(SPA·Tailwind)
- **원본 사양서**: `overview.md` (절대 삭제 금지 — 모든 기능의 기준 문서)

## 2. 핵심 사용자 흐름 (v2 — 회원제, 자세히는 기획안.md)
1. **회원가입/로그인** (이메일+비밀번호).
2. **내 여행 목록**: 생성/조회/수정/삭제. 카드에 제목·국가·1인당 예상액.
3. **여행 편집(계산기)**: 국가 선택→그 나라 통화+원화 기본 / 항목·금액 빠른입력(Enter로 다음 행) / **실시간 환율 자동+수동** / 항목별 **1인·팀(N빵)** / 1인당·합계 실시간.
4. **카톡 전달**: "1인당 ○○원 + 항목 + 환율 + 각자 보내세요" 정산 문구 복사.
- **모바일 우선**. 데이터는 계정에 서버 저장 → 어디서나 조회.
- **수익화**: 무료 + AdSense 자리(배포·승인 후), 고급(AI 견적분석 등)은 후일 유료.

## 3. 디렉토리 구조 (v2 — 회원제 웹서비스)
```
GolfDirector/
├─ overview.md            # 원본 사양서 (기준 문서)
├─ 기획안.md              # ★v2 서비스 기획안 (재탄생 — 회원제·N빵·수익화) ← 먼저 읽기
├─ CLAUDE.md              # ← 이 파일 (휴대용 컨텍스트)
├─ 골프총무-실행.bat       # 원클릭 실행(설치→키→서버→브라우저)
├─ backend/               # Node·Express·ESM — 인증 + 사용자별 여행 CRUD + (향후)AI
│  ├─ server.js           # /api/auth/*, /api/trips(GET·POST·PUT·DELETE), /api/parse, /health, 정적서빙
│  ├─ auth.js             # 회원가입/로그인(bcryptjs 해시 + JWT) + authMiddleware
│  ├─ db.js               # JSON 파일 DB (backend/data/{users,trips}.json, git 제외)
│  ├─ anthropic.js        # (향후/유료) Claude Opus 4.8 멀티모달 → 구조화 JSON
│  ├─ schema.js           # AI 파서용 TRIP_JSON_SCHEMA + SYSTEM_PROMPT
│  └─ .env.example        # JWT_SECRET, PORT, ANTHROPIC_API_KEY(선택)
├─ frontend/
│  ├─ index.html          # ★메인 앱 (모바일 우선): 로그인 / 내 여행 목록 / 여행 편집(계산기)
│  ├─ main.js             # 인증·CRUD·여행별 계산기(국가→통화, 실시간/수동 환율, N빵, 카톡)
│  ├─ mockData.js         # FX_RATES(폴백)·CURRENCY_SYMBOL·COUNTRY_CATALOG (앱이 재사용)
│  ├─ dashboard.html      # [레거시] 매트릭스 보기 (app.js) — v2 인증과 미연동, 참고용
│  └─ app.js              # [레거시] 매트릭스/AI업로드 로직
└─ extension/             # [레거시/선택] 크롬 익스텐션 (멀티모달 수집) — v2 메인 아님
```
> 레거시(dashboard.html·app.js·extension)는 이전 단계 산출물. v2는 `index.html`+`main.js`+백엔드(auth)가 본체.

## 4. 실행 방법 (v2는 백엔드 필요 — 회원/저장 때문)
- **권장**: `골프총무-실행.bat` 더블클릭 → 처음 1회 `npm install` + `.env`(JWT_SECRET) 자동 → `http://localhost:8787`. 또는 수동: `cd backend && npm install && (.env에 JWT_SECRET) && npm start`.
- 브라우저에서 `http://localhost:8787` 접속 → 회원가입 → 여행 만들기. (`frontend/index.html` 파일을 직접 열면 백엔드는 localhost:8787로 호출)
- **AI 견적분석**(선택/유료예정): `.env`에 `ANTHROPIC_API_KEY` 추가 시 `/api/parse` 동작.
- **배포(Phase 3)**: 백엔드를 클라우드(Render/Railway 등)에 올리면 총무는 URL 접속만. 그 후 AdSense 신청.

## 5. 데이터 모델 (v2 — 서버 저장)
- **user**: `{ id, email, passwordHash(bcrypt), createdAt }` — 비밀번호 평문 저장 안 함.
- **trip**: `{ id, userId, title, country(한글), currency(주통화코드), partySize, fxMode("auto"|"manual"), manualFx{cur:rate}, rows[], createdAt, updatedAt }`
- **row(비용항목)**: `{ name, amount(number|null), currency, scope("person"|"team") }`
- **계산식**: `1인당 = Σ(person항목 원화) + Σ(team항목 원화)/인원`, `합계 = 1인당 × 인원`. 원화환산은 `rateOf = manualFx[cur] ?? liveFx[cur] ?? FX_RATES[cur]`.
- **환율**: 프론트가 `open.er-api.com/v6/latest/USD`(키 불필요)에서 실시간 → `1c=(KRW/USD)/(c/USD)`. 사용자가 칸을 고치면 `manualFx`에 저장되고 trip에 영속. ※ mockData의 FX_RATES는 오프라인 폴백.
- **국가→통화**: `COUNTRY_CATALOG`(name→currency)로 국가 선택 시 주통화 자동. 행 통화는 KRW·주통화 우선 노출.
- (레거시) overview 사양서의 matrix 스키마(itinerary/expense/pay_type/COST_COLUMNS)는 dashboard.html·app.js에서만 사용.

## 6. 결정사항 로그 (Decisions)
- **국가/통화 분리**: 사양서 샘플은 `"country":"THB"`(통화코드)였으나, 탭이 국가명 기준이라 **`country`(한글 국가명) + `local_currency`(통화코드)로 분리**함. (사양서와 의도적 차이)
- **국가 탭 = 카탈로그 ∪ 데이터**: `COUNTRY_CATALOG`(태국·일본·베트남·필리핀·중국·대만·말레이시아·인도네시아)를 항상 노출 + 데이터에만 있는 국가는 뒤에 자동 합산. 빈 국가(0건)는 흐리게 표시하되 클릭 가능. → 후보국 추가/삭제는 `COUNTRY_CATALOG` 배열만 수정.
- **셀 편집**: Phase 1은 `prompt()` 기반 데모 (메모리상만 수정, 영속화 X).
- **저장소**: 아직 DB/영속화 없음. 모든 데이터는 mockData.js 하드코딩.

## 7. 진행 상황 (Phase Progress)
- ✅ **Phase 1 (완료)**: 익스텐션 골격 + 대시보드 골격(국가탭·상태필터·비용매트릭스·누락경고·환율요약·카톡복사) + mockData 연동 + 국가 탭 카탈로그+데이터 방식
- ✅ **Phase 2 (완료)**: 백엔드 프록시 + Claude Opus 4.8 멀티모달 정제 + structured outputs JSON 강제 + 익스텐션 멀티모달 수집 + 대시보드↔백엔드 저장/로드. (상세 11번)
- ✅ **Phase 2.5 (완료) — 설치 없는 웹앱 방향 + 수동 입력**:
  - **방향 결정**: 일반 총무가 쓰려면 익스텐션·로컬서버·키발급이 장벽 → **설치 없는 웹앱**으로 전환. 견적서 수집(사진/PDF/텍스트)을 **대시보드 안으로** 흡수("📷 견적서로 추가" 모달). 익스텐션은 이제 **선택**.
  - **수동 입력**(필수 요구): "＋ 새 여행 직접 만들기" 모달 → 빈 일정표 생성, 셀 더블클릭으로 금액 직접 입력/수정, "＋ 일차 추가". 모든 편집은 백엔드에 영속(`persistTrip`), 서버 꺼지면 메모리 폴백.
  - **단일 주소**: 백엔드가 `express.static`으로 대시보드도 서빙 → `http://localhost:8787` 한 주소. (배포 시 그대로 한 URL)
  - **원클릭 실행**: `골프총무-실행.bat`(Node확인→install→키입력→서버→대시보드). 대시보드는 서버 켜질 때까지 자동 재연결.
- ✅ **Phase 2.6 (완료) — 메인을 "간단 계산기"로 전환 (중요 피벗)**:
  - **피드백 반영**: "총무가 배워서 쓰느니 계산기가 낫다" → 매트릭스 대시보드를 메인에서 내리고, **숫자 몇 개 → 1인당 즉시 + 카톡 복사** 한 화면(`index.html`+`calculator.js`)을 메인으로. 매트릭스/AI는 `dashboard.html`(고급)로 이동.
  - **계산기 핵심**: 항목별 금액·통화 입력 → 실시간 환율 자동 환산 → 1인당/일행합계 즉시. **항목마다 1인/팀(N빵) 토글**(팀 비용은 인원수로 자동 분배) = 계산기 대비 진짜 차별점.
  - **실시간 환율**: `open.er-api.com/v6/latest/USD`(키 불필요, CORS OK). `1c = (KRW/USD)/(c/USD)`. 실패 시 mockData의 FX_RATES 폴백, 사용자 직접 수정 가능(manualFx). ※ 기본값(THB 37.5)은 실제(≈47)와 차이 커서 실시간이 중요.
  - **저장**: 계산기는 localStorage(서버·키 불필요). 카톡 공지 자동 생성.
- ✅ **v2 (완료) — 회원제 웹서비스로 재탄생 (큰 피벗, 기획안.md)**:
  - **요구**: 회원가입 + 개인별 서버 저장, 여행 CRUD, 국가→통화 자동, 실시간+수동 환율, 항목 빠른입력, N빵 전달, 모바일, 무료+AdSense(후일 유료).
  - **구현**: 백엔드 인증(bcryptjs+JWT) + 사용자별 trip CRUD(JSON DB). 프론트 재작성(`index.html`+`main.js`): 로그인/목록/여행편집 3뷰, 모바일 우선, Enter로 다음 행, 1인/팀 N빵, 실시간/수동 환율, 카톡 정산. AdSense 자리(`#ad-slot`) 마련.
  - **검증**: 인증+CRUD curl 테스트 통과. (계산기 단독 calculator.js는 main.js로 흡수돼 삭제)
- ✅ **v2 배포 (완료) — 라이브**: AWS Lightsail(Bitnami)에 Node+pm2+Apache 리버스프록시로 배포. **http://www.deoklabs.xyz/golfChongmu/** 에서 동작. 서브경로 대응(BASE_PATH). 상세는 12번.
- ⬜ **Phase 3 (다음)**: ① HTTPS 적용(현재 http만; bncert/Let's Encrypt) ② AdSense 신청 ③ JSON DB→실DB ④ 비번재설정/구글로그인 ⑤ 유료: 견적서 AI 자동입력(/api/parse)·엑셀·개인별 지출 정산

## 8. 다음에 할 일 (Next)
- 라이브 사용: **http://www.deoklabs.xyz/golfChongmu/** 회원가입 → 여행 만들기/항목입력/환율/카톡 (모바일 포함) 확인
- 로컬 개발: `골프총무-실행.bat` → `http://localhost:8787`
- 계산기가 "계산기보다 쉽다"가 확인되면 → 클라우드 배포(설치 없는 웹앱 완성)로

## 10. 입력 소스 — 멀티모달 설계 방침 (중요)
여행 정보는 브라우저 텍스트로만 오지 않는다. 실제로는 **이미지/PDF/메신저 텍스트파일**이 더 흔하다.
- **수집 대상**: ① 브라우저 선택 텍스트 ② 이미지(png/jpg — 카탈로그 캡처·브로슈어 사진·카톡 견적 이미지) ③ PDF(여행사 공식 견적서) ④ 메신저 .txt(카톡 내보내기 등) ⑤ 클립보드 붙여넣기(스크린샷)
- **핵심 방침**: Claude·Gemini 모두 멀티모달이므로 **별도 OCR/PDF 추출기 없이** 이미지·PDF를 모델에 직접 입력한다. 입력 형태만 다르고 **동일한 "→ 표준 JSON" 프롬프트로 수렴**.
- **아키텍처**: `여러 입력 어댑터 → 단일 AI 파서 → 표준 JSON` ("입력은 다양하게, 출력은 하나로")
- **익스텐션에 추가할 수집 입구**: 파일 드래그&드롭/업로드(이미지·PDF·txt), 클립보드 이미지 붙여넣기(Ctrl+V), 이미지 우클릭 컨텍스트 메뉴("골프총무로 보내기"). 현재는 텍스트 선택만 구현됨.
- **Phase 2 착수 시**: 모델은 비전 지원 모델 사용. Claude는 image 블록(base64 png/jpeg/webp/gif) + document 블록(base64 PDF) 입력 지원. 파일 크기/페이지 제한, 토큰 비용 고려 필요.

## 11. Phase 2 아키텍처 — AI 연동 (확정·구현됨)
- **데이터 흐름**: `익스텐션(멀티모달 수집) → 백엔드 프록시(키 보관·Claude 호출) → 표준 JSON → 대시보드 저장/조회`
- **키 관리 결정**: **백엔드 프록시 방식**. API 키는 `backend/.env`(ANTHROPIC_API_KEY)에만 존재 → 클라이언트에 노출 안 됨. 익스텐션은 백엔드 URL만 알고 호출(기본 `http://localhost:8787`, ⚙️설정에서 변경, chrome.storage `gdBackend`). 대시보드도 `localStorage.gdBackend`로 동일 기본값.
- **모델 결정**: `claude-opus-4-8` (멀티모달 + structured outputs). 비용 절감 시 `backend/anthropic.js`의 `model`만 Haiku/Sonnet로 교체.
- **정제 방식**: `output_config.format`(JSON Schema=`schema.js`의 TRIP_JSON_SCHEMA)로 출력 강제 + `thinking:adaptive`, `effort:medium`. 멀티모달 입력은 text/image(base64)/document(PDF base64) 블록으로 통합 → 별도 OCR 없음. 누락 비용은 `amount:null`.
- **입력 어댑터 형식**(익스텐션↔백엔드 공통): `{kind:"text",text}` · `{kind:"image",mediaType,data}` · `{kind:"pdf",data}`. POST `/api/parse` body=`{inputs:[...]}`.
- **저장**: `backend/trips.json`(git 제외). 대시보드는 로드 시 `/api/trips` 먼저 시도, 실패하면 mockData 폴백. trip_id/created_at은 서버가 부여(스키마에서 제외).
- **주의**: 익스텐션은 번들러가 없어 백엔드에서만 공식 SDK 사용(데이터 플레인). 익스텐션은 raw fetch로 백엔드만 호출(Anthropic 직접 호출 안 함 = 키 비노출).

## 12. 배포 (라이브 서버 — 중요)
- **라이브 URL**: http://www.deoklabs.xyz/golfChongmu/  (현재 **http만** 동작, https는 미설정)
- **서버**: AWS Lightsail Bitnami. IP `52.78.54.161`, user `bitnami`, SSH 키 `D:\lightsail\LAMP_deok22.pem`. (Apache 유저=daemon, Node v24, pm2 v7 설치됨. PHP도 있으나 미사용 — 이 서버 표준은 Node+pm2+Apache프록시.)
- **앱 위치**: `/home/bitnami/golfChongmu/` (`backend/` + `frontend/`). 기존 `1688` 앱과 동일 패턴.
- **구동**: pm2 name `golfChongmu`, **포트 3001**, env `BASE_PATH=/golfChongmu`(+JWT_SECRET) in `backend/.env`. → `pm2 restart golfChongmu`, 영속 `pm2 save`.
- **Apache 프록시**: `/opt/bitnami/apache/conf/vhosts/golfchongmu-proxy.conf` → `ProxyPass /golfChongmu http://127.0.0.1:3001/golfChongmu`. (httpd.conf가 `vhosts/*.conf` IncludeOptional)
- **서브경로 대응**: server.js `BASE_PATH`로 모든 라우트 prefix + 무슬래시→슬래시 리다이렉트. main.js는 자기 `<script src>` 위치에서 API_BASE 자동 도출(루트/서브경로 모두 대응).
- **사용자 데이터**: `/home/bitnami/golfChongmu/backend/data/{users,trips}.json` (서버에만, git 제외).
- **코드 갱신(재배포)**: 로컬에서 파일 수정 → `scp -i <키> <파일> bitnami@52.78.54.161:/home/bitnami/golfChongmu/<경로>` → 프론트(html/js)는 즉시 반영, 백엔드(.js) 바뀌면 `ssh ... 'pm2 restart golfChongmu'`. (번들 배포는 `tar`로 묶어 scp 후 서버에서 풀기)
- **주의**: 같은 Apache가 `1688`·`flight`·`discount` 등 타 앱도 서빙 → 프록시 conf는 `golfChongmu` 전용으로만, apache 재시작 전 `apachectl configtest` 필수.

## 9. 작업 컨벤션
- 주석/UI 텍스트는 한국어. 코드 식별자는 영어.
- 프론트/익스텐션은 번들러 없음 — 순수 `<script>` 태그, 전역은 `window.GolfDirectorData` / `window.GolfDirector`. 백엔드는 ESM(Node).
- 새 통화 추가 시 `FX_RATES` + `CURRENCY_SYMBOL`(mockData.js) 둘 다 갱신.
- 모델/프롬프트/스키마 변경은 `backend/anthropic.js` · `backend/schema.js`에서.
- **배포 갱신은 12번 참고** (scp + pm2 restart).
