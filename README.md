# ⛳ 골프총무 (Golf Director)

해외 골프 여행 총무를 위한 **일정 기반 비용 관리 & 시뮬레이터**.
크롬 익스텐션(MV3·SidePanel)으로 상품 페이지를 수집하고, 웹 대시보드에서 일정별 비용 매트릭스로 관리/시뮬레이션합니다.

## 프로젝트 구조 (Phase 1)

```
GolfDirector/
├─ overview.md            # 제품 기획 및 개발 사양서
├─ extension/             # 크롬 익스텐션 (Manifest V3 · SidePanel)
│  ├─ manifest.json
│  ├─ background.js       # 서비스워커: 사이드패널 오픈 + 텍스트/이미지 컨텍스트 메뉴 수집
│  ├─ sidepanel.html      # 멀티모달 수집 UI + 백엔드 URL 설정
│  └─ sidepanel.js        # 파일·이미지·PDF·텍스트 → 백엔드 정제 → 대시보드 저장
├─ backend/               # 백엔드 프록시 (Node · Express)
│  ├─ server.js           # /api/parse, /api/trips, /health
│  ├─ anthropic.js        # Claude Opus 4.8 멀티모달 → 표준 JSON
│  ├─ schema.js           # JSON Schema + 시스템 프롬프트
│  ├─ store.js            # trips.json 간이 저장
│  └─ .env.example        # ANTHROPIC_API_KEY
└─ frontend/              # 웹 대시보드 (SPA · Tailwind CSS)
   ├─ index.html          # 국가별 탭 + 상태 필터 + 비용 매트릭스 + 백엔드 연결 배지
   ├─ mockData.js         # 사양서 JSON 스키마 기반 더미 데이터(백엔드 미실행 시 폴백)
   └─ app.js              # 필터/매트릭스/요약/카톡복사 + 백엔드 로드
```

## 실행 방법

### ⭐ 가장 쉽게 — 간단 계산기 (설치 0)
`frontend/index.html` 을 더블클릭하세요. 끝.
숫자 몇 개 넣으면 1인당 비용이 바로 나오고(실시간 환율 자동), 카톡 공지까지 복사됩니다.
설치도, 서버도, API 키도 필요 없습니다.

### 고급 기능 (AI 견적 분석 · 매트릭스 · 서버 저장)
`골프총무-실행.bat` 더블클릭 → 처음 한 번만 준비(설치+키 입력) 후 `http://localhost:8787` 가 열립니다.
또는 수동으로:
```bash
cd backend
npm install
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
# .env 에 ANTHROPIC_API_KEY 입력 (AI 분석에만 필요)
npm start                   # http://localhost:8787
```
계산기 화면 우상단 「고급(매트릭스) 보기 →」 또는 `dashboard.html` 로 이동.

### 크롬 익스텐션 (선택)
1. 크롬 주소창에 `chrome://extensions` 입력
2. 우측 상단 **개발자 모드** 켜기
3. **압축해제된 확장 프로그램을 로드합니다** 클릭 → `extension/` 폴더 선택
4. 툴바의 골프총무 아이콘 클릭 → 우측 사이드패널 오픈
5. (선택) 웹페이지에서 텍스트 드래그 → 우클릭 → **⛳ 골프총무로 보내기**

## Phase 1 구현 범위

- [x] 익스텐션 기본 골격 (MV3, SidePanel, 컨텍스트 메뉴 수집, 목업 파서)
- [x] 대시보드 골격: 국가별 탭 / 상태 필터(PLANNING·COMPLETED)
- [x] 일정별 비용 매트릭스 테이블 (X축=비용항목, Y축=일차)
- [x] 셀 더블클릭 편집(데모), 금액 누락 ⚠️ 경고 표시
- [x] 실시간 환율 보정 요약(1인당 원화), 카톡 공유용 텍스트 복사
- [x] 사양서 JSON 스키마 기반 mockData 연동

## 다음 단계 (예정)

- **Phase 2**: 익스텐션 ↔ 실제 AI API(Gemini/Claude) 연동, 대시보드 영속 저장
- **Phase 3**: N빵 정산, 환율 실시간 API, 데이터 영속화/동기화
