const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dayPocketStore", {
  load: () => ipcRenderer.invoke("state:load"),
  save: (state) => ipcRenderer.invoke("state:save", state)
});
