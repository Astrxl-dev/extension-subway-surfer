let adblockAllowed = false;
const adblockSafeMode = false;


const POPUP_HOST_PATTERNS = [
  'doubleclick', 'googlesyndication', 'adsystem', 'adservice', 'adnxs', 'taboola',
  'outbrain', 'popads', 'propellerads', 'trafficroots', 'clickadu', 'spoutable',
  'onclick', 'interstitial', 'popunder', 'redir', 'redirect', 'trk.', 'track.',
  'adzerk', 'revcontent', 'megapop', 'adblade', 'exoclick', 'juicyads', 'adsterra',
  'popcash', 'admaven', 'hilltopads', 'monetag', 'richads', 'trafficjunky', 'mgid',
  'zeroredirect', 'pubmatic', 'openx', 'criteo', 'smartadserver', 'amazon-adsystem',
  'media.net', 'bidvertiser', 'adcash', 'adcolony', 'unity3d', 'applovin', 'vungle',
  'inmobi', 'mopub', 'ironsrc', 'chartboost', 'startapp', 'fyber', 'tapjoy',
  'adroll', 'perfectaudience', 'retargeter', 'steelhouse', 'chango', 'triggit',
  'ad.', 'ads.', 'adv.', 'banner.', 'click.', 'pop.', 'tracking.', 'pixel.',
  'syndication', 'adsrv', 'adserver', 'adtech', 'advertising', 'sponsor'
];

const POPUP_PATH_PATTERNS = [
  'popup', 'popunder', 'interstitial', 'advert', 'ads', 'trk', 'redirect',
  'click', 'banner', 'promo', 'sponsor', 'aff', 'partner', 'track', 'pixel',
  'conversion', 'campaign', 'landing', 'offer', 'deal', 'cpa', 'cpc', 'cpm'
];

const MAX_MUTATIONS_PER_BATCH = 150;
let adMutationObserverStarted = false;

const normalizeUrl = (rawUrl) => {
  if (!rawUrl) return '';
  try {
    return new URL(rawUrl, location.href).href;
  } catch (e) {
    return String(rawUrl);

  }
};

const shouldBlockUrl = (rawUrl) => {
  const href = normalizeUrl(rawUrl);
  if (!href) return false;

  try {
    const url = new URL(href);
    if (url.origin === location.origin) return false;


    const host = url.hostname.toLowerCase();
    if (POPUP_HOST_PATTERNS.some((p) => host.includes(p))) return true;
    if (POPUP_PATH_PATTERNS.some((p) => url.pathname.toLowerCase().includes(p))) return true;
    return false;
  } catch (e) {
    return true;
  }
};

function patchWindowOpen() {
  if (!adblockAllowed) return;
  const originalOpen = window.open;
  if (!originalOpen || originalOpen.__gt_patched) return;

  const wrapped = function patchedOpen(url, target, features) {
    if (!url || url === 'about:blank' || url === '' || shouldBlockUrl(url)) {
      chrome.runtime.sendMessage({
        action: 'adBlocked'
      });
      return null;
    }
    if (!window._userInteracting) {
      chrome.runtime.sendMessage({
        action: 'adBlocked'
      });
      return null;
    }
    return originalOpen.apply(this, arguments);
  };

  wrapped.__gt_patched = true;
  window.open = wrapped;


  ['click', 'mousedown', 'keydown', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => {
      window._userInteracting = true;

      setTimeout(() => {
        window._userInteracting = false;
      }, 1000);
    }, true);

  });
}

function setupClickPopupGuard() {
  if (!adblockAllowed) return;

  const guard = (event) => {
    if (!event.isTrusted) return;

    const anchor = event.target?.closest?.('a');

    const href = anchor?.href || null;
    if (href && shouldBlockUrl(href)) {
      event.preventDefault();
      event.stopPropagation();
      chrome.runtime.sendMessage({
        action: 'adBlocked'
      });
    }
  };
  document.addEventListener('click', guard, true);
}

function scanAndRemoveAds(root = document) {
  if (!adblockAllowed) return;
  try {
    const nodes = root.querySelectorAll(adSelectors.join(','));
    nodes.forEach((node) => {
      node.remove();
      chrome.runtime.sendMessage({
        action: 'adBlocked'
      });
    });
  } catch (e) {
  }
}

function startAdMutationObserver() {
  if (!adblockAllowed || adMutationObserverStarted || adblockSafeMode) return;

  adMutationObserverStarted = true;

  try {
    const observer = new MutationObserver((mutations) => {
      let processed = 0;
      for (const mutation of mutations) {
        if (processed > MAX_MUTATIONS_PER_BATCH) break;
        mutation.addedNodes.forEach((node) => {
          if (processed > MAX_MUTATIONS_PER_BATCH) return;
          if (node.nodeType !== 1) return;

          const element = node;

          if (element.tagName === 'IFRAME') {
            const src = element.src || element.getAttribute('src') || '';
            const name = element.name || '';

            const id = element.id || '';
            if (shouldBlockUrl(src) || /ad|banner|pop|promo|sponsor/i.test(name + id + src)) {
              element.remove();
              chrome.runtime.sendMessage({
                action: 'adBlocked'
              });

              processed += 1;
              return;
            }
          }

          if (element.tagName === 'SCRIPT') {
            const src = element.src || '';

            if (shouldBlockUrl(src)) {
              element.remove();
              chrome.runtime.sendMessage({
                action: 'adBlocked'
              });
              processed += 1;
              return;

            }
          }

          const style = element.style;
          if (style && style.zIndex && parseInt(style.zIndex) > 999999 && style.position === 'fixed') {
            const isOurs = element.id && (element.id.includes('timer') || element.id.includes('fps') || element.id.includes('key'));
            if (!isOurs) {
              element.remove();

              chrome.runtime.sendMessage({
                action: 'adBlocked'
              });
              processed += 1;
              return;

            }
          }

          if (element.matches?.(adSelectors.join(','))) {
            element.remove();

            chrome.runtime.sendMessage({
              action: 'adBlocked'
            });
            processed += 1;
            return;
          }

          const childMatch = element.querySelector?.(adSelectors.join(','));
          if (childMatch) {
            childMatch.remove();
            chrome.runtime.sendMessage({
              action: 'adBlocked'
            });
            processed += 1;
          }
        });

      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  } catch (e) {
    adMutationObserverStarted = false;
  }
}

(async () => {
  const {
    adblockActive
  } = await chrome.storage.local.get(["adblockActive"]);
  if (adblockActive === false) {
    adblockAllowed = false;
    return;
  }
  adblockAllowed = true;

  patchWindowOpen();
  setupClickPopupGuard();
})();

let lastMouseX = 0;
let lastMouseY = 0;

let tripleClickActive = !1;
let tripleClickKey = "KeyF";

let tripleClickX = null;
let tripleClickY = null;

let pickingTripleClickPos = !1;
document.addEventListener('mousemove', var1 => {
  lastMouseX = var1.clientX;
  lastMouseY = var1.clientY
}, {
  passive: !0
});
chrome.storage.local.get(['tripleClickActive', 'tripleClickKey', 'tripleClickX', 'tripleClickY'], var2 => {
  if (var2.tripleClickActive !== undefined) tripleClickActive = var2.tripleClickActive;

  if (var2.tripleClickKey) tripleClickKey = var2.tripleClickKey;
  if (var2.tripleClickX !== undefined && var2.tripleClickX !== null) tripleClickX = Number(var2.tripleClickX);
  if (var2.tripleClickY !== undefined && var2.tripleClickY !== null) tripleClickY = Number(var2.tripleClickY);

});


function showClickIndicator(x, y, msg) {
  const dot = document.createElement('div');
  dot.style.cssText = 'position:fixed;width:30px;height:30px;border-radius:50%;pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);background:#10b981;box-shadow:0 0 15px #10b981;';
  dot.style.left = x + 'px';
  dot.style.top = y + 'px';
  document.body.appendChild(dot);
  setTimeout(() => dot.remove(), 300);

}

function doTripleClick() {
  const clickX = lastMouseX;

  const clickY = lastMouseY;

  showClickIndicator(clickX, clickY);

  const canvas = document.querySelector('canvas');
  if (!canvas) {
    return
  }

  const rect = canvas.getBoundingClientRect();
  const offsetX = clickX - rect.left;
  const offsetY = clickY - rect.top;

  const simulateClick = () => {
    const eventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: clickX,
      clientY: clickY,
      screenX: clickX + window.screenX,
      screenY: clickY + window.screenY,
      pageX: clickX + window.scrollX,
      pageY: clickY + window.scrollY,
      offsetX: offsetX,
      offsetY: offsetY,
      button: 0,
      buttons: 1,
      detail: 1
    };

    canvas.dispatchEvent(new MouseEvent('mousedown', eventInit));

    canvas.dispatchEvent(new MouseEvent('mouseup', eventInit));
    canvas.dispatchEvent(new MouseEvent('click', eventInit));
  };

  simulateClick();
  setTimeout(simulateClick, 80);

  setTimeout(simulateClick, 160);
}

function startPickingTripleClickPosition() {
  if (pickingTripleClickPos) return;
  pickingTripleClickPos = true;

  const overlay = document.createElement('div');
  overlay.id = 'triple-click-pick-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;cursor:crosshair;background:rgba(99,102,241,0.15);';

  const indicator = document.createElement('div');
  indicator.id = 'triple-click-pick-indicator';

  indicator.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#6366f1;color:white;padding:12px 24px;border-radius:12px;font-family:Inter,sans-serif;font-size:14px;font-weight:600;z-index:2147483647;box-shadow:0 8px 32px rgba(99,102,241,0.4);pointer-events:none;';
  indicator.textContent = '🎯 Cliquez pour définir la position (Échap pour annuler)';
  const cursor = document.createElement('div');
  cursor.id = 'triple-click-cursor';
  cursor.style.cssText = 'position:fixed;width:20px;height:20px;border:3px solid #6366f1;border-radius:50%;pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);box-shadow:0 0 0 2px white,0 4px 12px rgba(0,0,0,0.3);';
  const coords = document.createElement('div');
  coords.id = 'triple-click-coords';
  coords.style.cssText = 'position:fixed;background:#18181b;color:#f4f4f5;padding:6px 12px;border-radius:8px;font-family:monospace;font-size:13px;pointer-events:none;z-index:2147483647;transform:translate(15px,-50%);border:1px solid #3f3f46;';
  document.body.appendChild(overlay);
  document.body.appendChild(indicator);
  document.body.appendChild(cursor);
  document.body.appendChild(coords);

  const updateCursor = (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    coords.style.left = e.clientX + 'px';
    coords.style.top = e.clientY + 'px';
    coords.textContent = 'X: ' + e.clientX + ' | Y: ' + e.clientY;
  };
  const cleanup = () => {
    pickingTripleClickPos = false;
    overlay.remove();
    indicator.remove();
    cursor.remove();
    coords.remove();
    document.removeEventListener('mousemove', updateCursor);
    document.removeEventListener('keydown', handleEscape);
  };

  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      cleanup();
    }
  };
  overlay.addEventListener('click', (e) => {
    e.preventDefault();

    e.stopPropagation();
    const x = e.clientX;

    const y = e.clientY;
    tripleClickX = x;
    tripleClickY = y;
    chrome.storage.local.set({
      tripleClickX: x,
      tripleClickY: y
    });
    indicator.textContent = '✅ Position: X=' + x + ', Y=' + y;
    indicator.style.background = '#10b981';

    setTimeout(cleanup, 800);
  });
  document.addEventListener('mousemove', updateCursor);

  document.addEventListener('keydown', handleEscape);

}

const log = () => {};
log("Gaming Tools Suite Complete - Content script chargé");
const adSelectors = [
  "[id*='google_ads']", "[class*='google-ad']",
  "[id*='ad-']", "[class*='ad-']",
  "[class*='advertisement']", "iframe[src*='doubleclick']",
  "iframe[src*='googlesyndication']", ".adsbygoogle",
  "[id*='banner']", "[class*='banner']",
  "[id*='sponsor']", "[class*='sponsor']",
  "[class*='AdBox']", "[class*='ad_container']",
  "[id*='popup']", "[class*='popup-ad']",
  "ins.adsbygoogle", "div[data-ad-slot]",
  "div[data-google-query-id]", "[id*='dfp-']",
  "[class*='dfp-']", "div[data-freestar-ad]",
  "div[id^='div-gpt-ad']", "div[class*='pub_']",
  "[id*='advert']", "[class*='advert']",
  "[class*='promo']", "[id*='promo']",
  "[class*='overlay-ad']", "[id*='overlay-ad']",
  "[class*='interstitial']", "[id*='interstitial']",
  "[class*='modal-ad']", "[class*='splash-ad']",
  "[class*='sticky-ad']", "[class*='floating-ad']",
  "[class*='bottom-ad']", "[class*='top-ad']",
  "[class*='sidebar-ad']", "[class*='leaderboard']",
  "[class*='skyscraper']", "[class*='rectangle-ad']",
  "[data-ad]", "[data-ads]", "[data-adunit]",
  "[aria-label*='advertisement']", "[aria-label*='sponsored']",
  ".ad-wrapper", ".ad-slot", ".ad-unit", ".ad-block",
  "aside[class*='ad']", "section[class*='ad']",
  "[class*='native-ad']", "[class*='promoted']",
  "[class*='taboola']", "[class*='outbrain']", "[class*='mgid']",
  "a[href*='click.'], a[href*='track.']",
  "iframe[src*='adserver']", "iframe[src*='adsrv']",
  "iframe[id*='google_ads']", "iframe[name*='google_ads']",
  "div[class*='_ad']", "div[id*='_ad']",
  ".pub_300x250", ".pub_728x90", ".text-ad", ".textAd",
  "#carbonads", ".carbon-wrap", "#ad_top", "#ad_bottom"
];

function injectAdblockCSS() {
  const styleId = 'gaming-tools-adblock';

  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = adSelectors.join(',') + ' { display: none !important; visibility: hidden !important; pointer-events: none !important; width: 0 !important; height: 0 !important; position: absolute !important; left: -9999px !important; }';

  document.head.appendChild(style);
  log("AdBlock CSS injecté");
}

async function initAdblock() {
  if (!adblockAllowed) return;
  const response = await chrome.runtime.sendMessage({
    'action': "getAdblockState"
  });
  if (response && response.active !== false) {
    injectAdblockCSS();
    scanAndRemoveAds();
    startAdMutationObserver();
    const observer = new MutationObserver(() => {
      if (!document.getElementById('gaming-tools-adblock')) injectAdblockCSS();
    });
    observer.observe(document.head, {
      childList: true
    });
  }
}
initAdblock();
let timerOverlay = null;
let timerState = "stopped";
let startTime = null;
let currentTime = 0;
let timerInterval = null;
let isVisible = !1;
let timerDisplayEl = null;
let timerMainEl = null;
let timerDecimalsEl = null;
let lastTimerMain = '';
let lastTimerDecimals = '';
let currentHotkey = "Control";
let zqsdHandler = null;
let isResolutionForced = !1;

let fpsOverlay = null;
let fpsVisible = !1;
let fpsAnimationId = null;
let fpsLastTimestamp = null;
let fpsSamples = [];
let storedCustomBackground = null;
let storedCustomBackgroundActive = null;
let fpsSettings = {
  position: {
    x: 20,
    y: 100
  },
  visible: !1
};
let currentFpsTheme = "minimal";
const DEFAULT_KEYPRESS_SETTINGS = {
  visible: !1,
  size: 1,
  layout: 'arrows',
  theme: "default",
  position: null
};
let keypressOverlay = null;

let keypressVisible = !1;
let keypressSettings = {
  ...DEFAULT_KEYPRESS_SETTINGS
};
let keypressKeyMap = {};
let keyResizeHandle = null;
let keySizeIndicator = null;
let isKeyResizeActive = !1;
let keyResizeState = null;

