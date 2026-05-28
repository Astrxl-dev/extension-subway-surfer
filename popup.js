/*
 * Sbs tools v1
 * Copyright (c) 2026 Astrxl
 */
const log = () => {};
let currentActiveKey = "Control";

function sendToContentScript(message, callback) {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, tabs => {
    if (!tabs[0]) {
      if (callback) callback(null, "Aucun onglet actif");

      return;
    }
    chrome.tabs.sendMessage(tabs[0].id, message, response => {
      if (chrome.runtime.lastError) {
        console.log("Content script non disponible:", chrome.runtime.lastError.message);
        if (callback) callback(null, "Ouvrez une page de jeu supportée");

      } else {
        if (callback) callback(response, null);
      }
    });
  });
}

const DEFAULT_PLAYLIST_URL = "https://soundcloud.com/bdwx/sets/u7j3r9nbxpeu";

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

const SUPPORTED_LANGS = ["fr", "en", "pt-BR", "zh"];
const LANGUAGE_FALLBACK = "fr";
let currentLanguage = LANGUAGE_FALLBACK;

const translations = {
  fr: {
    "nav.dashboard": "Dashboard",
    "nav.gametools": "Outils Jeu",
    "nav.rankings": "Classements",
    "nav.appearance": "Style",
    "nav.media": "Média",
    "language.title": "Choisissez votre langue",
    "language.subtitle": "Nous l'utiliserons pour l'interface du popup.",
    "language.fr": "Français",
    "language.frLabel": "Par défaut",
    "language.en": "English",
    "language.enLabel": "International",
    "language.pt": "Português (Brasil)",
    "language.ptLabel": "Comunidade BR",
    "language.zh": "中文",
    "language.zhLabel": "简体中文",
    "language.later": "Plus tard",
    "language.confirm": "Valider",
    "language.switch": "Changer de langue",
    "section.dashboard.title": "Dashboard",
    "section.dashboard.subtitle": "Contrôles principaux & Overlays",
    "card.liveOverlays": "Live Overlays",
    "label.speedrun": "Speedrun Timer",
    "desc.speedrun": "Chrono précis au millième",
    "desc.timerHotkey": "Touche d'activation du Timer :",
    "placeholder.customKey": "Ou tapez une touche personnalisée...",
    "label.fps": "FPS Counter",
    "desc.fps": "Affiche les images/seconde",
    "label.keypress": "Affichage Touches",
    "desc.keypress": "Visualisez vos inputs en direct",
    "card.resolution": "Résolution",
    "btn.force": "Forcer",
    "label.blackBars": "Bandes noires",
    "btn.reset": "Réinitialiser",
    "section.gametools.title": "Outils Jeu",
    "section.gametools.subtitle": "Sauvegardes, Cartes & Contrôles",
    "card.backup": "Gestionnaire de Sauvegarde",
    "btn.backup": "Backup",
    "btn.restore": "Restore",
    "btn.unlock": "Unlock All",
    "btn.resetData": "Reset Data",
    "card.mapSelector": "Sélecteur de Cartes",
    "card.keymap": "Mapping Clavier (ZQSD)",
    "placeholder.up": "Haut (Z)",
    "placeholder.left": "Gauche (Q)",
    "placeholder.down": "Bas (S)",
    "placeholder.right": "Droite (D)",
    "btn.apply": "Appliquer",
    "btn.disable": "Désactiver",
    "section.rankings.title": "Classements",
    "section.rankings.subtitle": "Speedrun & Records",
    "card.rankCalc": "Calculateur de Rang",
    "desc.rankCalc": "Entrez un temps pour voir le rang correspondant.",
    "placeholder.timeInput": "Ex: 1h 13m 45s",
    "card.worldRecords": "World Records",
    "btn.leaderboard": "Voir le Leaderboard Speedrun.com",
    "card.topFrance": "Top France",
    "section.appearance.title": "Apparence",
    "section.appearance.subtitle": "Personnalisez votre interface",
    "card.overlay": "Overlay Touches",
    "card.backgrounds": "Images de Fond",
    "desc.globalBackground": "Fond Global",
    "desc.activeBackground": "Fond Touche Active",
    "btn.import": "Importer Image",
    "btn.removeBackgrounds": "Supprimer les fonds",
    "card.timerColors": "Couleurs du Timer",
    "desc.colorRunning": "En cours",
    "desc.colorPaused": "Pause",
    "desc.colorStopped": "Arrêt",
    "section.media.title": "Média",
    "section.media.subtitle": "Audio et Musique",
    "card.volume": "Volume Global du Jeu",
    "card.soundcloud": "Lecteur SoundCloud",
    "placeholder.playlist": "URL de la Playlist...",
    "btn.launchPlayer": "Lancer le Player",
    "desc.soundcloud": "Ouvre une fenêtre pop-up dédiée.",
    "status.done": "Action effectuée",
    "rank.label": "Rang :",
    "rank.unranked": "Non classé"
  },
  en: {
    "nav.dashboard": "Dashboard",
    "nav.gametools": "Game Tools",
    "nav.rankings": "Ranks",
    "nav.appearance": "Style",
    "nav.media": "Media",
    "language.title": "Choose your language",
    "language.subtitle": "We will use it for the popup UI.",
    "language.fr": "Français",
    "language.frLabel": "Default",
    "language.en": "English",
    "language.enLabel": "International",
    "language.pt": "Português (Brasil)",
    "language.ptLabel": "BR community",
    "language.zh": "中文",
    "language.zhLabel": "Simplified Chinese",
    "language.later": "Later",
    "language.confirm": "Confirm",
    "language.switch": "Change language",
    "section.dashboard.title": "Dashboard",
    "section.dashboard.subtitle": "Main controls & overlays",
    "card.liveOverlays": "Live Overlays",
    "label.speedrun": "Speedrun Timer",
    "desc.speedrun": "Millisecond-accurate timer",
    "desc.timerHotkey": "Timer activation key:",
    "placeholder.customKey": "Or type a custom key...",
    "label.fps": "FPS Counter",
    "desc.fps": "Show frames per second",
    "label.keypress": "Key Display",
    "desc.keypress": "See your inputs live",
    "card.resolution": "Resolution",
    "btn.force": "Apply",
    "label.blackBars": "Black bars",
    "btn.reset": "Reset",
    "section.gametools.title": "Game Tools",
    "section.gametools.subtitle": "Backups, maps & controls",
    "card.backup": "Save Manager",
    "btn.backup": "Backup",
    "btn.restore": "Restore",
    "btn.unlock": "Unlock All",
    "btn.resetData": "Reset Data",
    "card.mapSelector": "Map Selector",
    "card.keymap": "Keyboard Mapping (ZQSD)",
    "placeholder.up": "Up (Z)",
    "placeholder.left": "Left (Q)",
    "placeholder.down": "Down (S)",
    "placeholder.right": "Right (D)",
    "btn.apply": "Apply",
    "btn.disable": "Disable",
    "section.rankings.title": "Ranks",
    "section.rankings.subtitle": "Speedrun & records",
    "card.rankCalc": "Rank Calculator",
    "desc.rankCalc": "Enter a time to see the matching rank.",
    "placeholder.timeInput": "Ex: 1h 13m 45s",
    "card.worldRecords": "World Records",
    "btn.leaderboard": "Open the Speedrun.com leaderboard",
    "card.topFrance": "Top France",
    "section.appearance.title": "Appearance",
    "section.appearance.subtitle": "Customize your interface",
    "card.overlay": "Key Overlay",
    "card.backgrounds": "Background Images",
    "desc.globalBackground": "Global Background",
    "desc.activeBackground": "Active Key Background",
    "btn.import": "Import Image",
    "btn.removeBackgrounds": "Remove backgrounds",
    "card.timerColors": "Timer Colors",
    "desc.colorRunning": "Running",
    "desc.colorPaused": "Paused",
    "desc.colorStopped": "Stopped",
    "section.media.title": "Media",
    "section.media.subtitle": "Audio & Music",
    "card.volume": "Game Master Volume",
    "card.soundcloud": "SoundCloud Player",
    "placeholder.playlist": "Playlist URL...",
    "btn.launchPlayer": "Launch Player",
    "desc.soundcloud": "Opens a dedicated pop-up window.",
    "status.done": "Action done",
    "rank.label": "Rank:",
    "rank.unranked": "Unranked"
  },
  "pt-BR": {
    "nav.dashboard": "Dashboard",
    "nav.gametools": "Ferramentas de Jogo",
    "nav.rankings": "Ranks",
    "nav.appearance": "Estilo",
    "nav.media": "Mídia",
    "language.title": "Escolha o idioma",
    "language.subtitle": "Usaremos no popup da extensão.",
    "language.fr": "Français",
    "language.frLabel": "Padrão",
    "language.en": "English",
    "language.enLabel": "Internacional",
    "language.pt": "Português (Brasil)",
    "language.ptLabel": "Comunidade BR",
    "language.zh": "中文",
    "language.zhLabel": "Chinês Simplificado",
    "language.later": "Depois",
    "language.confirm": "Confirmar",
    "language.switch": "Mudar idioma",
    "section.dashboard.title": "Dashboard",
    "section.dashboard.subtitle": "Controles principais e overlays",
    "card.liveOverlays": "Overlays ao vivo",
    "label.speedrun": "Timer de Speedrun",
    "desc.speedrun": "Cronômetro com precisão de ms",
    "desc.timerHotkey": "Tecla do timer:",
    "placeholder.customKey": "Ou digite uma tecla personalizada...",
    "label.fps": "Contador de FPS",
    "desc.fps": "Mostrar quadros por segundo",
    "label.keypress": "Exibição de teclas",
    "desc.keypress": "Veja seus inputs ao vivo",
    "card.resolution": "Resolução",
    "btn.force": "Forçar",
    "label.blackBars": "Barras pretas",
    "btn.reset": "Redefinir",
    "section.gametools.title": "Ferramentas de Jogo",
    "section.gametools.subtitle": "Backups, mapas e controles",
    "card.backup": "Gerenciador de Backup",
    "btn.backup": "Backup",
    "btn.restore": "Restaurar",
    "btn.unlock": "Desbloquear tudo",
    "btn.resetData": "Zerar dados",
    "card.mapSelector": "Seletor de mapa",
    "card.keymap": "Mapeamento de teclado (ZQSD)",
    "placeholder.up": "Cima (Z)",
    "placeholder.left": "Esquerda (Q)",
    "placeholder.down": "Baixo (S)",
    "placeholder.right": "Direita (D)",
    "btn.apply": "Aplicar",
    "btn.disable": "Desativar",
    "section.rankings.title": "Ranks",
    "section.rankings.subtitle": "Speedrun e recordes",
    "card.rankCalc": "Calculadora de Rank",
    "desc.rankCalc": "Digite um tempo para ver o rank.",
    "placeholder.timeInput": "Ex: 1h 13m 45s",
    "card.worldRecords": "Recordes Mundiais",
    "btn.leaderboard": "Ver leaderboard no Speedrun.com",
    "card.topFrance": "Top França",
    "section.appearance.title": "Aparência",
    "section.appearance.subtitle": "Personalize sua interface",
    "card.overlay": "Overlay de Teclas",
    "card.backgrounds": "Imagens de Fundo",
    "desc.globalBackground": "Fundo Global",
    "desc.activeBackground": "Fundo da tecla ativa",
    "btn.import": "Importar imagem",
    "btn.removeBackgrounds": "Remover fundos",
    "card.timerColors": "Cores do Timer",
    "desc.colorRunning": "Em andamento",
    "desc.colorPaused": "Pausado",
    "desc.colorStopped": "Parado",
    "section.media.title": "Mídia",
    "section.media.subtitle": "Áudio e música",
    "card.volume": "Volume global do jogo",
    "card.soundcloud": "Player SoundCloud",
    "placeholder.playlist": "URL da playlist...",
    "btn.launchPlayer": "Abrir player",
    "desc.soundcloud": "Abre uma janela pop-up dedicada.",
    "status.done": "Ação concluída",
    "rank.label": "Rank:",
    "rank.unranked": "Sem rank"
  },
  zh: {
    "nav.dashboard": "仪表盘",
    "nav.gametools": "游戏工具",
    "nav.rankings": "排名",
    "nav.appearance": "样式",
    "nav.media": "媒体",
    "language.title": "选择你的语言",
    "language.subtitle": "用于弹窗界面。",
    "language.fr": "Français",
    "language.frLabel": "默认",
    "language.en": "English",
    "language.enLabel": "国际",
    "language.pt": "Português (Brasil)",
    "language.ptLabel": "BR 社区",
    "language.zh": "中文",
    "language.zhLabel": "简体中文",
    "language.later": "稍后",
    "language.confirm": "确定",
    "language.switch": "切换语言",
    "section.dashboard.title": "仪表盘",
    "section.dashboard.subtitle": "主要控制与叠层",
    "card.liveOverlays": "实时叠层",
    "label.speedrun": "速通计时",
    "desc.speedrun": "毫秒级计时器",
    "desc.timerHotkey": "计时快捷键：",
    "placeholder.customKey": "或输入自定义按键...",
    "label.fps": "FPS 计数器",
    "desc.fps": "显示每秒帧数",
    "label.keypress": "按键显示",
    "desc.keypress": "实时查看你的输入",
    "card.resolution": "分辨率",
    "btn.force": "应用",
    "label.blackBars": "黑边",
    "btn.reset": "重置",
    "section.gametools.title": "游戏工具",
    "section.gametools.subtitle": "存档、地图与控制",
    "card.backup": "存档管理",
    "btn.backup": "备份",
    "btn.restore": "还原",
    "btn.unlock": "全部解锁",
    "btn.resetData": "重置数据",
    "card.mapSelector": "地图选择器",
    "card.keymap": "键位映射 (ZQSD)",
    "placeholder.up": "上 (Z)",
    "placeholder.left": "左 (Q)",
    "placeholder.down": "下 (S)",
    "placeholder.right": "右 (D)",
    "btn.apply": "应用",
    "btn.disable": "关闭",
    "section.rankings.title": "排名",
    "section.rankings.subtitle": "Speedrun 与纪录",
    "card.rankCalc": "段位计算器",
    "desc.rankCalc": "输入时间查看对应段位。",
    "placeholder.timeInput": "例：1h 13m 45s",
    "card.worldRecords": "世界纪录",
    "btn.leaderboard": "查看 Speedrun.com 排行",
    "card.topFrance": "法国榜单",
    "section.appearance.title": "外观",
    "section.appearance.subtitle": "自定义界面",
    "card.overlay": "按键叠层",
    "card.backgrounds": "背景图片",
    "desc.globalBackground": "全局背景",
    "desc.activeBackground": "激活键背景",
    "btn.import": "导入图片",
    "btn.removeBackgrounds": "删除背景",
    "card.timerColors": "计时器颜色",
    "desc.colorRunning": "运行",
    "desc.colorPaused": "暂停",
    "desc.colorStopped": "停止",
    "section.media.title": "媒体",
    "section.media.subtitle": "音频与音乐",
    "card.volume": "游戏全局音量",
    "card.soundcloud": "SoundCloud 播放器",
    "placeholder.playlist": "播放列表链接...",
    "btn.launchPlayer": "启动播放器",
    "desc.soundcloud": "打开一个专用弹窗。",
    "status.done": "操作完成",
    "rank.label": "段位：",
    "rank.unranked": "未定级"
  }
};


