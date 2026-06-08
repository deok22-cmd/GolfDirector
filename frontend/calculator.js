/**
 * 골프 비용 계산기 (메인 화면)
 * - 숫자만 입력 → 1인당 / 일행 합계 즉시 계산 (환율 자동 환산, 1인/팀 N빵 자동)
 * - 실시간 환율(open.er-api.com, 키 불필요) 적용, 실패 시 기본값 폴백 + 수동 수정 가능
 * - 카톡 공지 복사 / localStorage 기록 저장
 */
(function () {
  "use strict";

  const { FX_RATES, CURRENCY_SYMBOL } = window.GolfDirectorData;
  const CURRENCIES = Object.keys(CURRENCY_SYMBOL); // KRW, USD, THB, JPY, VND, PHP, TWD, MYR, CNY, IDR
  const $ = (id) => document.getElementById(id);

  // ---- 상태 ----
  const state = {
    title: "",
    party: 4,
    rows: [
      { name: "패키지(항공+숙박+그린피)", amount: 1200000, currency: "KRW", scope: "person" },
      { name: "추가 그린피", amount: 2000, currency: "THB", scope: "person" },
      { name: "카트+캐디피", amount: 1250, currency: "THB", scope: "person" },
      { name: "캐디팁", amount: 300, currency: "THB", scope: "person" },
      { name: "미팅샌딩(차량)", amount: 1500, currency: "THB", scope: "team" },
    ],
  };
  const fx = { ...FX_RATES }; // 현지통화 1단위 = 원
  const manualFx = new Set(); // 사용자가 직접 고친 통화
  let fxSource = "기본값";
  let lastFxKey = "";

  // ---- 유틸 ----
  const won = (n) => "₩" + Math.round(n || 0).toLocaleString("ko-KR");
  const sym = (c) => CURRENCY_SYMBOL[c] || c;
  const rateOf = (c) => (c === "KRW" ? 1 : fx[c] ?? FX_RATES[c] ?? 0);
  const toKrw = (row) => (row.amount == null ? 0 : row.amount * rateOf(row.currency));
  const usedCurrencies = () =>
    [...new Set(state.rows.map((r) => r.currency))].filter((c) => c !== "KRW");

  // ---- 계산 ----
  function compute() {
    let perPerson = 0; // 1인당 원화
    for (const r of state.rows) {
      const krw = toKrw(r);
      perPerson += r.scope === "team" ? krw / Math.max(1, state.party) : krw;
    }
    const group = perPerson * Math.max(1, state.party);
    const hasMissing = state.rows.some((r) => r.amount == null && r.name.trim());
    return { perPerson, group, hasMissing };
  }

  // ---- 렌더: 비용 항목 행 ----
  function renderRows() {
    const wrap = $("rows");
    wrap.innerHTML = state.rows
      .map((r, i) => {
        const curOpts = CURRENCIES.map(
          (c) => `<option value="${c}" ${c === r.currency ? "selected" : ""}>${sym(c)} ${c}</option>`
        ).join("");
        return `
        <div class="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_88px_92px_28px] gap-2 items-center">
          <input data-i="${i}" data-f="name" type="text" value="${escapeAttr(r.name)}" placeholder="항목명"
            class="row-in text-sm border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200 col-span-2 sm:col-span-1" />
          <input data-i="${i}" data-f="amount" type="text" inputmode="numeric" value="${r.amount == null ? "" : r.amount.toLocaleString()}" placeholder="금액"
            class="row-in text-sm text-right border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          <select data-i="${i}" data-f="currency" class="row-in text-sm border border-slate-300 rounded-lg px-1.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200">${curOpts}</select>
          <select data-i="${i}" data-f="scope" class="row-in text-xs border border-slate-300 rounded-lg px-1.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200">
            <option value="person" ${r.scope === "person" ? "selected" : ""}>1인</option>
            <option value="team" ${r.scope === "team" ? "selected" : ""}>팀(N빵)</option>
          </select>
          <button data-del="${i}" class="text-slate-300 hover:text-rose-500 text-lg leading-none justify-self-center">✕</button>
        </div>`;
      })
      .join("");

    wrap.querySelectorAll(".row-in").forEach((el) =>
      el.addEventListener("input", onRowInput)
    );
    wrap.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => {
        state.rows.splice(Number(b.dataset.del), 1);
        renderRows();
        recompute();
      })
    );
  }

  function onRowInput(e) {
    const i = Number(e.target.dataset.i);
    const f = e.target.dataset.f;
    let v = e.target.value;
    if (f === "amount") {
      const cleaned = v.replace(/[,\s]/g, "");
      state.rows[i].amount = cleaned === "" ? null : Number(cleaned);
      if (Number.isNaN(state.rows[i].amount)) state.rows[i].amount = null;
    } else {
      state.rows[i][f] = v;
    }
    recompute(); // 통화 변경 시 환율칸 갱신 포함
  }

  // ---- 렌더: 환율 칸 ----
  function renderFx() {
    const area = $("fx-area");
    const list = usedCurrencies();
    if (list.length === 0) {
      area.innerHTML = `<span class="text-[11px] text-slate-400">원화(₩)만 사용 중 — 환율 불필요</span>`;
      return;
    }
    area.innerHTML =
      list
        .map(
          (c) => `
        <label class="flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
          <span class="font-bold text-slate-600">1${sym(c)} =</span>
          <input data-fx="${c}" type="text" inputmode="decimal" value="${fx[c] ?? ""}"
            class="fx-in w-16 text-right border-b border-slate-300 focus:outline-none focus:border-emerald-500 bg-transparent" />
          <span class="text-slate-400">원</span>
        </label>`
        )
        .join("") +
      `<span class="self-center text-[11px] ${fxSource.startsWith("실시간") ? "text-emerald-600" : "text-slate-400"}">· ${fxSource}</span>`;

    area.querySelectorAll(".fx-in").forEach((el) =>
      el.addEventListener("input", (e) => {
        const c = e.target.dataset.fx;
        const v = Number(e.target.value.replace(/[,\s]/g, ""));
        if (!Number.isNaN(v) && v > 0) {
          fx[c] = v;
          manualFx.add(c);
          recompute(true); // 환율 직접수정: 환율칸 재렌더 없이 합계만
        }
      })
    );
  }

  // ---- 재계산 + 화면 갱신 ----
  function recompute(skipFxRender) {
    const key = usedCurrencies().sort().join(",");
    if (!skipFxRender && key !== lastFxKey) {
      lastFxKey = key;
      renderFx();
    }
    const { perPerson, group, hasMissing } = compute();
    $("per-person").textContent = won(perPerson);
    $("group-total").textContent = won(group);
    $("ppl-label").textContent = state.party;
    $("warn-missing").classList.toggle("hidden", !hasMissing);
  }

  // ---- 인원 ----
  function setParty(n) {
    state.party = Math.max(1, n || 1);
    $("party-size").value = state.party;
    recompute();
  }

  // ---- 카톡 공지 ----
  function kakaoText() {
    const { perPerson, group } = compute();
    const lines = [];
    lines.push(`⛳ ${state.title.trim() || "골프 여행"} 비용 안내`);
    lines.push(`■ 예상 1인 총비용: 약 ${won(perPerson)}`);
    lines.push(`■ 일행 ${state.party}명 합계: 약 ${won(group)}`);
    lines.push("");
    lines.push("[항목]");
    for (const r of state.rows) {
      if (!r.name.trim()) continue;
      const tag = r.scope === "team" ? `${state.party}명` : "1인";
      if (r.amount == null) {
        lines.push(`- ${r.name}(${tag}): 현지 확인`);
      } else if (r.currency === "KRW") {
        lines.push(`- ${r.name}(${tag}): ${won(r.amount)}`);
      } else {
        lines.push(`- ${r.name}(${tag}): ${sym(r.currency)}${r.amount.toLocaleString()} (≈${won(toKrw(r))})`);
      }
    }
    const cur = usedCurrencies();
    if (cur.length) {
      lines.push("");
      lines.push("※ 적용 환율: " + cur.map((c) => `1${sym(c)}≈${fx[c]}원`).join(", ") + ` (${fxSource})`);
    }
    return lines.join("\n");
  }

  // ---- 저장 (localStorage) ----
  const SAVE_KEY = "gd_calc_saved";
  function loadSaved() {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY)) || [];
    } catch {
      return [];
    }
  }
  function saveCurrent() {
    const { perPerson, group } = compute();
    const arr = loadSaved();
    arr.unshift({
      id: "c" + Date.now(),
      title: state.title.trim() || "제목 없는 계산",
      party: state.party,
      rows: state.rows,
      fx: { ...fx },
      perPerson,
      group,
      savedAt: new Date().toISOString().slice(0, 10),
    });
    localStorage.setItem(SAVE_KEY, JSON.stringify(arr.slice(0, 50)));
    renderSaved();
    toast("기록을 저장했어요 (이 브라우저에)");
  }
  function renderSaved() {
    const arr = loadSaved();
    $("saved-count").textContent = arr.length ? `(${arr.length})` : "";
    const box = $("saved-list");
    if (arr.length === 0) {
      box.innerHTML = `<div class="text-[11px] text-slate-400">저장된 기록이 없어요.</div>`;
      return;
    }
    box.innerHTML = arr
      .map(
        (s) => `
      <div class="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2">
        <div class="min-w-0">
          <div class="text-sm font-bold text-slate-700 truncate">${escapeHtml(s.title)}</div>
          <div class="text-[11px] text-slate-400">1인 ${won(s.perPerson)} · ${s.party}명 · ${s.savedAt}</div>
        </div>
        <div class="flex gap-1.5 flex-shrink-0">
          <button data-load="${s.id}" class="text-[11px] font-bold text-emerald-700 hover:underline">불러오기</button>
          <button data-rm="${s.id}" class="text-[11px] text-slate-400 hover:text-rose-500">삭제</button>
        </div>
      </div>`
      )
      .join("");
    box.querySelectorAll("[data-load]").forEach((b) =>
      b.addEventListener("click", () => {
        const s = loadSaved().find((x) => x.id === b.dataset.load);
        if (!s) return;
        state.title = s.title;
        state.party = s.party;
        state.rows = s.rows.map((r) => ({ ...r }));
        Object.assign(fx, s.fx);
        $("trip-title").value = s.title;
        $("party-size").value = s.party;
        lastFxKey = "";
        renderRows();
        recompute();
        toast("불러왔어요");
      })
    );
    box.querySelectorAll("[data-rm]").forEach((b) =>
      b.addEventListener("click", () => {
        localStorage.setItem(
          SAVE_KEY,
          JSON.stringify(loadSaved().filter((x) => x.id !== b.dataset.rm))
        );
        renderSaved();
      })
    );
  }

  // ---- 실시간 환율 ----
  async function fetchLiveRates() {
    try {
      const r = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
      const j = await r.json();
      if (j.result !== "success" || !j.rates || !j.rates.KRW) throw new Error("형식 오류");
      const krwPerUsd = j.rates.KRW;
      for (const c of CURRENCIES) {
        if (c === "KRW" || manualFx.has(c)) continue;
        const perUsd = j.rates[c];
        if (perUsd) fx[c] = krwPerUsd / perUsd; // 1 c = (KRW/USD) / (c/USD) 원
      }
      const when = (j.time_last_update_utc || "").replace(/ \d{2}:\d{2}:\d{2}.*/, "");
      fxSource = `실시간${when ? " · " + when : ""}`;
      lastFxKey = ""; // 환율칸 재렌더 유도
      recompute();
    } catch {
      fxSource = "기본값(오프라인)";
      renderFx();
    }
  }

  // ---- 토스트 ----
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

  // ---- HTML escape ----
  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;");
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  }

  // ---- 초기화 ----
  function init() {
    $("trip-title").addEventListener("input", (e) => (state.title = e.target.value));
    $("party-size").addEventListener("input", (e) => setParty(Number(e.target.value)));
    $("ppl-minus").addEventListener("click", () => setParty(state.party - 1));
    $("ppl-plus").addEventListener("click", () => setParty(state.party + 1));
    $("add-row").addEventListener("click", () => {
      state.rows.push({ name: "", amount: null, currency: "THB", scope: "person" });
      renderRows();
      recompute();
    });
    $("btn-kakao").addEventListener("click", () => {
      navigator.clipboard?.writeText(kakaoText()).then(
        () => toast("카톡 공지가 복사됐어요. 단톡방에 붙여넣기!"),
        () => toast("복사 실패 — 브라우저 권한 확인")
      );
    });
    $("btn-save").addEventListener("click", saveCurrent);
    $("toggle-saved").addEventListener("click", () => {
      const box = $("saved-list");
      box.classList.toggle("hidden");
      if (!box.classList.contains("hidden")) renderSaved();
    });

    renderRows();
    recompute();
    renderSaved();
    fetchLiveRates(); // 실시간 환율 시도 (실패 시 기본값 유지)
  }

  document.addEventListener("DOMContentLoaded", init);
})();
