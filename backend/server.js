/**
 * 골프총무 백엔드 (Express) v2
 * - 인증: POST {BASE}/api/auth/register | /login,  GET {BASE}/api/auth/me
 * - 여행(사용자 범위): GET/POST {BASE}/api/trips,  PUT/DELETE {BASE}/api/trips/:id
 * - (향후/유료) AI 견적 정제: POST {BASE}/api/parse  (로그인 필요)
 * - 프론트(frontend/) 정적 서빙
 *
 * BASE_PATH 환경변수로 서브경로 배포 지원(예: "/golfChongmu"). 로컬은 "" (루트).
 */
import "dotenv/config";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { register, login, authMiddleware, adminMiddleware, publicUser } from "./auth.js";
import { db } from "./db.js";
import { parseToTrip } from "./anthropic.js";

const app = express();
const BASE = process.env.BASE_PATH || ""; // 예: "/golfChongmu"
const P = (s) => BASE + s;

app.use(cors());
app.use(express.json({ limit: "25mb" }));

const frontendDir = fileURLToPath(new URL("../frontend", import.meta.url));

// 서브경로 무(無)슬래시 → 슬래시 리다이렉트 (정확히 슬래시 없을 때만; 루프 방지)
if (BASE) {
  app.get(BASE, (req, res, next) => {
    if (req.originalUrl.split("?")[0] === BASE) return res.redirect(301, BASE + "/");
    next();
  });
}

// 정적 프론트 서빙
app.use(BASE + "/", express.static(frontendDir));

app.get(P("/health"), (_req, res) =>
  res.json({ ok: true, service: "golf-director", base: BASE || "/", aiEnabled: Boolean(process.env.ANTHROPIC_API_KEY) })
);

// ---- 인증 ----
app.post(P("/api/auth/register"), (req, res) => {
  try {
    res.json(register(req.body || {}));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});
app.post(P("/api/auth/login"), (req, res) => {
  try {
    res.json(login(req.body || {}));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});
app.get(P("/api/auth/me"), authMiddleware, (req, res) => {
  const u = db.findUserById(req.userId);
  if (!u) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
  res.json({ user: publicUser(u) });
});

// ---- 여행 CRUD (사용자 범위) ----
app.get(P("/api/trips"), authMiddleware, (req, res) => {
  res.json({ trips: db.listTrips(req.userId) });
});
app.post(P("/api/trips"), authMiddleware, (req, res) => {
  res.json({ trip: db.createTrip(req.userId, req.body?.trip || req.body || {}) });
});
app.put(P("/api/trips/:id"), authMiddleware, (req, res) => {
  const trip = db.updateTrip(req.userId, req.params.id, req.body?.trip || req.body || {});
  if (!trip) return res.status(404).json({ error: "여행을 찾을 수 없습니다." });
  res.json({ trip });
});
app.delete(P("/api/trips/:id"), authMiddleware, (req, res) => {
  const ok = db.deleteTrip(req.userId, req.params.id);
  if (!ok) return res.status(404).json({ error: "여행을 찾을 수 없습니다." });
  res.json({ ok: true });
});

// ---- 공유 결과 페이지 ----
// 공유 링크 생성/갱신 (로그인 필요)
app.post(P("/api/trips/:id/share"), authMiddleware, (req, res) => {
  const t = db.setShare(req.userId, req.params.id, req.body?.fxSnapshot || {});
  if (!t) return res.status(404).json({ error: "여행을 찾을 수 없습니다." });
  res.json({ shareId: t.shareId });
});
// 공개 조회 (로그인 불필요) — 일행이 링크로 상세 조회
app.get(P("/api/share/:shareId"), (req, res) => {
  const t = db.findTripByShareId(req.params.shareId);
  if (!t) return res.status(404).json({ error: "공유된 내역을 찾을 수 없습니다." });
  const owner = db.findUserById(t.userId);
  res.json({
    trip: {
      title: t.title,
      country: t.country,
      currency: t.currency,
      startDate: t.startDate || "",
      endDate: t.endDate || "",
      partySize: t.partySize,
      members: t.members || [],
      rows: t.rows,
      fxSnapshot: t.fxSnapshot || {},
      bankName: t.bankName || "",
      accountNumber: t.accountNumber || "",
      accountHolder: t.accountHolder || "",
      owner: owner ? owner.email.split("@")[0] : "총무",
      updatedAt: t.updatedAt,
    },
  });
});

// ---- 공개 공지 (앱에서 배너 표시용) ----
app.get(P("/api/notice"), (_req, res) => res.json({ notice: db.getNotice() }));

// ---- 관리자 (deok22@gmail.com 등 ADMIN_EMAILS) ----
app.get(P("/api/admin/stats"), adminMiddleware, (_req, res) => {
  const users = db.listAllUsers();
  const trips = db.listAllTrips();
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    userCount: users.length,
    tripCount: trips.length,
    todaySignups: users.filter((u) => String(u.createdAt).slice(0, 10) === today).length,
    recentUsers: users.slice(-6).reverse(),
  });
});
app.get(P("/api/admin/users"), adminMiddleware, (_req, res) => res.json({ users: db.listAllUsers() }));
app.delete(P("/api/admin/users/:id"), adminMiddleware, (req, res) => {
  db.deleteUserCascade(req.params.id);
  res.json({ ok: true });
});
app.get(P("/api/admin/trips"), adminMiddleware, (_req, res) => res.json({ trips: db.listAllTrips() }));
app.delete(P("/api/admin/trips/:id"), adminMiddleware, (req, res) => {
  res.json({ ok: db.deleteAnyTrip(req.params.id) });
});
app.get(P("/api/admin/notice"), adminMiddleware, (_req, res) => res.json({ notice: db.getNotice() }));
app.put(P("/api/admin/notice"), adminMiddleware, (req, res) => res.json({ notice: db.setNotice(req.body?.notice) }));

// ---- (향후/유료) AI 견적 정제 — 로그인 필요 ----
app.post(P("/api/parse"), authMiddleware, async (req, res) => {
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
  console.log(`⛳ 골프총무 → http://localhost:${PORT}${BASE || ""}/`);
  if (!process.env.JWT_SECRET)
    console.warn("⚠️  JWT_SECRET 미설정 — 개발용 기본키 사용 중. 배포 전 .env에 설정하세요.");
});
