document.addEventListener("DOMContentLoaded", () => {
  const playerContainer = document.getElementById("player-container");
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeText = document.getElementById("volumeText");
  const muteBtn = document.getElementById("muteBtn");
  const urlParams = new URLSearchParams(window.location.search);
  const defaultPlaylistUrl = "https://soundcloud.com/bdwx/sets/u7j3r9nbxpeu";
  const playlistUrl = urlParams.get('url') || defaultPlaylistUrl;
  if (!playlistUrl) {
    playerContainer.innerHTML = "<div style=\"color:#fff\">Aucune URL</div>";

    return
  }
  const iframe = document.createElement("iframe");
  iframe.id = "sc-widget";

  iframe.allow = 'autoplay';
  iframe.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(playlistUrl) + "&color=%23209cee&auto_play=true&visual=true&show_artwork=true&hide_related=true&show_comments=false&enable_api=true";
  playerContainer.appendChild(iframe);

  function sendSCCommand(method, value) {
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({
        'method': method,
        'value': value
      }), '*')
    }
  }
  volumeSlider.addEventListener('input', event => {
    const vol = parseInt(event.target.value);
    volumeText.textContent = vol + '%';

    sendSCCommand("setVolume", vol);
    muteBtn.textContent = vol === 0 ? '🔇' : '🔊'
  });
  let savedVolume = 100;

  muteBtn.addEventListener("click", () => {
    const currentVol = parseInt(volumeSlider.value);
    if (currentVol > 0) {
      savedVolume = currentVol;
      volumeSlider.value = 0;

      volumeText.textContent = '0%';
      sendSCCommand("setVolume", 0);
      muteBtn.textContent = '🔇'
    } else {
      volumeSlider.value = savedVolume;
      volumeText.textContent = savedVolume + '%';
      sendSCCommand("setVolume", savedVolume);
      muteBtn.textContent = '🔊'
    }
  });
  iframe.onload = () => {
    setTimeout(() => {
      sendSCCommand('setVolume', 100)
    }, 1000)
  }
})