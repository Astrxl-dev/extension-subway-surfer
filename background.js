const log = () => {};

log("Gaming Tools Suite Complete - Background script démarré");

chrome.runtime.onInstalled.addListener(() => {
  log("Gaming Tools Suite Complete installée");
  chrome.storage.local.set({
    customHotkey: "Control",
    timerSettings: {
      position: {
        x: 20,
        y: 20
      },
      size: {
        width: 320,
        height: 80
      },
      visible: !1,
    },
    fpsSettings: {
      position: {
        x: 20,
        y: 100
      },
      visible: !1,
    },
    keypressSettings: {
      visible: !1,
      size: 1,
      layout: "arrows",
      theme: "default",
      position: null,
    },
    timerColors: {
      stopped: "#FFFFFF",
      running: "#FFFFFF",
      paused: "#FFFFFF",
    },
    globalVolumeLevel: 1,
    zqsdActive: !1,
    zqsdKeys: {
      up: "",
      down: "",
      left: "",
      right: "",
    },
    resolutionActive: !1,
    resolutionMode: null,
    selectedResolutionMode: "608x1080",
    adblockActive: !0,
    adsBlocked: 0,
    sessionBlocked: 0,
    adblockStats: {
      today: 0,
      total: 0,
      lastReset: new Date().toDateString(),
    },
    spotifyPlaylistUrl: "https://soundcloud.com/t4nso/sets/subway-tryhard?si=006cb8a1f52243ddb0a374a5fef64da5&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
  });
  log("Paramètres initialisés avec thème livesplit et adblock");
  log("Bloqueur de publicités installé")
});
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({
    sessionBlocked: 0,
  });
  log("Session adblock réinitialisée")
});
let pendingAds = 0;
let saveTimeout = null;

