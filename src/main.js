const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const DATA_FILE = "day-pocket.json";
const APP_NAME = "Day Pocket";

function getDataPath() {
  return path.join(app.getPath("userData"), DATA_FILE);
}

async function readItems() {
  try {
    const file = await fs.readFile(getDataPath(), "utf8");
    const parsed = JSON.parse(file);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeItems(items) {
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(getDataPath(), JSON.stringify(items, null, 2), "utf8");
  return items;
}

function createWindow() {
  const window = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 720,
    minHeight: 560,
    title: APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  app.setName(APP_NAME);

  ipcMain.handle("items:load", readItems);
  ipcMain.handle("items:save", (_event, items) => writeItems(items));

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
