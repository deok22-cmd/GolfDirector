/**
 * 골프총무 관리자 페이지 (ADMIN_EMAILS 계정만)
 * 통계 / 회원 관리 / 전체 여행 조회·삭제 / 공지 설정.
 * 토큰은 메인 앱과 공유(localStorage gd_token). 관리자 아니면 403 → 접근 차단.
 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const _self = (document.currentScript && document.currentScript.src) || location.href;
  const API_BASE = _self.replace(/\/[^/]*$/, "");
  const token = localStorage.getItem("gd_token") || "";
  const won = (n) => "₩" + Math.round(n || 0).toLocaleString("ko-KR");
  const esc = (s) => String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));

  async function api(method, path, body) {
    const r = await fetch(API_BASE + path, {
      method,
      headers: { "content-type": "application/json", authorization: "Bearer " + token },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || "오류 " + r.status); e.status = r.status; throw e; }
    return j;
  }
  function toast(m) {
    const el = $("toast"); el.textContent = m;
    el.classList.add("opacity-100", "translate-y-0"); el.classList.remove("opacity-0", "translate-y-2");
    setTimeout(() => { el.classList.add("opacity-0", "translate-y-2"); el.classList.remove("opacity-100", "translate-y-0"); }, 2000);
  }

  let TAB = "stats";
  function setTab(t) {
    TAB = t;
    document.querySelectorAll(".tab").forEach((b) => {
      const on = b.dataset.tab === t;
      b.className = "tab px-3 py-2 text-sm font-bold border-b-2 " + (on ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500");
    });
    render();
  }

  async function render() {
    const p = $("panel");
    p.innerHTML = '<div class="text-slate-400 text-sm py-10 text-center">불러오는 중…</div>';
    try {
      if (TAB === "stats") return renderStats(p, await api("GET", "/api/admin/stats"));
      if (TAB === "users") return renderUsers(p, await api("GET", "/api/admin/users"));
      if (TAB === "trips") return renderTrips(p, await api("GET", "/api/admin/trips"));
      if (TAB === "notice") return renderNotice(p, await api("GET", "/api/admin/notice"));
    } catch (e) {
      p.innerHTML = `<div class="text-rose-600 text-sm py-10 text-center">${esc(e.message)}</div>`;
    }
  }

  function card(label, value) {
    return `<div class="bg-white rounded-2xl border border-slate-200 p-4 text-center">
      <div class="text-3xl font-extrabold text-emerald-700">${value}</div>
      <div class="text-[11px] text-slate-400 mt-1">${label}</div></div>`;
  }
  function renderStats(p, s) {
    p.innerHTML = `
      <div class="grid grid-cols-3 gap-3 mb-4">
        ${card("총 회원", s.userCount)}${card("총 여행", s.tripCount)}${card("오늘 가입", s.todaySignups)}
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-4">
        <div class="text-[11px] font-bold text-slate-500 mb-2">최근 가입</div>
        ${(s.recentUsers || []).map((u) => `<div class="flex justify-between py-1.5 border-b border-slate-100 last:border-0 text-sm"><span class="font-semibold">${esc(u.email)}</span><span class="text-slate-400 text-xs">${String(u.createdAt).slice(0, 10)} · 여행 ${u.tripCount}</span></div>`).join("") || '<div class="text-slate-400 text-sm">없음</div>'}
      </div>`;
  }
  function renderUsers(p, d) {
    const us = d.users || [];
    p.innerHTML = `<div class="text-[11px] text-slate-400 mb-2">총 ${us.length}명</div>
      <div class="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
      ${us.map((u) => `<div class="flex items-center justify-between p-3">
        <div><div class="text-sm font-semibold">${esc(u.email)}</div><div class="text-[11px] text-slate-400">${String(u.createdAt).slice(0, 10)} · 여행 ${u.tripCount}개</div></div>
        <button data-del-user="${u.id}" data-email="${esc(u.email)}" class="text-[11px] text-rose-500 font-semibold">삭제</button>
      </div>`).join("") || '<div class="p-4 text-slate-400 text-sm">회원이 없습니다.</div>'}
      </div>`;
    p.querySelectorAll("[data-del-user]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm(`'${b.dataset.email}' 회원과 그 여행을 모두 삭제할까요?`)) return;
      try { await api("DELETE", "/api/admin/users/" + b.dataset.delUser); toast("삭제됨"); render(); } catch (e) { toast(e.message); }
    }));
  }
  function renderTrips(p, d) {
    const ts = d.trips || [];
    p.innerHTML = `<div class="text-[11px] text-slate-400 mb-2">총 ${ts.length}개</div>
      <div class="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
      ${ts.map((t) => `<div class="flex items-center justify-between p-3">
        <div class="min-w-0"><div class="text-sm font-semibold truncate">${esc(t.title || "(제목없음)")}</div><div class="text-[11px] text-slate-400">${esc(t.owner)} · ${esc(t.country || "")} · ${t.partySize}명 · ${(t.rows || []).length}항목</div></div>
        <div class="flex gap-2 flex-shrink-0 pl-2">
          ${t.shareId ? `<a href="./share.html?id=${t.shareId}" target="_blank" class="text-[11px] text-emerald-700 font-semibold">보기</a>` : ""}
          <button data-del-trip="${t.id}" class="text-[11px] text-rose-500 font-semibold">삭제</button>
        </div>
      </div>`).join("") || '<div class="p-4 text-slate-400 text-sm">여행이 없습니다.</div>'}
      </div>`;
    p.querySelectorAll("[data-del-trip]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("이 여행을 삭제할까요?")) return;
      try { await api("DELETE", "/api/admin/trips/" + b.dataset.delTrip); toast("삭제됨"); render(); } catch (e) { toast(e.message); }
    }));
  }
  function renderNotice(p, d) {
    p.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200 p-4">
        <div class="text-[11px] font-bold text-slate-500 mb-1">서비스 공지 (로그인 화면 등에 표시)</div>
        <textarea id="notice-text" rows="4" class="w-full text-sm border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-emerald-200">${esc(d.notice || "")}</textarea>
        <button id="notice-save" class="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl">저장</button>
        <p class="text-[11px] text-slate-400 mt-1">비워서 저장하면 공지가 사라집니다.</p>
      </div>`;
    $("notice-save").addEventListener("click", async () => {
      try { await api("PUT", "/api/admin/notice", { notice: $("notice-text").value }); toast("공지 저장됨"); } catch (e) { toast(e.message); }
    });
  }

  // 진입: 관리자 검증
  async function init() {
    if (!token) { $("gate").innerHTML = '로그인이 필요합니다. <a href="./" class="text-emerald-700 underline font-semibold">로그인하러 가기</a>'; return; }
    try {
      await api("GET", "/api/admin/stats"); // 403이면 관리자 아님
    } catch (e) {
      $("gate").innerHTML = e.status === 403
        ? '관리자 권한이 없는 계정입니다. <a href="./" class="text-emerald-700 underline font-semibold">서비스로</a>'
        : '로그인이 필요합니다. <a href="./" class="text-emerald-700 underline font-semibold">로그인</a>';
      return;
    }
    $("gate").classList.add("hidden");
    $("admin").classList.remove("hidden");
    document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
    setTab("stats");
  }
  init();
})();