async function incrementBlockCount() {
  pendingAds++;
  if (saveTimeout) return;

  saveTimeout = setTimeout(async () => {
    const data = await chrome.storage.local.get(["adsBlocked", "sessionBlocked", "adblockStats"]);
    let adsBlocked = (data.adsBlocked || 0) + pendingAds;
    let sessionBlocked = (data.sessionBlocked || 0) + pendingAds;

    let adblockStats = data.adblockStats || {
      today: 0,
      total: 0,
      lastReset: new Date().toDateString()
    };
    const today = new Date().toDateString();
    if (adblockStats.lastReset !== today) {
      adblockStats.today = 0;

      adblockStats.lastReset = today;
    }
    adblockStats.today += pendingAds;
    adblockStats.total += pendingAds;

    await chrome.storage.local.set({
      adsBlocked,
      sessionBlocked,
      adblockStats
    });

    pendingAds = 0;

    saveTimeout = null;
  }, 2000);

}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log("Background reçoit:", message);
  (async () => {
    switch (message.action) {
      case "saveResolutionState": {
        const newState = {
          resolutionActive: message.active,
          resolutionMode: message.mode || null,
        };

        if (message.mode) {
          newState.selectedResolutionMode = message.mode
        }
        await chrome.storage.local.set(newState);
        sendResponse({
          success: !0
        });
        break
      }
      case "saveHotkey":
        await chrome.storage.local.set({
          customHotkey: message.hotkey
        });
        sendResponse({
          success: !0
        });
        break;
      case "getGlobalVolume": {
        const {
          globalVolumeLevel
        } = await chrome.storage.local.get("globalVolumeLevel");

        sendResponse({
          globalVolumeLevel
        });
        break
      }
      case "saveZqsdKeys":
        await chrome.storage.local.set({
          zqsdKeys: message.keys
        });
        sendResponse({
          success: !0
        });
        break;
      case "getZqsdState": {
        const {
          zqsdActive
        } = await chrome.storage.local.get(["zqsdActive"]);
        sendResponse({
          active: zqsdActive || !1
        });
        break
      }
      case "saveTimerColors":
        await chrome.storage.local.set({
          timerColors: message.colors
        });
        sendResponse({
          success: !0
        });
        break;
      case "saveTimerSettings":
        await chrome.storage.local.set({
          timerSettings: {
            position: message.position,
            size: message.size,
            visible: message.visible,
          },
        });
        sendResponse({
          success: !0
        });
        break;
      case "getKeypressSettings": {
        const {
          keypressSettings
        } = await chrome.storage.local.get(["keypressSettings", ]);
        const defaultSettings = {
          visible: !1,
          size: 1,
          layout: "arrows",
          theme: "default",
          position: null,
        };

        const currentSettings = {
          ...defaultSettings,
          ...(keypressSettings || {})
        };
        const validThemes = ["default", "classic", "minimal", "block", "block-white", "retro", ];
        const themeMap = {
          neon: "block",
          ocean: "classic",
          sunset: "retro",
          frost: "minimal",
          carbon: "block",
          cyber: "classic",
          pastel: "minimal",
          circular: "classic",
          capsule: "classic",
          holo: "classic",
          split: "classic",
        };
        const validLayouts = ["arrows", "zqsd", "wasd"];
        let needsUpdate = !1;
        const layoutStr = typeof currentSettings.layout === "string" ? currentSettings.layout.toLowerCase() : "arrows";
        if (!validLayouts.includes(layoutStr)) {
          currentSettings.layout = "arrows";
          needsUpdate = !0
        } else {
          currentSettings.layout = layoutStr
        }
        const themeStr = typeof currentSettings.theme === "string" ? currentSettings.theme.toLowerCase() : "default";
        let finalTheme = themeStr;
        if (!validThemes.includes(themeStr)) {
          const mappedTheme = themeMap[themeStr];
          finalTheme = validThemes.includes(mappedTheme) ? mappedTheme : "default"
        }
        if (finalTheme !== currentSettings.theme) {
          currentSettings.theme = finalTheme;

          needsUpdate = !0
        }
        if (needsUpdate) {
          await chrome.storage.local.set({
            keypressSettings: currentSettings
          })
        }
        sendResponse({
          settings: currentSettings
        });
        break
      }
      case "saveFpsSettings":
        await chrome.storage.local.set({
          fpsSettings: {
            position: message.position,
            visible: message.visible,
          },
        });
        sendResponse({
          success: !0
        });
        break;

      case "saveGlobalVolume": {
        await chrome.storage.local.set({
          globalVolumeLevel: message.globalVolumeLevel
        });
        sendResponse({
          success: !0
        });
        break
      }
      case "saveResolutionSettings": {
        await chrome.storage.local.set({
          selectedResolutionMode: message.selectedResolutionMode,
          blackBarsEnabled: message.blackBarsEnabled
        });
        sendResponse({
          success: !0
        });
        break
      }
      case "saveKeypressSettings": {
        const {
          keypressSettings: oldSettings
        } = await chrome.storage.local.get(["keypressSettings"]);
        const defaultSettings = {
          visible: !1,
          size: 1,
          layout: "arrows",
          theme: "classic",
          position: null,
        };
        const currentSettings = oldSettings || defaultSettings;
        const newSize = typeof message.size === "number" ? Math.min(1.6, Math.max(0.6, message.size)) : currentSettings.size;

        const layoutStr = typeof message.layout === "string" ? message.layout.toLowerCase() : null;

        const validLayouts = ["arrows", "wasd", "zqsd"];
        let newLayout = layoutStr && validLayouts.includes(layoutStr) ? layoutStr : currentSettings.layout;
        const themeStr = typeof message.theme === "string" ? message.theme.toLowerCase() : null;
        const validThemes = ["default", "classic", "minimal", "block", "block-white", "retro", ];
        const themeMap = {
          neon: "block",
          ocean: "classic",
          sunset: "retro",
          frost: "minimal",
          carbon: "block",
          cyber: "classic",
          pastel: "minimal",
          circular: "classic",
          capsule: "classic",
          holo: "classic",
          split: "classic",
        };
        let newTheme = currentSettings.theme || "default";
        if (themeStr) {
          if (validThemes.includes(themeStr)) {
            newTheme = themeStr
          } else if (themeMap[themeStr] && validThemes.includes(themeMap[themeStr])) {
            newTheme = themeMap[themeStr]
          }
        }
        let newPosition = currentSettings.position || null;
        if (message.position && typeof message.position === "object") {
          const x = Number(message.position.x);

          const y = Number(message.position.y);
          if (Number.isFinite(x) && Number.isFinite(y)) {
            newPosition = {
              x: Math.round(x),
              y: Math.round(y),
            }
          }
        }
        const newSettings = {
          visible: typeof message.visible === "boolean" ? message.visible : currentSettings.visible,
          size: newSize,
          layout: newLayout,
          theme: newTheme,
          position: newPosition,
        };
        await chrome.storage.local.set({
          keypressSettings: newSettings
        });
        sendResponse({
          success: !0,
          settings: newSettings
        });
        break
      }
      case "saveZqsdState":
        await chrome.storage.local.set({
          zqsdActive: message.active
        });
        sendResponse({
          success: !0
        });
        break;
      case "getTimerColors": {
        const {
          timerColors
        } = await chrome.storage.local.get(["timerColors"]);
        sendResponse({
          colors: timerColors || {
            stopped: "#FFFFFF",
            running: "#FFFFFF",
            paused: "#FFFFFF",
          },
        });
        break
      }
      case "getResolutionState": {
        const {
          resolutionActive,
          resolutionMode
        } = await chrome.storage.local.get(["resolutionActive", "resolutionMode", ]);
        sendResponse({
          active: resolutionActive || !1,
          mode: resolutionMode || null,
        });
        break
      }
      case "getTimerSettings": {
        const {
          timerSettings
        } = await chrome.storage.local.get(["timerSettings", ]);
        const defaultSettings = {
          position: {
            x: 20,
            y: 20
          },
          size: {
            width: 320,
            height: 80
          },
          visible: !1,
        };
        sendResponse({
          settings: timerSettings || defaultSettings
        });
        break
      }
      case "enableAdblock":
        await chrome.storage.local.set({
          adblockActive: !0
        });

        sendResponse({
          success: !0
        });
        break;
      case "disableAdblock":
        await chrome.storage.local.set({
          adblockActive: !1
        });
        sendResponse({
          success: !0
        });
        break;
      case "getFpsSettings": {
        const {
          fpsSettings
        } = await chrome.storage.local.get(["fpsSettings"]);
        const defaultSettings = {
          position: {
            x: 20,
            y: 100
          },
          visible: !1,
        };

        sendResponse({
          settings: fpsSettings || defaultSettings
        });
        break
      }
      case "resetAdblockStats":
        await chrome.storage.local.set({
          adblockStats: {
            today: 0,
            total: 0,
            lastReset: new Date().toDateString(),
          },
          adsBlocked: 0,
          sessionBlocked: 0,
        });
        sendResponse({
          success: !0
        });
        break;
      case "adBlocked":
        await incrementBlockCount();
        sendResponse({
          success: !0
        });

        break;
      case "getResolutionSettings": {
        const {
          selectedResolutionMode,
          blackBarsEnabled
        } = await chrome.storage.local.get(["selectedResolutionMode", "blackBarsEnabled"]);
        sendResponse({
          selectedResolutionMode,
          blackBarsEnabled
        });
        break
      }
      case "getHotkey": {
        const {
          customHotkey
        } = await chrome.storage.local.get(["customHotkey", ]);
        sendResponse({
          hotkey: customHotkey || "Control"
        });
        break
      }
      case "getZqsdKeys": {
        const {
          zqsdKeys
        } = await chrome.storage.local.get(["zqsdKeys"]);
        sendResponse({
          keys: zqsdKeys
        });
        break
      }
      case "getAdblockState": {
        const {
          adblockActive,
          adblockStats
        } = await chrome.storage.local.get(["adblockActive", "adblockStats"]);
        sendResponse({
          active: adblockActive !== undefined ? adblockActive : !0,
          stats: adblockStats || {
            today: 0,
            total: 0
          },
        });
        break
      }
    }
  })();
  return !0
})