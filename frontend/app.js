/**
 * 골프총무 (Golf Director) - Dashboard App Logic
 * mockData.js 의 데이터를 받아 국가별 탭 / 상태 필터 / 비용 매트릭스 테이블을 렌더링.
 */
(function () {
  "use strict";

  const { FX_RATES, CURRENCY_SYMBOL, COST_COLUMNS, COUNTRY_CATALOG, MOCK_TRIPS } =
    window.GolfDirectorData;

  // 백엔드에서 저장된 여행을 불러오고, 미실행이면 mockData로 폴백.
  const DASHBOARD_BACKEND =
    localStorage.getItem("gdBackend") || "http://localhost:8787";
  let TRIPS = MOCK_TRIPS.slice();

  // ---------------------------------------------------------------------------
  // 애플리케이션 상태
  // ---------------------------------------------------------------------------
  const state = {
    country: "전체", // 전체 | 태국 | 일본 ...
    status: "ALL", // ALL | PLANNING | COMPLETED
    selectedTripId: null,
  };

  const STATUS_META = {
    ALL: { label: "전체", badge: "" },
    PLANNING: { label: "시뮬레이션 중", badge: "bg-amber-100 text-amber-700" },
    COMPLETED: { label: "다녀온 여행", badge: "bg-emerald-100 text-emerald-700" },
  };

  // ---------------------------------------------------------------------------
  // 유틸
  // ---------------------------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);

  const krw = (n) =>
    "₩" + Math.round(n).toLocaleString("ko-KR");

  // 외화 금액 → 원화 환산
  function toKrw(amount, currency) {
    if (amount == null) return 0;
    return amount * (FX_RATES[currency] ?? 0);
  }

  /**
   * 비용 항목명(item)을 매트릭스 컬럼(COST_COLUMNS) 중 하나로 분류.
   * pay_type 이 PREPAID 이면 무조건 '사전결제액'.
   */
  function categorize(expense) {
    if (expense.pay_type === "PREPAID") return "사전결제액";
    const name = expense.item;
    if (/그린피/.test(name)) return "그린피";
    if (/카트/.test(name)) return "카트비";
    if (/캐디팁/.test(name)) return "캐디팁";
    if (/캐디(피|fee)/i.test(name)) return "캐디피";
    if (/미팅|샌딩|샌팅/.test(name)) return "미팅샌딩비";
    if (/식|중식|석식|조식|점심|저녁|밥/.test(name)) return "식비";
    // '카트+캐디피' 처럼 복합 항목은 위 카트비에서 먼저 잡힘
    return "기타";
  }

  // ---------------------------------------------------------------------------
  // 데이터 가공
  // ---------------------------------------------------------------------------
  function filteredTrips() {
    return TRIPS.filter((t) => {
      const countryOk = state.country === "전체" || t.country === state.country;
      const statusOk = state.status === "ALL" || t.status === state.status;
      return countryOk && statusOk;
    });
  }

  // 카탈로그(항상 노출) ∪ 데이터에만 있는 국가(뒤에 합산)
  function tabCountries() {
    const catalog = COUNTRY_CATALOG.map((c) => c.name);
    const dataOnly = [...new Set(TRIPS.map((t) => t.country))].filter(
      (c) => !catalog.includes(c)
    );
    return [...catalog, ...dataOnly];
  }

  // 현재 상태필터 기준, 국가별 여행 건수
  function countByCountry() {
    const base = TRIPS.filter(
      (t) => state.status === "ALL" || t.status === state.status
    );
    const counts = {};
    for (const t of base) counts[t.country] = (counts[t.country] || 0) + 1;
    return { counts, total: base.length };
  }

  /**
   * 한 trip 의 itinerary 를 [day][column] = { krw, cells:[{amount,currency}], missing }
   * 형태의 매트릭스로 변환.
   */
  function buildMatrix(trip) {
    const matrix = {}; // day -> column -> cellData
    for (const dayObj of trip.itinerary) {
      const row = {};
      for (const col of COST_COLUMNS) {
        row[col] = { krw: 0, entries: [], missing: false };
      }
      for (const exp of dayObj.expenses) {
        const col = categorize(exp);
        const cell = row[col];
        cell.entries.push(exp);
        if (exp.amount == null) cell.missing = true;
        else cell.krw += toKrw(exp.amount, exp.currency);
      }
      matrix[dayObj.day] = { row, description: dayObj.description };
    }
    return matrix;
  }

  // ---------------------------------------------------------------------------
  // 렌더링: 국가별 탭
  // ---------------------------------------------------------------------------
  function renderCountryTabs() {
    const wrap = $("#country-tabs");
    const tabs = ["전체", ...tabCountries()];
    const { counts, total } = countByCountry();

    wrap.innerHTML = tabs
      .map((c) => {
        const active = c === state.country;
        const n = c === "전체" ? total : counts[c] || 0;
        const empty = n === 0; // 데이터 없는 후보 국가 → 흐리게
        const badge =
          active
            ? "bg-white/25 text-white"
            : empty
              ? "bg-slate-100 text-slate-300"
              : "bg-slate-200 text-slate-500";
        const base = active
          ? "bg-emerald-600 text-white shadow-sm"
          : empty
            ? "text-slate-300 hover:bg-slate-50"
            : "text-slate-600 hover:bg-slate-100";
        return `<button data-country="${c}"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg transition whitespace-nowrap ${base}">
          <span>${c}</span>
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge}">${n}</span>
        </button>`;
      })
      .join("");
    wrap.querySelectorAll("button").forEach((btn) =>
      btn.addEventListener("click", () => {
        state.country = btn.dataset.country;
        state.selectedTripId = null;
        render();
      })
    );
  }

  // ---------------------------------------------------------------------------
  // 렌더링: 상태 필터
  // ---------------------------------------------------------------------------
  function renderStatusFilter() {
    const wrap = $("#status-filter");
    const order = ["ALL", "PLANNING", "COMPLETED"];
    wrap.innerHTML = order
      .map((s) => {
        const active = s === state.status;
        return `<button data-status="${s}"
          class="px-3.5 py-1.5 text-xs font-semibold rounded-full border transition
          ${active
            ? "bg-slate-800 text-white border-slate-800"
            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}">
          ${STATUS_META[s].label}
        </button>`;
      })
      .join("");
    wrap.querySelectorAll("button").forEach((btn) =>
      btn.addEventListener("click", () => {
        state.status = btn.dataset.status;
        state.selectedTripId = null;
        render();
      })
    );
  }

  // ---------------------------------------------------------------------------
  // 렌더링: trip 선택 카드 리스트
  // ---------------------------------------------------------------------------
  function renderTripList(trips) {
    const wrap = $("#trip-list");
    if (trips.length === 0) {
      wrap.innerHTML = `<div class="text-sm text-slate-400 px-1">조건에 맞는 여행이 없습니다.</div>`;
      return;
    }
    wrap.innerHTML = trips
      .map((t) => {
        const active = t.trip_id === state.selectedTripId;
        const meta = STATUS_META[t.status];
        return `<button data-trip="${t.trip_id}"
          class="text-left min-w-[220px] flex-shrink-0 rounded-xl border p-4 transition
          ${active
            ? "border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/40"
            : "border-slate-200 bg-white hover:border-slate-300"}">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${meta.badge}">${meta.label}</span>
            <span class="text-[11px] text-slate-400">${t.country} · ${t.total_days}일 · ${t.party_size}인</span>
          </div>
          <div class="font-bold text-slate-800 text-sm leading-snug">${t.title}</div>
          <div class="mt-2 text-emerald-700 font-extrabold text-base">
            ${krw(t.summary.final_total_krw_per_person)}
            <span class="text-[11px] font-medium text-slate-400">/ 1인</span>
          </div>
        </button>`;
      })
      .join("");
    wrap.querySelectorAll("button").forEach((btn) =>
      btn.addEventListener("click", () => {
        state.selectedTripId = btn.dataset.trip;
        render();
      })
    );
  }

  // ---------------------------------------------------------------------------
  // 렌더링: 비용 매트릭스 테이블 (핵심 UI)
  // ---------------------------------------------------------------------------
  function renderMatrix(trip) {
    const panel = $("#matrix-panel");
    if (!trip) {
      panel.innerHTML = `<div class="flex flex-col items-center justify-center h-72 text-slate-400">
        <div class="text-5xl mb-3">⛳</div>
        <div class="text-sm">상단에서 여행을 선택하면 일정별 비용 매트릭스가 표시됩니다.</div>
      </div>`;
      return;
    }

    const matrix = buildMatrix(trip);
    const sym = CURRENCY_SYMBOL;

    // 헤더
    const headCols = COST_COLUMNS.map(
      (c) =>
        `<th class="px-3 py-2.5 text-right font-semibold text-slate-500 whitespace-nowrap">${c}</th>`
    ).join("");

    // 바디 (일차별 행)
    let dayTotalKrwAll = 0;
    const colTotals = Object.fromEntries(COST_COLUMNS.map((c) => [c, 0]));

    const rows = trip.itinerary
      .map((dayObj) => {
        const { row, description } = matrix[dayObj.day];
        let dayKrw = 0;
        const cells = COST_COLUMNS.map((col) => {
          const cell = row[col];
          dayKrw += cell.krw;
          colTotals[col] += cell.krw;

          if (cell.entries.length === 0) {
            return `<td class="px-3 py-2.5 text-right text-slate-300"
              data-trip="${trip.trip_id}" data-day="${dayObj.day}" data-col="${col}"
              ondblclick="window.GolfDirector.editCell(this)">–</td>`;
          }
          // 셀 내 표시: 통화기호+금액 (복수면 합산, null 은 경고)
          const display = cell.entries
            .map((e) =>
              e.amount == null
                ? `<span class="text-rose-500 font-bold" title="금액 누락(견적 확인 필요)">⚠️ 누락</span>`
                : `${sym[e.currency]}${e.amount.toLocaleString()}`
            )
            .join("<br>");
          const krwHint = cell.krw
            ? `<div class="text-[10px] text-slate-400 font-normal">${krw(cell.krw)}</div>`
            : "";
          return `<td class="px-3 py-2.5 text-right font-semibold text-slate-700 cursor-pointer hover:bg-emerald-50/60"
            data-trip="${trip.trip_id}" data-day="${dayObj.day}" data-col="${col}"
            ondblclick="window.GolfDirector.editCell(this)">
            <div>${display}</div>${krwHint}
          </td>`;
        }).join("");

        dayTotalKrwAll += dayKrw;

        return `<tr class="border-t border-slate-100 hover:bg-slate-50/50">
          <td class="px-3 py-2.5 sticky left-0 bg-white">
            <div class="font-bold text-slate-800 whitespace-nowrap">${dayObj.day}일차</div>
            <div class="text-[11px] text-slate-400 max-w-[180px] truncate" title="${description}">${description}</div>
          </td>
          ${cells}
          <td class="px-3 py-2.5 text-right font-extrabold text-emerald-700 whitespace-nowrap bg-emerald-50/40">${krw(dayKrw)}</td>
        </tr>`;
      })
      .join("");

    // 합계 행
    const totalCells = COST_COLUMNS.map(
      (c) =>
        `<td class="px-3 py-2.5 text-right font-bold text-slate-600 whitespace-nowrap">${colTotals[c] ? krw(colTotals[c]) : "–"}</td>`
    ).join("");

    panel.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 class="text-lg font-extrabold text-slate-800">${trip.title}</h2>
          <p class="text-xs text-slate-400 mt-0.5">
            ${trip.country} · 적용환율 1${sym[trip.local_currency]} = ₩${trip.current_fx_rate} · 생성일 ${trip.created_at}
          </p>
        </div>
        <button onclick="window.GolfDirector.copyKakao('${trip.trip_id}')"
          class="px-4 py-2 text-sm font-bold rounded-lg bg-yellow-400 text-slate-900 hover:bg-yellow-300 transition shadow-sm">
          📋 카톡 공유용 복사
        </button>
      </div>

      <div class="overflow-x-auto rounded-xl border border-slate-200">
        <table class="w-full text-sm border-collapse">
          <thead class="bg-slate-50 text-xs">
            <tr>
              <th class="px-3 py-2.5 text-left font-semibold text-slate-500 sticky left-0 bg-slate-50">일차 / 일정</th>
              ${headCols}
              <th class="px-3 py-2.5 text-right font-semibold text-emerald-700 bg-emerald-50/60 whitespace-nowrap">일차 합계(₩)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="border-t-2 border-slate-200 bg-slate-50/60">
              <td class="px-3 py-2.5 font-bold text-slate-700 sticky left-0 bg-slate-50/60">항목 합계</td>
              ${totalCells}
              <td class="px-3 py-2.5 text-right font-extrabold text-emerald-800 bg-emerald-50/60 whitespace-nowrap">${krw(dayTotalKrwAll)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-[11px] text-slate-400 mt-2">💡 셀을 더블 클릭하면 금액을 수정할 수 있습니다. (Phase 1 데모)</p>

      ${renderSummary(trip, dayTotalKrwAll)}
    `;
  }

  // ---------------------------------------------------------------------------
  // 렌더링: 실시간 환율 보정 요약 (1인당 원화 최종 예상)
  // ---------------------------------------------------------------------------
  function renderSummary(trip, localTotalKrwGroup) {
    const s = trip.summary;
    // 라이브 계산: (현지결제 합계 원화) / 인원 + 사전결제 1인가
    const localPerPerson = Math.round(
      localTotalKrwGroup / trip.party_size
    );
    const liveFinal = s.prepaid_krw_per_person + localPerPerson;

    const card = (label, value, sub, accent) => `
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="text-[11px] font-semibold text-slate-400">${label}</div>
        <div class="text-xl font-extrabold ${accent} mt-1">${value}</div>
        ${sub ? `<div class="text-[11px] text-slate-400 mt-0.5">${sub}</div>` : ""}
      </div>`;

    return `
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
        ${card("사전결제 (1인)", krw(s.prepaid_krw_per_person), "패키지 기본가", "text-slate-700")}
        ${card("현지결제 예상 (1인)", krw(localPerPerson), "실시간 환율 적용 · 매트릭스 기준", "text-slate-700")}
        ${card("최종 예상 총비용 (1인)", krw(liveFinal), `견적 기준 ${krw(s.final_total_krw_per_person)}`, "text-emerald-700")}
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // 인터랙션: 셀 더블클릭 편집 (Phase 1 데모 — 메모리상 수정)
  // ---------------------------------------------------------------------------
  function editCell(td) {
    const { trip, day, col } = td.dataset;
    const tripObj = TRIPS.find((t) => t.trip_id === trip);
    const dayObj = tripObj.itinerary.find((d) => d.day === Number(day));
    // 해당 컬럼으로 분류되는 첫 expense 를 찾거나 새로 생성
    let exp = dayObj.expenses.find((e) => categorize(e) === col);
    const input = prompt(`[${day}일차 · ${col}] 금액 입력 (${tripObj.local_currency} 기준):`,
      exp && exp.amount != null ? exp.amount : "");
    if (input === null) return;
    const amount = input.trim() === "" ? null : Number(input);
    if (input.trim() !== "" && Number.isNaN(amount)) {
      alert("숫자를 입력해 주세요.");
      return;
    }
    if (exp) {
      exp.amount = amount;
    } else {
      dayObj.expenses.push({
        item: col,
        amount,
        currency: tripObj.local_currency,
        pay_type: col === "사전결제액" ? "PREPAID" : "LOCAL",
      });
    }
    render();
  }

  // ---------------------------------------------------------------------------
  // 인터랙션: 카카오톡 브리핑 텍스트 생성 → 클립보드 (기능3 스텁)
  // ---------------------------------------------------------------------------
  function copyKakao(tripId) {
    const trip = TRIPS.find((t) => t.trip_id === tripId);
    const lines = [];
    lines.push(`⛳ [${trip.title}] 여행 정산 안내`);
    lines.push(`■ 예상 1인 총비용: 약 ${krw(trip.summary.final_total_krw_per_person)} (현지 환율 적용)`);
    lines.push("");
    lines.push("[일정별 요약]");
    for (const d of trip.itinerary) {
      const missing = d.expenses
        .filter((e) => e.amount == null)
        .map((e) => e.item);
      const warn = missing.length ? ` / 불포함·확인필요: ${missing.join(", ")}` : "";
      lines.push(`- ${d.day}일차: ${d.description}${warn}`);
    }
    lines.push("");
    lines.push("★ 총무 한마디: 현지 환전 여유롭게 준비하세요!");
    const text = lines.join("\n");

    navigator.clipboard?.writeText(text).then(
      () => toast("카톡 공유용 텍스트가 복사되었습니다 ✅"),
      () => toast("복사 실패 — 브라우저 권한을 확인하세요.")
    );
  }

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.remove("opacity-0", "translate-y-2");
    el.classList.add("opacity-100", "translate-y-0");
    setTimeout(() => {
      el.classList.add("opacity-0", "translate-y-2");
      el.classList.remove("opacity-100", "translate-y-0");
    }, 2200);
  }

  // ---------------------------------------------------------------------------
  // 메인 렌더
  // ---------------------------------------------------------------------------
  function render() {
    const trips = filteredTrips();
    // 선택된 trip 이 필터에서 사라졌으면 첫 항목 자동 선택
    if (!trips.find((t) => t.trip_id === state.selectedTripId)) {
      state.selectedTripId = trips[0]?.trip_id ?? null;
    }
    renderCountryTabs();
    renderStatusFilter();
    renderTripList(trips);
    const selected = trips.find((t) => t.trip_id === state.selectedTripId);
    renderMatrix(selected);
    $("#result-count").textContent = `${trips.length}건`;
  }

  // ---------------------------------------------------------------------------
  // 백엔드 연동: 저장된 여행 로드 (미실행 시 mockData 폴백)
  // ---------------------------------------------------------------------------
  async function loadBackendTrips() {
    try {
      const r = await fetch(`${DASHBOARD_BACKEND}/api/trips`, { cache: "no-store" });
      if (!r.ok) return;
      const { trips } = await r.json();
      if (Array.isArray(trips) && trips.length) {
        // 백엔드 저장 여행을 앞에, 중복 아닌 mock 샘플을 뒤에
        const ids = new Set(trips.map((t) => t.trip_id));
        TRIPS = [...trips, ...MOCK_TRIPS.filter((t) => !ids.has(t.trip_id))];
        state.selectedTripId = null;
        render();
        const badge = $("#backend-badge");
        if (badge) {
          badge.textContent = `백엔드 연결됨 · 저장 ${trips.length}건`;
          badge.classList.remove("hidden");
        }
      }
    } catch {
      /* 백엔드 미실행 → mockData 로 계속 동작 */
    }
  }

  // 전역 핸들러 노출 (인라인 ondblclick/onclick 용)
  window.GolfDirector = { editCell, copyKakao };

  document.addEventListener("DOMContentLoaded", () => {
    render();
    loadBackendTrips();
  });
})();
