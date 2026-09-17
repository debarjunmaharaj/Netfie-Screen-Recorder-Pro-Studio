// Recordly Studio Background Service Worker (Manifest V3)

function openOrFocusStudioTab() {
  const studioUrl = chrome.runtime.getURL('index.html');
  chrome.tabs.query({}, (tabs) => {
    const existing = tabs.find(t => t.url && t.url.startsWith(studioUrl));
    if (existing) {
      chrome.tabs.update(existing.id, { active: true });
      chrome.windows.update(existing.windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: studioUrl });
    }
  });
}

// Handle action / command shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-studio') {
    openOrFocusStudioTab();
  }
});

// Listen for messages from popup or page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'OPEN_STUDIO') {
    openOrFocusStudioTab();
    sendResponse({ status: 'ok' });
  }
});
