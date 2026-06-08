/**
 * 골프총무 (Golf Director) - SidePanel Logic (Phase 1)
 * - 컨텍스트 메뉴로 전달된 선택 텍스트 수신
 * - [페이지 분석] 시 목업 파서로 표준 JSON 생성 (Phase 2에서 실제 AI API 연동)
 */

const $ = (id) => document.getElementById(id);

const els = {
  text: $("capture-text"),
  analyze: $("btn-analyze"),
  clear: $("btn-clear"),
  send: $("btn-send"),
  output: $("json-output"),
  badge: $("status-badge"),
};

// 백그라운드(컨텍스트 메뉴)에서 저장한 캡처 텍스트 불러오기
async function loadPendingCapture() {
  try {
    const { pendingCapture } = await chrome.storage.local.get("pendingCapture");
    if (pendingCapture?.text) {
      els.text.value = pendingCapture.text;
      await chrome.storage.local.remove("pendingCapture");
      setBadge("수집됨", "bg-amber-100 text-amber-700");
    }
  } catch (e) {
    /* 익스텐션 컨텍스트 밖(파일 직접 열람)에서는 무시 */
  }
}

function setBadge(label, cls) {
  els.badge.textContent = label;
  els.badge.className = "text-[10px] px-2 py-0.5 rounded-full " + cls;
}

/**
 * 목업 AI 파서 — 실제로는 Phase 2에서 텍스트를 Gemini/Claude API로 보내
 * 표준 스키마(JSON)로 정제하여 받게 됩니다.
 * 여기서는 사양서 스키마 구조에 맞춘 샘플 결과를 반환합니다.
 */
function mockParse(rawText) {
  const guessTitle =
    (rawText.match(/.{0,40}(골프|패키지|CC|컨트리클럽).{0,20}/) || [])[0]?.trim() ||
    "분석된 골프 상품";

  return {
    trip_id: "draft-" + Math.random().toString(36).slice(2, 8),
    title: guessTitle.slice(0, 40),
    country: "THB",
    status: "PLANNING",
    total_days: null, // 텍스트에서 추출 실패 시 null → 대시보드 누락 경고
    party_size: 4,
    current_fx_rate: 37.5,
    created_at: new Date().toISOString().slice(0, 10),
    summary: {
      prepaid_krw_per_person: null,
      local_estimated_krw_per_person: null,
      final_total_krw_per_person: null,
    },
    itinerary: [
      {
        day: 1,
        description: "(AI 추출 예정)",
        expenses: [
          { item: "패키지기본가", amount: null, currency: "KRW", pay_type: "PREPAID" },
          { item: "캐디팁", amount: null, currency: "THB", pay_type: "LOCAL" },
        ],
      },
    ],
    _meta: { source_chars: rawText.length, parsed_by: "mock(phase1)" },
  };
}

els.analyze.addEventListener("click", () => {
  const raw = els.text.value.trim();
  if (!raw) {
    setBadge("텍스트 없음", "bg-rose-100 text-rose-700");
    return;
  }
  setBadge("분석 중…", "bg-blue-100 text-blue-700");

  // 실제 API 호출 지연을 흉내
  setTimeout(() => {
    const result = mockParse(raw);
    els.output.textContent = JSON.stringify(result, null, 2);
    els.send.disabled = false;
    setBadge("정제 완료", "bg-emerald-100 text-emerald-700");
  }, 600);
});

els.clear.addEventListener("click", () => {
  els.text.value = "";
  els.output.textContent = "// 분석 결과가 여기에 표시됩니다.";
  els.send.disabled = true;
  setBadge("대기", "bg-slate-100 text-slate-400");
});

els.send.addEventListener("click", () => {
  // Phase 2: 웹 대시보드 DB / chrome.storage 로 저장 연동 예정
  setBadge("저장(예정)", "bg-slate-200 text-slate-600");
  els.send.textContent = "✅ 저장 큐에 담김 (Phase 2 연동 예정)";
  setTimeout(() => {
    els.send.textContent = "📤 대시보드로 저장 (Phase 2 연동 예정)";
  }, 1800);
});

loadPendingCapture();
