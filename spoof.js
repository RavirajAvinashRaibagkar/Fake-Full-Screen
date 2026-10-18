// spoof.js — runs inside the PAGE's own JS world at document_start (manifest "world": "MAIN").
// While enabled for a site, the page sees a fully working (fake) Fullscreen API:
//   requestFullscreen() "succeeds", fullscreenElement/fullscreenEnabled/fullscreen report true,
//   fullscreenchange fires, window sizes match the screen, (display-mode: fullscreen) matches.
// The browser itself never leaves windowed mode.
(() => {
  "use strict";

  const CTL_EVENT = "__ff_ctl__";
  // Also report screen-sized window.innerWidth/innerHeight/outerWidth/outerHeight while "fullscreen".
  // Turn off if a site's layout breaks because it sizes its UI from innerHeight.
  const SPOOF_WINDOW_SIZE = true;

  const win = window;
  const doc = document;
  const isTop = win === win.top;

  /* ---------- make patched functions look native ---------- */
  const nativeToString = Function.prototype.toString;
  const masks = new WeakMap();
  const toStringProxy = new Proxy(nativeToString, {
    apply(target, thisArg, args) {
      return masks.has(thisArg) ? masks.get(thisArg) : Reflect.apply(target, thisArg, args);
    },
  });
  masks.set(toStringProxy, "function toString() { [native code] }");
  Object.defineProperty(Function.prototype, "toString", {
    value: toStringProxy, writable: true, configurable: true,
  });

  function mask(fn, name, kind) {
    const full = kind ? `${kind} ${name}` : name;
    Object.defineProperty(fn, "name", { value: full, configurable: true });
    masks.set(fn, `function ${full}() { [native code] }`);
    return fn;
  }
  function patchMethod(target, name, make) {
    const d = Object.getOwnPropertyDescriptor(target, name);
    if (!d || typeof d.value !== "function") return;
    Object.defineProperty(target, name, { ...d, value: mask(make(d.value), name) });
  }
  function patchGetter(target, name, make) {
    const d = Object.getOwnPropertyDescriptor(target, name);
    if (!d || !d.get) return;
    Object.defineProperty(target, name, { ...d, get: mask(make(d.get), name, "get") });
  }

  /* ---------- fake fullscreen state ---------- */
  let enabled = false;
  let fsEl = null;
  const active = () => (fsEl && fsEl.isConnected ? fsEl : null);

  function fire(target) {
    for (const type of ["fullscreenchange", "webkitfullscreenchange"]) {
      try { target.dispatchEvent(new Event(type, { bubbles: true, composed: true })); } catch {}
    }
  }
  function fireResize() {
    try { win.dispatchEvent(new Event("resize")); } catch {}
  }
  function enter(el) {
    if (!el || !el.isConnected || fsEl === el) return;
    fsEl = el;
    fire(el);
    fireResize();
  }
  function leave() {
    if (!fsEl) return;
    const prev = fsEl;
    fsEl = null;
    fire(prev.isConnected ? prev : doc);
    fireResize();
  }

  /* ---------- Document getters ---------- */
  const D = Document.prototype;
  for (const n of ["fullscreenElement", "webkitFullscreenElement", "webkitCurrentFullScreenElement"]) {
    patchGetter(D, n, (get) => function () { return (this === doc && active()) || get.call(this); });
  }
  for (const n of ["fullscreen", "webkitIsFullScreen"]) {
    patchGetter(D, n, (get) => function () { return (this === doc && !!active()) || get.call(this); });
  }
  for (const n of ["fullscreenEnabled", "webkitFullscreenEnabled"]) {
    patchGetter(D, n, (get) => function () { return enabled || get.call(this); });
  }

  /* ---------- request / exit ---------- */
  const E = Element.prototype;
  for (const n of ["requestFullscreen", "webkitRequestFullscreen", "webkitRequestFullScreen"]) {
    patchMethod(E, n, (original) => function (...args) {
      if (!enabled || !(this instanceof Element)) return Reflect.apply(original, this, args);
      if (n === "requestFullscreen") {
        return new Promise((resolve) => setTimeout(() => { enter(this); resolve(); }, 0));
      }
      setTimeout(() => enter(this), 0);
    });
  }
  for (const n of ["exitFullscreen", "webkitExitFullscreen", "webkitCancelFullScreen"]) {
    patchMethod(D, n, (original) => function (...args) {
      if (this !== doc || !fsEl) return Reflect.apply(original, this, args);
      if (n === "exitFullscreen") {
        return new Promise((resolve) => setTimeout(() => { leave(); resolve(); }, 0));
      }
      setTimeout(leave, 0);
    });
  }

  /* ---------- window size / position (what "is the window fullscreen?" checks read) ---------- */
  if (SPOOF_WINDOW_SIZE) {
    const scr = win.screen;
    const fake = {
      innerWidth: () => scr.width,  innerHeight: () => scr.height,
      outerWidth: () => scr.width,  outerHeight: () => scr.height,
      screenX: () => 0, screenY: () => 0, screenLeft: () => 0, screenTop: () => 0,
    };
    for (const [name, val] of Object.entries(fake)) {
      patchGetter(win, name, (get) => function () { return active() ? val() : get.call(this); });
    }
  }

  /* ---------- matchMedia('(display-mode: fullscreen)') ---------- */
  patchMethod(win, "matchMedia", (original) => function (...args) {
    const mql = Reflect.apply(original, this, args);
    if (typeof args[0] === "string" && /display-mode\s*:\s*fullscreen/i.test(args[0])) {
      return new Proxy(mql, {
        get(t, p) {
          if (p === "matches" && active()) return true;
          const v = Reflect.get(t, p, t);
          return typeof v === "function" ? v.bind(t) : v;
        },
        set(t, p, v) { return Reflect.set(t, p, v, t); },
      });
    }
    return mql;
  });

  /* ---------- control channel from bridge.js ---------- */
  win.addEventListener(CTL_EVENT, (e) => {
    let on;
    try { on = !!JSON.parse(e.detail).enabled; } catch { return; }
    if (on === enabled) return;
    enabled = on;
    if (on) { if (isTop) enter(doc.documentElement); }
    else leave();
  });
})();
