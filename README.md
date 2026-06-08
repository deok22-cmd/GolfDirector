# ⛳ 골프총무 (Golf Director)

해외 골프 여행 총무를 위한 **일정 기반 비용 관리 & 시뮬레이터**.
크롬 익스텐션(MV3·SidePanel)으로 상품 페이지를 수집하고, 웹 대시보드에서 일정별 비용 매트릭스로 관리/시뮬레이션합니다.

## 프로젝트 구조 (Phase 1)

```
GolfDirector/
├─ overview.md            # 제품 기획 및 개발 사양서
├─ extension/             # 크롬 익스텐션 (Manifest V3 · SidePanel)
│  ├─ manifest.json
│  ├─ background.js       # 서비스워커: 사이드패널 오픈 + 컨텍스트 메뉴 수집
│  ├─ sidepanel.html      # 사이드패널 UI (텍스트 분석 → JSON 미리보기)
│  └─ sidepanel.js        # 목업 AI 파서 (Phase 2에서 실제 API 연동)
└─ frontend/              # 웹 대시보드 (SPA · Tailwind CSS)
   ├─ index.html          # 국가별 탭 + 상태 필터 + 비용 매트릭스 레이아웃
   ├─ mockData.js         # 사양서 JSON 스키마 기반 더미 데이터
   └─ app.js              # 필터/매트릭스/요약/카톡복사 렌더링 로직
```

## 실행 방법

### 웹 대시보드
`frontend/index.html` 을 브라우저로 직접 열면 됩니다. (Tailwind는 Play CDN 사용)

### 크롬 익스텐션
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
