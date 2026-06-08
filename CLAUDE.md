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

## 2. 핵심 사용자 흐름 (2.6 피벗 후 — 계산기 우선)
- **메인 = 간단 계산기(`index.html`)**: 인원 + 항목별 금액·통화 입력 → **실시간 환율로 1인당/일행합계 즉시** → 카톡 공지 복사 → (선택) localStorage 기록 저장. **설치·서버·키 불필요**(파일 더블클릭).
- **고급(`dashboard.html`, 백엔드 필요)**: ① 견적서(사진/PDF/텍스트) AI 분석 또는 "새 여행 직접 만들기" → ② 일정별 비용 매트릭스(누락 ⚠️) → ③ 환율 시뮬레이션/카톡 → ④ 과거 여행(COMPLETED) 아카이브.
- 원본 사양서(overview.md)의 5단계(수집→정리→시뮬→공유→복기)는 고급 흐름에 해당. 일반 총무 진입점은 계산기.

## 3. 디렉토리 구조
```
GolfDirector/
├─ overview.md            # 제품 사양서 (기준 문서)
├─ CLAUDE.md              # ← 이 파일 (휴대용 컨텍스트)
├─ README.md             # 사용자용 실행/구조 안내
├─ extension/             # 크롬 익스텐션 (MV3 · SidePanel) — v0.2.0
│  ├─ manifest.json       # 권한 + host_permissions(http/https, 이미지/백엔드 호출용)
│  ├─ background.js       # 서비스워커: 패널 오픈 + 우클릭 텍스트/이미지 수집 → storage(pendingCaptures)
│  ├─ sidepanel.html      # 멀티모달 수집 UI + 백엔드 URL 설정
│  └─ sidepanel.js        # 파일/이미지/PDF/텍스트 첨부 → 백엔드 /api/parse → /api/trips 저장
├─ backend/               # 백엔드 프록시 (Node·Express·ESM) — Phase 2 신규
│  ├─ server.js           # /api/parse, /api/trips(GET·POST), /health
│  ├─ anthropic.js        # 공식 SDK로 Claude Opus 4.8 호출 (멀티모달 → 구조화 JSON)
│  ├─ schema.js           # TRIP_JSON_SCHEMA(structured outputs) + SYSTEM_PROMPT
│  ├─ store.js            # trips.json 파일 기반 간이 저장
│  └─ .env.example        # ANTHROPIC_API_KEY, PORT
└─ frontend/
   ├─ index.html          # ★메인 = 간단 계산기 (설치 0, 백엔드 불필요)
   ├─ calculator.js       # 계산기 로직: 1인/팀 N빵 환산, 실시간 환율, 카톡, localStorage 기록
   ├─ dashboard.html      # 고급(매트릭스) 보기 — 국가탭·상태필터·AI견적분석 (app.js 사용)
   ├─ app.js              # 대시보드 렌더링/인터랙션 + 백엔드 /api/trips 연동
   └─ mockData.js         # FX_RATES(폴백)·CURRENCY_SYMBOL·COUNTRY_CATALOG·MOCK_TRIPS
```

## 4. 실행 방법
- **가장 쉬움(권장)**: `frontend/index.html` 더블클릭 → **계산기 바로 사용** (설치·서버·키 전부 불필요). 실시간 환율은 인터넷만 있으면 자동.
- **고급/AI 기능**: `골프총무-실행.bat` 더블클릭(또는 `cd backend && npm install && npm start`). `dashboard.html`의 매트릭스·AI 견적분석·서버저장은 백엔드 필요(+ `.env`에 ANTHROPIC_API_KEY).
- **익스텐션**(선택): `chrome://extensions` → 개발자 모드 → `extension/` 로드. (AI 수집은 대시보드에도 흡수돼 있어 필수 아님)

## 5. 데이터 스키마 & 핵심 규칙 (mockData.js)
- **Trip 엔티티**: `trip_id, title, country(한글국가명), local_currency, status, total_days, party_size, current_fx_rate, created_at, summary{...}, itinerary[]`
- **status**: `"PLANNING"`(시뮬레이션 중) | `"COMPLETED"`(다녀온 여행)
- **expense**: `{ item, amount(number|null), currency, pay_type }` / pay_type = `"PREPAID"` | `"LOCAL"`
- **amount: null** = 견적서에 금액 누락 → 대시보드에서 ⚠️ 경고 (의도된 설계, 버그 아님)
- **FX_RATES**: 통화 1단위당 원화 (KRW1, USD1385, THB37.5, JPY9.1, VND0.056, PHP24.5, TWD43, MYR300, CNY190, IDR0.085). **이건 폴백 기본값**. 계산기(`calculator.js`)는 이미 실시간 환율(open.er-api.com) 적용, 실패 시에만 이 값 사용. 매트릭스(`app.js`)는 아직 이 폴백값 사용(향후 실시간 연동 가능).
- **COST_COLUMNS** (매트릭스 X축 8종): 사전결제액·그린피·카트비·캐디피·캐디팁·미팅샌딩비·식비·기타
- **categorize()** (app.js): expense.item 문자열을 위 8개 컬럼으로 분류. pay_type=PREPAID 면 무조건 '사전결제액'

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
- ⬜ **Phase 3 (예정)**: ① **클라우드 배포**(서버 URL만 주면 끝) ② N빵 정산 고도화(개인별 지출 입력/차액) ③ 파일저장→DB ④ (선택) 크롬 웹스토어 등록

## 8. 다음에 할 일 (Next)
- 로컬 검증: `frontend/index.html` 더블클릭 → 계산기로 금액 입력·실시간환율·카톡복사·기록저장 확인 (설치 0)
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

## 9. 작업 컨벤션
- 주석/UI 텍스트는 한국어. 코드 식별자는 영어.
- 프론트/익스텐션은 번들러 없음 — 순수 `<script>` 태그, 전역은 `window.GolfDirectorData` / `window.GolfDirector`. 백엔드는 ESM(Node).
- 새 통화 추가 시 `FX_RATES` + `CURRENCY_SYMBOL`(mockData.js) 둘 다 갱신.
- 모델/프롬프트/스키마 변경은 `backend/anthropic.js` · `backend/schema.js`에서.
