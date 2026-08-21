const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const DATA_FILE = "day-pocket.json";
const APP_NAME = "Day Pocket";
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

function getDataPath() {
  return path.join(app.getPath("userData"), DATA_FILE);
}

function normalizeState(parsed) {
  const defaultCategory = { id: "uncategorized", name: "미분류", color: "#64748b", locked: true };
  const defaultStatus = { id: "unset", name: "미지정", color: "#94a3b8", locked: true };
  const normalizeLabel = (label, fallbackColor) => ({
    ...label,
    color: /^#[0-9a-f]{6}$/i.test(label.color ?? "") ? label.color : fallbackColor
  });

  if (Array.isArray(parsed)) {
    return {
      items: parsed.map((item) => ({
        ...item,
        categoryId: item.categoryId ?? defaultCategory.id,
        statusId: item.statusId ?? defaultStatus.id
      })),
      categories: [defaultCategory],
      statuses: [defaultStatus]
    };
  }

  if (parsed && typeof parsed === "object") {
    const categories = Array.isArray(parsed.categories)
      ? parsed.categories.map((category) => normalizeLabel(category, defaultCategory.color))
      : [];
    const statuses = Array.isArray(parsed.statuses)
      ? parsed.statuses.map((status) => normalizeLabel(status, defaultStatus.color))
      : [];
    const hasDefault = categories.some((category) => category.id === defaultCategory.id);
    const hasDefaultStatus = statuses.some((status) => status.id === defaultStatus.id);

    return {
      items: Array.isArray(parsed.items)
        ? parsed.items.map((item) => ({
            ...item,
            categoryId: item.categoryId ?? defaultCategory.id,
            statusId: item.statusId ?? defaultStatus.id
          }))
        : [],
      categories: hasDefault ? categories : [defaultCategory, ...categories],
      statuses: hasDefaultStatus ? statuses : [defaultStatus, ...statuses]
    };
  }

  return { items: [], categories: [defaultCategory], statuses: [defaultStatus] };
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

  if (DEV_SERVER_URL) {
    window.loadURL(DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
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
