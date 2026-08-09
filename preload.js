const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flipTimer', {
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  setAlwaysOnTop: (enabled) => ipcRenderer.send('set-always-on-top', enabled),
  resizeForSetup: (expanded) => ipcRenderer.send('resize-for-setup', expanded),
  resizeForTransparent: (enabled) => ipcRenderer.send('resize-for-transparent', enabled),
});
