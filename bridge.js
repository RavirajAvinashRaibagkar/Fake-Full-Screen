// bridge.js — isolated world. Reads storage and tells spoof.js (page world) whether to be active.
(() => {
  const KEY = "enabledHosts";
  const EVT = "__ff_ctl__";
  const isTop = window === window.top;

  // Use the TOP page's hostname, so iframes follow the site you toggled.
  const topHost = (() => {
    try {
      const ao = location.ancestorOrigins;
      const origin = ao && ao.length ? ao[ao.length - 1] : location.origin;
      return new URL(origin).hostname;
    } catch {
      return location.hostname;
    }
  })();

  let last = null;
  function apply(list) {
    const enabled = Array.isArray(list) && list.includes(topHost);
    if (enabled === last) return;
    last = enabled;
    window.dispatchEvent(new CustomEvent(EVT, { detail: JSON.stringify({ enabled }) }));
    if (isTop) chrome.runtime.sendMessage({ type: "FF_STATE", enabled }).catch(() => {});
  }

  chrome.storage.local.get(KEY).then((r) => apply(r[KEY]));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[KEY]) apply(changes[KEY].newValue);
  });
})();
