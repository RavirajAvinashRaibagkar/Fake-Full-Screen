// service_worker.js
// Toggles fake fullscreen for the current site (hostname) by flipping a list in storage.
// Content scripts react to the storage change, so no tab messaging is needed.

const KEY = "enabledHosts";

async function toggleForTab(tab) {
  if (!tab || !tab.url) return;
  let host;
  try {
    const u = new URL(tab.url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return;
    host = u.hostname;
  } catch {
    return;
  }
  const res = await chrome.storage.local.get(KEY);
  const set = new Set(res[KEY] || []);
  if (set.has(host)) set.delete(host);
  else set.add(host);
  await chrome.storage.local.set({ [KEY]: [...set] });
}

chrome.action.onClicked.addListener((tab) => toggleForTab(tab));

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "toggle-fake-fullscreen") return;
  if (!tab) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  toggleForTab(tab);
});

// The top-frame content script reports state so we can show an ON badge per tab.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== "FF_STATE" || !sender.tab || sender.frameId !== 0) return;
  chrome.action.setBadgeText({ tabId: sender.tab.id, text: msg.enabled ? "ON" : "" });
  chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: "#16a34a" });
});
