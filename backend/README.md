# 골프총무 백엔드 프록시

Claude Opus 4.8를 이용해 여행 자료(텍스트·이미지·PDF)를 표준 trip JSON으로 정제하고, 여행을 저장/조회하는 프록시 서버. **API 키는 이 서버에만 보관**되어 클라이언트(익스텐션/대시보드)에 노출되지 않습니다.

## 설정 & 실행

```bash
cd backend
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
# .env 를 열어 ANTHROPIC_API_KEY 채우기
npm start                   # http://localhost:8787
```

> 개발 중 자동 재시작: `npm run dev`

## 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/health` | 상태 확인(키 설정 여부 포함) |
| POST | `/api/parse` | `{ inputs: [...] }` → `{ trip }` 정제 |
| GET | `/api/trips` | `{ trips: [...] }` 저장된 여행 목록 |
| POST | `/api/trips` | `{ trip }` 저장 → `{ trip }`(trip_id 부여) |

### `/api/parse` 입력 형식
```json
{
  "inputs": [
    { "kind": "text", "text": "여행사 상품 설명 텍스트..." },
    { "kind": "image", "mediaType": "image/png", "data": "<base64>" },
    { "kind": "pdf", "data": "<base64>" }
  ]
}
```
→ Claude Opus 4.8가 멀티모달로 읽어 `schema.js`의 표준 스키마에 맞는 JSON 반환.

## 모델/프롬프트
- 모델: `claude-opus-4-8` (멀티모달 + structured outputs)
- 출력 강제: `output_config.format`(JSON Schema) → 반드시 표준 trip 형태
- 누락 비용 항목은 `amount: null` (대시보드에서 ⚠️ 경고)
- 프롬프트/스키마: `schema.js`

## 저장
Phase 2는 `trips.json` 파일 기반 간이 저장(서버 폴더에 생성, git 제외). Phase 3에서 실제 DB로 교체 예정.

## 배포 (선택)
Render / Railway / Fly.io 등에 Node 앱으로 배포 후, 환경변수 `ANTHROPIC_API_KEY` 설정.
익스텐션·대시보드의 백엔드 URL을 배포 주소로 바꾸면 됩니다.
