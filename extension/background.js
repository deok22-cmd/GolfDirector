/**
 * 골프총무 (Golf Director) - Service Worker (MV3)
 * - 툴바 아이콘 클릭 시 사이드패널 열기
 * - 우클릭 컨텍스트 메뉴로 드래그한 텍스트를 사이드패널로 전달
 */

// 아이콘 클릭 → 사이드패널 자동 오픈
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.error("[GolfDirector] setPanelBehavior:", err));

  // 선택 텍스트 → 골프총무 보내기 컨텍스트 메뉴
  chrome.contextMenus.create({
    id: "golf-director-capture",
    title: "⛳ 골프총무로 보내기 (선택 텍스트 분석)",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "golf-director-capture") return;
  const captured = info.selectionText || "";

  // 사이드패널이 읽어갈 수 있도록 임시 저장
  await chrome.storage.local.set({
    pendingCapture: { text: captured, capturedAt: new Date().toISOString() },
  });

  // 사이드패널 열기 (가능한 탭 컨텍스트에서)
  try {
    if (tab && tab.windowId != null) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  } catch (err) {
    console.error("[GolfDirector] sidePanel.open:", err);
  }
});