const storageGet = (keys) => new Promise(resolve => {
  try {
    chrome.storage.local.get(keys, data => resolve(data || {}));
  } catch (e) {
    resolve({});
  }
});

function getTranslation(lang, key) {
  const locale = translations[lang] ? lang : LANGUAGE_FALLBACK;

  const dict = translations[locale] || {};
  if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
  if (translations.en && Object.prototype.hasOwnProperty.call(translations.en, key)) return translations.en[key];
  if (translations.fr && Object.prototype.hasOwnProperty.call(translations.fr, key)) return translations.fr[key];
  return "";
}

function applyTranslations(lang) {
  const locale = translations[lang] ? lang : LANGUAGE_FALLBACK;
  currentLanguage = locale;
  document.documentElement.lang = locale.startsWith("pt") ? "pt-BR" : locale;

  document.querySelectorAll('[data-i18n-key]').forEach(el => {
    const key = el.dataset.i18nKey;
    const value = getTranslation(locale, key);
    if (value) el.textContent = value;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const value = getTranslation(locale, key);

    if (value) el.placeholder = value;
  });
}

function setLanguage(lang, persist = false) {
  const locale = translations[lang] ? lang : LANGUAGE_FALLBACK;
  applyTranslations(locale);
  if (persist) {
    chrome.storage.local.set({
      preferredLanguage: locale,
      languageConfirmed: true
    });
  }
}

async function initLanguage() {
  const {
    preferredLanguage,
    languageConfirmed
  } = await storageGet(["preferredLanguage", "languageConfirmed"]);

  const locale = translations[preferredLanguage] ? preferredLanguage : LANGUAGE_FALLBACK;
  setLanguage(locale, false);
  setupLanguageModal(locale, !languageConfirmed);
}

function setupLanguageModal(initialLang = LANGUAGE_FALLBACK, shouldShowPrompt = false) {
  const modal = document.getElementById("languageModal");
  if (!modal) return;

  const optionButtons = Array.from(modal.querySelectorAll('.language-option'));
  const confirmBtn = document.getElementById("confirmLanguage");
  const laterBtn = document.getElementById("languageLater");
  const openPickerBtn = document.getElementById("openLanguagePicker");
  let selectedLang = translations[initialLang] ? initialLang : LANGUAGE_FALLBACK;

  const markActive = (lang) => {
    optionButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
  };

  optionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedLang = btn.dataset.lang;
      markActive(selectedLang);

      if (confirmBtn) confirmBtn.disabled = false;
    });
  });

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      setLanguage(selectedLang, true);
      modal.classList.add('hidden');
    });

  }

  if (laterBtn) {
    laterBtn.addEventListener('click', () => modal.classList.add('hidden'));
  }

  const openModal = () => {
    markActive(selectedLang);
    if (confirmBtn) confirmBtn.disabled = false;
    modal.classList.remove('hidden');

  };

  if (openPickerBtn) openPickerBtn.addEventListener('click', openModal);
  if (shouldShowPrompt) openModal();
}

function parseTimeToMillis(timeString) {
  if (!timeString) return 0;

  const trimmed = timeString.trim();

  const colonMatch = /^\s*(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?\s*$/;
  const colonParts = trimmed.match(colonMatch);
  if (colonParts) {
    const h = parseInt(colonParts[1] || "0", 10);
    const m = parseInt(colonParts[2] || "0", 10);
    const s = parseInt(colonParts[3] || "0", 10);

    return ((h * 60 + m) * 60 + s) * 1000;

  }

  const parts = trimmed.toLowerCase().replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  let totalMillis = 0;
  parts.forEach(part => {
    if (part.includes('h')) {
      totalMillis += parseInt(part, 10) * 60 * 60 * 1000;
    } else if (part.includes('m')) {
      totalMillis += parseInt(part, 10) * 60 * 1000;
    } else if (part.includes('s')) {
      totalMillis += parseInt(part, 10) * 1000;

    }
  });
  return totalMillis;
}

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await initLanguage();

  setupNavigation();
  setupSwitches();
  setupHotkeySelector();

  loadCurrentHotkey();
  setupColorEventListeners();
  setupSubwayEventListeners();
  setupSubwayCityEventListeners();
  setupZqsdEventListeners();

  setupResolutionEventListeners();

  setupVolumeControl();
  setupKeypressLogic();
  setupMusicEventListeners();
  setupIndividualBackgrounds();
  setupAdvancedCustomization();
  setupTripleClick();
  setupRecordingButton();
  setupRankCalculator();
}

function setupRankCalculator() {
  const timeInput = document.getElementById("timeInput");
  const rankResult = document.getElementById("rankResult");

  if (!timeInput || !rankResult) return;

  timeInput.addEventListener("input", () => {
    const timeString = timeInput.value;
    if (!timeString) {
      rankResult.textContent = "";
      return;
    }
    const timeInMillis = parseTimeToMillis(timeString);

    if (isNaN(timeInMillis)) {
      rankResult.textContent = "";
      return;
    }

    const currentRank = rankTiers.find(rank => timeInMillis >= rank.minTime);
    const label = getTranslation(currentLanguage, "rank.label") || "Rank:";
    const unrankedLabel = getTranslation(currentLanguage, "rank.unranked") || "Unranked";
    rankResult.textContent = currentRank ? `${label} ${currentRank.name}` : unrankedLabel;
  });
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.view-section');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(nav => nav.classList.remove('active'));
      sections.forEach(sec => sec.classList.remove('active'));

      item.classList.add('active');
      document.getElementById(item.dataset.target).classList.add('active');

    });
  });
}

function setupHotkeySelector() {
  const btns = document.querySelectorAll('.hotkey-btn');
  const customInput = document.getElementById('customKeyInput');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      setHotkey(key);
      btns.forEach(b => b.classList.remove('active'));

      btn.classList.add('active');
      customInput.value = '';

    });
  });

  customInput.addEventListener('keydown', (e) => {
    e.preventDefault();

    let code = e.code;
    if (e.ctrlKey && !e.altKey) code = "Control";
    else if (e.shiftKey) code = "Shift";
    else if (e.altKey) code = "Alt";
    else if (code === "Space") code = "Space";


    customInput.value = code;
    setHotkey(code);
    btns.forEach(b => b.classList.remove('active'));
  });
}

function setupSwitches() {
  const bindSwitch = (id, msgAction, labelOn, labelOff) => {
    const el = document.getElementById(id);
    el.addEventListener('change', () => {
      sendToContentScript({
        action: msgAction
      }, (r, err) => {
        if (err) {
          showStatus(err, false);
          el.checked = false;
        } else {
          const active = r && (r.visible || r.success);
          showStatus(active ? labelOn : labelOff, true);
        }
      });
    });
  };


  bindSwitch('toggleTimerSwitch', 'toggleTimer', "Timer Activé", "Timer Masqué");
  bindSwitch('toggleFpsSwitch', 'toggleFpsMonitor', "FPS Activés", "FPS Masqués");
  bindSwitch('toggleKeypressSwitch', 'toggleKeypressDisplay', "Touches Activées", "Touches Masquées");

  chrome.runtime.sendMessage({
    action: "getFpsSettings"
  }, r => {
    if (r?.settings?.visible) document.getElementById('toggleFpsSwitch').checked = true;
  });
  chrome.runtime.sendMessage({
    action: "getKeypressSettings"
  }, r => {
    if (r?.settings?.visible) document.getElementById('toggleKeypressSwitch').checked = true;

  });
  chrome.runtime.sendMessage({
    action: "getTimerSettings"
  }, r => {
    if (r?.settings?.visible) document.getElementById('toggleTimerSwitch').checked = true;
  });
}

function showStatus(msg, success) {
  const toast = document.getElementById("status");
  const translated = getTranslation(currentLanguage, msg) || msg;
  toast.querySelector("span").textContent = translated;
  toast.style.borderColor = success ? "var(--accent)" : "var(--danger)";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);

}

function setupTripleClick() {
  const toggle = document.getElementById('tripleClickToggle');
  const input = document.getElementById('tripleClickInput');

  const inputX = document.getElementById('tripleClickX');
  const inputY = document.getElementById('tripleClickY');

  if (!toggle || !input) return;

  chrome.storage.local.get(['tripleClickActive', 'tripleClickKey', 'tripleClickX', 'tripleClickY'], (data) => {
    toggle.checked = data.tripleClickActive || false;
    input.value = data.tripleClickKey || "KeyF";
    input.dataset.code = data.tripleClickKey || "KeyF";
    if (inputX && data.tripleClickX !== undefined && data.tripleClickX !== null) {
      inputX.value = data.tripleClickX;

    }
    if (inputY && data.tripleClickY !== undefined && data.tripleClickY !== null) {
      inputY.value = data.tripleClickY;
    }
  });

  toggle.addEventListener('change', () => {
    const active = toggle.checked;
    chrome.storage.local.set({
      tripleClickActive: active
    });
    sendToContentScript({
      action: "updateTripleClick",
      active: active
    });
  });

  input.addEventListener('keydown', (e) => {
    e.preventDefault();
    const code = e.code;

    input.value = code;
    input.dataset.code = code;

    chrome.storage.local.set({
      tripleClickKey: code
    });
    sendToContentScript({
      action: "updateTripleClickKey",
      key: code
    });

    input.blur();
  });


  if (inputX) {
    inputX.addEventListener('input', () => {
      const x = inputX.value === '' ? null : parseInt(inputX.value, 10);
      chrome.storage.local.set({
        tripleClickX: x
      });
      sendToContentScript({
        action: "updateTripleClickX",
        x: x
      });
    });
  }

  if (inputY) {
    inputY.addEventListener('input', () => {
      const y = inputY.value === '' ? null : parseInt(inputY.value, 10);
      chrome.storage.local.set({
        tripleClickY: y
      });
      sendToContentScript({
        action: "updateTripleClickY",
        y: y
      });
    });

  }

  const pickBtn = document.getElementById('pickTripleClickPos');
  if (pickBtn) {
    pickBtn.addEventListener('click', () => {
      sendToContentScript({
        action: "startPickTripleClickPos"
      }, (res, err) => {
        if (!err) {
          window.close();

        } else {
          showStatus(err, false);
        }
      });

    });

  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.tripleClickX && inputX) {
        inputX.value = changes.tripleClickX.newValue !== null ? changes.tripleClickX.newValue : '';
      }
      if (changes.tripleClickY && inputY) {
        inputY.value = changes.tripleClickY.newValue !== null ? changes.tripleClickY.newValue : '';
      }
    }
  });
}

function setupKeypressLogic() {
  const layoutBtns = document.querySelectorAll('.key-layout-btn');
  const themeBtns = document.querySelectorAll('.key-theme-btn');

  const updateActive = (btns, val, attr) => {
    btns.forEach(b => b.classList.toggle('active', b.dataset[attr] === val));
  };

  layoutBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const layout = btn.dataset.layout;
      updateActive(layoutBtns, layout, 'layout');
      sendToContentScript({
        action: "updateKeypressLayout",
        layout
      });
      chrome.runtime.sendMessage({
        action: 'saveKeypressSettings',
        layout
      });
      showStatus(`Layout: ${layout.toUpperCase()}`, true);
    });
  });

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;

      updateActive(themeBtns, theme, 'theme');
      sendToContentScript({
        action: "updateKeypressTheme",
        theme
      });
      chrome.runtime.sendMessage({
        action: 'saveKeypressSettings',
        theme
      });
      showStatus(`Thème: ${theme}`, true);
    });

  });

  chrome.runtime.sendMessage({
    action: 'getKeypressSettings'
  }, r => {
    if (r && r.settings) {
      updateActive(layoutBtns, r.settings.layout || 'arrows', 'layout');
      updateActive(themeBtns, r.settings.theme || 'default', 'theme');
    }
  });
}

