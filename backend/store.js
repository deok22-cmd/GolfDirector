/**
 * 골프총무 백엔드 - 여행 저장소 (Phase 2: 파일 기반 간이 저장)
 * trips.json 파일에 trip 배열을 보관. Phase 3에서 실제 DB로 교체 예정.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const FILE = new URL("./trips.json", import.meta.url);

function load() {
  try {
    return JSON.parse(readFileSync(FILE, "utf8"));
  } catch {
    return []; // 파일 없음/손상 → 빈 목록
  }
}

function persist(arr) {
  writeFileSync(FILE, JSON.stringify(arr, null, 2), "utf8");
}

export function listTrips() {
  return load();
}

/**
 * trip 저장(또는 같은 trip_id면 갱신). trip_id/created_at은 여기서 부여.
 */
export function saveTrip(trip) {
  const arr = load();
  const today = new Date().toISOString().slice(0, 10);
  const saved = {
    ...trip,
    trip_id: trip.trip_id || `trip-${randomUUID().slice(0, 8)}`,
    created_at: trip.created_at || today,
  };
  const idx = arr.findIndex((t) => t.trip_id === saved.trip_id);
  if (idx >= 0) arr[idx] = saved;
  else arr.push(saved);
  persist(arr);
  return saved;
}
