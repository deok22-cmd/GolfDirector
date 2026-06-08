/**
 * 골프총무 (Golf Director) - SidePanel Logic (Phase 2)
 * - 멀티모달 수집: 텍스트 / 이미지 / PDF (파일 업로드·드래그&드롭·붙여넣기·컨텍스트 메뉴)
 * - 백엔드 프록시(/api/parse)로 보내 Claude Opus 4.8가 표준 JSON으로 정제
 * - /api/trips 로 대시보드에 저장
 *
 * 첨부 객체 형식(백엔드 inputs와 동일):
 *   { kind:"text", text, name }
 *   { kind:"image", mediaType, data(base64), name }
 *   { kind:"pdf", data(base64), name }
 */

const $ = (id) => document.getElementById(id);
const DEFAULT_BACKEND = "http://localhost:8787";

const els = {
  settingsBtn: $("btn-settings"),
  settingsPanel: $("settings-panel"),
  backendUrl: $("backend-url"),
  testBtn: $("btn-test"),
  health: $("health-status"),
  dropzone: $("dropzone"),
  fileInput: $("file-input"),
  text: $("capture-text"),
  addText: $("btn-add-text"),
  attachments: $("attachments"),
  analyze: $("btn-analyze"),
  clear: $("btn-clear"),
  output: $("json-output"),
  badge: $("status-badge"),
  save: $("btn-save"),
};

let attachments = [];
let currentTrip = null;
let backendUrl = DEFAULT_BACKEND;

// ---------------------------------------------------------------------------
// 설정 (백엔드 URL)
// ---------------------------------------------------------------------------
async function loadBackendUrl() {
  try {
    const { gdBackend } = await chrome.storage.local.get("gdBackend");
    backendUrl = gdBackend || DEFAULT_BACKEND;
  } catch {
    backendUrl = DEFAULT_BACKEND;
  }
  els.backendUrl.value = backendUrl;
}

async function saveBackendUrl() {
  backendUrl = (els.backendUrl.value || DEFAULT_BACKEND).trim().replace(/\/$/, "");
  els.backendUrl.value = backendUrl;
  try {
    await chrome.storage.local.set({ gdBackend: backendUrl });
  } catch {
    /* 익스텐션 밖에서 열린 경우 무시 */
  }
}

els.settingsBtn.addEventListener("click", () => {
  els.settingsPanel.classList.toggle("hidden");
});

els.testBtn.addEventListener("click", async () => {
  await saveBackendUrl();
  els.health.textContent = "확인 중…";
  try {
    const r = await fetch(`${backendUrl}/health`);
    const j = await r.json();
    els.health.textContent = j.ok
      ? `✅ 연결됨 · 모델 ${j.model} · 키 ${j.hasApiKey ? "설정됨" : "없음(.env 확인)"}`
      : "응답 형식 오류";
    els.health.className = "text-[11px] mt-1.5 " + (j.hasApiKey ? "text-emerald-600" : "text-amber-600");
  } catch {
    els.health.textContent = "❌ 연결 실패 — 서버 실행/주소 확인";
    els.health.className = "text-[11px] text-rose-600 mt-1.5";
  }
});

// ---------------------------------------------------------------------------
// 첨부 관리
// ---------------------------------------------------------------------------
function setBadge(label, cls) {
  els.badge.textContent = label;
  els.badge.className = "text-[10px] px-2 py-0.5 rounded-full " + cls;
}

function addAttachment(att) {
  attachments.push(att);
  renderAttachments();
}

function renderAttachments() {
  if (attachments.length === 0) {
    els.attachments.innerHTML = "";
    els.analyze.disabled = true;
    return;
  }
  els.analyze.disabled = false;
  els.attachments.innerHTML = attachments
    .map((a, i) => {
      const icon = a.kind === "image" ? "🖼️" : a.kind === "pdf" ? "📄" : "📝";
      const meta =
        a.kind === "text"
          ? `${(a.text || "").length}자`
          : a.kind === "image"
            ? a.mediaType
            : "PDF";
      return `<div class="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5">
        <span class="text-[11px] text-slate-600 truncate">${icon} ${a.name || a.kind} <span class="text-slate-400">· ${meta}</span></span>
        <button data-idx="${i}" class="att-remove text-slate-400 hover:text-rose-500 text-xs font-bold">✕</button>
      </div>`;
    })
    .join("");
  els.attachments.querySelectorAll(".att-remove").forEach((btn) =>
    btn.addEventListener("click", () => {
      attachments.splice(Number(btn.dataset.idx), 1);
      renderAttachments();
    })
  );
}

