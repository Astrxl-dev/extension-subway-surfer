(() => {
  if (window.GAMING_TOOLS_VOLUME_CHANNEL) {
    window.postMessage({
      'source': "GAMING_TOOLS_VOLUME_CHANNEL",
      'type': "PAGE_READY"
    });
    return
  }
  window.GAMING_TOOLS_VOLUME_CHANNEL = !0;
  const sendMessage = (type, payload = {}) => {
    window.postMessage({
      'source': "GAMING_TOOLS_VOLUME_CHANNEL",
      'type': type,
      'payload': payload
    })
  };
  const trackedMediaElements = new Set();
  const audioContextMap = new WeakMap();
  const gainNodes = new Set();
  let currentVolume = 1;
  let initialized = !1;
  const clampVolume = rawValue => {
    const clamped = Number(rawValue);
    if (Number.isNaN(clamped)) {
      return currentVolume
    }
    return Math.min(1, Math.max(0, clamped))
  };

  const scheduleVolumeReport = () => {
    if (scheduleVolumeReport.timeout) {
      return
    }
    scheduleVolumeReport.timeout = setTimeout(() => {
      sendMessage("PAGE_VOLUME", {
        'volume': currentVolume
      });
      scheduleVolumeReport.timeout = null
    }, 200)
  };

  const applyVolumeToElement = el => {
    if (!initialized) {
      return
    }
    try {
      el.__volumeLock = !0;
      el.volume = currentVolume;
      el.muted = currentVolume === 0
    } catch (applyVolumeToAll) {} finally {
      el.__volumeLock = !1
    }
  };
  const getOrCreateGainForContext = () => {
    gainNodes.forEach(audioCtx => {
      try {
        audioCtx.gain.gain.value = currentVolume
      } catch (destination) {}
    });
    trackedMediaElements.forEach(extraArgs => applyVolumeToElement(extraArgs))
  };
  const entry = (gainNode, sig, changed = []) => {
    let connectThroughGain = audioContextMap.get(gainNode);
    if (!connectThroughGain) {
      const node = gainNode.createGain();

      node.gain.value = currentVolume;
      connectThroughGain = {
        'context': gainNode,
        'gain': node,
        'destinationConnected': !1,
        'lastDestination': null,
        'lastSignature': ''
      };
      audioContextMap.set(gainNode, connectThroughGain);
      gainNodes.add(connectThroughGain)
    }
    if (sig) {
      const dest = '' + changed.join(':');
      const args = connectThroughGain.lastDestination !== sig || connectThroughGain.lastSignature !== dest;

      if (!connectThroughGain.destinationConnected || args) {
        try {
          connectThroughGain.gain.disconnect()
        } catch (patchAudioNodeConnect) {}
        try {
          AudioNode.prototype.__originalConnect.call(connectThroughGain.gain, sig, ...changed);
          connectThroughGain.destinationConnected = !0;
          connectThroughGain.lastDestination = sig;

          connectThroughGain.lastSignature = dest
        } catch (trackMediaElement) {
          connectThroughGain.destinationConnected = !1
        }
      }
    }
    return connectThroughGain
  };

  const mediaEl = (onVolumeChange, observed, startMutationObserver = []) => {
    if (!onVolumeChange) {
      try {
        return entry(observed?.["context"], observed, startMutationObserver)
      } catch (debounceTimer) {
        return null
      }
    }
    return entry(onVolumeChange, observed, startMutationObserver)
  };
  const observer = () => {
    if (AudioNode.prototype.__originalConnect) {
      return
    }
    AudioNode.prototype.__originalConnect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function mutations(mutation, ...node2) {
      if (mutation instanceof AudioDestinationNode) {
        const patchAudioConstructor = mediaEl(mutation.context, mutation, node2);
        if (patchAudioConstructor) {
          return AudioNode.prototype.__originalConnect.call(this, patchAudioConstructor.gain, ...node2)
        }
      }
      return AudioNode.prototype.__originalConnect.call(this, mutation, ...node2)
    }
  };
  const OriginalAudio = PatchedAudio => {
    if (!PatchedAudio || trackedMediaElements.has(PatchedAudio)) {
      return
    }
    trackedMediaElements.add(PatchedAudio);
    applyVolumeToElement(PatchedAudio);
    const scanExistingMedia = () => {
      if (PatchedAudio.__volumeLock) {
        return
      }
      const setVolume = clampVolume(PatchedAudio.volume);
      if (setVolume !== currentVolume) {
        currentVolume = setVolume;
        getOrCreateGainForContext();
        scheduleVolumeReport()
      }
    };
    PatchedAudio.addEventListener("volumechange", scanExistingMedia);
    PatchedAudio.addEventListener("play", () => applyVolumeToElement(PatchedAudio))
  };
  const newVol = () => {
    let notify = null;
    const var46 = new MutationObserver(var47 => {
      if (notify) {
        return
      }
      notify = setTimeout(() => {
        for (const var48 of var47) {
          var48.addedNodes.forEach(var49 => {
            if (var49.nodeType !== Node.ELEMENT_NODE) {
              return
            }
            if (var49.tagName === "AUDIO" || var49.tagName === 'VIDEO') {
              OriginalAudio(var49)
            }
            if (typeof var49.querySelectorAll === "function") {
              var49.querySelectorAll("audio, video").forEach(var50 => {
                OriginalAudio(var50)
              })
            }
          })
        }
        notify = null
      }, 100)
    });
    var46.observe(document.documentElement || document, {
      'childList': !0,
      'subtree': !0,
      'attributes': !1,
      'characterData': !1
    })
  };
  const var51 = () => {
    const var52 = window.Audio;
    if (typeof var52 === "function" && !var52.__patched) {
      const var53 = function var54(...var55) {
        const var56 = Reflect.construct(var52, var55);
        OriginalAudio(var56);
        return var56
      };
      var53.prototype = var52.prototype;
      Object.defineProperty(var53, "name", {
        'value': var52.name
      });
      Object.setPrototypeOf(var53, var52);
      var53.__patched = !0;
      window.Audio = var53
    }
    const var57 = HTMLMediaElement.prototype.play;
    if (!HTMLMediaElement.prototype.__playPatched) {
      HTMLMediaElement.prototype.play = function var58(...var59) {
        OriginalAudio(this);
        return var57.apply(this, var59)
      };
      HTMLMediaElement.prototype.__playPatched = !0
    }
  };
  const var60 = () => {
    document.querySelectorAll("audio, video").forEach(var61 => {
      OriginalAudio(var61)
    })
  };
  const var62 = (var63, var64 = !0) => {
    const var65 = clampVolume(var63);
    if (var65 === currentVolume && initialized) {
      if (var64) {
        scheduleVolumeReport()
      }
      return currentVolume
    }
    currentVolume = var65;
    initialized = !0;
    getOrCreateGainForContext();
    if (var64) {
      scheduleVolumeReport()
    }
    return currentVolume
  };

  window.addEventListener("message", var66 => {
    if (var66.source !== window || !var66.data || var66.data.source !== "GAMING_TOOLS_VOLUME_CHANNEL") {
      return
    }
    const {
      type: var67,
      payload: var68
    } = var66.data;
    if (var67 === "EXT_SET_VOLUME") {
      var62(var68?.["volume"], !1)
    } else {
      if (var67 === "EXT_INIT_VOLUME") {
        var62(var68?.["volume"], !1)
      } else if (var67 === "EXT_REQUEST_VOLUME") {
        scheduleVolumeReport()
      }
    }
  });
  observer();

  var51();
  newVol();
  var60();
  sendMessage("PAGE_READY")
})()