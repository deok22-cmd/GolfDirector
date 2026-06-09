/**
 * 골프총무 - 공개 결제내역 결과 페이지 (로그인 불필요)
 * 카톡 링크(share.html?id=...)로 접속 → 공개 API에서 trip 조회 → 읽기전용 표시.
 * 환율은 공유 시점 스냅샷(fxSnapshot) 사용. 1인당/전체 × 전체/지급완료/미지급 6값 + 계좌 복사.
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
  let TRIP = null;

  const rateOf = (t, c) => (c === "KRW" ? 1 : (t.fxSnapshot && t.fxSnapshot[c]) ?? FX_RATES[c] ?? 0);
  function compute(t) {
    const party = Math.max(1, t.partySize || 1);
    let pp = 0, ppPaid = 0, ppUnpaid = 0;
    for (const r of t.rows || []) {
      const krw = r.amount == null ? 0 : r.amount * rateOf(t, r.currency);
      const c = r.scope === "team" ? krw / party : krw;
      pp += c;
      if (r.paid) ppPaid += c;
      else ppUnpaid += c;
    }
    return {
      perPerson: pp, paidPerPerson: ppPaid, unpaidPerPerson: ppUnpaid,
      group: pp * party, paidGroup: ppPaid * party, unpaidGroup: ppUnpaid * party,
    };
  }
  const esc = (s) => String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));

  function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text); return true; }
    } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  }
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("opacity-100", "translate-y-0");
    el.classList.remove("opacity-0", "translate-y-2");
    setTimeout(() => {
      el.classList.remove("opacity-100", "translate-y-0");
      el.classList.add("opacity-0", "translate-y-2");
    }, 2000);
  }

  async function load() {
    if (!id) return fail("잘못된 링크입니다.");
    try {
      const r = await fetch(API_BASE + "/api/share/" + encodeURIComponent(id), { cache: "no-store" });
      if (!r.ok) throw 0;
      TRIP = (await r.json()).trip;
      render(TRIP);
    } catch {
      fail("내역을 찾을 수 없습니다. 링크가 만료되었거나 삭제되었을 수 있어요.");
    }
  }
  function fail(msg) { $("loading").textContent = msg; }

  function render(t) {
    const c = compute(t);
    $("s-owner").textContent = (t.owner || "총무") + " 총무님의 정산";
    $("s-title").textContent = t.title || "골프 여행";
    $("s-sub").textContent = [t.country, t.partySize + "명"].filter(Boolean).join(" · ");
    $("s-ppl").textContent = t.partySize;
    $("s-pp-all").textContent = won(c.perPerson);
    $("s-pp-paid").textContent = won(c.paidPerPerson);
    $("s-pp-unpaid").textContent = won(c.unpaidPerPerson);
    $("s-g-all").textContent = won(c.group);
    $("s-g-paid").textContent = won(c.paidGroup);
    $("s-g-unpaid").textContent = won(c.unpaidGroup);

    // 내 미지급 송금
    $("s-mypay").textContent = won(c.unpaidPerPerson);
    const hasAccount = (t.accountNumber || "").trim();
    if (hasAccount) {
      $("s-account").innerHTML = `입금: <b>${esc(t.bankName || "")} ${esc(t.accountNumber)}</b>${t.accountHolder ? " · 예금주 " + esc(t.accountHolder) : ""}`;
      $("s-copy").disabled = false;
    } else {
      $("s-account").textContent = "총무가 계좌를 등록하지 않았어요.";
      $("s-copy").classList.add("hidden");
    }

    // 상세 항목
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

  // 계좌·금액 복사 (토스 송금용)
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "s-copy" && TRIP) {
      const c = compute(TRIP);
      const text = `${TRIP.bankName || ""} ${TRIP.accountNumber || ""} ${TRIP.accountHolder ? "(" + TRIP.accountHolder + ")" : ""} ${won(c.unpaidPerPerson)}`.replace(/\s+/g, " ").trim();
      if (copyText(text)) toast("복사됐어요! 토스 등에서 붙여넣어 송금하세요");
      else toast("복사 실패 — 길게 눌러 복사하세요");
    }
  });

  load();
})();
