/**
 * 골프총무 (Golf Director) - Service Worker (MV3)
 * - 툴바 아이콘 클릭 시 사이드패널 열기
 * - 우클릭 컨텍스트 메뉴: 선택 텍스트 / 이미지를 사이드패널로 전달 (멀티모달 수집)
 *
 * 수집한 자료는 chrome.storage.local 의 pendingCaptures 배열에 쌓고,
 * 사이드패널이 열릴 때 읽어가 첨부 목록에 추가한다.
 */

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.error("[GolfDirector] setPanelBehavior:", err));

  chrome.contextMenus.create({
    id: "gd-capture-text",
    title: "⛳ 골프총무로 보내기 (선택 텍스트)",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "gd-capture-image",
    title: "⛳ 골프총무로 보내기 (이미지)",
    contexts: ["image"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (info.menuItemId === "gd-capture-text") {
      await pushCapture({ kind: "text", text: info.selectionText || "", name: "선택 텍스트" });
    } else if (info.menuItemId === "gd-capture-image") {
      const img = await urlToImageAttachment(info.srcUrl);
      if (img) await pushCapture(img);
    } else {
      return;
    }
    if (tab && tab.windowId != null) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  } catch (err) {
    console.error("[GolfDirector] contextMenu:", err);
  }
});

// 수집 항목을 대기열에 추가
async function pushCapture(attachment) {
  const { pendingCaptures } = await chrome.storage.local.get("pendingCaptures");
  const queue = Array.isArray(pendingCaptures) ? pendingCaptures : [];
  queue.push({ ...attachment, capturedAt: new Date().toISOString() });
  await chrome.storage.local.set({ pendingCaptures: queue });
}

// 이미지 URL → base64 첨부 (서비스워커 fetch, host_permissions 필요)
async function urlToImageAttachment(srcUrl) {
  if (!srcUrl) return null;
  try {
    const resp = await fetch(srcUrl);
    const blob = await resp.blob();
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return {
      kind: "image",
      mediaType: blob.type || "image/png",
      data: btoa(binary),
      name: "캡처 이미지",
    };
  } catch (err) {
    console.error("[GolfDirector] urlToImageAttachment:", err);
    return null;
  }
}
