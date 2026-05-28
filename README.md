# Sbs Extension (Modified by Astrxl)

Une extension puissante pour les navigateurs basés sur Chromium conçue pour optimiser, personnaliser et enrichir l'expérience des joueurs sur les plateformes de jeu Web supportées (notamment `ss.randomkzn.com` et `yell0wsuit.page`). Ce projet regroupe une suite complète d'outils de gaming (Gaming Tools Suite) combinant personnalisation d'interface, suivi de performances, contrôle audio global et protection avancée.

---

## 🚀 Fonctionnalités Principales

### 🎮 Outils de Jeu & Interface
* **Timer d'Entraînement / Run (Style LiveSplit) :** Un chronomètre hautement personnalisable avec un système de classement par paliers de temps (ex: *Interstellar*, *Suprême*, *Grand Champion*, *Champion*...).
* **Compteur de FPS & Keypress :** Affichage en temps réel du taux de rafraîchissement et des touches pressées à l'écran, avec configurations de disposition (layout flèches/ZQSD) et de thèmes visuels.
* **Remap Clavier (ZQSD Active) :** Permet d'ajuster ou de réassigner les touches pour un confort de jeu optimal.
* **Changement de Résolution Virtuelle :** Prise en charge de résolutions personnalisées (ex: `608x1080`) avec option d'activation de bandes noires (Black Bars) pour simuler des affichages spécifiques ou étirés (Stretched resolution).

### 🛑 Anti-Popup & Adblock Renforcé
* **Bloqueur de Publicités Intégré :** Mode agressif mais sécurisé ciblant les scripts, popups et régies publicitaires majeures (`doubleclick`, `googlesyndication`, `popads`, `propellerads`, etc.).
* **Statistiques en Temps Réel :** Suivi du nombre d'éléments bloqués durant la session, aujourd'hui et au total.

### 🎵 Expérience Audio & Multimédia
* **Lecteur SoundCloud Dédié :** Intégration d'un mini-player SoundCloud via une fenêtre pop-up dédiée pour écouter vos playlists de "tryhard" directement pendant vos sessions de jeu sans alourdir l'onglet principal.
* **Contrôle du Volume Global (Audio Hook) :** Injection d'un script de gestion du gain audio permettant de centraliser et d'ajuster finement le volume de tous les éléments `<audio>` et `<video>` de la page de jeu.

### 📹 Enregistreur d'Écran (Screen Recorder)
* **Capture de Run :** Enregistrez vos meilleures performances et téléchargez instantanément la vidéo au format `.webm` avec un nom de fichier horodaté (`Run_HhMm_Ss.webm`) à la fin de la capture.

---

## 📂 Structure du Projet

```text
├── manifest.json              # Configuration de l'extension (Permissions, scripts de fond et de contenu)
├── background.js              # Service Worker : Gestion de l'état local, des raccourcis et de l'Adblock
├── content.js                 # Script de contenu injecté au démarrage des sites cibles (Anti-popup, overlay)
├── popup.html / popup.js      # Interface utilisateur principale (Menu de configuration V10 Ultimate Custom)
├── player.html / player.js    # Interface et logique du lecteur de musique SoundCloud intégré
├── volumeInjected.js          # Script injecté dans la page web pour intercepter et modifier le gain audio
├── icon.png                   # Logo officiel de l'extension
└── LICENSE                    # Licence propriétaire exclusive (Astrxl)

```

---

## 🛠️ Installation en Mode Développeur

Puisque cette extension est distribuée de manière exclusive et personnalisée, vous devez l'installer manuellement sur votre navigateur basé sur Chromium (Google Chrome, Brave, Edge, Opera, etc.) :

1. **Téléchargez** ou extrayez l'archive du projet dans un dossier local.
2. Ouvrez votre navigateur et accédez à la page des extensions :
* Saisissez `chrome://extensions` dans la barre d'adresse.


3. Activez le **Mode Développeur** (généralement un interrupteur en haut à droite de la page).
4. Cliquez sur le bouton **Charger l'extension non empaquetée** (Load unpacked).
5. Sélectionnez à deux reprises sur le dossier `Sbs extension modified by Astrxl`.
6. L'extension *Sbs extension modified by Astrxl* est désormais active ! Épinglez-la à votre barre d'outils pour y accéder facilement.

---

## 🔒 Licence & Propriété Intellectuelle

Ce logiciel est protégé par une **Licence Propriétaire** (Copyright © 2026 Astrxl).

* **Canal Officiel :** Le seul canal de distribution autorisé est le serveur Discord officiel : `discord.gg/nocoin`.
* **Restrictions :** Il est strictement interdit de copier, modifier, redistribuer, vendre ou d'effectuer de l'ingénierie inverse sur tout ou partie du code source sans l'accord explicite de l'auteur.

---

## 💬 Support & Signalements

Pour signaler un bug, demander une fonctionnalité ou signaler une distribution non autorisée du code, rejoignez la communauté :

* **Discord :** [discord.gg/nocoin](https://discord.gg/nocoin)