function loadCurrentHotkey() {
  chrome.runtime.sendMessage({
    action: 'getHotkey'
  }, r => {
    if (r && r.hotkey) {
      currentActiveKey = r.hotkey;
      document.querySelectorAll('.hotkey-btn').forEach(b => {
        if (b.dataset.key === r.hotkey) b.classList.add('active');

        else b.classList.remove('active');

      });

    }
  });
}

function setHotkey(key) {
  chrome.runtime.sendMessage({
    action: "saveHotkey",
    hotkey: key
  }, r => {
    if (r && r.success) {
      currentActiveKey = key;
      showStatus(`Touche Timer : ${key}`, true);
      sendToContentScript({
        action: "updateHotkey",
        hotkey: key
      });

    }
  });

}

function setupResolutionEventListeners() {
  const activate = document.getElementById('activateResolution');
  const deactivate = document.getElementById('deactivateResolution');
  const select = document.getElementById('resolutionSelect');
  const bb = document.getElementById('blackBarsToggle');
  const customInputs = document.getElementById('customResInputs');
  const widthInput = document.getElementById('customWidth');
  const heightInput = document.getElementById('customHeight');
  const colorPicker = document.getElementById('barsColorPicker');

  chrome.runtime.sendMessage({
    action: "getResolutionSettings"
  }, r => {
    if (r) {
      if (r.selectedResolutionMode) select.value = r.selectedResolutionMode;
      if (r.blackBarsEnabled !== undefined) bb.checked = r.blackBarsEnabled;

    }
  });


  activate.addEventListener('click', () => toggleResolution(true));
  deactivate.addEventListener('click', () => toggleResolution(false));

  if (select && customInputs) {
    const updateCustomVisibility = () => {
      customInputs.style.display = select.value === 'custom' ? 'block' : 'none';
    };
    select.addEventListener('change', updateCustomVisibility);

    updateCustomVisibility();
  }

  if (colorPicker) {
    chrome.storage.local.get('barsColor', (data) => {
      if (data && data.barsColor) colorPicker.value = data.barsColor;
    });

    colorPicker.addEventListener('change', () => {
      chrome.storage.local.set({
        barsColor: colorPicker.value
      });

    });
  }

  const saveSettings = () => {
    chrome.runtime.sendMessage({
      action: "saveResolutionSettings",
      selectedResolutionMode: select.value,
      blackBarsEnabled: bb.checked
    });
  };

  select.addEventListener('change', saveSettings);

  bb.addEventListener('change', saveSettings);
}

function toggleResolution(activate) {
  let mode = document.getElementById("resolutionSelect").value;

  const bb = document.getElementById("blackBarsToggle").checked;
  const colorEl = document.getElementById('barsColorPicker');
  const color = colorEl ? colorEl.value : '#000000';
  let width, height;

  if (mode === 'custom') {
    const wEl = document.getElementById('customWidth');
    const hEl = document.getElementById('customHeight');
    width = wEl ? parseInt(wEl.value, 10) : NaN;
    height = hEl ? parseInt(hEl.value, 10) : NaN;
    if (!width || !height || width < 320 || height < 240) {
      showStatus("Résolution invalide", false);
      return;
    }
    mode = `${width}x${height}`;
  }
  sendToContentScript({
    action: 'toggleResolution',
    activate,
    blackBarsEnabled: bb,
    mode,
    barsColor: color
  }, (r, err) => {
    if (err) {
      showStatus(err, false);

    } else {
      showStatus(activate ? `Résolution ${mode}` : "Reset Normal", true);
    }
  });

}

function setupVolumeControl() {
  const slider = document.getElementById("volumeSlider");
  const label = document.getElementById("volumeValue");
  chrome.runtime.sendMessage({
    action: "getGlobalVolume"
  }, r => {
    if (r && r.globalVolumeLevel !== undefined) {
      const vol = r.globalVolumeLevel * 100;
      slider.value = vol;
      label.textContent = Math.round(vol) + "%";
    }
  });
  slider.addEventListener("input", () => {
    const val = slider.value;
    label.textContent = val + "%";
    const volume = val / 100;
    chrome.runtime.sendMessage({
      action: "saveGlobalVolume",
      globalVolumeLevel: volume
    });
    sendToContentScript({
      action: "setGlobalVolume",
      volume: volume
    });
  });

}

function setupZqsdEventListeners() {
  const up = document.getElementById("upKey");
  const left = document.getElementById("leftKey");
  const down = document.getElementById("downKey");
  const right = document.getElementById("rightKey");
  chrome.runtime.sendMessage({
    action: 'getZqsdKeys'
  }, r => {
    if (r && r.keys) {
      up.value = r.keys.up;
      left.value = r.keys.left;
      down.value = r.keys.down;
      right.value = r.keys.right;
    }
  });
  document.getElementById("saveZqsdKeys").addEventListener("click", () => {
    const keys = {
      up: up.value.toUpperCase(),
      down: down.value.toUpperCase(),
      left: left.value.toUpperCase(),
      right: right.value.toUpperCase()
    };
    chrome.runtime.sendMessage({
      action: 'saveZqsdKeys',
      keys: keys
    }, () => {
      showStatus("Touches ZQSD Sauvegardées", true);
      sendToContentScript({
        action: "updateZqsdKeys",
        keys
      });
      sendToContentScript({
        action: "activateZqsd"
      });
    });
  });
  document.getElementById("deactivateZqsd").addEventListener("click", () => {
    sendToContentScript({
      action: "deactivateZqsd"
    }, (r, err) => {
      showStatus(err ? err : "ZQSD Désactivé", !err);
    });
  });
}

function setupSubwayEventListeners() {
  document.getElementById("backup").addEventListener("click", doBackup);
  document.getElementById("restore").addEventListener("click", doRestore);
  document.getElementById("save100").addEventListener("click", doSave100);
  document.getElementById("cleanData").addEventListener("click", doCleanData);
}

function doBackup() {
  chrome.tabs.query({
    'active': true,
    'currentWindow': true
  }, tabs => {
    if (!tabs[0]) return;
    chrome.scripting.executeScript({
      target: {
        tabId: tabs[0].id
      },
      func: backupData
    }, res => {
      if (res?.[0]?.result) {
        const blob = new Blob([res[0].result], {
          type: "application/octet-stream"
        });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
          url,
          filename: `SubwaySurfers_Backup_${new Date().toISOString().slice(0,10)}.bin`,
          saveAs: true
        });
        showStatus("Backup Créé", true);
      } else showStatus("Erreur Backup", false);
    });
  });
}

function backupData() {
  return new Promise(resolve => {
    const payload = {
      indexedDB: null,
      localStorage: null
    };
    let idb = false,
      ls = false;
    const check = () => {
      if (idb && ls) resolve(JSON.stringify(payload));
    };

    try {
      if (localStorage.length) {
        payload.localStorage = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k.includes("SaveData") || k.includes("Unity")) payload.localStorage[k] = localStorage.getItem(k);
        }
      }
    } catch (e) {}
    ls = true;

    if (!window.indexedDB) {
      idb = true;
      check();
      return;
    }
    const req = indexedDB.open('/idbfs');
    req.onerror = () => {
      idb = true;
      check();
    };
    req.onsuccess = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('FILE_DATA')) {
        db.close();
        idb = true;
        check();
        return;
      }
      const tx = db.transaction(['FILE_DATA'], 'readonly');
      const st = tx.objectStore('FILE_DATA');
      st.getAll().onsuccess = ev => {
        const data = ev.target.result;
        st.getAllKeys().onsuccess = ev2 => {
          payload.indexedDB = {};
          ev2.target.result.forEach((k, i) => {
            const d = data[i];
            if (d.contents instanceof Uint8Array) d.contents = Array.from(d.contents);

            payload.indexedDB[k] = d;

          });
          db.close();

          idb = true;
          check();
        }
      }
    }
  });
}

function doRestore() {
  const input = document.createElement("input");
  input.type = 'file';
  input.accept = ".bin";
  input.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();

    r.onload = ev => {
      const fileContent = ev.target.result;
      try {
        JSON.parse(fileContent);
        chrome.tabs.query({
          active: true,
          currentWindow: true
        }, tabs => {
          if (tabs[0]) {
            chrome.scripting.executeScript({
              target: {
                tabId: tabs[0].id
              },
              args: [fileContent],
              func: restoreData
            }, () => showStatus("Restauré ! Rechargez la page", true));

          }
        });
      } catch (error) {
        showStatus("Fichier de sauvegarde invalide", false);
      }
    };
    r.readAsText(f);

  };
  input.click();
}

function restoreData(json) {
  try {
    const d = JSON.parse(json);
    if (d.localStorage)
      for (let k in d.localStorage) localStorage.setItem(k, d.localStorage[k]);

    if (d.indexedDB) {
      const r = indexedDB.open('/idbfs');
      r.onsuccess = e => {
        const db = e.target.result;
        const tx = db.transaction(['FILE_DATA'], 'readwrite');
        const st = tx.objectStore('FILE_DATA');
        st.clear().onsuccess = () => {
          for (let k in d.indexedDB) {
            const rec = d.indexedDB[k];
            if (rec.contents) rec.contents = new Uint8Array(rec.contents);
            st.put(rec, k);
          }
        };
      };
    }
  } catch (e) {
    console.error("Error restoring data:", e);
  }
}

function doSave100() {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, tabs => {
    if (tabs[0]) chrome.scripting.executeScript({
      target: {
        tabId: tabs[0].id
      },
      func: applySave100
    }, () => showStatus("Tout débloqué ! Rechargez.", true));

  });
}