// 파일 → 첨부
function fileToAttachment(file) {
  return new Promise((resolve, reject) => {
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    const reader = new FileReader();
    if (isImage || isPdf) {
      reader.onload = () => {
        const base64 = String(reader.result).split(",")[1];
        resolve(
          isPdf
            ? { kind: "pdf", data: base64, name: file.name }
            : { kind: "image", mediaType: file.type, data: base64, name: file.name }
        );
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => resolve({ kind: "text", text: String(reader.result), name: file.name });
      reader.onerror = reject;
      reader.readAsText(file);
    }
  });
}

async function handleFiles(fileList) {
  for (const file of fileList) {
    try {
      addAttachment(await fileToAttachment(file));
    } catch (e) {
      console.error("파일 읽기 실패:", file.name, e);
    }
  }
}

// 파일 입력
els.fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

// 텍스트 추가
els.addText.addEventListener("click", () => {
  const t = els.text.value.trim();
  if (!t) return;
  addAttachment({ kind: "text", text: t, name: "붙여넣은 텍스트" });
  els.text.value = "";
});

// 드래그 & 드롭
["dragover", "dragenter"].forEach((ev) =>
  els.dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    els.dropzone.classList.add("border-emerald-400", "bg-emerald-50");
  })
);
["dragleave", "drop"].forEach((ev) =>
  els.dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    els.dropzone.classList.remove("border-emerald-400", "bg-emerald-50");
  })
);
els.dropzone.addEventListener("drop", (e) => {
  if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
});

// 클립보드 이미지 붙여넣기 (Ctrl+V)
document.addEventListener("paste", (e) => {
  const items = e.clipboardData?.items || [];
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) {
        fileToAttachment(file).then((a) => addAttachment({ ...a, name: "붙여넣은 이미지" }));
      }
    }
  }
});

// 컨텍스트 메뉴로 수집된 항목 불러오기
async function loadPendingCaptures() {
  try {
    const { pendingCaptures } = await chrome.storage.local.get("pendingCaptures");
    if (Array.isArray(pendingCaptures) && pendingCaptures.length) {
      pendingCaptures.forEach((a) => addAttachment(a));
      await chrome.storage.local.remove("pendingCaptures");
      setBadge("수집됨", "bg-amber-100 text-amber-700");
    }
  } catch {
    /* 익스텐션 밖에서 열람 시 무시 */
  }
}

// ---------------------------------------------------------------------------
// 분석 / 저장
// ---------------------------------------------------------------------------
els.analyze.addEventListener("click", async () => {
  await saveBackendUrl();
  if (attachments.length === 0) {
    setBadge("자료 없음", "bg-rose-100 text-rose-700");
    return;
  }
  setBadge("분석 중…", "bg-blue-100 text-blue-700");
  els.analyze.disabled = true;
  els.save.disabled = true;
  currentTrip = null;

  const inputs = attachments.map((a) =>
    a.kind === "text"
      ? { kind: "text", text: a.text }
      : a.kind === "image"
        ? { kind: "image", mediaType: a.mediaType, data: a.data }
        : { kind: "pdf", data: a.data }
  );

  try {
    const r = await fetch(`${backendUrl}/api/parse`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inputs }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || `서버 오류 ${r.status}`);
    currentTrip = j.trip;
    els.output.textContent = JSON.stringify(j.trip, null, 2);
    els.save.disabled = false;
    setBadge("정제 완료", "bg-emerald-100 text-emerald-700");
  } catch (err) {
    els.output.textContent = "// 오류: " + err.message;
    setBadge("실패", "bg-rose-100 text-rose-700");
  } finally {
    els.analyze.disabled = attachments.length === 0;
  }
});

els.save.addEventListener("click", async () => {
  if (!currentTrip) return;
  setBadge("저장 중…", "bg-blue-100 text-blue-700");
  els.save.disabled = true;
  try {
    const r = await fetch(`${backendUrl}/api/trips`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trip: currentTrip }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || `서버 오류 ${r.status}`);
    setBadge("저장됨 ✅", "bg-emerald-100 text-emerald-700");
    els.save.textContent = `✅ 저장 완료 (${j.trip.trip_id})`;
    setTimeout(() => {
      els.save.textContent = "💾 대시보드에 저장";
      els.save.disabled = false;
    }, 2200);
  } catch (err) {
    setBadge("저장 실패", "bg-rose-100 text-rose-700");
    els.save.disabled = false;
  }
});

els.clear.addEventListener("click", () => {
  attachments = [];
  currentTrip = null;
  els.text.value = "";
  els.output.textContent = "// 분석 결과가 여기에 표시됩니다.";
  els.save.disabled = true;
  renderAttachments();
  setBadge("대기", "bg-slate-100 text-slate-400");
});

// ---------------------------------------------------------------------------
// 초기화
// ---------------------------------------------------------------------------
els.backendUrl.addEventListener("change", saveBackendUrl);
(async function init() {
  await loadBackendUrl();
  await loadPendingCaptures();
  renderAttachments();
})();
