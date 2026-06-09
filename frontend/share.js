/**
 * 골프총무 - 공개 결제내역 결과 페이지 (로그인 불필요)
 * 전체 합계(전체/지급완료/미지급) + 개인별 정산(각자 낼 금액·미지급) + 본인 행 [계좌·금액 복사].
 * 환율은 공유 시점 스냅샷(fxSnapshot) 사용.
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
  const esc = (s) => String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  let TRIP = null;

  const letter = (i) => (i < 26 ? String.fromCharCode(65 + i) : "참가자" + (i + 1));
  const rateOf = (t, c) => (c === "KRW" ? 1 : (t.fxSnapshot && t.fxSnapshot[c]) ?? FX_RATES[c] ?? 0);
  function members(t) {
    return Array.isArray(t.members) && t.members.length
      ? t.members
      : Array.from({ length: Math.max(1, t.partySize || 1) }, () => "");
  }
  function compute(t) {
    const names = members(t);
    const N = names.length || 1;
    const per = names.map((nm, i) => ({ name: (nm && String(nm).trim()) || letter(i), total: 0, paid: 0, unpaid: 0 }));
    let g = 0, gp = 0, gu = 0;
    const addS = (p, s, paid) => { p.total += s; if (paid) p.paid += s; else p.unpaid += s; };
    for (const r of t.rows || []) {
      const krw = r.amount == null ? 0 : r.amount * rateOf(t, r.currency);
      const paid = !!r.paid;
      let ig;
      if (r.scope === "team") { const s = krw / N; per.forEach((p) => addS(p, s, paid)); ig = krw; }
      else if (r.scope === "specific") { let i = Number.isInteger(r.payer) ? r.payer : 0; if (i < 0 || i >= N) i = 0; addS(per[i], krw, paid); ig = krw; }
      else { per.forEach((p) => addS(p, krw, paid)); ig = krw * N; }
      g += ig; if (paid) gp += ig; else gu += ig;
    }
    if (Array.isArray(t.memberPaid)) per.forEach((p, i) => { if (t.memberPaid[i]) p.unpaid = 0; });
    return { members: per, group: g, paidGroup: gp, unpaidGroup: gu };
  }

  function copyText(text) {
    try { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text); return true; } } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      const ok = document.execCommand("copy"); document.body.removeChild(ta); return ok;
    } catch { return false; }
  }
  function toast(m) {
    const el = $("toast"); el.textContent = m;
    el.classList.add("opacity-100", "translate-y-0"); el.classList.remove("opacity-0", "translate-y-2");
    setTimeout(() => { el.classList.add("opacity-0", "translate-y-2"); el.classList.remove("opacity-100", "translate-y-0"); }, 2000);
  }

  async function load() {
    if (!id) return fail("잘못된 링크입니다.");
    try {
      const r = await fetch(API_BASE + "/api/share/" + encodeURIComponent(id), { cache: "no-store" });
      if (!r.ok) throw 0;
      TRIP = (await r.json()).trip;
      render(TRIP);
    } catch { fail("내역을 찾을 수 없습니다. 링크가 만료되었거나 삭제되었을 수 있어요."); }
  }
  function fail(msg) { $("loading").textContent = msg; }

  function acctStr(t) {
    return `${t.bankName || ""} ${t.accountNumber || ""}${t.accountHolder ? " (" + t.accountHolder + ")" : ""}`.replace(/\s+/g, " ").trim();
  }

  function render(t) {
    const c = compute(t);
    const hasAcct = (t.accountNumber || "").trim();
    $("s-owner").textContent = (t.owner || "총무") + " 총무님의 정산";
    $("s-title").textContent = t.title || "골프 여행";
    $("s-sub").textContent = [t.country, t.partySize + "명"].filter(Boolean).join(" · ");
    $("s-g-all").textContent = won(c.group);
    $("s-g-paid").textContent = won(c.paidGroup);
    $("s-g-unpaid").textContent = won(c.unpaidGroup);
    $("s-account-note").innerHTML = hasAcct
      ? `입금: <b class="text-slate-600">${esc(acctStr(t))}</b> — 본인 행의 <b>복사</b>를 눌러 보내세요`
      : "총무가 계좌를 등록하지 않았어요.";

    $("s-members").innerHTML = c.members
      .map((p, i) => {
        const badge = p.unpaid > 0
          ? `<span class="text-[11px] text-rose-500 font-semibold">미지급 ${won(p.unpaid)}</span>`
          : `<span class="text-[11px] text-emerald-600 font-semibold">완납</span>`;
        const copyBtn = hasAcct && p.unpaid > 0
          ? `<button data-copy="${i}" class="text-[11px] bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg px-2.5 py-1.5">복사</button>`
          : "";
        return `<div class="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
          <div><div class="text-sm font-bold text-slate-800">${esc(p.name)}</div><div>${badge}</div></div>
          <div class="flex items-center gap-2"><span class="text-sm font-bold text-slate-700">${won(p.total)}</span>${copyBtn}</div>
        </div>`;
      })
      .join("");
    $("s-members").querySelectorAll("[data-copy]").forEach((b) =>
      b.addEventListener("click", () => {
        const m = c.members[Number(b.dataset.copy)];
        const text = `${acctStr(t)} ${won(m.unpaid)}`.trim();
        if (copyText(text)) toast(m.name + "님 송금정보 복사됨! 토스 등에 붙여넣기");
        else toast("복사 실패 — 길게 눌러 복사하세요");
      })
    );

    // 상세 항목
    $("s-rows").innerHTML = (t.rows || [])
      .filter((r) => (r.name || "").trim())
      .map((r) => {
        let who = r.scope === "team" ? t.partySize + "명" : r.scope === "specific" ? ((members(t)[r.payer] || "").trim() || letter(r.payer || 0)) : "1인";
        const amt = r.amount == null ? "미정"
          : r.currency === "KRW" ? won(r.amount)
            : `${sym(r.currency)}${r.amount.toLocaleString()} <span class="text-slate-400">(≈${won(r.amount * rateOf(t, r.currency))})</span>`;
        const badge = r.paid
          ? '<span class="text-[10px] bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5 font-bold">지급완료</span>'
          : '<span class="text-[10px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 font-bold">미지급</span>';
        return `<div class="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
          <div><div class="text-sm font-semibold text-slate-700">${esc(r.name)} <span class="text-[10px] text-slate-400">${esc(who)}</span></div><div class="mt-0.5">${badge}</div></div>
          <div class="text-sm font-bold text-slate-800 text-right">${amt}</div>
        </div>`;
      })
      .join("");

    $("loading").classList.add("hidden");
    $("content").classList.remove("hidden");
  }

  load();
})();