function applySave100() {
  const request = indexedDB.open("/idbfs");
  request.onsuccess = function(event) {
    const db = event.target.result;
    const tx = db.transaction(["FILE_DATA"], "readonly");
    const store = tx.objectStore("FILE_DATA");
    const keysReq = store.getAllKeys();

    keysReq.onsuccess = function() {
      const allKeys = keysReq.result;
      const hashSet = new Set();
      allKeys.forEach(k => {
        const m = k.match(/^\/idbfs\/([a-f0-9]+)\/Save\/cloud$/);
        if (m) hashSet.add(m[1]);
      });

      if (hashSet.size === 0) {
        console.error("Aucun hash trouvé dans IndexedDB.");
        return;
      }
      const hashes = Array.from(hashSet);
      let done = 0;
      hashes.forEach(hash => {
        const tx2 = db.transaction(["FILE_DATA"], "readwrite");
        const store2 = tx2.objectStore("FILE_DATA");
        const data = {
          "timestamp": new Date(1732485593978),
          "mode": 33206,
          "contents": new Uint8Array([20, 0, 0, 0, 218, 47, 51, 223, 211, 235, 36, 203, 232, 4, 109, 30, 183, 217, 129, 209, 226, 12, 85, 89, 244, 45, 0, 0, 244, 45, 0, 0, 16, 111, 98, 102, 117, 115, 99, 97, 116, 101, 100, 67, 111, 105, 110, 115, 0, 81, 178, 127, 59, 16, 111, 98, 102, 117, 115, 99, 97, 116, 101, 100, 75, 101, 121, 115, 0, 240, 163, 125, 0, 16, 111, 98, 102, 117, 115, 99, 97, 116, 101, 100, 85, 110, 114, 101, 119, 97, 114, 100, 101, 100, 67, 111, 105, 110, 115, 0, 2, 0, 0, 0, 3, 112, 111, 119, 101, 114, 117, 112, 115, 0, 58, 0, 0, 0, 16, 104, 111, 118, 101, 114, 98, 111, 97, 114, 100, 0, 0, 0, 0, 0, 16, 104, 101, 97, 100, 115, 116, 97, 114, 116, 50, 48, 48, 48, 0, 247, 196, 154, 59, 16, 115, 99, 111, 114, 101, 98, 111, 111, 115, 116, 101, 114, 0, 20, 0, 0, 0, 0, 3, 117, 112, 103, 114, 97, 100, 101, 115, 0, 75, 0, 0, 0, 16, 106, 101, 116, 112, 97, 99, 107, 0, 0, 0, 0, 0, 16, 115, 117, 112, 101, 114, 115, 110, 101, 97, 107, 101, 114, 115, 0, 0, 0, 0, 0, 16, 99, 111, 105, 110, 109, 97, 103, 110, 101, 116, 0, 0, 0, 0, 0, 16, 100, 111, 117, 98, 108, 101, 77, 117, 108, 116, 105, 112, 108, 105, 101, 114, 0, 0, 0, 0, 0, 0, 4, 112, 101, 110, 100, 105, 110, 103, 82, 101, 119, 97, 114, 100, 115, 0, 5, 0, 0, 0, 0, 3, 98, 111, 97, 114, 100, 84, 104, 101, 109, 101, 68, 97, 116, 97, 0, 5, 0, 0, 0, 0, 4, 117, 110, 108, 111, 99, 107, 101, 100, 67, 104, 97, 114, 97, 99, 116, 101, 114, 115, 0, 134, 0, 0, 0, 2, 48, 0, 6, 0, 0, 0, 115, 108, 105, 99, 107, 0, 2, 49, 0, 7, 0, 0, 0, 102, 114, 105, 122, 122, 121, 0, 2, 50, 0, 8, 0, 0, 0, 112, 114, 105, 110, 99, 101, 107, 0, 2, 51, 0, 6, 0, 0, 0, 98, 114, 111, 100, 121, 0, 2, 52, 0, 4, 0, 0, 0, 122, 111, 101, 0, 2, 53, 0, 6, 0, 0, 0, 110, 105, 110, 106, 97, 0, 2, 54, 0, 4, 0, 0, 0, 116, 97, 103, 0, 2, 55, 0, 7, 0, 0, 0, 116, 114, 105, 99, 107, 121, 0, 2, 56, 0, 5, 0, 0, 0, 108, 117, 99, 121, 0, 2, 57, 0, 6, 0, 0, 0, 102, 114, 101, 115, 104, 0, 0, 3, 99, 111, 108, 108, 101, 99, 116, 101, 100, 67, 104, 97, 114, 97, 99, 116, 101, 114, 84, 111, 107, 101, 110, 115, 0, 51, 0, 0, 0, 16, 116, 114, 105, 99, 107, 121, 0, 2, 0, 0, 0, 16, 102, 114, 101, 115, 104, 0, 20, 9, 0, 0, 16, 121, 117, 116, 97, 110, 105, 0, 2, 0, 0, 0, 16, 115, 112, 105, 107, 101, 0, 12, 0, 0, 0, 0, 3, 115, 101, 108, 101, 99, 116, 101, 100, 79, 117, 116, 102, 105, 116, 115, 0, 69, 0, 0, 0, 16, 112, 114, 105, 110, 99, 101, 107, 0, 2, 0, 0, 0, 16, 122, 111, 101, 0, 2, 0, 0, 0, 16, 116, 97, 103, 0, 1, 0, 0, 0, 16, 116, 114, 105, 99, 107, 121, 0, 1, 0, 0, 0, 16, 108, 117, 99, 121, 0, 1, 0, 0, 0, 16, 102, 114, 101, 115, 104, 0, 1, 0, 0, 0, 0, 3, 117, 110, 108, 111, 99, 107, 101, 100, 79, 117, 116, 102, 105, 116, 115, 0, 162, 0, 0, 0, 4, 115, 108, 105, 99, 107, 0, 12, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 0, 4, 112, 114, 105, 110, 99, 101, 107, 0, 12, 0, 0, 0, 16, 48, 0, 2, 0, 0, 0, 0, 4, 122, 111, 101, 0, 12, 0, 0, 0, 16, 48, 0, 2, 0, 0, 0, 0, 4, 116, 97, 103, 0, 12, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 0, 4, 102, 114, 101, 115, 104, 0, 12, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 0, 4, 116, 114, 105, 99, 107, 121, 0, 19, 0, 0, 0, 16, 48, 0, 2, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 0, 4, 108, 117, 99, 121, 0, 12, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 0, 4, 98, 114, 111, 100, 121, 0, 12, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 0, 0, 4, 117, 110, 108, 111, 99, 107, 101, 100, 66, 111, 97, 114, 100, 115, 0, 22, 0, 0, 0, 2, 48, 0, 10, 0, 0, 0, 115, 116, 97, 114, 98, 111, 97, 114, 100, 0, 0, 4, 104, 97, 115, 83, 107, 105, 112, 112, 101, 100, 77, 105, 115, 115, 105, 111, 110, 115, 0, 17, 0, 0, 0, 8, 48, 0, 0, 8, 49, 0, 0, 8, 50, 0, 0, 0, 16, 114, 117, 110, 115, 67, 111, 109, 112, 108, 101, 116, 101, 100, 73, 110, 67, 117, 114, 114, 101, 110, 116, 77, 105, 115, 115, 105, 111, 110, 83, 101, 116, 0, 111, 1, 0, 0, 16, 99, 117, 114, 114, 101, 110, 116, 77, 105, 115, 115, 105, 111, 110, 83, 101, 116, 0, 1, 0, 0, 0, 4, 99, 117, 114, 114, 101, 110, 116, 77, 105, 115, 115, 105, 111, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 20, 0, 0, 0, 16, 50, 0, 2, 0, 0, 0, 0, 16, 109, 105, 115, 115, 105, 111, 110, 83, 101, 116, 67, 111, 109, 112, 108, 101, 116, 101, 100, 67, 111, 117, 110, 116, 0, 2, 0, 0, 0, 16, 99, 117, 114, 114, 101, 110, 116, 83, 107, 105, 112, 70, 111, 114, 86, 105, 100, 101, 111, 77, 105, 115, 115, 105, 111, 110, 73, 110, 100, 101, 120, 0, 0, 0, 0, 0, 9, 99, 117, 114, 114, 101, 110, 116, 83, 107, 105, 112, 70, 111, 114, 86, 105, 100, 101, 111, 73, 110, 100, 101, 120, 83, 101, 116, 65, 116, 0, 86, 59, 48, 96, 147, 1, 0, 0, 9, 108, 97, 115, 116, 84, 105, 109, 101, 77, 105, 115, 115, 105, 111, 110, 87, 97, 115, 83, 107, 105, 112, 112, 101, 100, 70, 111, 114, 86, 105, 100, 101, 111, 0, 128, 243, 119, 238, 124, 199, 255, 255, 8, 104, 97, 115, 83, 107, 105, 112, 112, 101, 100, 77, 105, 115, 115, 105, 111, 110, 70, 111, 114, 86, 105, 100, 101, 111, 84, 104, 105, 115, 83, 101, 116, 0, 0, 4, 97, 99, 104, 105, 101, 118, 101, 109, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 0, 5, 0, 0, 0, 0, 16, 117, 110, 114, 101, 112, 111, 114, 116, 101, 100, 71, 97, 109, 101, 115, 0, 0, 0, 0, 0, 9, 117, 110, 114, 101, 112, 111, 114, 116, 101, 100, 71, 97, 109, 101, 115, 84, 105, 109, 101, 83, 116, 97, 109, 112, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 104, 105, 103, 104, 83, 99, 111, 114, 101, 0, 193, 105, 130, 0, 4, 117, 110, 108, 111, 99, 107, 101, 100, 84, 114, 111, 112, 104, 105, 101, 115, 0, 37, 0, 0, 0, 8, 48, 0, 0, 8, 49, 0, 0, 8, 50, 0, 0, 8, 51, 0, 0, 8, 52, 0, 0, 8, 53, 0, 0, 8, 54, 0, 0, 8, 55, 0, 0, 0, 3, 97, 119, 97, 114, 100, 115, 80, 114, 111, 103, 114, 101, 115, 115, 0, 159, 15, 0, 0, 3, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 76, 65, 78, 69, 0, 238, 0, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 8, 0, 0, 0, 68, 105, 97, 109, 111, 110, 100, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 8, 0, 0, 0, 68, 105, 97, 109, 111, 110, 100, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70, 105, 110, 105, 115, 104, 101, 100, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70, 105, 110, 105, 115, 104, 101, 100, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 237, 186, 92, 53, 146, 1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 5, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 0, 0, 3, 79, 80, 69, 78, 95, 88, 95, 83, 85, 80, 69, 82, 95, 77, 89, 83, 84, 69, 82, 89, 95, 66, 79, 88, 69, 83, 0, 13, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 34, 0, 0, 0, 16, 83, 117, 112, 101, 114, 77, 121, 115, 116, 101, 114, 121, 66, 111, 120, 101, 115, 79, 112, 101, 110, 101, 100, 0, 0, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 87, 73, 78, 95, 88, 95, 74, 65, 67, 75, 80, 79, 84, 83, 0, 1, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 22, 0, 0, 0, 16, 74, 97, 99, 107, 112, 111, 116, 115, 87, 111, 110, 0, 0, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 95, 78, 79, 95, 74, 85, 77, 80, 95, 79, 82, 95, 82, 79, 76, 76, 0, 238, 0, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 8, 0, 0, 0, 68, 105, 97, 109, 111, 110, 100, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 8, 0, 0, 0, 68, 105, 97, 109, 111, 110, 100, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70, 105, 110, 105, 115, 104, 101, 100, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70, 105, 110, 105, 115, 104, 101, 100, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 22, 220, 92, 53, 146, 1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 5, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 0, 0, 3, 79, 80, 69, 78, 95, 88, 95, 77, 89, 83, 84, 69, 82, 89, 95, 66, 79, 88, 69, 83, 0, 9, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 83, 105, 108, 118, 101, 114, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 12, 0, 0, 0, 67, 111, 108, 108, 101, 99, 116, 105, 98, 108, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 218, 173, 20, 99, 146, 1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 29, 0, 0, 0, 16, 77, 121, 115, 116, 101, 114, 121, 66, 111, 120, 101, 115, 79, 112, 101, 110, 101, 100, 0, 20, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 80, 73, 67, 75, 95, 88, 95, 75, 69, 89, 83, 95, 73, 78, 71, 65, 77, 69, 0, 3, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 24, 0, 0, 0, 16, 75, 101, 121, 115, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 0, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 67, 79, 76, 76, 69, 67, 84, 95, 67, 79, 73, 78, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 0, 240, 0, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 5, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 0, 0, 3, 72, 65, 86, 69, 95, 83, 85, 80, 69, 82, 83, 78, 73, 67, 75, 69, 82, 83, 95, 65, 67, 84, 73, 86, 69, 95, 88, 95, 77, 73, 78, 95, 73, 78, 95, 65, 95, 82, 79, 87, 0, 240, 0, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 5, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 0, 0, 3, 67, 79, 77, 80, 76, 69, 84, 69, 95, 77, 73, 83, 83, 73, 79, 78, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 0, 240, 0, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 83, 105, 108, 118, 101, 114, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 83, 105, 108, 118, 101, 114, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 130, 36, 67, 48, 146, 1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 5, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 0, 0, 3, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 95, 78, 79, 95, 67, 79, 73, 78, 83, 0, 238, 0, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 8, 0, 0, 0, 68, 105, 97, 109, 111, 110, 100, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 8, 0, 0, 0, 68, 105, 97, 109, 111, 110, 100, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70, 105, 110, 105, 115, 104, 101, 100, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70, 105, 110, 105, 115, 104, 101, 100, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 251, 13, 93, 53, 146, 1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 5, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 0, 0, 3, 80, 73, 67, 75, 85, 80, 95, 80, 79, 87, 69, 82, 85, 80, 83, 0, 4, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 83, 105, 108, 118, 101, 114, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 12, 0, 0, 0, 67, 111, 108, 108, 101, 99, 116, 105, 98, 108, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 104, 170, 29, 99, 146, 1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 24, 0, 0, 0, 16, 80, 105, 99, 107, 117, 112, 80, 111, 119, 101, 114, 117, 112, 0, 100, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 67, 79, 77, 80, 76, 69, 84, 69, 95, 88, 95, 77, 73, 83, 83, 73, 79, 78, 83, 0, 6, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 27, 0, 0, 0, 16, 77, 105, 115, 115, 105, 111, 110, 67, 111, 109, 112, 108, 101, 116, 101, 100, 0, 0, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 67, 79, 76, 76, 69, 67, 84, 95, 79, 76, 68, 95, 84, 82, 79, 80, 72, 89, 95, 73, 84, 69, 77, 83, 95, 77, 66, 0, 48, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 69, 0, 0, 0, 16, 71, 111, 108, 100, 67, 104, 97, 105, 110, 67, 108, 111, 99, 107, 0, 0, 0, 0, 0, 16, 72, 101, 97, 100, 112, 104, 111, 110, 101, 115, 0, 0, 0, 0, 0, 16, 84, 97, 112, 101, 66, 108, 97, 99, 107, 0, 0, 0, 0, 0, 16, 76, 112, 66, 108, 97, 99, 107, 0, 0, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 67, 79, 76, 76, 69, 67, 84, 95, 79, 76, 68, 95, 84, 82, 79, 80, 72, 89, 95, 73, 84, 69, 77, 83, 95, 83, 77, 66, 0, 46, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 67, 0, 0, 0, 16, 71, 111, 108, 100, 67, 104, 97, 105, 110, 68, 111, 108, 108, 97, 114, 0, 0, 0, 0, 0, 16, 71, 111, 108, 100, 83, 107, 117, 108, 108, 0, 0, 0, 0, 0, 16, 71, 111, 108, 100, 98, 97, 114, 0, 0, 0, 0, 0, 16, 68, 105, 97, 109, 111, 110, 100, 0, 0, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 0, 9, 119, 101, 101, 107, 108, 121, 71, 105, 102, 116, 85, 110, 108, 111, 99, 107, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 4, 115, 116, 97, 116, 86, 97, 108, 117, 101, 115, 0, 35, 1, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 0, 0, 0, 0, 16, 50, 0, 0, 0, 0, 0, 16, 51, 0, 0, 0, 0, 0, 16, 52, 0, 0, 0, 0, 0, 16, 53, 0, 0, 0, 0, 0, 16, 54, 0, 0, 0, 0, 0, 16, 55, 0, 0, 0, 0, 0, 16, 56, 0, 1, 0, 0, 0, 16, 57, 0, 0, 0, 0, 0, 16, 49, 48, 0, 0, 0, 0, 0, 16, 49, 49, 0, 0, 0, 0, 0, 16, 49, 50, 0, 0, 0, 0, 0, 16, 49, 51, 0, 5, 0, 0, 0, 16, 49, 52, 0, 0, 0, 0, 0, 16, 49, 53, 0, 0, 0, 0, 0, 16, 49, 54, 0, 0, 0, 0, 0, 16, 49, 55, 0, 0, 0, 0, 0, 16, 49, 56, 0, 0, 0, 0, 0, 16, 49, 57, 0, 0, 0, 0, 0, 16, 50, 48, 0, 0, 0, 0, 0, 16, 50, 49, 0, 0, 0, 0, 0, 16, 50, 50, 0, 0, 0, 0, 0, 16, 50, 51, 0, 0, 0, 0, 0, 16, 50, 52, 0, 0, 0, 0, 0, 16, 50, 53, 0, 192, 1, 0, 0, 16, 50, 54, 0, 0, 0, 0, 0, 16, 50, 55, 0, 0, 0, 0, 0, 16, 50, 56, 0, 0, 0, 0, 0, 16, 50, 57, 0, 58, 0, 0, 0, 16, 51, 48, 0, 0, 0, 0, 0, 16, 51, 49, 0, 0, 0, 0, 0, 16, 51, 50, 0, 0, 0, 0, 0, 16, 51, 51, 0, 0, 0, 0, 0, 16, 51, 52, 0, 0, 0, 0, 0, 16, 51, 53, 0, 0, 0, 0, 0, 16, 51, 54, 0, 0, 0, 0, 0, 0, 4, 109, 121, 115, 116, 101, 114, 121, 66, 111, 120, 101, 115, 79, 112, 101, 110, 101, 100, 0, 26, 0, 0, 0, 16, 48, 0, 57, 0, 0, 0, 16, 49, 0, 0, 0, 0, 0, 16, 50, 0, 0, 0, 0, 0, 0, 16, 99, 111, 109, 112, 108, 101, 116, 101, 100, 82, 117, 110, 67, 111, 117, 110, 116, 0, 199, 1, 0, 0, 2, 99, 117, 114, 114, 101, 110, 116, 67, 104, 97, 114, 97, 99, 116, 101, 114, 73, 100, 0, 8, 0, 0, 0, 112, 114, 105, 110, 99, 101, 107, 0, 2, 99, 117, 114, 114, 101, 110, 116, 66, 111, 97, 114, 100, 73, 100, 0, 7, 0, 0, 0, 110, 111, 114, 109, 97, 108, 0, 2, 112, 114, 101, 118, 105, 111, 117, 115, 66, 111, 97, 114, 100, 73, 100, 0, 7, 0, 0, 0, 110, 111, 114, 109, 97, 108, 0, 3, 97, 119, 97, 114, 100, 73, 115, 78, 101, 119, 0, 145, 1, 0, 0, 8, 67, 79, 76, 76, 69, 67, 84, 95, 79, 76, 68, 95, 84, 82, 79, 80, 72, 89, 95, 73, 84, 69, 77, 83, 95, 77, 66, 0, 0, 8, 67, 79, 76, 76, 69, 67, 84, 95, 79, 76, 68, 95, 84, 82, 79, 80, 72, 89, 95, 73, 84, 69, 77, 83, 95, 83, 77, 66, 0, 0, 8, 67, 79, 77, 80, 76, 69, 84, 69, 95, 88, 95, 77, 73, 83, 83, 73, 79, 78, 83, 0, 0, 8, 80, 73, 67, 75, 85, 80, 95, 80, 79, 87, 69, 82, 85, 80, 83, 0, 0, 8, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 95, 78, 79, 95, 67, 79, 73, 78, 83, 0, 0, 8, 67, 79, 77, 80, 76, 69, 84, 69, 95, 77, 73, 83, 83, 73, 79, 78, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 0, 0, 8, 72, 65, 86, 69, 95, 83, 85, 80, 69, 82, 83, 78, 73, 67, 75, 69, 82, 83, 95, 65, 67, 84, 73, 86, 69, 95, 88, 95, 77, 73, 78, 95, 73, 78, 95, 65, 95, 82, 79, 87, 0, 0, 8, 67, 79, 76, 76, 69, 67, 84, 95, 67, 79, 73, 78, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 0, 0, 8, 80, 73, 67, 75, 95, 88, 95, 75, 69, 89, 83, 95, 73, 78, 71, 65, 77, 69, 0, 0, 8, 79, 80, 69, 78, 95, 88, 95, 77, 89, 83, 84, 69, 82, 89, 95, 66, 79, 88, 69, 83, 0, 0, 8, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 95, 78, 79, 95, 74, 85, 77, 80, 95, 79, 82, 95, 82, 79, 76, 76, 0, 0, 8, 87, 73, 78, 95, 88, 95, 74, 65, 67, 75, 80, 79, 84, 83, 0, 0, 8, 79, 80, 69, 78, 95, 88, 95, 83, 85, 80, 69, 82, 95, 77, 89, 83, 84, 69, 82, 89, 95, 66, 79, 88, 69, 83, 0, 0, 8, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 76, 65, 78, 69, 0, 0, 0, 3, 97, 119, 97, 114, 100, 72, 97, 115, 80, 97, 121, 101, 100, 79, 117, 116, 0, 145, 1, 0, 0, 8, 67, 79, 76, 76, 69, 67, 84, 95, 79, 76, 68, 95, 84, 82, 79, 80, 72, 89, 95, 73, 84, 69, 77, 83, 95, 77, 66, 0, 0, 8, 67, 79, 76, 76, 69, 67, 84, 95, 79, 76, 68, 95, 84, 82, 79, 80, 72, 89, 95, 73, 84, 69, 77, 83, 95, 83, 77, 66, 0, 0, 8, 67, 79, 77, 80, 76, 69, 84, 69, 95, 88, 95, 77, 73, 83, 83, 73, 79, 78, 83, 0, 0, 8, 80, 73, 67, 75, 85, 80, 95, 80, 79, 87, 69, 82, 85, 80, 83, 0, 0, 8, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 95, 78, 79, 95, 67, 79, 73, 78, 83, 0, 1, 8, 67, 79, 77, 80, 76, 69, 84, 69, 95, 77, 73, 83, 83, 73, 79, 78, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 0, 1, 8, 72, 65, 86, 69, 95, 83, 85, 80, 69, 82, 83, 78, 73, 67, 75, 69, 82, 83, 95, 65, 67, 84, 73, 86, 69, 95, 88, 95, 77, 73, 78, 95, 73, 78, 95, 65, 95, 82, 79, 87, 0, 0, 8, 67, 79, 76, 76, 69, 67, 84, 95, 67, 79, 73, 78, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 0, 0, 8, 80, 73, 67, 75, 95, 88, 95, 75, 69, 89, 83, 95, 73, 78, 71, 65, 77, 69, 0, 0, 8, 79, 80, 69, 78, 95, 88, 95, 77, 89, 83, 84, 69, 82, 89, 95, 66, 79, 88, 69, 83, 0, 0, 8, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 95, 78, 79, 95, 74, 85, 77, 80, 95, 79, 82, 95, 82, 79, 76, 76, 0, 1, 8, 87, 73, 78, 95, 88, 95, 74, 65, 67, 75, 80, 79, 84, 83, 0, 0, 8, 79, 80, 69, 78, 95, 88, 95, 83, 85, 80, 69, 82, 95, 77, 89, 83, 84, 69, 82, 89, 95, 66, 79, 88, 69, 83, 0, 0, 8, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 76, 65, 78, 69, 0, 1, 0, 8, 97, 119, 97, 114, 100, 115, 70, 105, 114, 115, 116, 76, 111, 97, 100, 101, 100, 0, 1, 2, 119, 101, 101, 107, 108, 121, 72, 117, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 86, 101, 114, 115, 105, 111, 110, 0, 4, 0, 0, 0, 49, 46, 48, 0, 4, 104, 97, 115, 76, 111, 103, 103, 101, 100, 87, 101, 101, 107, 108, 121, 72, 117, 110, 116, 80, 101, 114, 105, 111, 100, 0, 21, 0, 0, 0, 8, 48, 0, 1, 8, 49, 0, 1, 8, 50, 0, 1, 8, 51, 0, 1, 0, 3, 119, 101, 101, 107, 108, 121, 72, 117, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 68, 97, 116, 97, 0, 95, 0, 0, 0, 2, 104, 117, 110, 116, 83, 116, 97, 114, 116, 86, 101, 114, 115, 105, 111, 110, 0, 20, 0, 0, 0, 48, 57, 47, 49, 51, 47, 50, 48, 49, 56, 32, 48, 48, 58, 48, 48, 58, 48, 48, 0, 4, 116, 111, 107, 101, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 33, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 0, 0, 0, 0, 16, 50, 0, 0, 0, 0, 0, 16, 51, 0, 0, 0, 0, 0, 0, 0, 16, 119, 111, 114, 100, 72, 117, 110, 116, 87, 111, 114, 100, 115, 73, 110, 82, 111, 119, 0, 1, 0, 0, 0, 8, 119, 111, 114, 100, 72, 117, 110, 116, 80, 97, 121, 101, 100, 79, 117, 116, 0, 0, 16, 119, 111, 114, 100, 72, 117, 110, 116, 85, 110, 108, 111, 99, 107, 101, 100, 77, 97, 115, 107, 0, 1, 0, 0, 0, 16, 119, 111, 114, 100, 72, 117, 110, 116, 76, 97, 115, 116, 80, 97, 121, 111, 117, 116, 68, 97, 121, 79, 102, 89, 101, 97, 114, 0, 27, 1, 0, 0, 3, 99, 104, 97, 114, 97, 99, 116, 101, 114, 78, 97, 109, 101, 69, 118, 101, 110, 116, 68, 97, 116, 97, 0, 221, 0, 0, 0, 2, 99, 117, 114, 114, 101, 110, 116, 67, 104, 97, 114, 97, 99, 116, 101, 114, 0, 6, 0, 0, 0, 115, 108, 105, 99, 107, 0, 16, 99, 111, 108, 108, 101, 99, 116, 101, 100, 76, 101, 116, 116, 101, 114, 73, 110, 100, 101, 120, 0, 255, 255, 255, 255, 16, 115, 107, 105, 112, 112, 101, 100, 67, 104, 97, 114, 97, 99, 116, 101, 114, 115, 0, 0, 0, 0, 0, 8, 119, 97, 115, 76, 97, 115, 116, 67, 104, 97, 114, 97, 99, 116, 101, 114, 67, 111, 109, 112, 108, 101, 116, 101, 100, 0, 0, 16, 99, 111, 109, 112, 108, 101, 116, 101, 100, 67, 104, 97, 114, 97, 99, 116, 101, 114, 115, 0, 0, 0, 0, 0, 4, 99, 104, 97, 114, 97, 99, 116, 101, 114, 115, 76, 105, 115, 116, 0, 5, 0, 0, 0, 0, 4, 99, 97, 116, 101, 103, 111, 114, 121, 87, 111, 114, 100, 115, 76, 105, 115, 116, 0, 5, 0, 0, 0, 0, 18, 101, 118, 101, 110, 116, 73, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 101, 118, 101, 110, 116, 67, 97, 116, 101, 103, 111, 114, 121, 0, 5, 0, 0, 0, 67, 97, 116, 49, 0, 0, 18, 108, 97, 115, 116, 69, 118, 101, 110, 116, 73, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 108, 97, 115, 116, 84, 105, 109, 101, 65, 110, 69, 118, 101, 110, 116, 72, 97, 115, 66, 101, 101, 110, 84, 114, 105, 101, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 108, 97, 115, 116, 84, 105, 109, 101, 65, 110, 69, 118, 101, 110, 116, 87, 97, 115, 83, 116, 97, 114, 116, 101, 100, 0, 213, 111, 239, 102, 0, 0, 0, 0, 18, 108, 97, 115, 116, 84, 105, 109, 101, 69, 118, 101, 110, 116, 80, 111, 112, 117, 112, 87, 97, 115, 70, 111, 114, 99, 101, 83, 104, 111, 119, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 108, 97, 115, 116, 69, 118, 101, 110, 116, 73, 116, 101, 109, 73, 68, 0, 1, 0, 0, 0, 0, 8, 115, 104, 111, 117, 108, 100, 82, 101, 115, 116, 111, 114, 101, 73, 116, 101, 109, 65, 102, 116, 101, 114, 69, 118, 101, 110, 116, 0, 0, 2, 119, 111, 114, 100, 72, 117, 110, 116, 68, 97, 105, 108, 121, 87, 111, 114, 100, 0, 5, 0, 0, 0, 68, 65, 83, 72, 0, 9, 119, 111, 114, 100, 72, 117, 110, 116, 69, 120, 112, 105, 114, 101, 84, 105, 109, 101, 0, 69, 44, 158, 96, 147, 1, 0, 0, 2, 115, 121, 98, 111, 65, 110, 97, 108, 121, 116, 105, 99, 115, 83, 97, 109, 112, 108, 101, 83, 116, 97, 116, 101, 0, 10, 0, 0, 0, 85, 110, 115, 97, 109, 112, 108, 101, 100, 0, 2, 115, 121, 98, 111, 65, 110, 97, 108, 121, 116, 105, 99, 115, 85, 115, 101, 114, 73, 100, 0, 1, 0, 0, 0, 0, 2, 115, 121, 98, 111, 65, 103, 103, 114, 101, 103, 97, 116, 101, 100, 68, 97, 116, 97, 83, 116, 114, 105, 110, 103, 0, 1, 0, 0, 0, 0, 3, 115, 121, 98, 111, 65, 110, 97, 108, 121, 116, 105, 99, 115, 85, 110, 104, 97, 110, 100, 108, 101, 100, 65, 98, 84, 101, 115, 116, 68, 97, 116, 97, 0, 5, 0, 0, 0, 0, 16, 115, 121, 98, 111, 65, 110, 97, 108, 121, 116, 105, 99, 115, 67, 117, 114, 114, 101, 110, 116, 83, 101, 115, 115, 105, 111, 110, 0, 255, 255, 255, 255, 8, 107, 105, 108, 111, 111, 65, 110, 97, 108, 121, 116, 105, 99, 115, 72, 97, 115, 76, 111, 103, 103, 101, 100, 83, 121, 98, 111, 85, 115, 101, 114, 73, 100, 0, 0, 16, 112, 101, 114, 115, 105, 115, 116, 101, 100, 83, 101, 115, 115, 105, 111, 110, 69, 118, 101, 110, 116, 78, 117, 109, 98, 101, 114, 0, 255, 255, 255, 255, 3, 109, 97, 110, 97, 103, 101, 114, 68, 97, 116, 97, 0, 165, 0, 0, 0, 9, 108, 97, 115, 116, 83, 117, 98, 109, 105, 116, 116, 101, 100, 83, 99, 111, 114, 101, 83, 116, 97, 114, 116, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 9, 108, 97, 115, 116, 83, 117, 98, 109, 105, 116, 116, 101, 100, 83, 99, 111, 114, 101, 69, 110, 100, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 10, 110, 101, 120, 116, 84, 111, 117, 114, 110, 97, 109, 101, 110, 116, 84, 105, 109, 101, 0, 16, 117, 110, 115, 117, 98, 109, 105, 116, 116, 101, 100, 83, 99, 111, 114, 101, 78, 111, 84, 111, 117, 114, 110, 97, 109, 101, 110, 116, 0, 0, 0, 0, 0, 10, 117, 110, 115, 117, 98, 109, 105, 116, 116, 101, 100, 83, 99, 111, 114, 101, 78, 111, 84, 111, 117, 114, 110, 97, 109, 101, 110, 116, 84, 105, 109, 101, 0, 0, 2, 108, 97, 115, 116, 84, 111, 112, 82, 117, 110, 82, 101, 115, 117, 108, 116, 65, 119, 97, 114, 100, 101, 100, 73, 68, 0, 1, 0, 0, 0, 0, 2, 112, 101, 110, 100, 105, 110, 103, 84, 111, 112, 82, 117, 110, 82, 101, 115, 117, 108, 116, 73, 68, 0, 1, 0, 0, 0, 0, 16, 112, 101, 110, 100, 105, 110, 103, 84, 111, 112, 82, 117, 110, 82, 101, 115, 117, 108, 116, 115, 83, 99, 111, 114, 101, 0, 255, 255, 255, 255, 16, 112, 101, 110, 100, 105, 110, 103, 84, 111, 112, 82, 117, 110, 82, 101, 115, 117, 108, 116, 115, 82, 97, 110, 107, 0, 255, 255, 255, 255, 16, 112, 101, 110, 100, 105, 110, 103, 84, 111, 112, 82, 117, 110, 82, 101, 115, 117, 108, 116, 115, 87, 101, 101, 107, 0, 255, 255, 255, 255, 16, 112, 101, 110, 100, 105, 110, 103, 84, 111, 112, 82, 117, 110, 66, 101, 97, 116, 101, 110, 70, 114, 105, 101, 110, 100, 115, 65, 119, 97, 114, 100, 0, 0, 0, 0, 0, 8, 98, 101, 104, 97, 118, 105, 111, 114, 97, 108, 65, 100, 115, 65, 108, 108, 111, 119, 101, 100, 0, 1, 3, 105, 110, 116, 101, 114, 115, 116, 105, 116, 105, 97, 108, 83, 116, 97, 116, 115, 0, 159, 0, 0, 0, 3, 108, 105, 115, 116, 86, 101, 114, 115, 105, 111, 110, 70, 111, 114, 73, 68, 0, 41, 0, 0, 0, 2, 104, 111, 109, 101, 95, 105, 110, 116, 101, 114, 115, 116, 105, 116, 105, 97, 108, 115, 95, 108, 105, 115, 116, 0, 7, 0, 0, 0, 110, 111, 116, 115, 101, 116, 0, 0, 16, 115, 101, 101, 110, 84, 104, 105, 115, 72, 111, 117, 114, 0, 1, 0, 0, 0, 16, 99, 117, 114, 114, 101, 110, 116, 72, 111, 117, 114, 0, 59, 181, 14, 1, 16, 115, 101, 101, 110, 84, 104, 105, 115, 68, 97, 121, 0, 1, 0, 0, 0, 16, 99, 117, 114, 114, 101, 110, 116, 68, 97, 121, 0, 141, 71, 11, 0, 8, 104, 97, 115, 83, 101, 101, 110, 70, 105, 114, 115, 116, 73, 110, 116, 101, 114, 115, 116, 105, 116, 105, 97, 108, 0, 0, 0, 3, 99, 111, 110, 115, 117, 109, 97, 98, 108, 101, 83, 101, 101, 110, 86, 105, 100, 101, 111, 115, 67, 111, 117, 110, 116, 0, 5, 0, 0, 0, 0, 3, 99, 111, 110, 115, 117, 109, 97, 98, 108, 101, 86, 105, 100, 101, 111, 83, 101, 101, 110, 65, 116, 0, 5, 0, 0, 0, 0, 3, 99, 111, 111, 108, 100, 111, 119, 110, 115, 0, 27, 0, 0, 0, 3, 97, 99, 116, 105, 118, 101, 67, 111, 111, 108, 100, 111, 119, 110, 115, 0, 5, 0, 0, 0, 0, 0, 16, 105, 110, 65, 112, 112, 76, 101, 103, 97, 99, 121, 80, 117, 114, 99, 104, 97, 115, 101, 67, 111, 117, 110, 116, 0, 0, 0, 0, 0, 16, 105, 110, 65, 112, 112, 67, 111, 110, 115, 117, 109, 97, 98, 108, 101, 80, 117, 114, 99, 104, 97, 115, 101, 67, 111, 117, 110, 116, 0, 0, 0, 0, 0, 16, 105, 110, 65, 112, 112, 82, 101, 115, 116, 111, 114, 101, 100, 80, 117, 114, 99, 104, 97, 115, 101, 67, 111, 117, 110, 116, 0, 0, 0, 0, 0, 16, 105, 110, 65, 112, 112, 78, 111, 110, 67, 111, 110, 115, 117, 109, 97, 98, 108, 101, 80, 117, 114, 99, 104, 97, 115, 101, 67, 111, 117, 110, 116, 0, 0, 0, 0, 0, 8, 105, 115, 70, 114, 101, 115, 104, 73, 110, 115, 116, 97, 108, 108, 0, 1, 8, 104, 97, 115, 85, 115, 101, 114, 82, 117, 110, 65, 112, 112, 66, 101, 102, 111, 114, 101, 0, 1, 9, 108, 97, 115, 116, 68, 97, 105, 108, 121, 79, 110, 108, 105, 110, 101, 76, 111, 103, 0, 128, 243, 119, 238, 124, 199, 255, 255, 9, 108, 97, 115, 116, 80, 108, 97, 121, 68, 97, 116, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 9, 108, 97, 115, 116, 81, 117, 105, 116, 68, 97, 116, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 2, 108, 97, 115, 116, 80, 117, 114, 99, 104, 97, 115, 101, 100, 66, 117, 110, 100, 108, 101, 0, 5, 0, 0, 0, 78, 111, 110, 101, 0, 8, 104, 97, 115, 80, 97, 105, 100, 79, 117, 116, 70, 97, 99, 101, 98, 111, 111, 107, 82, 101, 119, 97, 114, 100, 0, 0, 8, 104, 97, 115, 83, 101, 101, 110, 70, 114, 111, 110, 116, 83, 99, 114, 101, 101, 110, 70, 105, 114, 115, 116, 84, 105, 109, 101, 0, 1, 8, 104, 97, 115, 77, 97, 100, 101, 79, 110, 101, 86, 97, 108, 105, 100, 80, 117, 114, 99, 104, 97, 115, 101, 0, 0, 2, 102, 105, 114, 115, 116, 73, 110, 115, 116, 97, 108, 108, 101, 100, 86, 101, 114, 115, 105, 111, 110, 0, 1, 0, 0, 0, 0, 9, 102, 105, 114, 115, 116, 73, 110, 115, 116, 97, 108, 108, 68, 97, 116, 101, 0, 54, 218, 76, 23, 146, 1, 0, 0, 8, 104, 97, 115, 68, 111, 117, 98, 108, 101, 67, 111, 105, 110, 115, 85, 112, 103, 114, 97, 100, 101, 0, 0, 8, 104, 97, 115, 65, 100, 82, 101, 109, 111, 118, 97, 108, 85, 112, 103, 114, 97, 100, 101, 0, 0, 3, 104, 97, 115, 67, 104, 97, 114, 97, 99, 116, 101, 114, 66, 101, 101, 110, 83, 101, 101, 110, 0, 5, 0, 0, 0, 0, 3, 104, 97, 115, 66, 111, 97, 114, 100, 66, 101, 101, 110, 83, 101, 101, 110, 0, 5, 0, 0, 0, 0, 3, 99, 104, 97, 114, 97, 99, 116, 101, 114, 79, 117, 116, 102, 105, 116, 115, 83, 101, 101, 110, 0, 83, 1, 0, 0, 4, 110, 105, 110, 106, 97, 0, 12, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 0, 4, 112, 114, 105, 110, 99, 101, 107, 0, 19, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 0, 4, 102, 114, 97, 110, 107, 0, 12, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 0, 4, 107, 105, 110, 103, 0, 12, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 0, 4, 102, 114, 105, 122, 122, 121, 0, 12, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 0, 4, 115, 108, 105, 99, 107, 0, 19, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 16, 49, 0, 0, 0, 0, 0, 0, 4, 122, 111, 101, 0, 19, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 0, 4, 98, 114, 111, 100, 121, 0, 19, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 0, 4, 116, 97, 103, 0, 19, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 0, 4, 116, 97, 115, 104, 97, 0, 12, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 0, 4, 108, 117, 99, 121, 0, 19, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 0, 4, 116, 114, 105, 99, 107, 121, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 16, 50, 0, 1, 0, 0, 0, 0, 4, 102, 114, 101, 115, 104, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 16, 50, 0, 1, 0, 0, 0, 0, 4, 115, 112, 105, 107, 101, 0, 12, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 0, 0, 4, 99, 111, 108, 108, 101, 99, 116, 67, 111, 105, 110, 115, 68, 117, 109, 109, 121, 68, 97, 116, 97, 0, 35, 4, 0, 0, 3, 48, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 49, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 0, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 0, 0, 0, 0, 0, 3, 49, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 50, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 0, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 0, 0, 0, 0, 0, 3, 50, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 51, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 0, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 0, 0, 0, 0, 0, 3, 51, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 49, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 24, 0, 0, 0, 0, 3, 52, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 53, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 22, 0, 0, 0, 0, 3, 53, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 54, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 19, 0, 0, 0, 0, 3, 54, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 55, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 15, 0, 0, 0, 0, 3, 55, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 51, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 14, 0, 0, 0, 0, 3, 56, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 56, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 10, 0, 0, 0, 0, 3, 57, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 49, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 7, 0, 0, 0, 0, 3, 49, 48, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 57, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 0, 0, 0, 0, 3, 49, 49, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 52, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 0, 0, 0, 0, 3, 49, 50, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 50, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 1, 0, 0, 0, 0, 3, 49, 51, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 51, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 0, 0, 0, 0, 0, 0, 3, 101, 97, 114, 110, 67, 117, 114, 114, 101, 110, 99, 121, 68, 97, 116, 97, 0, 5, 0, 0, 0, 0, 3, 105, 110, 65, 112, 112, 80, 117, 114, 99, 104, 97, 115, 101, 72, 105, 115, 116, 111, 114, 121, 0, 5, 0, 0, 0, 0, 16, 110, 117, 109, 98, 101, 114, 79, 102, 66, 114, 101, 97, 100, 67, 114, 117, 109, 98, 115, 83, 104, 111, 119, 110, 79, 110, 70, 114, 111, 110, 116, 80, 97, 103, 101, 0, 195, 5, 0, 0, 16, 97, 103, 101, 82, 101, 115, 116, 114, 105, 99, 116, 105, 111, 110, 73, 110, 112, 117, 116, 86, 101, 114, 115, 105, 111, 110, 0, 0, 0, 0, 0, 16, 97, 103, 101, 82, 101, 115, 116, 114, 105, 99, 116, 105, 111, 110, 73, 110, 112, 117, 116, 77, 111, 110, 116, 104, 0, 12, 0, 0, 0, 16, 97, 103, 101, 82, 101, 115, 116, 114, 105, 99, 116, 105, 111, 110, 73, 110, 112, 117, 116, 89, 101, 97, 114, 0, 207, 7, 0, 0, 3, 98, 114, 101, 97, 100, 99, 114, 117, 109, 98, 115, 0, 90, 0, 0, 0, 2, 108, 97, 115, 116, 68, 97, 105, 108, 121, 87, 111, 114, 100, 0, 5, 0, 0, 0, 68, 65, 83, 72, 0, 18, 119, 101, 101, 107, 108, 121, 72, 117, 110, 116, 80, 101, 114, 105, 111, 100, 69, 120, 112, 105, 114, 101, 68, 97, 116, 101, 84, 105, 99, 107, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 108, 97, 115, 116, 77, 105, 115, 115, 105, 111, 110, 83, 101, 116, 0, 2, 0, 0, 0, 0, 2, 108, 97, 115, 116, 69, 118, 101, 110, 116, 84, 121, 112, 101, 83, 104, 111, 119, 110, 0, 5, 0, 0, 0, 78, 111, 110, 101, 0, 9, 108, 97, 115, 116, 69, 118, 101, 110, 116, 83, 104, 111, 119, 110, 84, 105, 109, 101, 115, 116, 97, 109, 112, 0, 128, 243, 119, 238, 124, 199, 255, 255, 2, 108, 97, 115, 116, 83, 101, 101, 110, 66, 117, 110, 100, 108, 101, 86, 101, 114, 115, 105, 111, 110, 0, 4, 0, 0, 0, 49, 46, 48, 0, 9, 108, 97, 115, 116, 84, 105, 109, 101, 65, 86, 105, 100, 101, 111, 70, 111, 114, 75, 101, 121, 115, 87, 97, 115, 83, 101, 101, 110, 0, 128, 243, 119, 238, 124, 199, 255, 255, 9, 119, 101, 108, 99, 111, 109, 101, 80, 97, 99, 107, 83, 116, 97, 114, 116, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 99, 117, 114, 114, 101, 110, 116, 73, 110, 116, 114, 111, 86, 105, 100, 101, 111, 65, 100, 80, 114, 105, 122, 101, 73, 110, 100, 101, 120, 0, 0, 0, 0, 0, 16, 99, 117, 114, 114, 101, 110, 116, 82, 97, 110, 100, 111, 109, 86, 105, 100, 101, 111, 65, 100, 80, 114, 105, 122, 101, 73, 110, 100, 101, 120, 0, 0, 0, 0, 0, 16, 99, 117, 114, 114, 101, 110, 116, 86, 105, 100, 101, 111, 65, 100, 80, 114, 105, 122, 101, 83, 101, 101, 100, 0, 112, 171, 154, 71, 16, 118, 105, 100, 101, 111, 115, 87, 97, 116, 99, 104, 101, 100, 83, 105, 110, 99, 101, 68, 97, 105, 108, 121, 75, 101, 121, 115, 0, 0, 0, 0, 0, 3, 102, 114, 105, 101, 110, 100, 83, 116, 97, 116, 117, 115, 0, 5, 0, 0, 0, 0, 8, 97, 108, 108, 111, 119, 83, 101, 108, 108, 72, 101, 97, 100, 115, 116, 97, 114, 116, 68, 117, 114, 105, 110, 103, 82, 117, 110, 0, 1, 8, 97, 108, 108, 111, 119, 83, 101, 108, 108, 83, 99, 111, 114, 101, 98, 111, 111, 115, 116, 101, 114, 68, 117, 114, 105, 110, 103, 82, 117, 110, 0, 1, 8, 104, 97, 115, 67, 111, 108, 108, 101, 99, 116, 101, 100, 70, 114, 111, 109, 70, 114, 105, 101, 110, 100, 115, 0, 0, 8, 104, 97, 115, 83, 104, 111, 119, 110, 67, 111, 108, 108, 101, 99, 116, 80, 111, 112, 117, 112, 0, 0, 8, 104, 97, 115, 83, 104, 111, 119, 110, 70, 97, 99, 101, 98, 111, 111, 107, 80, 111, 112, 117, 112, 0, 0, 8, 104, 97, 115, 83, 104, 111, 119, 110, 72, 111, 118, 101, 114, 98, 111, 97, 114, 100, 80, 111, 112, 117, 112, 0, 0, 8, 104, 97, 115, 83, 104, 111, 119, 110, 77, 105, 115, 115, 105, 111, 110, 73, 110, 116, 114, 111, 80, 111, 112, 117, 112, 0, 0, 8, 104, 97, 115, 83, 104, 111, 119, 110, 69, 110, 100, 71, 97, 109, 101, 77, 105, 115, 115, 105, 111, 110, 80, 111, 112, 117, 112, 0, 0, 8, 105, 115, 84, 117, 116, 111, 114, 105, 97, 108, 67, 111, 109, 112, 108, 101, 116, 101, 100, 0, 1, 8, 115, 104, 111, 117, 108, 100, 83, 104, 111, 119, 67, 111, 108, 108, 101, 99, 116, 80, 111, 112, 117, 112, 0, 0, 8, 115, 104, 111, 117, 108, 100, 83, 104, 111, 119, 70, 97, 99, 101, 98, 111, 111, 107, 80, 111, 112, 117, 112, 0, 0, 8, 115, 104, 111, 117, 108, 100, 83, 104, 111, 119, 72, 111, 118, 101, 114, 98, 111, 97, 114, 100, 80, 111, 112, 117, 112, 0, 1, 8, 115, 104, 111, 117, 108, 100, 83, 104, 111, 119, 77, 105, 115, 115, 105, 111, 110, 73, 110, 116, 114, 111, 100, 117, 99, 116, 105, 111, 110, 80, 111, 112, 117, 112, 0, 0, 8, 115, 104, 111, 117, 108, 100, 83, 104, 111, 119, 69, 110, 100, 71, 97, 109, 101, 77, 105, 115, 115, 105, 111, 110, 80, 111, 112, 117, 112, 0, 0, 16, 108, 97, 115, 116, 83, 104, 111, 119, 110, 84, 111, 112, 82, 117, 110, 73, 110, 116, 114, 111, 80, 111, 112, 117, 112, 86, 101, 114, 115, 105, 111, 110, 78, 117, 109, 98, 101, 114, 0, 0, 0, 0, 0, 8, 110, 101, 118, 101, 114, 65, 115, 107, 70, 111, 114, 82, 97, 116, 105, 110, 103, 0, 0, 2, 108, 97, 110, 103, 117, 97, 103, 101, 0, 1, 0, 0, 0, 0, 8, 115, 111, 117, 110, 100, 69, 102, 102, 101, 99, 116, 115, 69, 110, 97, 98, 108, 101, 100, 0, 1, 8, 109, 117, 115, 105, 99, 69, 110, 97, 98, 108, 101, 100, 0, 0, 8, 116, 111, 112, 82, 117, 110, 67, 104, 97, 108, 108, 101, 110, 103, 101, 114, 115, 69, 110, 97, 98, 108, 101, 100, 0, 1, 8, 114, 101, 109, 111, 116, 101, 78, 111, 116, 105, 102, 105, 99, 97, 116, 105, 111, 110, 115, 69, 110, 97, 98, 108, 101, 100, 0, 1, 16, 108, 111, 99, 97, 108, 78, 111, 116, 105, 102, 105, 99, 97, 116, 105, 111, 110, 115, 69, 110, 97, 98, 108, 101, 100, 0, 255, 255, 255, 255, 8, 104, 97, 115, 76, 111, 103, 103, 101, 100, 83, 116, 97, 116, 105, 99, 68, 97, 116, 97, 0, 0, 9, 108, 97, 115, 116, 76, 111, 103, 103, 101, 100, 68, 97, 105, 108, 121, 68, 97, 116, 97, 0, 128, 243, 119, 238, 124, 199, 255, 255, 1, 97, 110, 97, 108, 121, 116, 105, 99, 115, 83, 97, 109, 112, 108, 105, 110, 103, 75, 101, 121, 0, 0, 0, 0, 32, 175, 182, 224, 63, 9, 97, 98, 84, 101, 115, 116, 76, 97, 115, 116, 68, 97, 105, 108, 121, 69, 118, 101, 110, 116, 115, 82, 101, 112, 111, 114, 116, 68, 97, 116, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 2, 97, 98, 84, 101, 115, 116, 80, 108, 97, 121, 101, 114, 83, 101, 101, 100, 0, 11, 0, 0, 0, 50, 50, 51, 53, 54, 55, 53, 56, 57, 51, 0, 2, 97, 98, 84, 101, 115, 116, 84, 97, 103, 68, 97, 116, 97, 0, 1, 0, 0, 0, 0, 2, 102, 108, 117, 114, 114, 121, 85, 115, 101, 114, 73, 100, 0, 1, 0, 0, 0, 0, 8, 104, 97, 115, 76, 111, 103, 103, 101, 100, 71, 97, 109, 101, 67, 101, 110, 116, 101, 114, 76, 111, 103, 105, 110, 0, 0, 8, 104, 97, 115, 76, 111, 103, 103, 101, 100, 70, 97, 99, 101, 98, 111, 111, 107, 76, 111, 103, 105, 110, 0, 0, 3, 104, 97, 115, 76, 111, 103, 103, 101, 100, 70, 108, 117, 114, 114, 121, 68, 97, 105, 108, 121, 69, 118, 101, 110, 116, 83, 111, 99, 105, 97, 108, 0, 5, 0, 0, 0, 0, 0])
        };

        const putReq = store2.put(data, `/idbfs/${hash}/Save/cloud`);
        putReq.onsuccess = function() {
          done++;
          if (done === hashes.length) location.reload();
        };
        putReq.onerror = function() {
          console.error("Erreur unlock pour hash:", hash);
        };
      });
    };
  };

  request.onerror = function() {
    console.error("Erreur ouverture IndexedDB.");
  };
}