let keypressElementMap = Object.create(null);
let keypressActiveKeys = new Set();
let keypressBoundsHandle = null;
let lastSavedKeypressSettings = {
  ...DEFAULT_KEYPRESS_SETTINGS,
  position: null
};
(async () => {
  const response = await chrome.runtime.sendMessage({
    action: 'getHotkey'
  });

  if (response && response.hotkey) {
    currentHotkey = response.hotkey
  }
})();
document.addEventListener("keydown", handleKeydown, !0);
document.addEventListener("keyup", handleKeyup, !0);
(async () => {
  const response = await chrome.runtime.sendMessage({
    action: "getZqsdState"
  });
  if (response && response.active) {
    log("ZQSD était activé - réactivation automatique");
    if (window.wasdZqsdHandler) {
      document.removeEventListener("keydown", window.wasdZqsdHandler, !0);

      document.removeEventListener("keyup", window.wasdZqsdHandler, !0);
      window.wasdZqsdHandler = null;
      zqsdHandler = null
    }
    setTimeout(() => {
      activateZqsdDirectly();

      setTimeout(() => {
        if (keypressOverlay && keypressVisible) {
          const layout = keypressSettings.layout || 'arrows';
          renderKeypressLayout(layout)
        }
      }, 100)
    }, 1000)
  }
})();
(async () => {
  const response = await chrome.runtime.sendMessage({
    action: "getFpsSettings"
  });
  if (chrome.runtime.lastError) {
    return
  }
  if (response && response.settings) {
    const {
      position,
      visible
    } = response.settings;
    if (position && typeof position.x === "number" && typeof position.y === 'number') {
      fpsSettings.position = position
    }
    fpsSettings.visible = !!visible;
    if (fpsSettings.visible) {
      if (!fpsOverlay) createFpsOverlay();
      fpsVisible = !0;
      applyFpsSettings();
    }
  }
})();
(async () => {
  const response = await chrome.runtime.sendMessage({
    action: "getKeypressSettings"
  });
  if (chrome.runtime.lastError) {
    return
  }
  if (response && response.settings) {
    keypressVisible = !!response.settings.visible;
    keypressSettings.visible = keypressVisible;
    keypressSettings.size = clampKeypressScale(response.settings.size ?? 1);

    const layout = typeof response.settings.layout === 'string' ? response.settings.layout.toLowerCase() : "arrows";
    let needsUpdate = !1;
    let newLayout = "arrows";
    if (KEY_LAYOUTS[layout]) {
      newLayout = layout
    }
    keypressSettings.layout = newLayout;
    const theme = typeof response.settings.theme === "string" ? response.settings.theme : null;
    const resolvedTheme = resolveThemeKey(theme);
    keypressSettings.theme = resolvedTheme;
    if (response.settings.position && typeof response.settings.position === 'object') {
      const {
        x,
        y
      } = response.settings.position;
      if (Number.isFinite(x) && Number.isFinite(y)) {
        keypressSettings.position = {
          x: Math.round(x),
          y: Math.round(y)
        }
      } else {
        keypressSettings.position = null
      }
    } else {
      keypressSettings.position = null
    }
    if (needsUpdate) {
      persistKeypressSettings({
        layout: newLayout
      })
    }
    if (theme && resolvedTheme !== theme.toLowerCase()) {
      persistKeypressSettings({
        theme: resolvedTheme
      })
    }
    lastSavedKeypressSettings = {
      visible: keypressSettings.visible,
      size: keypressSettings.size,
      layout: keypressSettings.layout,
      theme: keypressSettings.theme,
      position: keypressSettings.position ? {
        ...keypressSettings.position
      } : null
    };
    if (keypressVisible) {
      createKeypressOverlay();
      setKeypressLayout(keypressSettings.layout);
      applyKeypressSize(keypressSettings.size);
      applyKeypressTheme(keypressSettings.theme);
      keypressOverlay.style.display = "block";
      applyKeypressPosition(keypressSettings.position);
      scheduleKeypressBoundsCheck()
    }
  }
})();
let currentGlobalVolume = 1;
let volumePageReady = !1;

function injectVolumeScript() {
  const rootEl = document.documentElement || document.head || document.body;
  if (!rootEl) {
    window.addEventListener("DOMContentLoaded", injectVolumeScript, {
      once: !0
    });
    return
  }
  if (rootEl.dataset?.["volumeInjected"] === "true") {
    return
  }
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src = chrome.runtime.getURL("volumeInjected.js");
  script.dataset.channel = "GAMING_TOOLS_VOLUME_CHANNEL";
  script.addEventListener("load", () => {
    script.remove()
  });
  rootEl.appendChild(script);
  if (rootEl.dataset) {
    rootEl.dataset.volumeInjected = "true"
  }
}

function sendVolumeToPage(type, payload = {}) {
  window.postMessage({
    source: "GAMING_TOOLS_VOLUME_CHANNEL",
    type,
    payload,
  })
}
async function initGlobalVolumeControl() {
  injectVolumeScript();
  const {
    globalVolumeLevel
  } = await chrome.storage.local.get(["globalVolumeLevel"]);
  if (globalVolumeLevel !== undefined) {
    currentGlobalVolume = Math.min(1, Math.max(0, globalVolumeLevel))
  }
  if (volumePageReady) {
    sendVolumeToPage("EXT_INIT_VOLUME", {
      volume: currentGlobalVolume
    })
  }
  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.source !== "GAMING_TOOLS_VOLUME_CHANNEL") {
      return
    }
    const {
      type,
      payload
    } = event.data;
    if (type === "PAGE_READY") {
      volumePageReady = !0;

      sendVolumeToPage("EXT_INIT_VOLUME", {
        volume: currentGlobalVolume
      })
    } else if (type === "PAGE_VOLUME") {
      const volume = Math.min(1, Math.max(0, payload?.["volume"] || 0));
      currentGlobalVolume = volume;
      chrome.storage.local.set({
        globalVolumeLevel: volume
      })
    }
  })
}
initGlobalVolumeControl();

(async () => {
  const {
    advancedStyleV2
  } = await chrome.storage.local.get('advancedStyleV2');
  if (advancedStyleV2) {
    setTimeout(() => {
      const applyV2 = (s) => {
        const timerOverlay = document.getElementById('speedrun-timer-overlay');

        const timerDisplayEl = timerOverlay?.querySelector('#timer-display');

        const fpsOverlay = document.getElementById('fps-monitor-overlay');
        const keypressOverlay = document.getElementById('keypress-overlay');

        if (s.timer && timerOverlay) {
          const ts = s.timer;
          timerOverlay.style.backgroundColor = ts.bgColor || '#000000';
          timerOverlay.style.borderRadius = ts.borderRadius || '0px';
          timerOverlay.style.opacity = ts.opacity !== undefined ? ts.opacity : 1;
          timerOverlay.style.borderWidth = ts.borderWidth || '0px';
          timerOverlay.style.borderColor = ts.borderColor || '#6366f1';
          timerOverlay.style.borderStyle = parseInt(ts.borderWidth) > 0 ? 'solid' : 'none';
          timerOverlay.style.boxShadow = parseInt(ts.shadow) > 0 ? `0 0 ${ts.shadow} rgba(0,0,0,0.5)` : 'none';

          if (timerDisplayEl) {
            timerDisplayEl.style.color = ts.textColor || '#FFFFFF';
            if (ts.fontFamily) timerDisplayEl.style.fontFamily = ts.fontFamily;
          }
        }
        if (s.fps && fpsOverlay) {
          const fs = s.fps;
          fpsOverlay.style.backgroundColor = fs.bgColor || '#000000';
          fpsOverlay.style.borderRadius = fs.borderRadius || '4px';
          fpsOverlay.style.opacity = fs.opacity !== undefined ? fs.opacity : 1;
          fpsOverlay.style.borderWidth = fs.borderWidth || '0px';
          fpsOverlay.style.borderColor = fs.borderColor || '#10b981';
          fpsOverlay.style.borderStyle = parseInt(fs.borderWidth) > 0 ? 'solid' : 'none';
          fpsOverlay.style.boxShadow = parseInt(fs.shadow) > 0 ? `0 0 ${fs.shadow} rgba(0,0,0,0.5)` : 'none';
          const valueEl = fpsOverlay.querySelector('.fps-value');
          if (valueEl) {
            valueEl.style.color = fs.textColor || '#FFFFFF';

            if (fs.fontFamily) valueEl.style.fontFamily = fs.fontFamily;

          }
        }
        if (s.keys && keypressOverlay) {
          const ks = s.keys;
          keypressOverlay.style.setProperty('--key-bg', ks.bgColor || '#000000');
          keypressOverlay.style.setProperty('--key-color', ks.textColor || '#ffffff');
          keypressOverlay.style.setProperty('--key-border', ks.borderColor || '#3d3d3d');
          keypressOverlay.style.setProperty('--key-active-bg', ks.activeBgColor || '#4bc277');
          keypressOverlay.style.setProperty('--key-active-border', ks.activeColor || '#4bc277');
          keypressOverlay.style.setProperty('--key-radius', ks.borderRadius || '12px');
          keypressOverlay.style.setProperty('--key-border-width', ks.borderWidth || '2px');
          keypressOverlay.style.setProperty('--key-gap', ks.gap || '10px');
          keypressOverlay.style.opacity = ks.opacity !== undefined ? ks.opacity : 1;

          const shadowPx = parseInt(ks.shadow) || 0;
          if (shadowPx > 0) {
            keypressOverlay.style.setProperty('--key-shadow', `0 ${shadowPx}px ${shadowPx*2}px rgba(0,0,0,0.3)`);
            keypressOverlay.style.setProperty('--key-active-shadow', `0 ${shadowPx}px ${shadowPx*2}px rgba(75,194,119,0.4)`);
          } else {
            keypressOverlay.style.setProperty('--key-shadow', 'none');
            keypressOverlay.style.setProperty('--key-active-shadow', 'none');
          }

          const sizeScale = ks.sizeScale || 1;
          keypressOverlay.style.setProperty('--key-scale', String(sizeScale));

          const keys = keypressOverlay.querySelectorAll('.key');
          const keyContainer = keypressOverlay.querySelector('.key-container');
          if (keyContainer) {
            keyContainer.style.gap = `calc(${ks.gap || '10px'} * ${sizeScale})`;
          }
          let activeKeyStyle = document.getElementById('key-active-dynamic-style');
          if (!activeKeyStyle) {
            activeKeyStyle = document.createElement('style');
            activeKeyStyle.id = 'key-active-dynamic-style';
            document.head.appendChild(activeKeyStyle);
          }
          const activeBgColor = ks.activeBgColor || '#4bc277';
          const activeTextColor = ks.activeTextColor || '#ffffff';

          const activeBorderColor = ks.activeColor || '#4bc277';
          activeKeyStyle.textContent = `
                        #key-display-overlay .key.active {
                            background: ${activeBgColor} !important;
                            border-color: ${activeBorderColor} !important;
                        }
                        #key-display-overlay .key.active span {
                            color: ${activeTextColor} !important;
                        }
                    `;

          keys.forEach(key => {
            key.style.background = ks.bgColor || '#000000';
            key.style.borderColor = ks.borderColor || '#3d3d3d';
            key.style.borderRadius = ks.borderRadius || '12px';

            key.style.borderWidth = ks.borderWidth || '2px';
            key.style.borderStyle = 'solid';
            if (shadowPx > 0) {
              key.style.boxShadow = `0 ${shadowPx}px ${shadowPx*2}px rgba(0,0,0,0.3)`;
            } else {
              key.style.boxShadow = 'none';
            }
            const span = key.querySelector('span');

            if (span) span.style.color = ks.textColor || '#ffffff';
          });
        }
      };
      applyV2(advancedStyleV2);
    }, 1500);
  }
})();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") {
    return
  }
  if (Object.prototype.hasOwnProperty.call(changes, "globalVolumeLevel")) {
    currentGlobalVolume = Math.min(1, Math.max(0, changes.globalVolumeLevel.newValue));
    sendVolumeToPage('EXT_SET_VOLUME', {
      volume: currentGlobalVolume
    })
  }
});
let blackBarsEnabled = !0;
const RESOLUTION_CONFIGS = {
  '608x1080': {
    width: 608,
    height: 1080,
    indicator: "608×1080 ACTIF"
  },
  '890x1080': {
    width: 890,
    height: 1080,
    indicator: "890×1080 ACTIF"
  }
};
let currentResolutionMode = null;
(async () => {
  const data = await chrome.storage.local.get(["blackBarsEnabled", "forcedResolutionMode", "verticalResolutionEnabled", "barsColor"]);
  if (data.blackBarsEnabled !== undefined) {
    blackBarsEnabled = data.blackBarsEnabled
  }
  let forcedResolutionMode = data.forcedResolutionMode;
  if (!forcedResolutionMode && data.verticalResolutionEnabled) {
    forcedResolutionMode = "608x1080"
  }
  const hasPreset = forcedResolutionMode && RESOLUTION_CONFIGS[forcedResolutionMode];
  const isCustom = typeof forcedResolutionMode === 'string' && /^\d{2,4}x\d{2,4}$/i.test(forcedResolutionMode || '');
  if (forcedResolutionMode && (hasPreset || isCustom)) {
    const resolutionMode = forcedResolutionMode;
    const barsColor = (typeof data.barsColor === 'string' && data.barsColor) ? data.barsColor : '#000000';
    const applyResolution = () => {
      if (document.readyState === "complete") {
        setTimeout(() => applyForcedResolution(resolutionMode, blackBarsEnabled, barsColor), 500)
      } else {
        window.addEventListener("load", () => {
          setTimeout(() => applyForcedResolution(resolutionMode, blackBarsEnabled, barsColor), 500)
        }, {
          once: !0
        })
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener('DOMContentLoaded', applyResolution, {
        once: !0
      })
    } else {
      applyResolution()
    }
  }
})();

function applyForcedResolution(resolutionMode = '608x1080', enableBlackBars = !0, barsColor = '#000000') {
  let width, height, indicator;
  if (RESOLUTION_CONFIGS[resolutionMode]) {
    const cfg = RESOLUTION_CONFIGS[resolutionMode];
    width = cfg.width;
    height = cfg.height;
    indicator = cfg.indicator
  } else if (typeof resolutionMode === 'string' && /^\d{2,4}x\d{2,4}$/i.test(resolutionMode)) {
    const parts = resolutionMode.toLowerCase().split('x');
    width = parseInt(parts[0], 10);
    height = parseInt(parts[1], 10);
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      width = 608;

      height = 1080
    }
    indicator = `${width}×${height} ACTIF`
  } else {
    const cfg = RESOLUTION_CONFIGS['608x1080'];
    width = cfg.width;
    height = cfg.height;
    indicator = cfg.indicator;
    resolutionMode = '608x1080'
  }
  log("Application permanente du mode " + resolutionMode);
  blackBarsEnabled = enableBlackBars;
  currentResolutionMode = resolutionMode;
  isResolutionForced = !0;
  chrome.storage.local.set({
    blackBarsEnabled: enableBlackBars,
    verticalResolutionEnabled: resolutionMode === "608x1080",
    forcedResolutionMode: resolutionMode,
    selectedResolutionMode: resolutionMode
  });
  chrome.runtime.sendMessage({
    action: "saveResolutionState",
    active: !0,
    mode: resolutionMode
  });
  let viewportMeta = document.querySelector("meta[name=\"viewport\"]");
  if (!viewportMeta) {
    viewportMeta = document.createElement("meta");
    viewportMeta.name = "viewport";
    document.head.appendChild(viewportMeta)
  }
  viewportMeta.content = "width=" + width + ", user-scalable=no";
  const body = document.body;

  const docElement = document.documentElement;
  const timerOverlay = document.getElementById("speedrun-timer-overlay");
  if (timerOverlay) {
    document.documentElement.appendChild(timerOverlay);

    timerOverlay.style.position = 'fixed';
    timerOverlay.style.zIndex = "2147483647"
  }
  body.style.cssText = `
        margin: 0 !important;

        padding: 0 !important;

        width: ${width}px !important;
        min-width: ${width}px !important;
        max-width: ${width}px !important;
        height: ${height}px !important;
        min-height: ${height}px !important;
        overflow: hidden !important;

        position: fixed !important;
        left: 50% !important;
        top: 50% !important;
        transform: translate(-50%, -50%) !important;
        box-sizing: border-box !important;
    `;
  const backgroundColor = blackBarsEnabled ? barsColor : "transparent";
  docElement.style.cssText = `
        margin: 0 !important;
        padding: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        overflow: hidden !important;
        background: ${backgroundColor} !important;
        box-sizing: border-box !important;
    `;
  docElement.style.setProperty("background", backgroundColor, "important");
  document.body.offsetHeight;
  docElement.offsetHeight;
  setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
    document.body.offsetHeight
  }, 50);
  setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
    window.scrollTo(0, 0)
  }, 150);
  setTimeout(() => {
    window.dispatchEvent(new Event("resize"))
  }, 300);
  setTimeout(() => {
    forceResizeToWidth(width)
  }, 100);
  const indicatorDiv = document.createElement('div');
  indicatorDiv.style.cssText = `
        position: fixed;
        top: 10px;

        left: 50%;
        transform: translateX(-50%);
        background: #44ff44;

        color: black;
        padding: 5px 10px;

        border-radius: 3px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        z-index: 2147483646;
        pointer-events: none;
        opacity: 0.8;
    `;
  indicatorDiv.textContent = indicator;
  indicatorDiv.id = "resolution-indicator-permanent";
  document.body.appendChild(indicatorDiv);
  setTimeout(() => {
    if (indicatorDiv && indicatorDiv.parentNode) {
      indicatorDiv.style.transition = "opacity 0.5s";
      indicatorDiv.style.opacity = '0';
      setTimeout(() => {
        if (indicatorDiv && indicatorDiv.parentNode) {
          indicatorDiv.remove()
        }
      }, 500)
    }
  }, 3000);
  log("Mode " + resolutionMode + " appliqué de manière permanente")
}

