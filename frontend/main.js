/**
 * 골프총무 v2 — 프론트 컨트롤러
 * 회원가입/로그인 · 내 여행 목록 CRUD · 여행별 계산기(국가→통화, 실시간/수동 환율, 1인/팀 N빵, 카톡)
 * 바닐라 JS(빌드 없음). 백엔드: 같은 주소(서빙) 또는 localhost(파일 열람).
 */
(function () {
  "use strict";

  const { FX_RATES, CURRENCY_SYMBOL, COUNTRY_CATALOG } = window.GolfDirectorData;
  const CURRENCIES = Object.keys(CURRENCY_SYMBOL);
  const $ = (id) => document.getElementById(id);
  // API 주소를 main.js 자신의 위치에서 도출 → 루트(/)든 서브경로(/golfChongmu/)든 자동 대응
  const _selfSrc = (document.currentScript && document.currentScript.src) || (location.origin + location.pathname);
  const API_BASE = _selfSrc.replace(/\/[^/]*$/, ""); // .../golfChongmu (main.js 디렉토리, 끝슬래시 제거)

  const session = { token: localStorage.getItem("gd_token") || "", email: localStorage.getItem("gd_email") || "" };
  let authMode = "login"; // login | register
  const liveFx = {}; // 통화 → 원 (실시간)
  let fxLoaded = false;
  const state = { trip: null, lastFxKey: "" };

  // ---------------- 유틸 ----------------
  const won = (n) => "₩" + Math.round(n || 0).toLocaleString("ko-KR");
  const sym = (c) => CURRENCY_SYMBOL[c] || c;
  const catalogCurrency = (name) => (COUNTRY_CATALOG.find((c) => c.name === name) || {}).currency;

  function rateOf(trip, c) {
    if (c === "KRW") return 1;
    return (trip.manualFx && trip.manualFx[c]) ?? liveFx[c] ?? FX_RATES[c] ?? 0;
  }
  function computeTrip(trip) {
    const party = Math.max(1, Number(trip.partySize) || 1);
    let pp = 0, ppPaid = 0, ppUnpaid = 0;
    for (const r of trip.rows || []) {
      const krw = r.amount == null ? 0 : r.amount * rateOf(trip, r.currency);
      const c = r.scope === "team" ? krw / party : krw;
      pp += c;
      if (r.paid) ppPaid += c;
      else ppUnpaid += c;
    }
    return {
      perPerson: pp,
      group: pp * party,
      paidGroup: ppPaid * party,
      unpaidGroup: ppUnpaid * party,
      paidPerPerson: ppPaid,
      unpaidPerPerson: ppUnpaid,
      hasMissing: (trip.rows || []).some((r) => r.amount == null && (r.name || "").trim()),
    };
  }
  // 통화 선택 옵션: KRW · 주통화 · 나머지 순
  function currencyOptions(selected, main) {
    const order = [...new Set(["KRW", main, ...CURRENCIES].filter(Boolean))];
    return order.map((c) => `<option value="${c}" ${c === selected ? "selected" : ""}>${sym(c)} ${c}</option>`).join("");
  }
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("opacity-100", "translate-y-0");
    el.classList.remove("opacity-0", "translate-y-2");
    setTimeout(() => {
      el.classList.remove("opacity-100", "translate-y-0");
      el.classList.add("opacity-0", "translate-y-2");
    }, 1900);
  }

  // ---------------- API ----------------
  async function api(method, path, body) {
    const headers = { "content-type": "application/json" };
    if (session.token) headers.authorization = "Bearer " + session.token;
    let r;
    try {
      r = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch {
      const e = new Error("서버에 연결할 수 없어요. ‘골프총무-실행.bat’으로 서버를 켠 뒤, 주소창에 http://localhost:8787 로 접속해 주세요.");
      e.status = 0;
      throw e;
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(j.error || `오류 ${r.status}`);
      e.status = r.status;
      throw e;
    }
    return j;
  }

  // ---------------- 뷰 전환 ----------------
  function showView(name) {
    ["auth", "list", "editor"].forEach((v) => $("view-" + v).classList.toggle("hidden", v !== name));
    $("topbar").classList.toggle("hidden", name === "auth");
    $("ad-slot").classList.toggle("hidden", name === "auth");
    window.scrollTo(0, 0);
  }

  // ---------------- 인증 ----------------
  function setAuthMode(m) {
    authMode = m;
    $("tab-login").className = "flex-1 py-2 rounded-lg text-sm font-bold " + (m === "login" ? "bg-white shadow-sm" : "text-slate-500");
    $("tab-register").className = "flex-1 py-2 rounded-lg text-sm font-bold " + (m === "register" ? "bg-white shadow-sm" : "text-slate-500");
    $("auth-submit").textContent = m === "login" ? "로그인" : "회원가입";
    $("auth-pw").autocomplete = m === "login" ? "current-password" : "new-password";
    $("auth-error").classList.add("hidden");
  }
  async function submitAuth() {
    const email = $("auth-email").value.trim();
    const password = $("auth-pw").value;
    $("auth-error").classList.add("hidden");
    try {
      const { token, user } = await api("POST", "/api/auth/" + (authMode === "login" ? "login" : "register"), { email, password });
      session.token = token;
      session.email = user.email;
      localStorage.setItem("gd_token", token);
      localStorage.setItem("gd_email", user.email);
      enterApp();
    } catch (e) {
      const el = $("auth-error");
      el.textContent = e.message;
      el.classList.remove("hidden");
    }
  }
  function logout() {
    session.token = "";
    session.email = "";
    localStorage.removeItem("gd_token");
    localStorage.removeItem("gd_email");
    showView("auth");
  }

  // ---------------- 목록 ----------------
  async function loadList() {
    let trips = [];
    try {
      trips = (await api("GET", "/api/trips")).trips || [];
    } catch (e) {
      if (e.status === 401) return logout();
      toast(e.message);
    }
    renderList(trips);
    showView("list");
  }
  function renderList(trips) {
    const wrap = $("trip-cards");
    $("list-empty").classList.toggle("hidden", trips.length > 0);
    wrap.innerHTML = trips
      .map((t) => {
        const { perPerson } = computeTrip(t);
        return `<div class="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between active:bg-slate-50" data-open="${t.id}">
          <div class="min-w-0">
            <div class="font-bold text-slate-800 truncate">${escapeHtml(t.title || "제목 없음")}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(t.country || "국가 미설정")} · ${t.partySize || 1}명 · ${(t.rows || []).length}개 항목</div>
          </div>
          <div class="text-right flex-shrink-0 pl-3">
            <div class="text-emerald-700 font-extrabold">${won(perPerson)}</div>
            <div class="text-[10px] text-slate-400">1인당</div>
          </div>
        </div>`;
      })
      .join("");
    wrap.querySelectorAll("[data-open]").forEach((el) =>
      el.addEventListener("click", () => openEditor(trips.find((t) => t.id === el.dataset.open)))
    );
  }

  // ---------------- 에디터 ----------------
  function newTrip() {
    const country = COUNTRY_CATALOG[0]?.name || "";
    return {
      title: "",
      country,
      currency: catalogCurrency(country) || "KRW",
      partySize: 4,
      manualFx: {},
      bankName: "",
      accountNumber: "",
      accountHolder: "",
      rows: [
        { name: "패키지(항공+숙박+그린피)", amount: null, currency: "KRW", scope: "person" },
        { name: "캐디팁", amount: null, currency: catalogCurrency(country) || "KRW", scope: "person" },
      ],
    };
  }

  function openEditor(trip) {
    state.trip = trip ? JSON.parse(JSON.stringify(trip)) : newTrip();
    if (!state.trip.manualFx) state.trip.manualFx = {};
    state.lastFxKey = "";
    $("ed-title").value = state.trip.title || "";
    $("ed-party").value = state.trip.partySize || 1;
    $("ed-bank").value = state.trip.bankName || "";
    $("ed-holder").value = state.trip.accountHolder || "";
    $("ed-account").value = state.trip.accountNumber || "";
    $("ed-delete").classList.toggle("hidden", !state.trip.id);
    fillCountrySelect();
    renderRows();
    recompute();
    showView("editor");
  }

  function fillCountrySelect() {
    const sel = $("ed-country");
    const names = COUNTRY_CATALOG.map((c) => c.name);
    if (state.trip.country && !names.includes(state.trip.country)) names.push(state.trip.country);
    sel.innerHTML = names.map((n) => `<option value="${escapeAttr(n)}" ${n === state.trip.country ? "selected" : ""}>${escapeHtml(n)}</option>`).join("");
  }

  function renderRows() {
    const wrap = $("ed-rows");
    const main = state.trip.currency;
    wrap.innerHTML = state.trip.rows
      .map(
        (r, i) => `
      <div class="grid grid-cols-[1fr_auto] gap-2 items-center">
        <input data-i="${i}" data-f="name" type="text" value="${escapeAttr(r.name)}" placeholder="항목명"
          class="row-in border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
        <div class="flex items-center gap-1">
          <button data-paid="${i}" class="text-[11px] font-bold px-2 py-1.5 rounded-lg whitespace-nowrap ${r.paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}">${r.paid ? "지급완료" : "미지급"}</button>
          <button data-del="${i}" class="text-slate-300 hover:text-rose-500 text-lg px-1">✕</button>
        </div>
        <div class="col-span-2 grid grid-cols-[1fr_84px_92px] gap-2">
          <input data-i="${i}" data-f="amount" type="text" inputmode="numeric" value="${r.amount == null ? "" : r.amount.toLocaleString()}" placeholder="금액"
            class="row-in text-right border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          <select data-i="${i}" data-f="currency" class="row-in border border-slate-300 rounded-lg px-1 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">${currencyOptions(r.currency, main)}</select>
          <select data-i="${i}" data-f="scope" class="row-in border border-slate-300 rounded-lg px-1 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
            <option value="person" ${r.scope === "person" ? "selected" : ""}>1인</option>
            <option value="team" ${r.scope === "team" ? "selected" : ""}>팀</option>
          </select>
        </div>
      </div>`
      )
      .join("");

    wrap.querySelectorAll(".row-in").forEach((el) => {
      el.addEventListener("input", onRowInput);
      if (el.dataset.f === "amount")
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const i = Number(el.dataset.i);
            if (i === state.trip.rows.length - 1) addRow();
            else focusRow(i + 1);
          }
        });
    });
    wrap.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => {
        state.trip.rows.splice(Number(b.dataset.del), 1);
        renderRows();
        recompute();
      })
    );
    wrap.querySelectorAll("[data-paid]").forEach((b) =>
      b.addEventListener("click", () => {
        const r = state.trip.rows[Number(b.dataset.paid)];
        r.paid = !r.paid;
        renderRows();
        recompute();
      })
    );
  }
  function focusRow(i) {
    const el = $("ed-rows").querySelector(`[data-i="${i}"][data-f="name"]`);
    if (el) el.focus();
  }
  function onRowInput(e) {
    const i = Number(e.target.dataset.i);
    const f = e.target.dataset.f;
    const row = state.trip.rows[i];
    if (f === "amount") {
      const c = e.target.value.replace(/[,\s]/g, "");
      row.amount = c === "" ? null : Number(c);
      if (Number.isNaN(row.amount)) row.amount = null;
    } else {
      row[f] = e.target.value;
    }
    recompute();
  }
  function addRow() {
    state.trip.rows.push({ name: "", amount: null, currency: state.trip.currency, scope: "person" });
    renderRows();
    recompute();
    focusRow(state.trip.rows.length - 1);
  }

  function usedCurrencies() {
    return [...new Set([state.trip.currency, ...state.trip.rows.map((r) => r.currency)])].filter((c) => c && c !== "KRW");
  }
  function renderFx() {
    const area = $("ed-fx");
    const list = usedCurrencies();
    const manual = Object.keys(state.trip.manualFx || {}).length > 0;
    $("ed-fx-source").textContent = manual ? "· 직접입력" : fxLoaded ? "· 실시간" : "· 기본값";
    $("ed-fx-reset").classList.toggle("hidden", !manual);
    if (list.length === 0) {
      area.innerHTML = `<span class="text-[11px] text-slate-400">원화(₩)만 사용 — 환율 불필요</span>`;
      return;
    }
    area.innerHTML = list
      .map(
        (c) => `<label class="flex items-center gap-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
        <span class="font-bold text-slate-600">1${sym(c)}=</span>
        <input data-fx="${c}" type="text" inputmode="decimal" value="${(state.trip.manualFx[c] ?? liveFx[c] ?? FX_RATES[c] ?? "")}"
          class="w-14 text-right border-b border-slate-300 bg-transparent focus:outline-none focus:border-emerald-500" />
        <span class="text-slate-400 text-xs">원</span></label>`
      )
      .join("");
    area.querySelectorAll("[data-fx]").forEach((el) =>
      el.addEventListener("input", (e) => {
        const c = e.target.dataset.fx;
        const v = Number(e.target.value.replace(/[,\s]/g, ""));
        if (!Number.isNaN(v) && v > 0) {
          state.trip.manualFx[c] = v;
          $("ed-fx-source").textContent = "· 직접입력";
          $("ed-fx-reset").classList.remove("hidden");
          updateResult();
        }
      })
    );
  }
  function recompute() {
    const key = usedCurrencies().sort().join(",") + "|" + Object.keys(state.trip.manualFx).sort().join(",");
    if (key !== state.lastFxKey) {
      state.lastFxKey = key;
      renderFx();
    }
    updateResult();
  }
  function updateResult() {
    const r = computeTrip(state.trip);
    $("ed-pp-all").textContent = won(r.perPerson);
    $("ed-pp-paid").textContent = won(r.paidPerPerson);
    $("ed-pp-unpaid").textContent = won(r.unpaidPerPerson);
    $("ed-g-all").textContent = won(r.group);
    $("ed-g-paid").textContent = won(r.paidGroup);
    $("ed-g-unpaid").textContent = won(r.unpaidGroup);
    $("ed-ppl-label").textContent = state.trip.partySize;
  }

  function setParty(n) {
    state.trip.partySize = Math.max(1, n || 1);
    $("ed-party").value = state.trip.partySize;
    updateResult();
  }

  async function saveTrip(silent) {
    state.trip.title = $("ed-title").value.trim();
    const payload = { trip: state.trip };
    try {
      const res = state.trip.id
        ? await api("PUT", "/api/trips/" + state.trip.id, payload)
        : await api("POST", "/api/trips", payload);
      state.trip = { ...res.trip, manualFx: res.trip.manualFx || {} };
      $("ed-delete").classList.remove("hidden");
      if (!silent) toast("저장됐어요");
      return true;
    } catch (e) {
      if (e.status === 401) return logout();
      toast("저장 실패: " + e.message);
      return false;
    }
  }

  async function deleteTrip() {
    if (!state.trip.id) return openListReload();
    if (!confirm("이 여행을 삭제할까요?")) return;
    try {
      await api("DELETE", "/api/trips/" + state.trip.id);
    } catch (e) {
      if (e.status === 401) return logout();
    }
    openListReload();
  }
  async function openListReload() {
    await loadList();
  }

  // 클립보드 복사 (http 환경 대비 execCommand 폴백)
  function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  // 결과 공유: 저장 → 공유링크 생성 → 카톡 메시지(링크 포함) 팝업
  async function shareTrip() {
    const ok = await saveTrip(true);
    if (ok !== true) return;
    const fxSnapshot = {};
    for (const c of usedCurrencies()) fxSnapshot[c] = rateOf(state.trip, c);
    let shareId;
    try {
      shareId = (await api("POST", "/api/trips/" + state.trip.id + "/share", { fxSnapshot })).shareId;
    } catch (e) {
      if (e.status === 401) return logout();
      return toast("공유 링크 생성 실패: " + e.message);
    }
    const url = API_BASE + "/share.html?id=" + shareId;
    const owner = (session.email || "").split("@")[0];
    const c = computeTrip(state.trip);
    const msg =
      `⛳ [${owner} 총무] '${state.trip.title || "골프 여행"}' 골프 비용 정산\n` +
      `예상 1인당 ${won(c.perPerson)}` +
      (c.unpaidGroup > 0 ? ` · 미지급 ${won(c.unpaidGroup)} 남음` : ``) +
      `\n👉 상세 결제내역 보기: ${url}`;
    $("share-text").value = msg;
    $("share-pop").classList.remove("hidden");
    if (copyText(msg)) toast("복사됐어요! 단톡방에 붙여넣으세요");
  }

  // ---------------- 실시간 환율 ----------------
  async function fetchLiveRates() {
    try {
      const r = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
      const j = await r.json();
      if (j.result !== "success" || !j.rates?.KRW) throw 0;
      const krwUsd = j.rates.KRW;
      for (const c of CURRENCIES) {
        if (c === "KRW") continue;
        if (j.rates[c]) liveFx[c] = krwUsd / j.rates[c];
      }
      fxLoaded = true;
      if (state.trip && !$("view-editor").classList.contains("hidden")) {
        state.lastFxKey = "";
        recompute();
      }
    } catch {
      fxLoaded = false;
    }
  }

  // ---------------- escape ----------------
  function escapeAttr(s) { return String(s).replace(/"/g, "&quot;"); }
  function escapeHtml(s) { return String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m])); }

  // ---------------- 시작 ----------------
  function enterApp() {
    $("user-email").textContent = session.email;
    loadList();
    if (!fxLoaded) fetchLiveRates();
  }

  function wire() {
    $("tab-login").addEventListener("click", () => setAuthMode("login"));
    $("tab-register").addEventListener("click", () => setAuthMode("register"));
    $("auth-submit").addEventListener("click", submitAuth);
    $("auth-pw").addEventListener("keydown", (e) => { if (e.key === "Enter") submitAuth(); });
    $("btn-logout").addEventListener("click", logout);
    $("brand").addEventListener("click", () => session.token && loadList());

    $("btn-new").addEventListener("click", () => openEditor(null));
    $("ed-back").addEventListener("click", async () => { await saveTrip(true); openListReload(); });
    $("ed-delete").addEventListener("click", deleteTrip);
    $("ed-save").addEventListener("click", () => saveTrip(false));

    $("ed-title").addEventListener("input", (e) => (state.trip.title = e.target.value));
    $("ed-bank").addEventListener("input", (e) => (state.trip.bankName = e.target.value));
    $("ed-holder").addEventListener("input", (e) => (state.trip.accountHolder = e.target.value));
    $("ed-account").addEventListener("input", (e) => (state.trip.accountNumber = e.target.value));
    $("ed-party").addEventListener("input", (e) => setParty(Number(e.target.value)));
    $("ed-ppl-minus").addEventListener("click", () => setParty(state.trip.partySize - 1));
    $("ed-ppl-plus").addEventListener("click", () => setParty(state.trip.partySize + 1));
    $("ed-country").addEventListener("change", (e) => {
      state.trip.country = e.target.value;
      const cur = catalogCurrency(e.target.value);
      if (cur) state.trip.currency = cur;
      state.lastFxKey = "";
      renderRows();
      recompute();
    });
    $("ed-add-row").addEventListener("click", addRow);
    $("ed-fx-reset").addEventListener("click", () => {
      state.trip.manualFx = {};
      state.lastFxKey = "";
      recompute();
    });
    $("ed-kakao").addEventListener("click", shareTrip);
    $("share-close").addEventListener("click", () => $("share-pop").classList.add("hidden"));
    $("share-copy").addEventListener("click", () => {
      if (copyText($("share-text").value)) toast("복사됐어요!");
      else { $("share-text").focus(); $("share-text").select(); toast("길게 눌러 복사하세요"); }
    });

    setAuthMode("login");
    if (session.token) enterApp();
    else showView("auth");
    fetchLiveRates();
  }

  document.addEventListener("DOMContentLoaded", wire);
})();
