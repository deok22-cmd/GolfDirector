/**
 * 골프총무 백엔드 (Express) v2
 * - 인증: POST /api/auth/register | /api/auth/login,  GET /api/auth/me
 * - 여행(사용자 범위): GET/POST /api/trips,  PUT/DELETE /api/trips/:id
 * - (향후/유료) AI 견적 정제: POST /api/parse  (로그인 필요)
 * - 프론트(frontend/) 정적 서빙 → http://localhost:8787 한 주소
 */
import "dotenv/config";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { register, login, authMiddleware, publicUser } from "./auth.js";
import { db } from "./db.js";
import { parseToTrip } from "./anthropic.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

// 프론트 정적 서빙
const frontendDir = fileURLToPath(new URL("../frontend", import.meta.url));
app.use(express.static(frontendDir));

app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "golf-director", aiEnabled: Boolean(process.env.ANTHROPIC_API_KEY) })
);

// ---- 인증 ----
app.post("/api/auth/register", (req, res) => {
  try {
    res.json(register(req.body || {}));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});
app.post("/api/auth/login", (req, res) => {
  try {
    res.json(login(req.body || {}));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const u = db.findUserById(req.userId);
  if (!u) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
  res.json({ user: publicUser(u) });
});

// ---- 여행 CRUD (사용자 범위) ----
app.get("/api/trips", authMiddleware, (req, res) => {
  res.json({ trips: db.listTrips(req.userId) });
});
app.post("/api/trips", authMiddleware, (req, res) => {
  res.json({ trip: db.createTrip(req.userId, req.body?.trip || req.body || {}) });
});
app.put("/api/trips/:id", authMiddleware, (req, res) => {
  const trip = db.updateTrip(req.userId, req.params.id, req.body?.trip || req.body || {});
  if (!trip) return res.status(404).json({ error: "여행을 찾을 수 없습니다." });
  res.json({ trip });
});
app.delete("/api/trips/:id", authMiddleware, (req, res) => {
  const ok = db.deleteTrip(req.userId, req.params.id);
  if (!ok) return res.status(404).json({ error: "여행을 찾을 수 없습니다." });
  res.json({ ok: true });
});

// ---- (향후/유료) AI 견적 정제 — 로그인 필요 ----
app.post("/api/parse", authMiddleware, async (req, res) => {
  try {
    const { inputs } = req.body || {};
    if (!Array.isArray(inputs) || inputs.length === 0)
      return res.status(400).json({ error: "inputs[]가 필요합니다." });
    res.json({ trip: await parseToTrip(inputs) });
  } catch (e) {
    res.status(500).json({ error: e?.message || "정제 실패" });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`⛳ 골프총무 → http://localhost:${PORT}`);
  if (!process.env.JWT_SECRET)
    console.warn("⚠️  JWT_SECRET 미설정 — 개발용 기본키 사용 중. 배포 전 .env에 설정하세요.");
});
