const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dayPocketStore", {
  load: () => ipcRenderer.invoke("items:load"),
  save: (items) => ipcRenderer.invoke("items:save", items)
});