function doCleanData() {
  if (!confirm("Tout effacer ?")) return;
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, tabs => {
    if (tabs[0]) chrome.scripting.executeScript({
      target: {
        tabId: tabs[0].id
      },
      func: () => {
        indexedDB.deleteDatabase("/idbfs");
        localStorage.clear();
        location.reload();
      }
    }, () => showStatus("Données effacées", true));
  });

}

function setupSubwayCityEventListeners() {
  document.querySelectorAll('.city-link').forEach(link => {
    link.addEventListener("click", () => {
      const url = link.dataset.url;
      if (url.includes("speedrun")) chrome.tabs.create({
        url
      });
      else if (url.includes("image")) chrome.tabs.create({
        url
      });
      else chrome.tabs.create({
        url
      });
    });
  });
}

function setupColorEventListeners() {
  document.querySelectorAll(".color-picker").forEach(p => {
    p.addEventListener('input', () => {
      const colors = {
        stopped: document.getElementById('color-stopped').value,
        running: document.getElementById('color-running').value,
        paused: document.getElementById('color-paused').value
      };
      chrome.runtime.sendMessage({
        action: "saveTimerColors",
        colors
      });
      sendToContentScript({
        action: "updateTimerColors",
        colors
      });
    });
  });

  chrome.runtime.sendMessage({
    action: "getTimerColors"
  }, r => {
    if (r?.colors) {
      document.getElementById('color-stopped').value = r.colors.stopped;
      document.getElementById('color-running').value = r.colors.running;
      document.getElementById('color-paused').value = r.colors.paused;
    }
  });

}

