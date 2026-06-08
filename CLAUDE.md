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

## 2. 핵심 사용자 흐름 (5단계)
1. **수집**: 여행사/블로그 텍스트 드래그 → 크롬 익스텐션 사이드패널 → AI가 표준 JSON으로 정제
2. **정리**: 대시보드에 여행 카드로 입력, 일정별 비용 매트릭스 자동 생성. 누락 항목은 ⚠️ 경고
3. **시뮬레이션**: 셀 더블클릭 금액 수정 + 환율 조정 → 1인당 원화 총액 실시간 비교
4. **공유**: 카톡 공유용 텍스트 복사 → 단톡방 공지
5. **복기**: 다녀온 여행(COMPLETED) 아카이브로 과거 지출 조회

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
└─ frontend/              # 웹 대시보드 (SPA · Tailwind Play CDN)
   ├─ index.html          # 국가 탭 + 상태 필터 + 매트릭스 + 백엔드 연결 배지
   ├─ mockData.js         # 사양서 스키마 기반 더미 데이터 + 환율/통화/국가 카탈로그
   └─ app.js              # 렌더링/인터랙션 + 백엔드 /api/trips 로드(미실행 시 mock 폴백)
```

## 4. 실행 방법
- **백엔드**(Phase 2): `cd backend` → `npm install` → `.env.example`를 `.env`로 복사 후 `ANTHROPIC_API_KEY` 입력 → `npm start` (http://localhost:8787)
- **대시보드**: `frontend/index.html` 을 브라우저로 직접 열기 (백엔드 실행 중이면 저장된 여행 자동 로드, 아니면 mockData)
- **익스텐션**: `chrome://extensions` → 개발자 모드 ON → "압축해제된 확장 프로그램 로드" → `extension/` 선택. 설정(⚙️)에서 백엔드 URL 확인.

## 5. 데이터 스키마 & 핵심 규칙 (mockData.js)
- **Trip 엔티티**: `trip_id, title, country(한글국가명), local_currency, status, total_days, party_size, current_fx_rate, created_at, summary{...}, itinerary[]`
- **status**: `"PLANNING"`(시뮬레이션 중) | `"COMPLETED"`(다녀온 여행)
- **expense**: `{ item, amount(number|null), currency, pay_type }` / pay_type = `"PREPAID"` | `"LOCAL"`
- **amount: null** = 견적서에 금액 누락 → 대시보드에서 ⚠️ 경고 (의도된 설계, 버그 아님)
- **FX_RATES**: 통화 1단위당 원화. KRW1, USD1385, THB37.5, JPY9.1, VND0.056, PHP24.5, TWD43, MYR300, CNY190, IDR0.085 (목업값 — Phase 3에서 실시간 API 교체)
- **COST_COLUMNS** (매트릭스 X축 8종): 사전결제액·그린피·카트비·캐디피·캐디팁·미팅샌딩비·식비·기타
- **categorize()** (app.js): expense.item 문자열을 위 8개 컬럼으로 분류. pay_type=PREPAID 면 무조건 '사전결제액'

## 6. 결정사항 로그 (Decisions)
- **국가/통화 분리**: 사양서 샘플은 `"country":"THB"`(통화코드)였으나, 탭이 국가명 기준이라 **`country`(한글 국가명) + `local_currency`(통화코드)로 분리**함. (사양서와 의도적 차이)
- **국가 탭 = 카탈로그 ∪ 데이터**: `COUNTRY_CATALOG`(태국·일본·베트남·필리핀·중국·대만·말레이시아·인도네시아)를 항상 노출 + 데이터에만 있는 국가는 뒤에 자동 합산. 빈 국가(0건)는 흐리게 표시하되 클릭 가능. → 후보국 추가/삭제는 `COUNTRY_CATALOG` 배열만 수정.
- **셀 편집**: Phase 1은 `prompt()` 기반 데모 (메모리상만 수정, 영속화 X).
- **저장소**: 아직 DB/영속화 없음. 모든 데이터는 mockData.js 하드코딩.

## 7. 진행 상황 (Phase Progress)
- ✅ **Phase 1 (완료)**: 익스텐션 골격 + 대시보드 골격(국가탭·상태필터·비용매트릭스·누락경고·환율요약·카톡복사) + mockData 연동 + 국가 탭 카탈로그+데이터 방식
- ✅ **Phase 2 (완료)**: 백엔드 프록시 + Claude Opus 4.8 멀티모달 정제 + 익스텐션 멀티모달 수집(파일·이미지·PDF·텍스트·드래그·붙여넣기·컨텍스트메뉴) + structured outputs JSON 강제 + 대시보드↔백엔드 저장/로드 연동. (아키텍처 상세는 11번)
- ⬜ **Phase 3 (예정)**: N빵 정산 기능, 실시간 환율 API, 파일저장→실제 DB 교체, 셀 인라인 편집 UI 고도화, 백엔드 배포(Render/Railway 등)

## 8. 다음에 할 일 (Next)
- 사용자가 백엔드 실행(`npm install` + `.env` 키) 후 익스텐션→대시보드 end-to-end 실동작 확인
- 확인 후 Phase 3(정산/실시간 환율/DB/배포) 우선순위 결정

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
