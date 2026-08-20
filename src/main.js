const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const DATA_FILE = "day-pocket.json";
const APP_NAME = "Day Pocket";

function getDataPath() {
  return path.join(app.getPath("userData"), DATA_FILE);
}

function normalizeState(parsed) {
  const defaultCategory = { id: "uncategorized", name: "미분류", locked: true };

  if (Array.isArray(parsed)) {
    return {
      items: parsed.map((item) => ({ ...item, categoryId: item.categoryId ?? defaultCategory.id })),
      categories: [defaultCategory]
    };
  }

  if (parsed && typeof parsed === "object") {
    const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
    const hasDefault = categories.some((category) => category.id === defaultCategory.id);

    return {
      items: Array.isArray(parsed.items)
        ? parsed.items.map((item) => ({ ...item, categoryId: item.categoryId ?? defaultCategory.id }))
        : [],
      categories: hasDefault ? categories : [defaultCategory, ...categories]
    };
  }

  return { items: [], categories: [defaultCategory] };
}

async function readState() {
  try {
    const file = await fs.readFile(getDataPath(), "utf8");
    const parsed = JSON.parse(file);
    return normalizeState(parsed);
  } catch (error) {
    if (error.code === "ENOENT") return normalizeState(null);
    throw error;
  }
}

async function writeState(state) {
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(getDataPath(), JSON.stringify(normalizeState(state), null, 2), "utf8");
  return state;
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
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

  ipcMain.handle("state:load", readState);
  ipcMain.handle("state:save", (_event, state) => writeState(state));

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