function setupMusicEventListeners() {
  const input = document.getElementById("soundcloudUrl");

  document.getElementById("loadSoundcloudPlaylist").addEventListener("click", () => {
    const raw = (input.value || "").trim();
    const url = raw || DEFAULT_PLAYLIST_URL;

    if (url && url.includes("soundcloud")) {
      chrome.storage.local.set({
        musicPlaylistUrl: url
      });
      chrome.windows.create({
        url: chrome.runtime.getURL("player.html?url=" + encodeURIComponent(url)),
        type: "popup",
        width: 500,
        height: 300
      });
    } else showStatus("URL Invalide", false);
  });

  chrome.storage.local.get("musicPlaylistUrl", r => {
    const saved = typeof r?.musicPlaylistUrl === "string" ? r.musicPlaylistUrl.trim() : "";
    const initialUrl = saved || DEFAULT_PLAYLIST_URL;

    input.value = initialUrl;
    if (!saved) chrome.storage.local.set({
      musicPlaylistUrl: initialUrl
    });
  });
}

function setupIndividualBackgrounds() {
  const previewIds = {
    timer: 'preview-timer',
    fps: 'preview-fps',
    keys: 'preview-keys',
    keysActive: 'preview-keys'
  };

  const setPreview = (type, data) => {
    const previewId = previewIds[type];
    if (!previewId) return;
    const el = document.getElementById(previewId);
    if (!el) return;
    if (data) {
      el.style.backgroundImage = `url(${data})`;
      el.style.backgroundSize = 'cover';
    } else {
      el.style.backgroundImage = 'none';
      el.style.backgroundColor = 'transparent';
    }
  };

  const bindUpload = (btnId, inputId, storageKey, msgAction, targetType) => {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    btn.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = ev.target?.result;
        if (!data) return;
        chrome.storage.local.set({
          [storageKey]: data
        });
        sendToContentScript({
          action: msgAction,
          background: data,
          targetType
        });
        setPreview(targetType, data);
        showStatus("Image appliquée !", true);
      };
      reader.readAsDataURL(f);
    });
  };

  bindUpload('btn-upload-timer', 'file-timer', 'bgTimer', 'updateSpecificBackground', 'timer');

  bindUpload('btn-upload-fps', 'file-fps', 'bgFps', 'updateSpecificBackground', 'fps');
  bindUpload('btn-upload-keys', 'file-keys', 'bgKeys', 'updateSpecificBackground', 'keys');
  bindUpload('btn-upload-keys-active', 'file-keys-active', 'bgKeysActive', 'updateSpecificBackground', 'keysActive');

  ['timer', 'fps', 'keys'].forEach((type) => {
    const resetBtn = document.getElementById(`btn-reset-${type}`);
    if (!resetBtn) return;

    resetBtn.addEventListener('click', () => {
      const keys = type === 'keys' ? ['bgKeys', 'bgKeysActive'] : [`bg${type.charAt(0).toUpperCase()}${type.slice(1)}`];
      chrome.storage.local.remove(keys);
      sendToContentScript({
        action: 'resetSpecificBackground',
        targetType: type
      });
      setPreview(type, null);
      showStatus("Fond réinitialisé", true);
    });
  });

  chrome.storage.local.get(['bgTimer', 'bgFps', 'bgKeys', 'bgKeysActive'], (data) => {
    setPreview('timer', data.bgTimer);

    setPreview('fps', data.bgFps);

    setPreview('keys', data.bgKeys || data.bgKeysActive);
  });
}

