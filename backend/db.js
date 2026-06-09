/**
 * 골프총무 백엔드 - JSON 파일 DB (사용자/여행)
 * 소규모 MVP용. 배포 시 SQLite/Postgres로 교체 쉬움.
 * 파일: backend/data/users.json, backend/data/trips.json (git 제외)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "data");
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const fileOf = (name) => join(dataDir, name + ".json");
const readAll = (name) => {
  try {
    return JSON.parse(readFileSync(fileOf(name), "utf8"));
  } catch {
    return [];
  }
};
const writeAll = (name, arr) => writeFileSync(fileOf(name), JSON.stringify(arr, null, 2), "utf8");

function sanitizeTrip(d) {
  return {
    title: String(d.title || "새 여행").slice(0, 100),
    country: String(d.country || ""),
    currency: String(d.currency || "KRW"),
    partySize: Math.max(1, Number(d.partySize) || 1),
    fxMode: d.fxMode === "manual" ? "manual" : "auto",
    manualFx: d.manualFx && typeof d.manualFx === "object" ? d.manualFx : {},
    bankName: String(d.bankName || "").slice(0, 40),
    accountNumber: String(d.accountNumber || "").slice(0, 50),
    accountHolder: String(d.accountHolder || "").slice(0, 40),
    rows: Array.isArray(d.rows)
      ? d.rows.slice(0, 100).map((r) => ({
          name: String(r.name || "").slice(0, 80),
          amount: r.amount === null || r.amount === "" ? null : Number(r.amount),
          currency: String(r.currency || "KRW"),
          scope: r.scope === "team" ? "team" : "person",
          paid: r.paid === true, // 지급완료 여부 (기본 미지급)
        }))
      : [],
  };
}

export const db = {
  // ---- users ----
  findUserByEmail(email) {
    return readAll("users").find((u) => u.email === String(email).toLowerCase());
  },
  findUserById(id) {
    return readAll("users").find((u) => u.id === id);
  },
  createUser({ email, passwordHash }) {
    const users = readAll("users");
    const user = {
      id: randomUUID(),
      email: String(email).toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    writeAll("users", users);
    return user;
  },

  // ---- trips (사용자 범위) ----
  listTrips(userId) {
    return readAll("trips")
      .filter((t) => t.userId === userId)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  },
  getTrip(userId, id) {
    return readAll("trips").find((t) => t.id === id && t.userId === userId) || null;
  },
  createTrip(userId, data) {
    const trips = readAll("trips");
    const now = new Date().toISOString();
    const trip = { id: randomUUID(), userId, ...sanitizeTrip(data), createdAt: now, updatedAt: now };
    trips.push(trip);
    writeAll("trips", trips);
    return trip;
  },
  updateTrip(userId, id, data) {
    const trips = readAll("trips");
    const idx = trips.findIndex((t) => t.id === id && t.userId === userId);
    if (idx < 0) return null;
    trips[idx] = {
      ...trips[idx],
      ...sanitizeTrip(data),
      id,
      userId,
      updatedAt: new Date().toISOString(),
    };
    writeAll("trips", trips);
    return trips[idx];
  },
  deleteTrip(userId, id) {
    const trips = readAll("trips");
    const next = trips.filter((t) => !(t.id === id && t.userId === userId));
    const removed = next.length !== trips.length;
    if (removed) writeAll("trips", next);
    return removed;
  },

  // ---- 공유(결과 페이지) ----
  findTripByShareId(shareId) {
    return readAll("trips").find((t) => t.shareId === shareId) || null;
  },
  // 공유 링크 생성/갱신: shareId(없으면 발급) + fxSnapshot(공유 시점 환율) 저장
  setShare(userId, id, fxSnapshot) {
    const trips = readAll("trips");
    const idx = trips.findIndex((t) => t.id === id && t.userId === userId);
    if (idx < 0) return null;
    if (!trips[idx].shareId) trips[idx].shareId = randomUUID().replace(/-/g, "").slice(0, 12);
    trips[idx].fxSnapshot = fxSnapshot && typeof fxSnapshot === "object" ? fxSnapshot : {};
    trips[idx].updatedAt = new Date().toISOString();
    writeAll("trips", trips);
    return trips[idx];
  },
};
