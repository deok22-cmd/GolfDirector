/**
 * 골프총무 - 공개 결제내역 결과 페이지 (로그인 불필요)
 * 카톡 링크(share.html?id=...)로 접속 → 백엔드 공개 API에서 trip 조회 → 읽기전용 표시.
 * 환율은 공유 시점 스냅샷(fxSnapshot) 사용 → 총무가 본 금액과 동일.
 */
(function () {
  "use strict";
  const { FX_RATES, CURRENCY_SYMBOL } = window.GolfDirectorData;
  const $ = (id) => document.getElementById(id);
  const _self = (document.currentScript && document.currentScript.src) || location.href;
  const API_BASE = _self.replace(/\/[^/]*$/, "");
  const won = (n) => "₩" + Math.round(n || 0).toLocaleString("ko-KR");
  const sym = (c) => CURRENCY_SYMBOL[c] || c;
  const id = new URLSearchParams(location.search).get("id");

  const rateOf = (t, c) => (c === "KRW" ? 1 : (t.fxSnapshot && t.fxSnapshot[c]) ?? FX_RATES[c] ?? 0);
  function compute(t) {
    const party = Math.max(1, t.partySize || 1);
    let pp = 0, paid = 0, un = 0;
    for (const r of t.rows || []) {
      const krw = r.amount == null ? 0 : r.amount * rateOf(t, r.currency);
      const c = r.scope === "team" ? krw / party : krw;
      pp += c;
      if (r.paid) paid += c;
      else un += c;
    }
    return { perPerson: pp, group: pp * party, paid: paid * party, unpaid: un * party };
  }
  const esc = (s) => String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));

  async function load() {
    if (!id) return fail("잘못된 링크입니다.");
    try {
      const r = await fetch(API_BASE + "/api/share/" + encodeURIComponent(id), { cache: "no-store" });
      if (!r.ok) throw 0;
      render((await r.json()).trip);
    } catch {
      fail("내역을 찾을 수 없습니다. 링크가 만료되었거나 삭제되었을 수 있어요.");
    }
  }
  function fail(msg) {
    $("loading").textContent = msg;
  }
  function render(t) {
    const c = compute(t);
    $("s-owner").textContent = (t.owner || "총무") + " 총무님의 정산";
    $("s-title").textContent = t.title || "골프 여행";
    $("s-sub").textContent = [t.country, t.partySize + "명"].filter(Boolean).join(" · ");
    $("s-perperson").textContent = won(c.perPerson);
    $("s-group").textContent = won(c.group);
    $("s-paid").textContent = won(c.paid);
    $("s-unpaid").textContent = won(c.unpaid);
    $("s-rows").innerHTML = (t.rows || [])
      .filter((r) => (r.name || "").trim())
      .map((r) => {
        const tag = r.scope === "team" ? t.partySize + "명" : "1인";
        const amt =
          r.amount == null
            ? "미정"
            : r.currency === "KRW"
              ? won(r.amount)
              : `${sym(r.currency)}${r.amount.toLocaleString()} <span class="text-slate-400">(≈${won(r.amount * rateOf(t, r.currency))})</span>`;
        const badge = r.paid
          ? '<span class="text-[10px] bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5 font-bold">지급완료</span>'
          : '<span class="text-[10px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 font-bold">미지급</span>';
        return `<div class="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
          <div><div class="text-sm font-semibold text-slate-700">${esc(r.name)} <span class="text-[10px] text-slate-400">${tag}</span></div><div class="mt-0.5">${badge}</div></div>
          <div class="text-sm font-bold text-slate-800 text-right">${amt}</div>
        </div>`;
      })
      .join("");
    $("loading").classList.add("hidden");
    $("content").classList.remove("hidden");
  }

  load();
})();