function setupAdvancedCustomization() {
  const setLabel = (id, value, suffix = '') => {
    const el = document.getElementById(id);
    if (el) el.textContent = value + suffix;
  };

  const timerInputs = {
    bgColor: document.getElementById('timer-bg-color'),
    textColor: document.getElementById('timer-text-color'),
    radius: document.getElementById('timer-radius'),
    opacity: document.getElementById('timer-opacity'),
    fontScale: document.getElementById('timer-font-scale'),
    borderWidth: document.getElementById('timer-border-width'),
    borderColor: document.getElementById('timer-border-color'),
    fontFamily: document.getElementById('timer-font-family'),
    shadow: document.getElementById('timer-shadow')
  };


  const fpsInputs = {
    bgColor: document.getElementById('fps-bg-color'),
    textColor: document.getElementById('fps-text-color'),
    radius: document.getElementById('fps-radius'),
    opacity: document.getElementById('fps-opacity'),
    fontScale: document.getElementById('fps-font-scale'),
    borderWidth: document.getElementById('fps-border-width'),
    borderColor: document.getElementById('fps-border-color'),
    fontFamily: document.getElementById('fps-font-family'),
    shadow: document.getElementById('fps-shadow')
  };

  const keysInputs = {
    bgColor: document.getElementById('keys-bg-color'),
    textColor: document.getElementById('keys-text-color'),
    activeBgColor: document.getElementById('keys-active-bg-color'),
    activeTextColor: document.getElementById('keys-active-text-color'),
    activeColor: document.getElementById('keys-active-color'),
    borderColor: document.getElementById('keys-border-color'),
    radius: document.getElementById('keys-radius'),
    opacity: document.getElementById('keys-opacity'),
    sizeScale: document.getElementById('keys-size-scale'),
    borderWidth: document.getElementById('keys-border-width'),
    shadow: document.getElementById('keys-shadow'),
    gap: document.getElementById('keys-gap')
  };


  const updateLabels = () => {
    if (timerInputs.radius) setLabel('val-timer-radius', timerInputs.radius.value, 'px');
    if (timerInputs.opacity) setLabel('val-timer-opacity', timerInputs.opacity.value, '%');

    if (timerInputs.fontScale) setLabel('val-timer-font', timerInputs.fontScale.value, '%');
    if (timerInputs.borderWidth) setLabel('val-timer-border', timerInputs.borderWidth.value, 'px');
    if (timerInputs.shadow) setLabel('val-timer-shadow', timerInputs.shadow.value, 'px');
    if (fpsInputs.radius) setLabel('val-fps-radius', fpsInputs.radius.value, 'px');

    if (fpsInputs.opacity) setLabel('val-fps-opacity', fpsInputs.opacity.value, '%');
    if (fpsInputs.fontScale) setLabel('val-fps-font', fpsInputs.fontScale.value, '%');
    if (fpsInputs.borderWidth) setLabel('val-fps-border', fpsInputs.borderWidth.value, 'px');
    if (fpsInputs.shadow) setLabel('val-fps-shadow', fpsInputs.shadow.value, 'px');
    if (keysInputs.radius) setLabel('val-keys-radius', keysInputs.radius.value, 'px');
    if (keysInputs.opacity) setLabel('val-keys-opacity', keysInputs.opacity.value, '%');

    if (keysInputs.sizeScale) setLabel('val-keys-size', keysInputs.sizeScale.value, '%');
    if (keysInputs.borderWidth) setLabel('val-keys-border', keysInputs.borderWidth.value, 'px');
    if (keysInputs.shadow) setLabel('val-keys-shadow', keysInputs.shadow.value, 'px');
    if (keysInputs.gap) setLabel('val-keys-gap', keysInputs.gap.value, 'px');
  };

  const getSettings = () => ({
    timer: {
      bgColor: timerInputs.bgColor?.value || '#000000',
      textColor: timerInputs.textColor?.value || '#ffffff',
      borderRadius: (timerInputs.radius?.value || 0) + 'px',
      opacity: (timerInputs.opacity?.value || 100) / 100,
      fontScale: (timerInputs.fontScale?.value || 100) / 100,
      borderWidth: (timerInputs.borderWidth?.value || 0) + 'px',
      borderColor: timerInputs.borderColor?.value || '#6366f1',
      fontFamily: timerInputs.fontFamily?.value || "'Calibri', sans-serif",
      shadow: (timerInputs.shadow?.value || 0) + 'px'
    },
    fps: {
      bgColor: fpsInputs.bgColor?.value || '#000000',
      textColor: fpsInputs.textColor?.value || '#ffffff',
      borderRadius: (fpsInputs.radius?.value || 4) + 'px',
      opacity: (fpsInputs.opacity?.value || 100) / 100,
      fontScale: (fpsInputs.fontScale?.value || 100) / 100,
      borderWidth: (fpsInputs.borderWidth?.value || 0) + 'px',
      borderColor: fpsInputs.borderColor?.value || '#10b981',
      fontFamily: fpsInputs.fontFamily?.value || "'Segoe UI', sans-serif",
      shadow: (fpsInputs.shadow?.value || 0) + 'px'
    },
    keys: {
      bgColor: keysInputs.bgColor?.value || '#000000',
      textColor: keysInputs.textColor?.value || '#ffffff',
      activeBgColor: keysInputs.activeBgColor?.value || '#4bc277',
      activeTextColor: keysInputs.activeTextColor?.value || '#ffffff',
      activeColor: keysInputs.activeColor?.value || '#4bc277',
      borderColor: keysInputs.borderColor?.value || '#3d3d3d',
      borderRadius: (keysInputs.radius?.value || 12) + 'px',
      opacity: (keysInputs.opacity?.value || 100) / 100,
      sizeScale: (keysInputs.sizeScale?.value || 100) / 100,
      borderWidth: (keysInputs.borderWidth?.value || 2) + 'px',
      shadow: (keysInputs.shadow?.value || 6) + 'px',
      gap: (keysInputs.gap?.value || 10) + 'px'
    }
  });

  const saveAndApply = () => {
    updateLabels();
    const settings = getSettings();
    chrome.storage.local.set({
      advancedStyleV2: settings
    });

    sendToContentScript({
      action: 'applyAdvancedStyleV2',
      settings
    });
  };

  [...Object.values(timerInputs), ...Object.values(fpsInputs), ...Object.values(keysInputs)].forEach(input => {
    if (input) input.addEventListener('input', saveAndApply);

  });

  chrome.storage.local.get('advancedStyleV2', (data) => {
    if (data.advancedStyleV2) {
      const s = data.advancedStyleV2;

      if (s.timer) {
        if (timerInputs.bgColor) timerInputs.bgColor.value = s.timer.bgColor || '#000000';
        if (timerInputs.textColor) timerInputs.textColor.value = s.timer.textColor || '#ffffff';
        if (timerInputs.radius) timerInputs.radius.value = parseInt(s.timer.borderRadius) || 0;

        if (timerInputs.opacity) timerInputs.opacity.value = Math.round((s.timer.opacity || 1) * 100);
        if (timerInputs.fontScale) timerInputs.fontScale.value = Math.round((s.timer.fontScale || 1) * 100);
        if (timerInputs.borderWidth) timerInputs.borderWidth.value = parseInt(s.timer.borderWidth) || 0;
        if (timerInputs.borderColor) timerInputs.borderColor.value = s.timer.borderColor || '#6366f1';
        if (timerInputs.fontFamily) timerInputs.fontFamily.value = s.timer.fontFamily || "'Calibri', sans-serif";
        if (timerInputs.shadow) timerInputs.shadow.value = parseInt(s.timer.shadow) || 0;
      }
      if (s.fps) {
        if (fpsInputs.bgColor) fpsInputs.bgColor.value = s.fps.bgColor || '#000000';
        if (fpsInputs.textColor) fpsInputs.textColor.value = s.fps.textColor || '#ffffff';
        if (fpsInputs.radius) fpsInputs.radius.value = parseInt(s.fps.borderRadius) || 4;
        if (fpsInputs.opacity) fpsInputs.opacity.value = Math.round((s.fps.opacity || 1) * 100);
        if (fpsInputs.fontScale) fpsInputs.fontScale.value = Math.round((s.fps.fontScale || 1) * 100);
        if (fpsInputs.borderWidth) fpsInputs.borderWidth.value = parseInt(s.fps.borderWidth) || 0;
        if (fpsInputs.borderColor) fpsInputs.borderColor.value = s.fps.borderColor || '#10b981';
        if (fpsInputs.fontFamily) fpsInputs.fontFamily.value = s.fps.fontFamily || "'Segoe UI', sans-serif";
        if (fpsInputs.shadow) fpsInputs.shadow.value = parseInt(s.fps.shadow) || 0;

      }
      if (s.keys) {
        if (keysInputs.bgColor) keysInputs.bgColor.value = s.keys.bgColor || '#000000';
        if (keysInputs.textColor) keysInputs.textColor.value = s.keys.textColor || '#ffffff';
        if (keysInputs.activeColor) keysInputs.activeColor.value = s.keys.activeColor || '#4bc277';
        if (keysInputs.borderColor) keysInputs.borderColor.value = s.keys.borderColor || '#3d3d3d';
        if (keysInputs.radius) keysInputs.radius.value = parseInt(s.keys.borderRadius) || 12;
        if (keysInputs.opacity) keysInputs.opacity.value = Math.round((s.keys.opacity || 1) * 100);

        if (keysInputs.sizeScale) keysInputs.sizeScale.value = Math.round((s.keys.sizeScale || 1) * 100);
        if (keysInputs.borderWidth) keysInputs.borderWidth.value = parseInt(s.keys.borderWidth) || 2;
        if (keysInputs.shadow) keysInputs.shadow.value = parseInt(s.keys.shadow) || 6;
        if (keysInputs.gap) keysInputs.gap.value = parseInt(s.keys.gap) || 10;
      }
    }
    updateLabels();
  });


  updateLabels();
}