function restoreNormalResolution() {
  log("Restauration de la résolution normale");
  const body = document.body;
  const docElement = document.documentElement;
  body.style.cssText = '';
  docElement.style.cssText = '';
  let viewportMeta = document.querySelector("meta[name=\"viewport\"]");
  if (viewportMeta) {
    viewportMeta.content = "width=device-width, initial-scale=1.0"
  }
  const permanentIndicator = document.getElementById("resolution-indicator-permanent");
  if (permanentIndicator) {
    permanentIndicator.remove()
  }
  window.dispatchEvent(new Event('resize'));
  const normalModeIndicator = document.createElement("div");
  normalModeIndicator.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff4444;
        color: white;
        padding: 5px 10px;
        border-radius: 3px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        z-index: 2147483646;
        pointer-events: none;
        opacity: 0.8;
    `;
  normalModeIndicator.textContent = "MODE NORMAL";
  document.body.appendChild(normalModeIndicator);
  setTimeout(() => {
    if (normalModeIndicator && normalModeIndicator.parentNode) {
      normalModeIndicator.style.transition = "opacity 0.5s";
      normalModeIndicator.style.opacity = '0';
      setTimeout(() => {
        if (normalModeIndicator && normalModeIndicator.parentNode) {
          normalModeIndicator.remove()
        }
      }, 500)
    }
  }, 2000);
  chrome.storage.local.set({
    verticalResolutionEnabled: !1
  });
  chrome.storage.local.remove("forcedResolutionMode");
  chrome.runtime.sendMessage({
    action: 'saveResolutionState',
    active: !1,
    mode: null
  });

  log("Résolution normale restaurée");
  currentResolutionMode = null;
  isResolutionForced = !1
}

function forceResizeToWidth(width) {
  const allElements = document.querySelectorAll('div, section, main, article, header, footer, img');
  allElements.forEach(element => {
    if (element.id === "speedrun-timer-overlay") {
      return
    }
    const styles = window.getComputedStyle(element);
    if (["div", "section", 'main', 'article', "header", "footer"].includes(element.tagName.toLowerCase())) {
      if (styles.width === "100%" || element.offsetWidth > width) {
        element.style.width = "100%";
        element.style.maxWidth = width + 'px'
      }
    }
    if (element.tagName.toLowerCase() === "img") {
      element.style.maxWidth = '100%';
      element.style.height = "auto"
    }
  })
}

function activateZqsdDirectly() {
  if (window.wasdZqsdHandler) {
    log("ZQSD déjà actif");
    return
  }
  const eventTargets = [document, window, document.activeElement, document.querySelector("canvas")].filter(Boolean);
  chrome.storage.local.get('zqsdKeys', (data) => {
    const zqsdKeys = data.zqsdKeys;
    const keydownHandler = (event) => {
      let key;
      if (event.code === "Space" || event.key === " ") {
        key = "SPACE"
      } else {
        key = event.key.toUpperCase()
      }
      let keyMap;
      if (zqsdKeys) {
        keyMap = {
          [zqsdKeys.up]: ["ArrowUp", 38],
          [zqsdKeys.left]: ["ArrowLeft", 37],
          [zqsdKeys.down]: ["ArrowDown", 40],
          [zqsdKeys.right]: ["ArrowRight", 39]
        }
      } else {
        keyMap = {
          'W': ["ArrowUp", 38],
          'A': ["ArrowLeft", 37],
          'S': ['ArrowDown', 40],
          'D': ["ArrowRight", 39],
          'Z': ["ArrowUp", 38],
          'Q': ['ArrowLeft', 37]
        }
      }
      if (event.key === '1') {
        event.preventDefault();
        event.stopImmediatePropagation();
        eventTargets.forEach(target => target.dispatchEvent(new KeyboardEvent(event.type, {
          key: " ",
          code: "Space",
          keyCode: 32,
          which: 32,
          bubbles: !0
        })));
        return
      }
      if (event.key === " " && event.isTrusted) {
        if (currentHotkey === "Space") {
          event.preventDefault();
          event.stopImmediatePropagation();
          controlTimer();
          return
        }
        const spaceIsMapped = zqsdKeys && Object.values(zqsdKeys).includes('SPACE');
        if (!spaceIsMapped) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return
        }
      }
      const mappedKey = keyMap[key];
      if (mappedKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        eventTargets.forEach(target => target.dispatchEvent(new KeyboardEvent(event.type, {
          key: mappedKey[0],
          code: mappedKey[0],
          keyCode: mappedKey[1],
          which: mappedKey[1],
          bubbles: !0
        })))
      }
    };
    document.addEventListener("keydown", keydownHandler, !0);
    document.addEventListener("keyup", keydownHandler, !0);
    window.wasdZqsdHandler = keydownHandler;
    zqsdHandler = keydownHandler;
    log("ZQSD activé automatiquement")
  })
}
let timerColors = {
  'stopped': '#FFFFFF',
  'running': "#FFFFFF",
  'paused': "#FFFFFF"
};
chrome.runtime.sendMessage({
  'action': "getTimerColors"
}, var3 => {
  if (var3 && var3.colors) {
    timerColors = var3.colors;
    applyTimerColor()
  }
});


function applyTimerColor() {
  if (!timerDisplayEl) {
    return
  }
  let var4 = timerColors.stopped;

  if (timerState === "running") {
    var4 = timerColors.running
  } else {
    if (timerState === "paused") {
      var4 = timerColors.paused
    }
  }
  timerDisplayEl.style.color = var4
}

function applyThemeToTimer() {
  if (!timerOverlay || !timerDisplayEl) {
    return
  }
  Object.assign(timerOverlay.style, {
    'background': '#000',
    'border': "none",
    'borderRadius': '0',
    'boxShadow': "none",
    'backdropFilter': "none",
    'padding': '0'
  });

  Object.assign(timerDisplayEl.style, {
    'fontFamily': "'Calibri','Segoe UI',Arial,sans-serif",
    'fontWeight': "bold",
    'textShadow': "none",
    'fontSize': "43px",
    'letterSpacing': '0',
    'textAlign': "right",
    'padding': "8px 12px",
    'lineHeight': '1',
    'position': "relative",
    'transform': 'none',
    'top': "auto",
    'left': "auto",
    'width': "100%",
    'height': "100%",
    'display': "flex",
    'alignItems': "center",
    'justifyContent': "flex-end"
  });
  applyTimerColor();
  const var5 = timerOverlay.getBoundingClientRect();
  updateFontSize(var5.width, var5.height)
}

function createTimerOverlay() {
  if (timerOverlay) {
    return
  }
  timerOverlay = document.createElement("div");
  timerOverlay.id = "speedrun-timer-overlay";

  timerOverlay.innerHTML = "\n        <style>\n            #speedrun-timer-overlay{position:fixed;top:20px;right:20px;width:225px;height:50px;z-index:2147483647;display:none;user-select:none;min-width:180px;min-height:40px;max-width:800px;max-height:200px;overflow:hidden;background:#000;border:none;box-shadow:none;border-radius:0}\n            #timer-content{width:100%;height:100%;position:relative;cursor:move}\n            #timer-display{font-family:'Calibri','Segoe UI',Arial,sans-serif;font-weight:bold;font-size:43px;letter-spacing:0;line-height:1;color:#FFF;text-shadow:none;white-space:nowrap;display:flex;align-items:baseline;justify-content:flex-end;width:100%;height:100%;padding:8px 12px;box-sizing:border-box;position:relative}\n            #timer-display .time-main{font-size:1em;line-height:1;display:inline-block}\n            #timer-display .time-decimals{font-size:.7em;line-height:1;display:inline-block;transform:translateY(0.12em)}\n            .timer-stopped,.timer-running,.timer-paused{color:#FFF}\n            .resize-handle{position:absolute;background:transparent;z-index:2147483648;opacity:0;transition:opacity .2s}\n            #speedrun-timer-overlay:hover .resize-handle{opacity:.3;background:rgba(255,255,255,.1)}\n            .resize-handle:hover{opacity:.6!important;background:rgba(255,255,255,.2)!important}\n            .resize-nw{top:0;left:0;width:12px;height:12px;cursor:nw-resize}\n            .resize-ne{top:0;right:0;width:12px;height:12px;cursor:ne-resize}\n            .resize-sw{bottom:0;left:0;width:12px;height:12px;cursor:sw-resize}\n            .resize-se{bottom:0;right:0;width:12px;height:12px;cursor:se-resize}\n            .resize-n{top:0;left:12px;right:12px;height:8px;cursor:n-resize}\n            .resize-s{bottom:0;left:12px;right:12px;height:8px;cursor:s-resize}\n            .resize-w{left:0;top:12px;bottom:12px;width:8px;cursor:w-resize}\n            .resize-e{right:0;top:12px;bottom:12px;width:8px;cursor:e-resize}\n            .size-indicator{position:absolute;top:-35px;right:0;background:rgba(0,0,0,.9);color:#FFF;padding:6px 12px;font-size:12px;opacity:0;pointer-events:none;font-family:'Segoe UI',Arial,sans-serif;font-weight:400;transition:opacity .2s;border-radius:3px}\n            #speedrun-timer-overlay.resizing .size-indicator{opacity:1}\n        </style>\n        <div id=\"timer-content\">\n            <div id=\"timer-display\" class=\"timer-stopped\">\n                <span class=\"time-main\">0</span><span class=\"time-decimals\">.00</span>\n            </div>\n        </div>\n        <div class=\"resize-handle resize-nw\" data-direction=\"nw\"></div>\n        <div class=\"resize-handle resize-ne\" data-direction=\"ne\"></div>\n        <div class=\"resize-handle resize-sw\" data-direction=\"sw\"></div>\n        <div class=\"resize-handle resize-se\" data-direction=\"se\"></div>\n        <div class=\"resize-handle resize-n\" data-direction=\"n\"></div>\n        <div class=\"resize-handle resize-s\" data-direction=\"s\"></div>\n        <div class=\"resize-handle resize-w\" data-direction=\"w\"></div>\n        <div class=\"resize-handle resize-e\" data-direction=\"e\"></div>\n        <div class=\"size-indicator\">225px × 50px</div>\n    ";

  timerDisplayEl = timerOverlay.querySelector("#timer-display");
  timerMainEl = timerDisplayEl ? timerDisplayEl.querySelector(".time-main") : null;
  timerDecimalsEl = timerDisplayEl ? timerDisplayEl.querySelector('.time-decimals') : null;
  lastTimerMain = timerMainEl ? timerMainEl.textContent : '';
  lastTimerDecimals = timerDecimalsEl ? timerDecimalsEl.textContent : '';
  document.documentElement.appendChild(timerOverlay);
  applyCustomBackground(timerOverlay, storedCustomBackground);

  applyThemeToTimer();

  makeDraggable(timerOverlay);
  makeResizable(timerOverlay);
  loadSettings()
}

function initializeOverlays() {
  createTimerOverlay();
  createFpsOverlay()
}
if (document.readyState === "loading") {
  document.addEventListener('DOMContentLoaded', initializeOverlays)
} else {
  initializeOverlays()
}

function loadSettings() {
  chrome.runtime.sendMessage({
    'action': "getTimerSettings"
  }, var6 => {
    if (var6 && var6.settings) {
      const var7 = var6.settings;
      if (var7.visible) {
        if (!timerOverlay) createTimerOverlay();
        timerOverlay.style.left = var7.position.x + 'px';
        timerOverlay.style.top = var7.position.y + 'px';

        timerOverlay.style.width = var7.size.width + 'px';
        timerOverlay.style.height = var7.size.height + 'px';
        updateFontSize(var7.size.width, var7.size.height);
        isVisible = !0;
        timerOverlay.style.display = "block"
      }
    }
  })
}

function createThrottledInvoker(var8, var9 = 180) {
  let var10 = null;
  return {
    'trigger'() {
      if (var10 !== null) {
        return
      }
      var10 = setTimeout(() => {
        var10 = null;
        var8()
      }, var9)
    },
    'flush'() {
      if (var10 !== null) {
        clearTimeout(var10);
        var10 = null
      }
      var8()
    }
  }
}

function makeDraggable(var11, var12 = {}) {
  let var13 = 0;
  let var14 = 0;
  let var15 = 0;
  let var16 = 0;
  let var17 = !1;
  const var18 = typeof var12.onChange === "function" ? var12.onChange : saveTimerSettings;

  const var19 = createThrottledInvoker(var18);
  var11.addEventListener("mousedown", var20);


  function var20(var21) {
    if (var21.target.classList.contains("resize-handle")) {
      return
    }
    var21.preventDefault();
    var17 = !0;
    var15 = var21.clientX;
    var16 = var21.clientY;

    document.addEventListener("mousemove", var22);
    document.addEventListener("mouseup", var23)
  }

  function var22(var24) {
    if (!var17) {
      return
    }
    var24.preventDefault();
    var13 = var15 - var24.clientX;
    var14 = var16 - var24.clientY;
    var15 = var24.clientX;
    var16 = var24.clientY;
    const var25 = Math.max(0, Math.min((var11.offsetLeft || 0) - var13, window.innerWidth - var11.offsetWidth));

    const var26 = Math.max(0, Math.min((var11.offsetTop || 0) - var14, window.innerHeight - var11.offsetHeight));
    var11.style.left = var25 + 'px';
    var11.style.top = var26 + 'px';
    var19.trigger()
  }

  function var23() {
    var17 = !1;

    document.removeEventListener("mousemove", var22);
    document.removeEventListener("mouseup", var23);
    var19.flush()
  }
}

function makeResizable(var27) {
  const var28 = var27.querySelectorAll(".resize-handle");
  const var29 = var27.querySelector('.size-indicator');
  let var30 = !1;
  let var31 = '';
  let var32 = 0;

  let var33 = 0;
  let var34 = 0;

  let var35 = 0;
  let var36 = 0;

  let var37 = 0;

  var28.forEach(var38 => var38.addEventListener("mousedown", var39));

  function var39(var40) {
    var40.preventDefault();
    var40.stopPropagation();
    var30 = !0;
    var31 = var40.target.dataset.direction;
    var32 = var40.clientX;
    var33 = var40.clientY;
    const var41 = var27.getBoundingClientRect();
    var34 = var41.width;
    var35 = var41.height;
    var36 = var41.left;
    var37 = var41.top;
    var27.classList.add('resizing');
    document.addEventListener("mousemove", var42);
    document.addEventListener("mouseup", var43)
  }

  function var42(var44) {
    if (!var30) {
      return
    }
    var44.preventDefault();
    const var45 = var44.clientX - var32;

    const var46 = var44.clientY - var33;
    let var47 = var34;
    let var48 = var35;
    let var49 = var36;
    let var50 = var37;

    if (var31.includes('e')) {
      var47 = Math.max(180, Math.min(800, var34 + var45))
    }
    if (var31.includes('w')) {
      var47 = Math.max(180, Math.min(800, var34 - var45));
      var49 = var36 + (var34 - var47)
    }
    if (var31.includes('s')) {
      var48 = Math.max(40, Math.min(200, var35 + var46))
    }
    if (var31.includes('n')) {
      var48 = Math.max(40, Math.min(200, var35 - var46));
      var50 = var37 + (var35 - var48)
    }
    var27.style.width = var47 + 'px';
    var27.style.height = var48 + 'px';
    var27.style.left = var49 + 'px';
    var27.style.top = var50 + 'px';
    updateFontSize(var47, var48);
    var29.textContent = Math.round(var47) + "px × " + Math.round(var48) + 'px';
    var29.style.opacity = '1'
  }

  function var43() {
    if (!var30) {
      return
    }
    var30 = !1;
    document.removeEventListener("mousemove", var42);
    document.removeEventListener("mouseup", var43);
    var27.classList.remove("resizing");
    var29.style.opacity = '0';
    saveTimerSettings()
  }
}

function updateFpsFontSize(width, height) {
  if (!fpsOverlay) return;
  const valueElement = fpsOverlay.querySelector(".fps-value");
  const labelElement = fpsOverlay.querySelector(".fps-label");

  if (!valueElement || !labelElement) return;
  const baseWidth = 120;
  const baseHeight = 70;
  const widthRatio = width / baseWidth;
  const heightRatio = height / baseHeight;
  const scale = Math.min(widthRatio, heightRatio);
  const baseValueSize = 36;

  const baseLabelSize = 10;

  valueElement.style.fontSize = `${Math.max(12, baseValueSize * scale)}px`;
  labelElement.style.fontSize = `${Math.max(6, baseLabelSize * scale)}px`
}

function makeFpsResizable(element) {
  const handles = element.querySelectorAll(".resize-handle");

  const sizeIndicator = element.querySelector('.size-indicator');
  let isResizing = !1;
  let resizeDirection = '';
  let startX = 0,
    startY = 0;

  let startWidth = 0,
    startHeight = 0;
  let startLeft = 0,
    startTop = 0;
  handles.forEach(handle => handle.addEventListener("mousedown", startResize));


  function startResize(e) {
    e.preventDefault();
    e.stopPropagation();
    isResizing = !0;
    resizeDirection = e.target.dataset.direction;
    startX = e.clientX;

    startY = e.clientY;
    const rect = element.getBoundingClientRect();

    startWidth = rect.width;
    startHeight = rect.height;
    startLeft = rect.left;
    startTop = rect.top;

    element.classList.add('resizing');
    document.addEventListener("mousemove", performResize);
    document.addEventListener("mouseup", stopResize)
  }

  function performResize(e) {
    if (!isResizing) return;
    e.preventDefault();
    const deltaX = e.clientX - startX;

    const deltaY = e.clientY - startY;
    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;

    let newTop = startTop;
    if (resizeDirection.includes('e')) newWidth = Math.max(100, startWidth + deltaX);
    if (resizeDirection.includes('w')) {
      newWidth = Math.max(100, startWidth - deltaX);
      newLeft = startLeft + (startWidth - newWidth)
    }
    if (resizeDirection.includes('s')) newHeight = Math.max(50, startHeight + deltaY);
    if (resizeDirection.includes('n')) {
      newHeight = Math.max(50, startHeight - deltaY);
      newTop = startTop + (startHeight - newHeight)
    }
    element.style.width = `${newWidth}px`;
    element.style.height = `${newHeight}px`;
    element.style.left = `${newLeft}px`;
    element.style.top = `${newTop}px`;
    updateFpsFontSize(newWidth, newHeight);
    if (sizeIndicator) {
      sizeIndicator.textContent = `${Math.round(newWidth)}px × ${Math.round(newHeight)}px`;

      sizeIndicator.style.opacity = '1'
    }
  }

  function stopResize() {
    if (!isResizing) return;
    isResizing = !1;
    document.removeEventListener("mousemove", performResize);
    document.removeEventListener("mouseup", stopResize);

    element.classList.remove("resizing");

    if (sizeIndicator) sizeIndicator.style.opacity = '0';
    saveFpsSettings()
  }
}

function updateFontSize(width, height) {
  if (!timerDisplayEl) {
    return
  }
  const widthRatio = width / 225;
  const heightRatio = height / 50;
  const scale = Math.min(widthRatio, heightRatio);
  const fontSize = Math.max(18, Math.min(120, 43 * scale));
  timerDisplayEl.style.fontSize = fontSize + 'px';

  timerDisplayEl.style.letterSpacing = "0px";
  timerDisplayEl.style.lineHeight = '1';
  timerDisplayEl.style.padding = "8px 12px";
  timerDisplayEl.style.textAlign = "right";
  if (timerDecimalsEl) {
    timerDecimalsEl.style.fontSize = '0.7em'
  }
}

function saveTimerSettings() {
  if (!timerOverlay) {
    return
  }
  const rect = timerOverlay.getBoundingClientRect();
  chrome.runtime.sendMessage({
    action: "saveTimerSettings",
    position: {
      x: Math.round(rect.left),
      y: Math.round(rect.top)
    },
    size: {
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    },
    visible: isVisible
  })
}

function applyCustomBackground(element, imageDataUrl) {
  if (!element) return;
  if (element.id === 'key-display-overlay') {
    const keys = element.querySelectorAll('.key');
    if (imageDataUrl) {
      keys.forEach(key => {
        key.style.setProperty('background-image', `url(${imageDataUrl})`);
        key.style.setProperty('background-size', '100% 100%');
        key.style.setProperty('background-color', 'transparent', 'important');
        key.style.setProperty('border', '1px solid rgba(255, 255, 255, 0.3)')
      });
      element.style.setProperty('background', 'transparent', 'important')
    } else {
      keys.forEach(key => {
        key.style.removeProperty('background-image');
        key.style.removeProperty('background-attachment');
        key.style.removeProperty('background-size');
        key.style.removeProperty('background-color');
        key.style.removeProperty('border')
      })
    }
    return
  }
  if (imageDataUrl) {
    element.style.setProperty('background-image', `url(${imageDataUrl})`, 'important');
    element.style.setProperty('background-size', '100% 100%', 'important');
    element.style.setProperty('background-position', 'center', 'important');
    element.style.setProperty('background-repeat', 'no-repeat', 'important');
    element.style.setProperty('background-color', 'rgba(0,0,0,0.7)', 'important')
  } else {
    element.style.removeProperty('background-image');
    element.style.removeProperty('background-size');
    element.style.removeProperty('background-position');
    element.style.removeProperty('background-repeat');
    if (element.id === 'fps-monitor-overlay') {
      element.style.setProperty('background-color', 'rgba(0, 0, 0, 1.0)', 'important')
    } else if (element.id === 'speedrun-timer-overlay') {
      element.style.setProperty('background', '#000')
    } else {
      element.style.removeProperty('background-color')
    }
  }
}(async () => {
  const {
    customBackground
  } = await chrome.storage.local.get('customBackground');
  if (customBackground) {
    storedCustomBackground = customBackground;
    if (timerOverlay) applyCustomBackground(timerOverlay, storedCustomBackground);
    if (fpsOverlay) applyCustomBackground(fpsOverlay, storedCustomBackground);

    if (keypressOverlay) applyCustomBackground(keypressOverlay, storedCustomBackground);
  }
})();

function setTimerText(mainPart, decimalPart) {
  if (!timerMainEl || !timerDecimalsEl) {
    return
  }
  if (lastTimerMain !== mainPart) {
    timerMainEl.textContent = mainPart;

    lastTimerMain = mainPart
  }
  if (lastTimerDecimals !== decimalPart) {
    timerDecimalsEl.textContent = decimalPart;
    lastTimerDecimals = decimalPart
  }
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const seconds = totalSeconds % 60;

  const centiseconds = Math.floor((ms % 1000) / 10);
  const decimalPart = centiseconds.toString().padStart(2, '0');
  const mainPart = hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` : minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}`;

  return {
    mainPart,
    decimalPart
  }
}
const rankTiers = [{
  name: "Interstellar",
  minTime: 90 * 60 * 1000
}, {
  name: "Suprême",
  minTime: 73 * 60 * 1000
}, {
  name: "Grand Champion",
  minTime: 55 * 60 * 1000
}, {
  name: "Champion",
  minTime: 47 * 60 * 1000
}, {
  name: "Grand Master",
  minTime: 41 * 60 * 1000
}, {
  name: "Master +",
  minTime: 35 * 60 * 1000
}, {
  name: "Master",
  minTime: 28 * 60 * 1000
}, {
  name: "Élite",
  minTime: (23 * 60 * 1000) + 1000
}, {
  name: "Diamant 3",
  minTime: 23 * 60 * 1000
}, {
  name: "Diamant 2",
  minTime: 19 * 60 * 1000
}, {
  name: "Diamant 1",
  minTime: (15 * 60 * 1000) + 1000
}, {
  name: "Platine 3",
  minTime: 15 * 60 * 1000
}, {
  name: "Platine 2",
  minTime: 12 * 60 * 1000
}, {
  name: "Platine 1",
  minTime: (9 * 60 * 1000) + 1000
}, {
  name: "Gold 3",
  minTime: 9 * 60 * 1000
}, {
  name: "Gold 2",
  minTime: 7 * 60 * 1000
}, {
  name: "Gold 1",
  minTime: 5 * 60 * 1000
}, {
  name: "Argent 3",
  minTime: 4 * 60 * 1000
}, {
  name: "Argent 2",
  minTime: 3 * 60 * 1000
}, {
  name: "Argent 1",
  minTime: 2 * 60 * 1000
}, {
  name: "Bronze 3",
  minTime: 90 * 1000
}, {
  name: "Bronze 2",
  minTime: 60 * 1000
}, {
  name: "Bronze 1",
  minTime: 30 * 1000
}, {
  name: "Unranked",
  minTime: 0
}].sort((a, b) => b.minTime - a.minTime);

function updateRank(time) {
  if (!timerOverlay) return;
  let rankDisplay = timerOverlay.querySelector("#rank-display");
  if (!rankDisplay) {
    rankDisplay = document.createElement("div");
    rankDisplay.id = "rank-display";

    Object.assign(rankDisplay.style, {
      color: "#fff",
      fontSize: "16px",
      fontWeight: "bold",
      position: "absolute",
      top: "-20px",
      left: "0px",
      textShadow: "1px 1px 2px rgba(0,0,0,0.7)",
      zIndex: "1"
    });
    const timerContent = timerOverlay.querySelector("#timer-content");
    if (timerContent) timerContent.insertBefore(rankDisplay, timerContent.firstChild)
  }
  if (!rankDisplay) return;
  const currentRank = rankTiers.find(rank => time >= rank.minTime);
  rankDisplay.textContent = currentRank ? currentRank.name : ""
}

function updateTimer() {
  if (!timerOverlay || !isVisible || timerState !== "running") {
    return
  }
  if (!timerMainEl || !timerDecimalsEl) {
    return
  }
  currentTime = performance.now() - startTime;
  updateRank(currentTime);
  const {
    mainPart,
    decimalPart
  } = formatTime(currentTime);
  setTimerText(mainPart, '.' + decimalPart)
}

function controlTimer() {
  if (!isVisible || !timerDisplayEl) {
    return
  }
  if (timerState === "stopped") {
    startTime = performance.now();
    currentTime = 0;
    timerState = "running";
    timerDisplayEl.className = "timer-running";
    applyTimerColor();
    setTimerText('0', ".00");
    const update = () => {
      if (timerState === "running") {
        updateTimer();

        timerInterval = requestAnimationFrame(update)
      }
    };
    timerInterval = requestAnimationFrame(update)
  } else if (timerState === 'running') {
    cancelAnimationFrame(timerInterval);
    timerInterval = null;
    currentTime = performance.now() - startTime;

    timerState = "paused";
    timerDisplayEl.className = "timer-paused";
    applyTimerColor();

    const {
      mainPart,
      decimalPart
    } = formatTime(currentTime);
    setTimerText(mainPart, '.' + decimalPart)
  } else {
    cancelAnimationFrame(timerInterval);

    timerInterval = null;
    timerState = "stopped";
    currentTime = 0;
    timerDisplayEl.className = "timer-stopped";
    applyTimerColor();
    setTimerText('0', ".00")
  }
}

function toggleTimerVisibility() {
  if (!timerOverlay) {
    createTimerOverlay()
  }
  isVisible = !isVisible;
  timerOverlay.style.display = isVisible ? 'block' : "none";
  if (isVisible) {
    if (timerState === 'running') {
      updateTimer()
    } else {
      const time = timerState === 'paused' ? currentTime : 0;
      const {
        mainPart,
        decimalPart
      } = formatTime(time);
      setTimerText(mainPart, '.' + decimalPart)
    }
  }
  saveTimerSettings()
}

function ensureFpsStyles() {
  let styleSheet = document.getElementById("fps-monitor-styles");
  if (!styleSheet) {
    styleSheet = document.createElement("style");
    styleSheet.id = "fps-monitor-styles";
    document.head.appendChild(styleSheet)
  }
  const newContent = `
        #fps-monitor-overlay {
            position: fixed !important;
            top: 100px;
            left: 20px;
            min-width: 120px;
            padding: 12px 16px;
            z-index: 2147483647 !important;
            display: none;
            flex-direction: column;
            gap: 4px;

            cursor: move !important;
            user-select: none;
            transition: none;
            background-color: rgba(0, 0, 0, 1.0) !important;
            border: none;
            box-shadow: none;
            color: #FFFFFF;
            border-radius: 4px;
            overflow: hidden;
        }
        #fps-monitor-overlay:active {
            cursor: grabbing !important;

        }
        #fps-monitor-overlay .fps-label {
            text-transform: uppercase;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.5px;
            color: #CCCCCC;

            opacity: 0.8;
            pointer-events: none;
        }
        #fps-monitor-overlay .fps-value {
            font-size: 36px;

            font-weight: 900;
            line-height: 1;
            transition: color 0.2s ease;
            pointer-events: none;
        }
        #fps-monitor-overlay .fps-value.high { color: #FFFFFF; }
        #fps-monitor-overlay .fps-value.medium { color: #DDDDDD; }
        #fps-monitor-overlay .fps-value.low { 
            color: #BBBBBB;
        }
        .resize-handle{position:absolute;background:transparent;z-index:2147483648;opacity:0;transition:opacity .2s}
        #fps-monitor-overlay:hover .resize-handle{opacity:.3;background:rgba(255,255,255,.1)}
        .resize-handle:hover{opacity:.6!important;background:rgba(255,255,255,.2)!important}
        .resize-nw{top:0;left:0;width:12px;height:12px;cursor:nw-resize}
        .resize-ne{top:0;right:0;width:12px;height:12px;cursor:ne-resize}
        .resize-sw{bottom:0;left:0;width:12px;height:12px;cursor:sw-resize}
        .resize-se{bottom:0;right:0;width:12px;height:12px;cursor:se-resize}
        .resize-n{top:0;left:12px;right:12px;height:8px;cursor:n-resize}
        .resize-s{bottom:0;left:12px;right:12px;height:8px;cursor:s-resize}
        .resize-w{left:0;top:12px;bottom:12px;width:8px;cursor:w-resize}
        .resize-e{right:0;top:12px;bottom:12px;width:8px;cursor:e-resize}
        .size-indicator{position:absolute;bottom:calc(100% + 5px);left:50%;transform:translateX(-50%);background:rgba(0,0,0,.7);color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;white-space:nowrap;opacity:0;transition:opacity .2s;pointer-events:none;z-index:2147483649}
        #fps-monitor-overlay.resizing .size-indicator{opacity:1}
    `;
  if (styleSheet.textContent !== newContent) {
    styleSheet.textContent = newContent
  }
}

function createFpsOverlay() {
  if (fpsOverlay) {
    return
  }
  ensureFpsStyles();
  fpsOverlay = document.createElement("div");
  fpsOverlay.id = "fps-monitor-overlay";
  fpsOverlay.innerHTML = `
        <div class="fps-label">Frames per second</div>
        <div class="fps-value">--</div>
        <div class="resize-handle resize-nw" data-direction="nw"></div>
        <div class="resize-handle resize-ne" data-direction="ne"></div>
        <div class="resize-handle resize-sw" data-direction="sw"></div>
        <div class="resize-handle resize-se" data-direction="se"></div>
        <div class="resize-handle resize-n" data-direction="n"></div>
        <div class="resize-handle resize-s" data-direction="s"></div>
        <div class="resize-handle resize-w" data-direction="w"></div>
        <div class="resize-handle resize-e" data-direction="e"></div>
        <div class="size-indicator"></div>
    `;
  document.documentElement.appendChild(fpsOverlay);
  chrome.storage.local.get('customBackground', ({
    customBackground
  }) => {
    if (customBackground) {
      storedCustomBackground = customBackground;
      applyCustomBackground(fpsOverlay, customBackground)
    }
  });
  makeDraggable(fpsOverlay, {
    onChange: saveFpsSettings
  });
  makeFpsResizable(fpsOverlay);
  applyFpsSettings()
}

function applyFpsSettings() {
  if (!fpsOverlay) {
    return
  }
  const position = fpsSettings.position || {
    x: 20,
    y: 100
  };
  fpsOverlay.style.left = (typeof position.x === 'number' ? position.x : 20) + 'px';

  fpsOverlay.style.top = (typeof position.y === 'number' ? position.y : 100) + 'px';

  fpsOverlay.style.display = fpsVisible ? "flex" : "none";
  if (fpsVisible) {
    startFpsLoop()
  } else {
    stopFpsLoop();

    updateFpsDisplay(null)
  }
}

function toggleFpsOverlay() {
  if (!fpsOverlay) {
    createFpsOverlay()
  }
  fpsVisible = !fpsVisible;
  fpsSettings.visible = fpsVisible;

  fpsOverlay.style.display = fpsVisible ? 'flex' : 'none';
  if (fpsVisible) {
    startFpsLoop()
  } else {
    stopFpsLoop();

    updateFpsDisplay(null)
  }
  saveFpsSettings();
  return fpsVisible
}

function startFpsLoop() {
  if (fpsAnimationId) {
    return
  }
  fpsLastTimestamp = null;
  fpsSamples = [];
  let frameCount = 0;
  const loop = (timestamp) => {
    if (!fpsVisible) {
      fpsAnimationId = null;
      return
    }
    if (fpsLastTimestamp !== null) {
      const deltaTime = timestamp - fpsLastTimestamp;
      if (deltaTime > 0) {
        const fps = 1000 / deltaTime;
        fpsSamples.push(fps);
        if (fpsSamples.length > 30) {
          fpsSamples.shift()
        }
        frameCount++;
        if (frameCount % 5 === 0) {
          const sum = fpsSamples.reduce((a, b) => a + b, 0);
          const avg = sum / fpsSamples.length;
          updateFpsDisplay(avg)
        }
      }
    }
    fpsLastTimestamp = timestamp;
    fpsAnimationId = requestAnimationFrame(loop)
  };
  fpsAnimationId = requestAnimationFrame(loop)
}

function stopFpsLoop() {
  if (fpsAnimationId) {
    cancelAnimationFrame(fpsAnimationId);
    fpsAnimationId = null
  }
  fpsLastTimestamp = null;
  fpsSamples = []
}

function updateFpsDisplay(fps) {
  if (!fpsOverlay) {
    return
  }
  const valueElement = fpsOverlay.querySelector(".fps-value");
  if (!valueElement) {
    return
  }
  valueElement.classList.remove("low", "medium", "high");
  if (typeof fps !== "number" || !isFinite(fps)) {
    valueElement.textContent = '--';

    valueElement.classList.add("medium");
    return
  }
  const roundedFps = Math.max(0, Math.round(fps));
  valueElement.textContent = roundedFps.toString();
  if (roundedFps >= 55) {
    valueElement.classList.add("high")
  } else if (roundedFps >= 30) {
    valueElement.classList.add("medium")
  } else {
    valueElement.classList.add("low")
  }
}

function saveFpsSettings() {
  if (!fpsOverlay) {
    return
  }
  if (fpsOverlay.style.display !== 'none') {
    const rect = fpsOverlay.getBoundingClientRect();
    fpsSettings.position = {
      x: Math.round(rect.left),
      y: Math.round(rect.top)
    };
    fpsSettings.size = {
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  }
  chrome.runtime.sendMessage({
    action: "saveFpsSettings",
    position: fpsSettings.position,
    size: fpsSettings.size,
    visible: fpsVisible
  }, () => {})
}
const KEY_LAYOUTS = {
  'arrows': {
    'rows': [
      [{
        'id': 'key-up',
        'label': '↑',
        'matches': ["arrowup"]
      }],
      [{
        'id': 'key-left',
        'label': '←',
        'matches': ["arrowleft"]
      }, {
        'id': 'key-down',
        'label': '↓',
        'matches': ['arrowdown']
      }, {
        'id': "key-right",
        'label': '→',
        'matches': ["arrowright"]
      }]
    ]
  },
  'wasd': {
    'rows': [
      [{
        'id': "key-up",
        'label': 'W',
        'matches': ['w', "keyw", 'z', "keyz", "arrowup"]
      }],
      [{
        'id': "key-left",
        'label': 'A',
        'matches': ['a', "keya", 'q', "keyq", "arrowleft"]
      }, {
        'id': "key-down",
        'label': 'S',
        'matches': ['s', 'keys', "arrowdown"]
      }, {
        'id': 'key-right',
        'label': 'D',
        'matches': ['d', "keyd", "arrowright"]
      }]
    ]
  },
  'zqsd': {
    'rows': [
      [{
        'id': "key-up",
        'label': 'Z',
        'matches': ['z', "keyz", 'w', 'keyw', "arrowup"]
      }],
      [{
        'id': "key-left",
        'label': 'Q',
        'matches': ['q', "keyq", 'a', "keya", 'arrowleft']
      }, {
        'id': "key-down",
        'label': 'S',
        'matches': ['s', "keys", "arrowdown"]
      }, {
        'id': "key-right",
        'label': 'D',
        'matches': ['d', "keyd", "arrowright"]
      }]
    ]
  }
};
const KEY_THEMES = {
  'default': {
    'label': "Default"
  },
  'classic': {
    'label': "Classique"
  },
  'minimal': {
    'label': "Minimal Verre"
  },
  'block': {
    'label': "Bloc Mécanique"
  },
  'block-white': {
    'label': "Bloc Blanc"
  },
  'retro': {
    'label': "Retro Terminal"
  }
};
const LEGACY_THEME_MAP = {
  'neon': "block",
  'ocean': 'classic',
  'sunset': "retro",
  'frost': "minimal",
  'carbon': 'block',
  'cyber': 'classic',
  'pastel': "minimal",
  'circular': "classic",
  'capsule': "classic",
  'holo': 'classic',
  'split': "classic"
};


function resolveThemeKey(theme) {
  if (!theme) {
    return "default"
  }
  const themeKey = typeof theme === "string" ? theme.toLowerCase() : "default";
  if (Object.prototype.hasOwnProperty.call(KEY_THEMES, themeKey)) {
    return themeKey
  }
  const mappedTheme = LEGACY_THEME_MAP[themeKey];
  if (mappedTheme && Object.prototype.hasOwnProperty.call(KEY_THEMES, mappedTheme)) {
    return mappedTheme
  }
  return "default"
}

function normalizeKeyValue(value) {
  if (!value) {
    return ''
  }
  return value.toLowerCase()
}

function clampKeypressScale(scale) {
  const numScale = typeof scale === 'number' ? scale : parseFloat(scale);

  if (Number.isNaN(numScale)) {
    return 1
  }
  return Math.min(1.6, Math.max(0.6, numScale))
}

function getKeypressSizePercent(scale = keypressSettings.size) {
  const numScale = typeof scale === "number" ? scale : keypressSettings.size;
  return Math.round(Math.min(1.6, Math.max(0.6, numScale)) * 100)
}

function updateKeypressSizeIndicator(scale) {
  if (!keySizeIndicator) {
    return
  }
  keySizeIndicator.textContent = getKeypressSizePercent(scale) + '%'
}

function persistKeypressSettings(newSettings = {}) {
  const validLayouts = Object.keys(KEY_LAYOUTS);
  const layout = typeof newSettings.layout === "string" ? newSettings.layout.toLowerCase() : keypressSettings.layout;
  let newLayout = validLayouts.includes(layout) ? layout : keypressSettings.layout;
  const newSize = typeof newSettings.size === "number" ? clampKeypressScale(newSettings.size) : keypressSettings.size;
  const newVisibility = typeof newSettings.visible === "boolean" ? newSettings.visible : keypressSettings.visible;
  const theme = typeof newSettings.theme === "string" ? newSettings.theme : keypressSettings.theme;
  const newTheme = resolveThemeKey(theme);
  let newPosition = keypressSettings.position;
  if (newSettings.position && typeof newSettings.position === 'object') {
    const x = Number(newSettings.position.x);
    const y = Number(newSettings.position.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      newPosition = {
        x: Math.round(x),
        y: Math.round(y)
      }
    }
  }
  const settingsToSave = {
    action: 'saveKeypressSettings',
    visible: newVisibility,
    size: newSize,
    layout: newLayout,
    theme: newTheme,
    position: newPosition ? {
      x: newPosition.x,
      y: newPosition.y
    } : null
  };
  const positionsAreEqual = (pos1, pos2) => {
    if (!pos1 && !pos2) {
      return !0
    }
    if (!pos1 || !pos2) {
      return !1
    }
    return pos1.x === pos2.x && pos1.y === pos2.y
  };
  if (lastSavedKeypressSettings.visible === settingsToSave.visible && lastSavedKeypressSettings.size === settingsToSave.size && lastSavedKeypressSettings.layout === settingsToSave.layout && lastSavedKeypressSettings.theme === settingsToSave.theme && positionsAreEqual(lastSavedKeypressSettings.position, settingsToSave.position)) {
    return
  }
  lastSavedKeypressSettings = {
    visible: settingsToSave.visible,
    size: settingsToSave.size,
    layout: settingsToSave.layout,
    theme: settingsToSave.theme,
    position: settingsToSave.position ? {
      x: settingsToSave.position.x,
      y: settingsToSave.position.y
    } : null
  };
  keypressSettings.visible = settingsToSave.visible;
  keypressSettings.size = settingsToSave.size;
  keypressSettings.layout = settingsToSave.layout;
  keypressSettings.theme = settingsToSave.theme;

  keypressSettings.position = settingsToSave.position ? {
    x: settingsToSave.position.x,
    y: settingsToSave.position.y
  } : null;

  chrome.runtime.sendMessage(settingsToSave, () => {})
}

function ensureKeypressResizeElements() {
  if (!keypressOverlay) {
    return
  }
  if (!keyResizeHandle) {
    keyResizeHandle = document.createElement("div");

    keyResizeHandle.className = 'key-resize-handle';
    keypressOverlay.appendChild(keyResizeHandle)
  }
  if (!keySizeIndicator) {
    keySizeIndicator = document.createElement('div');

    keySizeIndicator.className = "key-size-indicator";
    keypressOverlay.appendChild(keySizeIndicator)
  }
  updateKeypressSizeIndicator();
  if (!keyResizeHandle.dataset.bound) {
    keyResizeHandle.addEventListener("mousedown", startKeyResize);
    keyResizeHandle.dataset.bound = 'true'
  }
}

function getKeypressOverlayRect() {
  if (!keypressOverlay) {
    return {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0
    }
  }
  const styles = window.getComputedStyle(keypressOverlay);
  let restoreStyles = null;
  if (styles.display === "none") {
    const originalDisplay = keypressOverlay.style.display;
    const originalVisibility = keypressOverlay.style.visibility;
    keypressOverlay.style.visibility = "hidden";
    keypressOverlay.style.display = "block";
    restoreStyles = () => {
      keypressOverlay.style.display = originalDisplay;
      keypressOverlay.style.visibility = originalVisibility
    }
  }
  const rect = keypressOverlay.getBoundingClientRect();
  if (restoreStyles) {
    restoreStyles()
  }
  return rect
}

function computeDefaultKeypressPosition(rect) {
  const overlayRect = rect || getKeypressOverlayRect();
  const overlayWidth = overlayRect.width || 180;
  const overlayHeight = overlayRect.height || 180;
  const x = Math.max(10, Math.round(window.innerWidth - overlayWidth - 30));
  const y = Math.max(10, Math.round(window.innerHeight - overlayHeight - 30));
  return {
    x,
    y
  }
}

function applyKeypressPosition(position) {
  if (!keypressOverlay) {
    return
  }
  const rect = getKeypressOverlayRect();
  const overlayWidth = rect.width || keypressOverlay.offsetWidth || 0;
  const overlayHeight = rect.height || keypressOverlay.offsetHeight || 0;
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;
  let newPos = null;
  if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
    newPos = {
      x: position.x,
      y: position.y
    }
  } else {
    newPos = computeDefaultKeypressPosition(rect)
  }
  const finalPos = {
    x: Math.max(0, Math.min(winWidth - overlayWidth, newPos.x)),
    y: Math.max(0, Math.min(winHeight - overlayHeight, newPos.y))
  };
  keypressOverlay.style.left = Math.round(finalPos.x) + 'px';
  keypressOverlay.style.top = Math.round(finalPos.y) + 'px';

  keypressOverlay.style.right = "auto";
  keypressOverlay.style.bottom = 'auto';
  keypressOverlay.style.transform = 'none';
  keypressSettings.position = {
    ...finalPos
  }
}

function saveKeypressPosition() {
  if (!keypressOverlay) {
    return
  }
  let x = parseFloat(keypressOverlay.style.left);
  let y = parseFloat(keypressOverlay.style.top);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    const rect = getKeypressOverlayRect();
    if (!Number.isFinite(x)) {
      x = rect.left
    }
    if (!Number.isFinite(y)) {
      y = rect.top
    }
  }
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return
  }
  const position = {
    x: Math.max(0, Math.round(x)),
    y: Math.max(0, Math.round(y))
  };
  keypressSettings.position = {
    ...position
  };
  persistKeypressSettings({
    position
  })
}

function applyKeypressTheme(theme) {
  if (!keypressOverlay) {
    return
  }
  const themeKey = resolveThemeKey(theme);

  Object.keys(KEY_THEMES).forEach(key => {
    keypressOverlay.classList.toggle("key-theme-" + key, key === themeKey)
  });
  keypressOverlay.dataset.theme = themeKey
}

function setKeypressTheme(theme, options = {}) {
  const newTheme = resolveThemeKey(theme);
  const changed = keypressSettings.theme !== newTheme;
  keypressSettings.theme = newTheme;
  if (keypressOverlay) {
    applyKeypressTheme(newTheme)
  }
  if (options.persist && changed) {
    persistKeypressSettings({
      theme: newTheme
    })
  }
  return newTheme
}

function startKeyResize(var51) {
  if (!keypressOverlay) {
    return
  }
  var51.preventDefault();
  var51.stopPropagation();
  const var52 = keypressOverlay.getBoundingClientRect();
  keyResizeState = {
    'startX': var51.clientX,
    'startY': var51.clientY,
    'width': var52.width,
    'height': var52.height,
    'diagonal': Math.hypot(var52.width, var52.height) || 1,
    'scale': keypressSettings.size
  };
  isKeyResizeActive = !0;
  keypressOverlay.classList.add("resizing");
  updateKeypressSizeIndicator(keyResizeState.scale);
  document.addEventListener("mousemove", performKeyResize);
  document.addEventListener("mouseup", stopKeyResize)
}

function performKeyResize(var53) {
  if (!isKeyResizeActive || !keyResizeState) {
    return
  }
  var53.preventDefault();
  const var54 = var53.clientX - keyResizeState.startX;
  const var55 = var53.clientY - keyResizeState.startY;
  const var56 = Math.max(30, keyResizeState.width + var54);
  const var57 = Math.max(30, keyResizeState.height + var55);
  const var58 = Math.hypot(var56, var57);

  const var59 = var58 / keyResizeState.diagonal;
  const var60 = clampKeypressScale(keyResizeState.scale * var59);

  applyKeypressSize(var60);
  updateKeypressSizeIndicator(var60)
}

function stopKeyResize() {
  if (!isKeyResizeActive) {
    return
  }
  document.removeEventListener('mousemove', performKeyResize);
  document.removeEventListener("mouseup", stopKeyResize);
  isKeyResizeActive = !1;

  if (keypressOverlay) {
    keypressOverlay.classList.remove("resizing")
  }
  updateKeypressSizeIndicator();
  persistKeypressSettings({
    'size': keypressSettings.size
  });

  keyResizeState = null
}

function resetKeypressActiveState() {
  keypressActiveKeys.clear();
  for (const var61 in keypressElementMap) {
    if (Object.prototype.hasOwnProperty.call(keypressElementMap, var61)) {
      const var62 = keypressElementMap[var61];

      if (var62) {
        var62.classList.remove("active")
      }
    }
  }
}

function renderKeypressLayout(var63) {
  if (!keypressOverlay) {
    return
  }
  const var64 = keypressOverlay.querySelector(".key-container");

  if (!var64) {
    return
  }
  const var65 = KEY_LAYOUTS[var63] || KEY_LAYOUTS.arrows;
  keypressKeyMap = {};
  keypressElementMap = Object.create(null);
  keypressActiveKeys.clear();
  var64.innerHTML = '';
  var65.rows.forEach(var66 => {
    const var67 = document.createElement("div");
    var67.className = 'key-row';
    var66.forEach(var68 => {
      const var69 = document.createElement("div");
      var69.className = "key";
      var69.id = var68.id;
      const var70 = document.createElement("span");
      var70.textContent = var68.label;

      var69.appendChild(var70);
      const var71 = var68.matches.map(var72 => var72.toLowerCase());
      var69.dataset.matches = var71.join(',');
      var71.forEach(var73 => {
        keypressKeyMap[var73] = var68.id
      });

      keypressElementMap[var68.id] = var69;
      var67.appendChild(var69)
    });
    var64.appendChild(var67)
  });
  keypressOverlay.dataset.layout = var63;
  resetKeypressActiveState()
}

function applyKeypressSize(var74) {
  const var75 = clampKeypressScale(var74);

  keypressSettings.size = var75;

  if (keypressOverlay) {
    keypressOverlay.style.setProperty("--key-scale", String(var75));
    if (keypressVisible) {
      scheduleKeypressBoundsCheck()
    }
  }
  updateKeypressSizeIndicator(var75)
}

function setKeypressLayout(var76) {
  const var77 = typeof var76 === "string" ? var76.toLowerCase() : "arrows";
  const var78 = var77;
  const var79 = KEY_LAYOUTS[var78] ? var78 : "arrows";
  const var80 = keypressSettings.layout !== var79;
  keypressSettings.layout = var79;
  if (keypressOverlay && (var80 || keypressOverlay.dataset.layout !== var79)) {
    renderKeypressLayout(var79);
    if (keypressVisible) {
      scheduleKeypressBoundsCheck()
    }
  }
}

function handleKeydown(var81) {
  if (!keypressVisible || !keypressOverlay) {
    return
  }
  const var82 = normalizeKeyValue(var81.key);
  const var83 = var81.code ? normalizeKeyValue(var81.code) : null;
  let var84 = keypressKeyMap[var82];

  if (!var84 && var83) {
    var84 = keypressKeyMap[var83]
  }
  if (!var84) {
    return
  }
  if (keypressActiveKeys.has(var84)) {
    return
  }
  const var85 = keypressElementMap[var84];
  if (!var85) {
    return
  }
  keypressActiveKeys.add(var84);
  var85.classList.add('active');
  if (storedCustomBackgroundActive) {
    var85.style.setProperty('background-image', `url(${storedCustomBackgroundActive})`)
  }
}

function handleKeyup(var86) {
  if (!keypressVisible || !keypressOverlay) {
    return
  }
  let var87 = keypressKeyMap[normalizeKeyValue(var86.key)];
  if (!var87 && var86.code) {
    var87 = keypressKeyMap[normalizeKeyValue(var86.code)]
  }
  if (!var87) {
    return
  }
  keypressActiveKeys['delete'](var87);
  const var88 = keypressElementMap[var87];
  if (var88) {
    var88.classList.remove('active');
    if (storedCustomBackground) {
      var88.style.setProperty('background-image', `url(${storedCustomBackground})`)
    } else {
      var88.style.removeProperty('background-image')
    }
  }
}

function createKeypressOverlay() {
  if (keypressOverlay) {
    return keypressOverlay
  }
  keypressOverlay = document.createElement("div");
  keypressOverlay.id = "key-display-overlay";
  keypressOverlay.style.setProperty("--key-scale", String(clampKeypressScale(keypressSettings.size)));
  const var89 = document.createElement("div");
  var89.className = 'key-container';
  keypressOverlay.appendChild(var89);
  let var90 = document.getElementById('key-display-overlay-style');
  if (!var90) {
    var90 = document.createElement("style");
    var90.id = "key-display-overlay-style";
    var90.textContent = "\n        #key-display-overlay {\n            position: fixed;\n            bottom: 30px;\n            right: 30px;\n            z-index: 2147483647 !important;\n            user-select: none;\n            cursor: move;\n            display: none;\n            padding: 0;\n            margin: 0;\n            border-radius: 0;\n            background: transparent !important;\n            border: none !important;\n            box-shadow: none !important;\n            outline: none !important;\n            overflow: visible;\n            animation: keyOverlayFadeIn 0.3s ease;\n            --key-scale: 1;\n            --key-base-size: 60px;\n            --key-gap: 10px;\n            --key-border-width: calc(2px * var(--key-scale));\n            --key-radius: calc(12px * var(--key-scale));\n            --key-bg: linear-gradient(145deg, #2b2b2b, #191919);\n            --key-border: #3d3d3d;\n            --key-hover-bg: linear-gradient(145deg, #323232, #1f1f1f);\n            --key-active-bg: linear-gradient(145deg, #4bc277, #328f56);\n            --key-active-border: #6fe49d;\n            --key-shadow: 0 calc(6px * var(--key-scale)) calc(18px * var(--key-scale)) rgba(0, 0, 0, 0.55),\n                          inset 0 calc(1px * var(--key-scale)) calc(3px * var(--key-scale)) rgba(255, 255, 255, 0.12);\n            --key-hover-shadow: 0 calc(7px * var(--key-scale)) calc(20px * var(--key-scale)) rgba(0, 0, 0, 0.55);\n            --key-active-shadow: 0 calc(5px * var(--key-scale)) calc(22px * var(--key-scale)) rgba(73, 194, 119, 0.55),\n                                 inset 0 0 calc(18px * var(--key-scale)) rgba(73, 194, 119, 0.45);\n            --key-color: #ffffff;\n            --key-font: 'Segoe UI', Arial, sans-serif;\n            --key-letter: 0;\n            --key-text-shadow: 0 calc(2px * var(--key-scale)) calc(4px * var(--key-scale)) rgba(0, 0, 0, 0.8);\n            --resize-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0));\n            --resize-border: rgba(255, 255, 255, 0.25);\n            --resize-shadow: inset 0 0 calc(4px * var(--key-scale)) rgba(0, 0, 0, 0.3);\n        }\n        #key-display-overlay::before,\n        #key-display-overlay::after {\n            display: none !important;\n        }\n        #key-display-overlay .key-container {\n            display: flex;\n            flex-direction: column;\n            align-items: center;\n            justify-content: center;\n            gap: calc(var(--key-gap) * var(--key-scale));\n            padding: 0;\n            margin: 0;\n            border: none;\n            background: transparent;\n            box-shadow: none;\n        }\n        #key-display-overlay .key-row {\n            display: flex;\n            gap: calc(var(--key-gap) * var(--key-scale));\n            align-items: stretch;\n            justify-content: center;\n        }\n        #key-display-overlay .key {\n            position: relative;\n            width: calc(var(--key-base-size) * var(--key-scale));\n            height: calc(var(--key-base-size) * var(--key-scale));\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            border-radius: var(--key-radius);\n            background: var(--key-bg);\n            border: var(--key-border-width) solid var(--key-border);\n            box-shadow: var(--key-shadow);\n            color: var(--key-color);\n            font-family: var(--key-font);\n            letter-spacing: var(--key-letter);\n            text-transform: none;\n            transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease, border-color 0.12s ease;\n            transform: var(--key-transform, translate3d(0, 0, 0));\n        }\n        #key-display-overlay .key span {\n            font-size: calc(22px * var(--key-scale));\n            font-weight: 600;\n            text-shadow: var(--key-text-shadow);\n            pointer-events: none;\n        }\n        #key-display-overlay .key:hover {\n            box-shadow: var(--key-hover-shadow);\n            background: var(--key-hover-bg);\n        }\n        #key-display-overlay .key.active {\n            box-shadow: var(--key-active-shadow);\n            background: var(--key-active-bg);\n            border-color: var(--key-active-border);\n        }\n        #key-display-overlay .key-resize-handle {\n            position: absolute;\n            bottom: calc(-8px * var(--key-scale));\n            right: calc(-8px * var(--key-scale));\n            width: calc(18px * var(--key-scale));\n            height: calc(18px * var(--key-scale));\n            border-radius: 4px;\n            border: none;\n            background: transparent;\n            box-shadow: none;\n            cursor: nwse-resize;\n            opacity: 0;\n            transition: opacity 0.2s ease;\n        }\n        #key-display-overlay:hover .key-resize-handle {\n            opacity: 0.4;\n        }\n        #key-display-overlay .key-resize-handle:hover {\n            opacity: 0.7 !important;\n        }\n        #key-display-overlay .key-resize-handle::after {\n            content: '';\n            position: absolute;\n            inset: 6px;\n            border-radius: 3px;\n            border: 1px solid rgba(255, 255, 255, 0.3);\n        }\n        #key-display-overlay .key-size-indicator {\n            position: absolute;\n            bottom: calc(100% + 10px);\n            right: 0;\n            padding: 6px 10px;\n            border-radius: 4px;\n            pointer-events: none;\n            opacity: 0;\n            transition: opacity 0.2s ease;\n            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);\n            background: rgba(0, 0, 0, 0.7);\n            color: #ffffff;\n            font-size: 12px;\n            font-weight: 600;\n        }\n        #key-display-overlay.resizing .key-size-indicator {\n            opacity: 1;\n        }\n        #key-display-overlay.key-theme-classic {\n            --key-base-size: 60px;\n            --key-gap: 10px;\n            --key-border-width: calc(2px * var(--key-scale));\n            --key-radius: calc(14px * var(--key-scale));\n            --key-bg: linear-gradient(145deg, #2c2c2c, #151515);\n            --key-border: #3f3f3f;\n            --key-hover-bg: linear-gradient(145deg, #353535, #1d1d1d);\n            --key-active-bg: linear-gradient(145deg, #47bf74, #2f8f52);\n            --key-active-border: #6ce099;\n            --key-shadow: 0 calc(6px * var(--key-scale)) calc(20px * var(--key-scale)) rgba(0, 0, 0, 0.6),\n                          inset 0 calc(1px * var(--key-scale)) calc(3px * var(--key-scale)) rgba(255, 255, 255, 0.12);\n            --key-hover-shadow: 0 calc(7px * var(--key-scale)) calc(22px * var(--key-scale)) rgba(0, 0, 0, 0.6);\n            --key-active-shadow: 0 calc(5px * var(--key-scale)) calc(24px * var(--key-scale)) rgba(73, 194, 119, 0.55),\n                                 inset 0 0 calc(18px * var(--key-scale)) rgba(73, 194, 119, 0.42);\n        }\n        #key-display-overlay.key-theme-classic::before,\n        #key-display-overlay.key-theme-classic::after {\n            opacity: 0;\n            background: none;\n            border: none;\n        }\n        #key-display-overlay.key-theme-minimal {\n            padding: 0;\n            --key-base-size: 58px;\n            --key-gap: 14px;\n            --key-border-width: calc(1.4px * var(--key-scale));\n            --key-radius: calc(6px * var(--key-scale));\n            --key-bg: #000000;\n            --key-border: rgba(255, 255, 255, 0.45);\n            --key-hover-bg: rgba(255, 255, 255, 0.18);\n            --key-active-bg: #ffffff;\n            --key-active-border: rgba(255, 255, 255, 0.9);\n            --key-shadow: none;\n            --key-hover-shadow: none;\n            --key-active-shadow: none;\n            --key-color: #f7f7f7;\n            --key-text-shadow: none;\n            --resize-bg: rgba(255, 255, 255, 0.35);\n            --resize-border: rgba(255, 255, 255, 0.5);\n        }\n        #key-display-overlay.key-theme-minimal .key {\n            background: var(--key-bg) !important;\n        }\n        #key-display-overlay.key-theme-minimal .key.active {\n            background: #ffffff !important;\n            color: #000000 !important;\n        }\n        #key-display-overlay.key-theme-minimal .key.active span {\n            color: #000000 !important;\n        }\n        #key-display-overlay.key-theme-minimal::before,\n        #key-display-overlay.key-theme-minimal::after {\n            opacity: 0;\n            background: none;\n            border: none;\n            transform: none;\n        }\n        #key-display-overlay.key-theme-minimal .key-container {\n            display: grid;\n            grid-template-columns: repeat(3, minmax(calc(42px * var(--key-scale)), 1fr));\n            grid-template-rows: repeat(2, minmax(calc(42px * var(--key-scale)), 1fr));\n            grid-template-areas:\n                \". up .\"\n                \"left down right\";\n            align-items: center;\n            justify-items: center;\n            gap: calc(16px * var(--key-scale));\n            width: calc(220px * var(--key-scale));\n            padding: 0;\n            border: none;\n            background: transparent;\n            box-shadow: none;\n        }\n        #key-display-overlay.key-theme-minimal .key-row {\n            display: contents;\n        }\n        #key-display-overlay.key-theme-minimal .key {\n            border-radius: calc(8px * var(--key-scale));\n        }\n        #key-display-overlay.key-theme-minimal #key-up { grid-area: up; }\n        #key-display-overlay.key-theme-minimal #key-down { grid-area: down; }\n        #key-display-overlay.key-theme-minimal #key-left { grid-area: left; }\n        #key-display-overlay.key-theme-minimal #key-right { grid-area: right; }\n        #key-display-overlay.key-theme-block {\n            padding: 0;\n            --key-base-size: 58px;\n            --key-gap: 8px;\n            --key-border-width: calc(3px * var(--key-scale));\n            --key-radius: calc(4px * var(--key-scale));\n            --key-bg: linear-gradient(160deg, #303030 0%, #1b1b1b 60%, #050505 100%);\n            --key-border: #050505;\n            --key-hover-bg: linear-gradient(160deg, #3a3a3a, #1f1f1f, #090909);\n            --key-active-bg: linear-gradient(160deg, #ffb347, #ffcc33);\n            --key-active-border: #ffe066;\n            --key-color: #fff7d1;\n            --key-shadow: 0 calc(6px * var(--key-scale)) calc(14px * var(--key-scale)) rgba(8, 8, 8, 0.85);\n            --key-hover-shadow: 0 calc(7px * var(--key-scale)) calc(18px * var(--key-scale)) rgba(0, 0, 0, 0.9);\n            --key-active-shadow: 0 calc(6px * var(--key-scale)) calc(22px * var(--key-scale)) rgba(255, 204, 51, 0.45);\n            --key-text-shadow: 0 calc(2px * var(--key-scale)) calc(4px * var(--key-scale)) rgba(0, 0, 0, 0.9);\n        }\n        #key-display-overlay.key-theme-block::before,\n        #key-display-overlay.key-theme-block::after {\n            opacity: 0;\n            background: none;\n            border: none;\n        }\n        #key-display-overlay.key-theme-block .key-container {\n            padding: 0;\n            border: none;\n            border-radius: calc(12px * var(--key-scale));\n            background: transparent;\n            box-shadow: none;\n        }\n        #key-display-overlay.key-theme-block .key span {\n            font-weight: 800;\n        }\n        #key-display-overlay.key-theme-block-white {\n            padding: 0;\n            --key-base-size: 58px;\n            --key-gap: 8px;\n            --key-border-width: calc(3px * var(--key-scale));\n            --key-radius: calc(4px * var(--key-scale));\n            --key-bg: #000000;\n            --key-border: transparent;\n            --key-hover-bg: #000000;\n            --key-active-bg: #ffffff;\n            --key-active-border: #ffffff;\n            --key-color: #ffffff;\n            --key-shadow: none;\n            --key-hover-shadow: none;\n            --key-active-shadow: 0 0 0 rgba(0,0,0,0);\n            --key-text-shadow: none;\n        }\n        #key-display-overlay.key-theme-block-white::before,\n        #key-display-overlay.key-theme-block-white::after {\n            opacity: 0;\n            background: none;\n            border: none;\n        }\n        #key-display-overlay.key-theme-block-white .key-container {\n            padding: 0;\n            border: none;\n            border-radius: calc(12px * var(--key-scale));\n            background: transparent;\n            box-shadow: none;\n        }\n        #key-display-overlay.key-theme-block-white .key span {\n            font-weight: 800;\n        }\n        #key-display-overlay.key-theme-block-white .key.active {\n            color: #0b0b0b;\n        }\n        #key-display-overlay.key-theme-block-white .key.active span {\n            color: #0b0b0b;\n        }\n        #key-display-overlay.key-theme-retro {\n            padding: 0;\n            --key-base-size: 58px;\n            --key-gap: 8px;\n            --key-border-width: calc(2px * var(--key-scale));\n            --key-radius: 0;\n            --key-bg: repeating-linear-gradient(45deg, #333, #333 8px, #2a2a2a 8px, #2a2a2a 16px);\n            --key-border: #00ff7f;\n            --key-hover-bg: repeating-linear-gradient(45deg, #3f3f3f, #3f3f3f 8px, #333 8px, #333 16px);\n            --key-active-bg: #00ff7f;\n            --key-active-border: #111111;\n            --key-color: #00ff7f;\n            --key-shadow: 0 calc(2px * var(--key-scale)) 0 rgba(0, 0, 0, 0.9);\n            --key-hover-shadow: 0 calc(3px * var(--key-scale)) 0 rgba(0, 0, 0, 0.9);\n            --key-active-shadow: 0 calc(4px * var(--key-scale)) 0 rgba(0, 0, 0, 0.95);\n            --key-font: 'Courier New', monospace;\n            --key-letter: 0.08em;\n            --key-text-shadow: none;\n        }\n        #key-display-overlay.key-theme-retro::before,\n        #key-display-overlay.key-theme-retro::after {\n            opacity: 0;\n            background: none;\n            border: none;\n        }\n        #key-display-overlay.key-theme-retro {\n            border-radius: calc(6px * var(--key-scale));\n        }\n        #key-display-overlay.key-theme-retro .key-container {\n            border: none;\n            padding: 0;\n            background: transparent;\n            box-shadow: none;\n        }\n        #key-display-overlay.key-theme-retro .key {\n            border-top: calc(4px * var(--key-scale)) solid #111111;\n        }\n        #key-display-overlay.key-theme-retro .key span {\n            text-transform: uppercase;\n            font-weight: 700;\n        }\n        #key-display-overlay.key-theme-split {\n            padding: 0;\n            --key-base-size: 54px;\n            --key-gap: 12px;\n            --key-radius: calc(10px * var(--key-scale));\n            --key-bg: linear-gradient(145deg, #1f1f1f, #101010);\n            --key-border: rgba(255, 255, 255, 0.18);\n            --key-hover-bg: linear-gradient(145deg, #282828, #141414);\n            --key-active-bg: linear-gradient(145deg, #42b0ff, #2d7de2);\n            --key-active-border: #66c7ff;\n            --key-shadow: 0 calc(6px * var(--key-scale)) calc(12px * var(--key-scale)) rgba(0, 0, 0, 0.5);\n            --key-hover-shadow: 0 calc(8px * var(--key-scale)) calc(18px * var(--key-scale)) rgba(0, 0, 0, 0.55);\n            --key-active-shadow: 0 calc(8px * var(--key-scale)) calc(22px * var(--key-scale)) rgba(66, 176, 255, 0.45);\n        }\n        #key-display-overlay.key-theme-split::before,\n        #key-display-overlay.key-theme-split::after {\n            opacity: 0;\n            background: none;\n            border: none;\n        }\n        #key-display-overlay.key-theme-split .key-container {\n            display: grid;\n            grid-template-columns: repeat(2, minmax(calc(58px * var(--key-scale)), 1fr));\n            grid-template-rows: repeat(2, minmax(calc(58px * var(--key-scale)), 1fr));\n            grid-template-areas:\n                \"up right\"\n                \"left down\";\n            gap: calc(18px * var(--key-scale));\n            align-items: stretch;\n            justify-items: stretch;\n            padding: 0;\n            background: transparent;\n            border-radius: calc(18px * var(--key-scale));\n            box-shadow: none;\n        }\n        #key-display-overlay.key-theme-split .key-row {\n            display: contents;\n        }\n        #key-display-overlay.key-theme-split #key-up {\n            grid-area: up;\n            align-self: end;\n            justify-self: start;\n            --key-transform: rotate(-6deg);\n        }\n        #key-display-overlay.key-theme-split #key-right {\n            grid-area: right;\n            align-self: start;\n            justify-self: end;\n            --key-transform: rotate(8deg);\n        }\n        #key-display-overlay.key-theme-split #key-left {\n            grid-area: left;\n            align-self: start;\n            justify-self: start;\n            --key-transform: rotate(-10deg);\n        }\n        #key-display-overlay.key-theme-split .key.active {\n            --key-active-bg: linear-gradient(135deg, #52c0ff 0%, #3b8de8 100%);\n            --key-active-border: #88d4ff;\n        }\n        #key-display-overlay.key-theme-default {\n            --key-bg: #000000;\n            --key-border: #000000;\n            --key-radius: 0;\n            --key-active-bg: #FFFFFF;\n            --key-active-border: #FFFFFF;\n            --key-color: #FFFFFF;\n            --key-active-color: #000000;\n            --key-shadow: none;\n            --key-active-shadow: none;\n        }\n        #key-display-overlay.key-theme-default .key.active > span {\n            color: #000000 !important;\n        }\n        #key-display-overlay.key-theme-default .key {\n            transition: background 0.1s ease, border-color 0.1s ease;\n        }\n        #key-display-overlay.key-theme-default .key.active {\n            transition-duration: 0.05s;\n        }\n        @keyframes keyOverlayFadeIn {\n            from { opacity: 0; transform: translateY(15px) scale(0.98); }\n            to { opacity: 1; transform: translateY(0) scale(1); }\n        }\n        ";

    document.head.appendChild(var90)
  }
  document.documentElement.appendChild(keypressOverlay);

  chrome.storage.local.get(['customBackground', 'customBackgroundActive'], var91 => {
    if (var91.customBackground) {
      storedCustomBackground = var91.customBackground;
      applyCustomBackground(keypressOverlay, var91.customBackground)
    }
    if (var91.customBackgroundActive) {
      storedCustomBackgroundActive = var91.customBackgroundActive
    }
  });
  applyKeypressTheme(keypressSettings.theme || "default");
  setKeypressLayout(keypressSettings.layout || "arrows");

  applyKeypressSize(keypressSettings.size || 1);

  ensureKeypressResizeElements();
  applyKeypressPosition(keypressSettings.position);
  makeDraggable(keypressOverlay, {
    'onChange': saveKeypressPosition
  });
  scheduleKeypressBoundsCheck();
  return keypressOverlay
}

function keepOverlayInBounds() {
  if (!keypressOverlay) {
    return
  }
  const var92 = getKeypressOverlayRect();
  const var93 = window.innerWidth;
  const var94 = window.innerHeight;
  let var95 = var92.left;
  let var96 = var92.top;

  let var97 = !1;
  if (var92.right > var93) {
    var95 = Math.max(0, var93 - var92.width - 10);
    var97 = !0
  }
  if (var92.left < 0) {
    var95 = 10;

    var97 = !0
  }
  if (var92.bottom > var94) {
    var96 = Math.max(0, var94 - var92.height - 10);
    var97 = !0
  }
  if (var92.top < 0) {
    var96 = 10;
    var97 = !0
  }
  if (var97) {
    keypressOverlay.style.left = Math.round(var95) + 'px';
    keypressOverlay.style.top = Math.round(var96) + 'px';
    keypressOverlay.style.right = 'auto';
    keypressOverlay.style.bottom = "auto";
    keypressOverlay.style.transform = "none";

    keypressSettings.position = {
      'x': Math.round(var95),
      'y': Math.round(var96)
    };
    persistKeypressSettings({
      'position': keypressSettings.position
    })
  }
}

function scheduleKeypressBoundsCheck() {
  if (!keypressOverlay) {
    return
  }
  if (keypressBoundsHandle !== null) {
    return
  }
  keypressBoundsHandle = requestAnimationFrame(() => {
    keypressBoundsHandle = null;
    keepOverlayInBounds()
  })
}

function toggleKeypressDisplay() {
  if (!keypressOverlay) {
    createKeypressOverlay()
  }
  keypressVisible = !keypressVisible;
  keypressSettings.visible = keypressVisible;
  log("Keypress display toggled:", keypressVisible);
  if (keypressVisible) {
    applyKeypressTheme(keypressSettings.theme);
    setKeypressLayout(keypressSettings.layout);
    applyKeypressSize(keypressSettings.size);
    keypressOverlay.style.display = "block";
    applyKeypressPosition(keypressSettings.position);
    scheduleKeypressBoundsCheck();
    ensureKeypressResizeElements();

    updateKeypressSizeIndicator();
    resetKeypressActiveState();
    log("Keypress display is now active using layout " + keypressSettings.layout + '.')
  } else {
    keypressOverlay.style.display = "none";
    resetKeypressActiveState()
  }
  persistKeypressSettings({
    'visible': keypressVisible,
    'size': keypressSettings.size,
    'layout': keypressSettings.layout,
    'theme': keypressSettings.theme,
    'position': keypressSettings.position
  });
  return keypressVisible
}
window.addEventListener("resize", () => {
  if (keypressOverlay) {
    scheduleKeypressBoundsCheck()
  }
});
document.addEventListener("fullscreenchange", () => {
  if (keypressOverlay) {
    scheduleKeypressBoundsCheck()
  }
});

chrome.runtime.sendMessage({
  'action': "getKeypressSettings"
}, var98 => {
  if (chrome.runtime.lastError) {
    return
  }
  if (var98 && var98.settings) {
    keypressVisible = !!var98.settings.visible;
    keypressSettings.visible = keypressVisible;

    keypressSettings.size = clampKeypressScale(var98.settings.size ?? 1);
    keypressSettings.layout = typeof var98.settings.layout === "string" ? KEY_LAYOUTS[var98.settings.layout.toLowerCase()] ? var98.settings.layout.toLowerCase() : 'arrows' : "arrows";
    if (keypressVisible) {
      createKeypressOverlay();

      setKeypressLayout(keypressSettings.layout);
      applyKeypressSize(keypressSettings.size);
      keypressOverlay.style.display = "block";
      setTimeout(() => keepOverlayInBounds(), 100)
    }
  }
});
chrome.runtime.onMessage.addListener((var99, var100, var101) => {
  switch (var99.action) {
    case "toggleTimer":
      toggleTimerVisibility();
      var101({
        'success': !0
      });
      break;
    case 'toggleFpsMonitor':
      const var102 = toggleFpsOverlay();
      var101({
        'success': !0,
        'visible': var102
      });
      break;
    case "toggleKeypressDisplay":
      const var103 = toggleKeypressDisplay();
      var101({
        'success': !0,
        'visible': var103
      });

      break;

    case "updateKeypressLayout":
      setKeypressLayout(var99.layout);
      ensureKeypressResizeElements();
      if (keypressOverlay) {
        renderKeypressLayout(keypressSettings.layout)
      }
      if (window.wasdZqsdHandler) {
        deactivateZqsd();
        activateZqsdDirectly()
      }
      var101({
        'success': !0,
        'layout': keypressSettings.layout
      });
      break;
    case "updateKeypressTheme":
      const var104 = setKeypressTheme(var99.theme);
      ensureKeypressResizeElements();
      if (var103) {
        scheduleKeypressBoundsCheck()
      }
      var101({
        'success': !0,
        'theme': var104
      });

      break;
    case "updateHotkey":
      currentHotkey = var99.hotkey;
      var101({
        'success': !0
      });
      break;
    case "updateTimerColors":
      timerColors = var99.colors;
      applyTimerColor();
      var101({
        'success': !0
      });

      break;
    case "activateZqsd":
      activateZqsdDirectly();
      chrome.runtime.sendMessage({
        'action': "saveZqsdState",
        'active': !0
      });
      var101({
        'success': !0
      });
      break;
    case "deactivateZqsd":
      if (window.wasdZqsdHandler) {
        document.removeEventListener('keydown', window.wasdZqsdHandler, !0);

        document.removeEventListener("keyup", window.wasdZqsdHandler, !0);
        window.wasdZqsdHandler = null;
        zqsdHandler = null
      }
      chrome.runtime.sendMessage({
        'action': "saveZqsdState",
        'active': !1
      });

      var101({
        'success': !0
      });
      break;
    case 'updateZqsdKeys':
      if (window.wasdZqsdHandler) {
        document.removeEventListener('keydown', window.wasdZqsdHandler, !0);
        document.removeEventListener('keyup', window.wasdZqsdHandler, !0);
        window.wasdZqsdHandler = null;
        zqsdHandler = null
      }
      activateZqsdDirectly();
      var101({
        'success': !0
      });
      break;
    case "toggleResolution":
      const var105 = var99.blackBarsEnabled !== !1;
      const var106 = (typeof var99.mode === 'string' && (RESOLUTION_CONFIGS[var99.mode] || /^\d{2,4}x\d{2,4}$/i.test(var99.mode))) ? var99.mode : "608x1080";

      const _barsColor = typeof var99.barsColor === 'string' && var99.barsColor ? var99.barsColor : '#000000';
      let var107 = !1;
      if (var99.activate === !1) {
        if (isResolutionForced) {
          restoreNormalResolution();
          var107 = !0
        }
      } else {
        const var108 = isResolutionForced && currentResolutionMode && currentResolutionMode !== var106;
        applyForcedResolution(var106, var105, _barsColor);
        var107 = var108
      }
      var101({
        'success': !0,
        'enabled': isResolutionForced,
        'mode': currentResolutionMode,
        'reloaded': var107
      });
      if (var107) {
        setTimeout(() => window.location.reload(), 100)
      }
      break;
    case "setGlobalVolume":
      if (typeof var99.volume === "number" && !Number.isNaN(var99.volume)) {
        const var109 = Math.min(1, Math.max(0, var99.volume));
        currentGlobalVolume = var109;
        chrome.storage.local.set({
          globalVolumeLevel: var109
        }, () => {
          sendVolumeToPage("EXT_SET_VOLUME", {
            'volume': var109
          });
          var101({
            'success': !0,
            'volume': var109
          })
        })
      } else {
        var101({
          'success': !1
        })
      }
      return !0;
    case "updateTripleClick":
      tripleClickActive = var99.active;
      break;
    case "updateTripleClickKey":
      tripleClickKey = var99.key;

      break;
    case "updateTripleClickX":
      tripleClickX = (var99.x !== null && var99.x !== undefined) ? Number(var99.x) : null;
      break;

    case "updateTripleClickY":
      tripleClickY = (var99.y !== null && var99.y !== undefined) ? Number(var99.y) : null;
      break;
    case "startPickTripleClickPos":
      startPickingTripleClickPosition();
      break;
    case "startScreenRecording":
      startScreenRecording();

      var101({
        success: true,
        recording: true
      });
      break;
    case "stopScreenRecording":
      stopScreenRecording();
      var101({
        success: true
      });
      break;
    case "getRecordingState":
      var101({
        recording: isRecordingActive
      });
      break;
    case 'applyAdvancedStyle':
      if (var99.settings) {
        const s = var99.settings;

        const timerWasVisible = timerOverlay ? timerOverlay.style.display : 'none';

        const fpsWasVisible = fpsOverlay ? fpsOverlay.style.display : 'none';
        const keysWasVisible = keypressOverlay ? keypressOverlay.style.display : 'none';

        if (timerOverlay) {
          timerOverlay.style.borderRadius = s.borderRadius || '0px';
          timerOverlay.style.opacity = s.bgOpacity !== undefined ? s.bgOpacity : 1;
          timerOverlay.style.display = timerWasVisible;

          if (timerDisplayEl) {
            timerDisplayEl.style.color = s.textColor || '#FFFFFF';
            if (s.fontFamily) timerDisplayEl.style.fontFamily = s.fontFamily;
            const baseSize = 43;
            const rect = timerOverlay.getBoundingClientRect();
            const widthRatio = rect.width / 225;
            const heightRatio = rect.height / 50;
            const scale = Math.min(widthRatio, heightRatio);
            const calculatedSize = Math.max(18, Math.min(120, baseSize * scale));
            const finalSize = calculatedSize * (s.fontScale || 1);
            timerDisplayEl.style.fontSize = `${finalSize}px`;
          }
        }
        if (fpsOverlay) {
          fpsOverlay.style.borderRadius = s.borderRadius || '4px';
          fpsOverlay.style.opacity = s.bgOpacity !== undefined ? s.bgOpacity : 1;
          fpsOverlay.style.display = fpsWasVisible;
          const valueEl = fpsOverlay.querySelector('.fps-value');
          if (valueEl) {
            valueEl.style.color = s.textColor || '#FFFFFF';
            if (s.fontFamily) valueEl.style.fontFamily = s.fontFamily;
          }
        }
        if (keypressOverlay) {
          keypressOverlay.style.setProperty('--key-radius', s.borderRadius || '12px');
          keypressOverlay.style.setProperty('--key-color', s.textColor || '#ffffff');
          keypressOverlay.style.opacity = s.bgOpacity !== undefined ? s.bgOpacity : 1;

          keypressOverlay.style.display = keysWasVisible;
          if (s.fontFamily) keypressOverlay.style.setProperty('--key-font', s.fontFamily);

        }
      }
      var101({
        success: true
      });
      break;
    case 'resetAllCustomization':
      if (timerOverlay) {
        const wasVisible = timerOverlay.style.display;
        const pos = {
          left: timerOverlay.style.left,
          top: timerOverlay.style.top
        };
        const size = {
          width: timerOverlay.style.width,
          height: timerOverlay.style.height
        };

        applyThemeToTimer();
        timerOverlay.style.display = wasVisible;
        timerOverlay.style.left = pos.left;
        timerOverlay.style.top = pos.top;
        timerOverlay.style.width = size.width;
        timerOverlay.style.height = size.height;

      }
      if (fpsOverlay) {
        const wasVisible = fpsOverlay.style.display;
        const pos = {
          left: fpsOverlay.style.left,
          top: fpsOverlay.style.top
        };
        ensureFpsStyles();
        fpsOverlay.style.display = wasVisible;
        fpsOverlay.style.left = pos.left;
        fpsOverlay.style.top = pos.top;
      }
      if (keypressOverlay) {
        const wasVisible = keypressOverlay.style.display;
        const pos = {
          left: keypressOverlay.style.left,
          top: keypressOverlay.style.top
        };
        applyKeypressTheme('default');
        keypressOverlay.style.display = wasVisible;
        keypressOverlay.style.left = pos.left;

        keypressOverlay.style.top = pos.top;
      }
      var101({
        success: true
      });

      break;
    case "updateBackground":
      storedCustomBackground = var99.background;
      applyCustomBackground(timerOverlay, storedCustomBackground);
      applyCustomBackground(fpsOverlay, storedCustomBackground);
      applyCustomBackground(keypressOverlay, storedCustomBackground);
      var101({
        success: !0
      });
      break;
    case "updateBackgroundActive":
      storedCustomBackgroundActive = var99.background;
      var101({
        success: !0
      });
      break;

    case "resetSpecificBackground": {
      const target = var99.targetType;
      if (target === 'timer' && timerOverlay) {
        applyCustomBackground(timerOverlay, null);
      }
      if (target === 'fps' && fpsOverlay) {
        applyCustomBackground(fpsOverlay, null);
      }
      if (target === 'keys' && keypressOverlay) {
        applyCustomBackground(keypressOverlay, null);
        storedCustomBackgroundActive = null;
      }
      var101({
        success: true
      });
      break;
    }
    case "updateSpecificBackground": {
      const target = var99.targetType;
      const bg = var99.background;
      if (target === 'timer' && timerOverlay) {
        applyCustomBackground(timerOverlay, bg);
      }
      if (target === 'fps' && fpsOverlay) {
        applyCustomBackground(fpsOverlay, bg);

      }
      if (target === 'keys' && keypressOverlay) {
        applyCustomBackground(keypressOverlay, bg);
      }
      if (target === 'keysActive') {
        storedCustomBackgroundActive = bg;
      }
      var101({
        success: true
      });
      break;
    }
    case 'applyAdvancedStyleV2':
      if (var99.settings) {
        const s = var99.settings;

        if (s.timer && timerOverlay) {
          const ts = s.timer;

          timerOverlay.style.backgroundColor = ts.bgColor || '#000000';
          timerOverlay.style.borderRadius = ts.borderRadius || '0px';

          timerOverlay.style.opacity = ts.opacity !== undefined ? ts.opacity : 1;
          timerOverlay.style.borderWidth = ts.borderWidth || '0px';
          timerOverlay.style.borderColor = ts.borderColor || '#6366f1';
          timerOverlay.style.borderStyle = parseInt(ts.borderWidth) > 0 ? 'solid' : 'none';

          timerOverlay.style.boxShadow = parseInt(ts.shadow) > 0 ? `0 0 ${ts.shadow} rgba(0,0,0,0.5)` : 'none';
          if (timerDisplayEl) {
            timerDisplayEl.style.color = ts.textColor || '#FFFFFF';
            if (ts.fontFamily) timerDisplayEl.style.fontFamily = ts.fontFamily;
            const baseSize = 43;
            const rect = timerOverlay.getBoundingClientRect();

            const widthRatio = rect.width / 225;
            const heightRatio = rect.height / 50;
            const scale = Math.min(widthRatio, heightRatio);

            const calculatedSize = Math.max(18, Math.min(120, baseSize * scale));
            const finalSize = calculatedSize * (ts.fontScale || 1);
            timerDisplayEl.style.fontSize = `${finalSize}px`;
          }
        }

        if (s.fps && fpsOverlay) {
          const fs = s.fps;
          fpsOverlay.style.backgroundColor = fs.bgColor || '#000000';
          fpsOverlay.style.borderRadius = fs.borderRadius || '4px';
          fpsOverlay.style.opacity = fs.opacity !== undefined ? fs.opacity : 1;
          fpsOverlay.style.borderWidth = fs.borderWidth || '0px';
          fpsOverlay.style.borderColor = fs.borderColor || '#10b981';
          fpsOverlay.style.borderStyle = parseInt(fs.borderWidth) > 0 ? 'solid' : 'none';
          fpsOverlay.style.boxShadow = parseInt(fs.shadow) > 0 ? `0 0 ${fs.shadow} rgba(0,0,0,0.5)` : 'none';
          const valueEl = fpsOverlay.querySelector('.fps-value');
          if (valueEl) {
            valueEl.style.color = fs.textColor || '#FFFFFF';
            if (fs.fontFamily) valueEl.style.fontFamily = fs.fontFamily;
            const baseFps = 14;
            const finalFpsSize = baseFps * (fs.fontScale || 1);
            valueEl.style.fontSize = `${finalFpsSize}px`;
          }
        }

        if (s.keys && keypressOverlay) {
          const ks = s.keys;
          keypressOverlay.style.setProperty('--key-bg', ks.bgColor || '#000000');
          keypressOverlay.style.setProperty('--key-color', ks.textColor || '#ffffff');
          keypressOverlay.style.setProperty('--key-border', ks.borderColor || '#3d3d3d');
          keypressOverlay.style.setProperty('--key-active-bg', ks.activeBgColor || '#4bc277');
          keypressOverlay.style.setProperty('--key-active-border', ks.activeColor || '#4bc277');
          keypressOverlay.style.setProperty('--key-radius', ks.borderRadius || '12px');

          keypressOverlay.style.setProperty('--key-border-width', ks.borderWidth || '2px');
          keypressOverlay.style.setProperty('--key-gap', ks.gap || '10px');
          keypressOverlay.style.setProperty('--key-base-size', '60px');

          const shadowPx = parseInt(ks.shadow) || 0;
          if (shadowPx > 0) {
            keypressOverlay.style.setProperty('--key-shadow', `0 ${shadowPx}px ${shadowPx*2}px rgba(0,0,0,0.3)`);
            keypressOverlay.style.setProperty('--key-active-shadow', `0 ${shadowPx}px ${shadowPx*2}px rgba(75,194,119,0.4)`);
          } else {
            keypressOverlay.style.setProperty('--key-shadow', 'none');
            keypressOverlay.style.setProperty('--key-active-shadow', 'none');
          }

          keypressOverlay.style.opacity = ks.opacity !== undefined ? ks.opacity : 1;

          const sizeScale = ks.sizeScale || 1;
          keypressOverlay.style.setProperty('--key-scale', String(sizeScale));

          const keys = keypressOverlay.querySelectorAll('.key');
          const keyContainer = keypressOverlay.querySelector('.key-container');
          if (keyContainer) {
            keyContainer.style.gap = `calc(${ks.gap || '10px'} * ${sizeScale})`;
          }

          let activeKeyStyle = document.getElementById('key-active-dynamic-style');
          if (!activeKeyStyle) {
            activeKeyStyle = document.createElement('style');
            activeKeyStyle.id = 'key-active-dynamic-style';
            document.head.appendChild(activeKeyStyle);
          }
          const activeBgColor = ks.activeBgColor || '#4bc277';
          const activeTextColor = ks.activeTextColor || '#ffffff';
          const activeBorderColor = ks.activeColor || '#4bc277';
          activeKeyStyle.textContent = `
                #key-display-overlay .key.active {
                    background: ${activeBgColor} !important;
                    border-color: ${activeBorderColor} !important;
                }
                #key-display-overlay .key.active span {
                    color: ${activeTextColor} !important;

                }
            `;

          keys.forEach(key => {
            key.style.background = ks.bgColor || '#000000';
            key.style.borderColor = ks.borderColor || '#3d3d3d';
            key.style.borderRadius = ks.borderRadius || '12px';
            key.style.borderWidth = ks.borderWidth || '2px';
            key.style.borderStyle = 'solid';

            if (shadowPx > 0) {
              key.style.boxShadow = `0 ${shadowPx}px ${shadowPx*2}px rgba(0,0,0,0.3)`;

            } else {
              key.style.boxShadow = 'none';
            }
            const span = key.querySelector('span');
            if (span) span.style.color = ks.textColor || '#ffffff';
          });
        }
      }
      var101({
        success: true
      });

      break;
    default:
      var101({
        'success': !1,
        'error': "Unknown action"
      });
      break
  }
  return !0
});
document.addEventListener("keydown", var110 => {
  if (var110.repeat) {
    return
  }
  if (tripleClickActive && var110.code === tripleClickKey) {
    doTripleClick()
  }
  let var111 = !1;
  if (currentHotkey === 'Space') {
    if (var110.key === " " || var110.code === "Space" || var110.keyCode === 32) {
      if (!var110.ctrlKey && !var110.altKey && !var110.metaKey && !var110.shiftKey) {
        var111 = !0
      } else {
        if (var110.shiftKey && !var110.ctrlKey && !var110.altKey && !var110.metaKey) {}
      }
    }
  } else {
    if (currentHotkey === "Control" && var110.ctrlKey && !var110.altKey && !var110.metaKey && !var110.shiftKey) {
      var111 = !0
    } else {
      if (currentHotkey === "Shift" && var110.shiftKey && !var110.ctrlKey && !var110.altKey && !var110.metaKey) {
        var111 = !0
      } else {
        if (currentHotkey === 'Alt' && var110.altKey && !var110.ctrlKey && !var110.metaKey && !var110.shiftKey) {
          var111 = !0
        } else {
          if (currentHotkey === "Meta" && var110.metaKey && !var110.ctrlKey && !var110.altKey && !var110.shiftKey) {
            var111 = !0
          } else {
            if (currentHotkey === var110.code && !var110.ctrlKey && !var110.altKey && !var110.metaKey && !var110.shiftKey) {
              var111 = !0
            }
          }
        }
      }
    }
  }
  if (var111) {
    var110.preventDefault();
    var110.stopPropagation();
    var110.stopImmediatePropagation();
    const var112 = ["Shift", "Control", "Alt", "Meta"].includes(currentHotkey);
    if (var112 || !var110.shiftKey) {
      controlTimer()
    }
  }
  let var113 = !1;

  if (currentHotkey === 'Space' && (var110.key === " " || var110.code === "Space" || var110.keyCode === 32) && var110.shiftKey && !var110.ctrlKey && !var110.altKey && !var110.metaKey) {
    var113 = !0
  } else if (!['Shift', 'Control', "Alt", "Meta"].includes(currentHotkey) && currentHotkey === var110.code && var110.shiftKey && !var110.ctrlKey && !var110.altKey && !var110.metaKey) {
    var113 = !0
  }
  if (var113) {
    var110.preventDefault();
    var110.stopPropagation();
    var110.stopImmediatePropagation();

    toggleTimerVisibility()
  }
}, !0);
log("Gaming Tools Suite Complete - Content script prêt")

let mediaRecorder = null;
let recordedChunks = [];

let isRecordingActive = false;


async function startScreenRecording() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: 1920,
        height: 1080,
        frameRate: 60
      },
      audio: false
    });

    const mimeTypes = ['video/webm;codecs=h264', 'video/webm;codecs=vp8', 'video/webm'];
    const selectedMime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: selectedMime,
      videoBitsPerSecond: 5000000
    });

    recordedChunks = [];
    isRecordingActive = true;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    };


    mediaRecorder.onstop = () => {
      isRecordingActive = false;
      const blob = new Blob(recordedChunks, {
        type: selectedMime
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const filename = `Run_${now.getHours()}h${now.getMinutes()}_${now.getSeconds()}.webm`;

      a.style.display = 'none';
      a.href = url;

      a.download = filename;

      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);

        window.URL.revokeObjectURL(url);
        recordedChunks = [];
      }, 1000);

      stream.getTracks().forEach(track => track.stop());
    };

    stream.getVideoTracks()[0].onended = () => {
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    };

    mediaRecorder.start(1000);


  } catch (err) {
    console.error("Erreur REC:", err);
    isRecordingActive = false;
  }
}

function stopScreenRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}