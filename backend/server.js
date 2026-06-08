/**
 * 골프총무 백엔드 프록시 (Express)
 * - POST /api/parse  : 텍스트/이미지/PDF → Claude Opus 4.8 → 표준 trip JSON
 * - GET  /api/trips  : 저장된 여행 목록 (대시보드가 로드)
 * - POST /api/trips  : 여행 저장
 * - GET  /health     : 상태 확인
 *
 * API 키는 서버 환경변수(ANTHROPIC_API_KEY)에만 존재 → 클라이언트에 노출되지 않음.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { parseToTrip } from "./anthropic.js";
import { listTrips, saveTrip } from "./store.js";

const app = express();
app.use(cors()); // 익스텐션/대시보드 어디서든 호출 허용 (MVP). 운영 시 origin 제한 권장.
app.use(express.json({ limit: "25mb" })); // 이미지/PDF base64는 클 수 있음

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "golf-director-backend",
    model: "claude-opus-4-8",
    hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
  });
});

// 자료 → 표준 JSON 정제 (저장은 안 함)
app.post("/api/parse", async (req, res) => {
  try {
    const { inputs } = req.body || {};
    if (!Array.isArray(inputs) || inputs.length === 0) {
      return res.status(400).json({ error: "inputs[] (text/image/pdf)가 필요합니다." });
    }
    const trip = await parseToTrip(inputs);
    res.json({ trip });
  } catch (err) {
    console.error("[/api/parse]", err);
    res.status(500).json({ error: err?.message || "정제에 실패했습니다." });
  }
});

// 저장된 여행 목록
app.get("/api/trips", (_req, res) => {
  res.json({ trips: listTrips() });
});

// 여행 저장
app.post("/api/trips", (req, res) => {
  try {
    const { trip } = req.body || {};
    if (!trip || typeof trip !== "object") {
      return res.status(400).json({ error: "trip 객체가 필요합니다." });
    }
    const saved = saveTrip(trip);
    res.json({ trip: saved });
  } catch (err) {
    console.error("[/api/trips]", err);
    res.status(500).json({ error: err?.message || "저장에 실패했습니다." });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`⛳ 골프총무 backend → http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("⚠️  ANTHROPIC_API_KEY 가 설정되지 않았습니다. .env 를 확인하세요.");
  }
});
