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
├─ extension/             # 크롬 익스텐션 (MV3 · SidePanel)
│  ├─ manifest.json       # 권한: sidePanel, activeTab, scripting, storage, contextMenus
│  ├─ background.js       # 서비스워커: 패널 오픈 + 우클릭 텍스트 수집 → storage
│  ├─ sidepanel.html      # 텍스트 분석 UI
│  └─ sidepanel.js        # 목업 파서 (Phase 2에서 실제 AI API 연동 예정)
└─ frontend/              # 웹 대시보드 (SPA · Tailwind Play CDN)
   ├─ index.html          # 국가 탭 + 상태 필터 + 매트릭스 레이아웃 골격
   ├─ mockData.js         # 사양서 스키마 기반 더미 데이터 + 환율/통화/국가 카탈로그
   └─ app.js              # 모든 렌더링/인터랙션 로직
```

## 4. 실행 방법
- **대시보드**: `frontend/index.html` 을 브라우저로 직접 열기 (빌드 불필요, Tailwind는 CDN)
- **익스텐션**: `chrome://extensions` → 개발자 모드 ON → "압축해제된 확장 프로그램 로드" → `extension/` 선택

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
- ✅ **Phase 1 (완료)**: 익스텐션 골격(MV3/SidePanel/컨텍스트메뉴/목업파서) + 대시보드 골격(국가탭·상태필터·비용매트릭스·누락경고·환율요약·카톡복사) + 스키마 기반 mockData 연동 + 국가 탭 카탈로그+데이터 방식
- ⬜ **Phase 2 (예정)**: 익스텐션 ↔ 실제 AI API(Claude/Gemini) 연동으로 텍스트→JSON 정제 실동작, 대시보드 영속 저장(chrome.storage 또는 백엔드)
- ⬜ **Phase 3 (예정)**: N빵 정산 기능, 실시간 환율 API, 데이터 영속화/동기화, 셀 인라인 편집 UI 고도화

## 8. 다음에 할 일 (Next)
- 사용자가 먼저 대시보드를 브라우저로 띄워 흐름 체감 → 그 후 Phase 2 진행 여부 결정
- Phase 2 착수 시: API 키 관리 방식(env/설정 UI), AI 프롬프트 스펙(텍스트→표준 JSON) 먼저 확정 필요

## 9. 작업 컨벤션
- 주석/UI 텍스트는 한국어. 코드 식별자는 영어.
- 번들러 없음 — 순수 `<script>` 태그, 전역은 `window.GolfDirectorData` / `window.GolfDirector` 로 노출.
- 새 통화 추가 시 `FX_RATES` + `CURRENCY_SYMBOL` 둘 다 갱신할 것.