function setupRecordingButton() {
  const btn = document.getElementById('recordingActionBtn');
  if (!btn) return;

  const setBtnState = (isRecording) => {
    if (isRecording) {
      btn.innerHTML = '<i class="fa-solid fa-stop"></i> Arrêter l\'enregistrement';
      btn.classList.remove('btn-primary');

      btn.classList.add('btn-danger');
      btn.dataset.action = 'stop';
    } else {
      btn.innerHTML = '<i class="fa-solid fa-video"></i> Lancer l\'enregistrement';
      btn.classList.remove('btn-danger');
      btn.classList.add('btn-primary');
      btn.dataset.action = 'start';
    }
  };

  sendToContentScript({
    action: 'getRecordingState'
  }, (res) => {
    setBtnState(res && res.recording);
  });

  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (action === 'start') {
      sendToContentScript({
        action: 'startScreenRecording'
      }, (res, err) => {
        if (err) {
          showStatus(err, false);
        } else if (res && res.recording) {
          setBtnState(true);
        }
      });
    } else {
      sendToContentScript({
        action: 'stopScreenRecording'
      }, (res, err) => {
        setBtnState(false);
        showStatus(err ? err : 'Vidéo téléchargée !', !err);
      });
    }
  });
}

document.getElementById('resetAllCustom')?.addEventListener('click', () => {
  if (!confirm('Réinitialiser TOUTE la customisation ?')) return;
  chrome.storage.local.remove([
    'advancedStyle', 'bgTimer', 'bgFps', 'bgKeys', 'bgKeysActive', 'barsColor'
  ]);
  sendToContentScript({
    action: 'resetAllCustomization'
  });

  showStatus('Customisation réinitialisée', true);
  setTimeout(() => location.reload(), 500);
});