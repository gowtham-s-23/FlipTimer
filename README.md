# Flip Timer

Always-on-top flip-clock countdown timer for Windows. Set a task, start the timer, and keep focus while you work.

![Flip Timer](build/icon.png)

## Download (Windows)

**Easiest way:** install the ready-made app — no Node.js required.

1. Go to the latest release:  
   **[Download Flip Timer for Windows](https://github.com/gowtham-s-23/FlipTimer/releases/latest)**
2. Download **`Flip.Timer-Setup-1.0.1.exe`**
3. Run the installer
4. Launch **Flip Timer** from the Start menu

The installer adds a Start menu shortcut and a desktop shortcut.

> Direct installer download (v1.0.1):  
> [**Flip.Timer-Setup-1.0.1.exe**](https://github.com/gowtham-s-23/FlipTimer/releases/download/v1.0.1/Flip.Timer-Setup-1.0.1.exe)

## Features

- Always stays on top of other windows
- Flip-clock style countdown (hours : minutes : seconds)
- Set and display your current task
- Light / dark theme
- Transparent overlay mode (clock + Start / Reset / Solid)
- Quick presets: 5m, 15m, 25m, 45m, 1h
- Sound chime when the timer finishes
- Desktop notification when time is up (if allowed)
- Remembers your last task, duration, theme, and transparent preference

## How to use

1. Open **Flip Timer**
2. Click the gear icon
3. Enter your **task** and duration (or pick a preset)
4. Click **Apply**
5. Click **Start**
6. When time is up, you’ll hear a chime

Drag the window from the top bar to move it. Use the theme button to switch light/dark mode. Use the transparent button for a minimal overlay; click **Solid** to restore the full UI.

## Run from source (developers)

### Requirements

- [Node.js](https://nodejs.org/) 18+ (includes npm)
- Windows 10/11

### Setup

```bash
git clone https://github.com/gowtham-s-23/FlipTimer.git
cd FlipTimer
npm install
npm start
```

### Build the Windows installer yourself

```bash
npm run dist
```

The installer will be created at:

```text
dist/Flip Timer-Setup-1.0.1.exe
```

## Project structure

```text
FlipTimer/
├── main.js          # Electron main process (always-on-top window)
├── preload.js       # Secure bridge to the window controls
├── index.html       # UI layout
├── styles.css       # Flip-clock look (light + dark)
├── app.js           # Timer logic, task, sound, persistence
├── build/icon.png   # App icon
└── package.json     # Scripts and electron-builder config
```

## Uninstall

Use **Settings → Apps → Flip Timer → Uninstall**, or uninstall from the Start menu entry.

## License

MIT
