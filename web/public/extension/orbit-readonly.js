chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined)
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'orbit.readStatus') return
  sendResponse({ mode: 'read-only', broker: 'http://127.0.0.1:47831', externalProviders: 'BLOCKED_EXTERNAL' })
})
