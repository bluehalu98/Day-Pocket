const itemForm = document.querySelector("#item-form");
const itemTitleInput = document.querySelector("#item-title-input");
const itemSearchInput = document.querySelector("#item-search-input");
const itemList = document.querySelector("#item-list");
const counter = document.querySelector("#counter");
const itemCategorySelect = document.querySelector("#item-category-select");
const categoryFilter = document.querySelector("#category-filter");
const itemTemplate = document.querySelector("#item-template");
const subtaskTemplate = document.querySelector("#subtask-template");

const listView = document.querySelector("#list-view");
const detailView = document.querySelector("#detail-view");
const backButton = document.querySelector("#back-button");
const newItemButton = document.querySelector("#new-item-button");
const itemOverlay = document.querySelector("#item-overlay");
const itemOverlayClose = document.querySelector("#item-overlay-close");
const categoryManagerButton = document.querySelector("#category-manager-button");
const categoryOverlay = document.querySelector("#category-overlay");
const categoryOverlayClose = document.querySelector("#category-overlay-close");
const categoryForm = document.querySelector("#category-form");
const categoryNameInput = document.querySelector("#category-name-input");
const categoryList = document.querySelector("#category-list");
const emptyState = document.querySelector("#empty-state");
const detailCard = document.querySelector("#detail-card");
const detailTitle = document.querySelector("#detail-title");
const detailCategorySelect = document.querySelector("#detail-category-select");
const detailContent = document.querySelector("#detail-content");
const editorButtons = document.querySelectorAll("[data-command]");
const deleteItemButton = document.querySelector("#delete-item-button");
const subtaskForm = document.querySelector("#subtask-form");
const subtaskInput = document.querySelector("#subtask-input");
const subtaskList = document.querySelector("#subtask-list");
const subtaskCount = document.querySelector("#subtask-count");

let items = [];
let categories = [{ id: "uncategorized", name: "미분류", color: "#64748b", locked: true }];
let selectedItemId = null;
let currentView = "list";
let activeCategoryFilter = "all";
let searchQuery = "";
const expandedItemIds = new Set();
let saveTimer = null;

function createItem(title) {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title,
    categoryId: itemCategorySelect.value || "uncategorized",
    content: "",
    subtasks: [],
    createdAt: now,
    updatedAt: now
  };
}

function createSubtask(title) {
  return {
    id: crypto.randomUUID(),
    title,
    done: false,
    createdAt: new Date().toISOString()
  };
}

function selectedItem() {
  return items.find((item) => item.id === selectedItemId) ?? null;
}

function categoryName(categoryId) {
  return categories.find((category) => category.id === categoryId)?.name ?? "미분류";
}

function categoryById(categoryId) {
  return categories.find((category) => category.id === categoryId) ?? categories[0];
}

function randomHexColor() {
  const channel = () => Math.floor(96 + Math.random() * 128);
  return `#${[channel(), channel(), channel()]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

function visibleItems() {
  const query = searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    const categoryMatches =
      activeCategoryFilter === "all" || (item.categoryId ?? "uncategorized") === activeCategoryFilter;
    const searchTarget = `${item.title} ${stripHtml(item.content)}`.toLowerCase();
    return categoryMatches && (!query || searchTarget.includes(query));
  });
}

function itemProgress(item) {
  if (item.subtasks.length === 0) return "하위 일감 0개";

  const done = item.subtasks.filter((subtask) => subtask.done).length;
  return `하위 일감 ${done}/${item.subtasks.length}`;
}

function previewText(item) {
  const content = stripHtml(item.content).trim();
  if (!content) return "내용 없음";
  return content.length > 120 ? `${content.slice(0, 120)}...` : content;
}

function stripHtml(html) {
  const element = document.createElement("div");
  element.innerHTML = html;
  return element.textContent ?? "";
}

function syncIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function persist() {
  await window.dayPocketStore.save({ items, categories });
}

async function updateSelectedItem(patch) {
  items = items.map((item) =>
    item.id === selectedItemId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
  );
  await persist();
  render();
}

async function updateSelectedContent() {
  items = items.map((item) =>
    item.id === selectedItemId
      ? { ...item, content: detailContent.innerHTML, updatedAt: new Date().toISOString() }
      : item
  );
  await persist();
  renderList();
}

function scheduleContentSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(updateSelectedContent, 160);
}

function showListView() {
  currentView = "list";
  selectedItemId = null;
  render();
}

function showDetailView(itemId) {
  currentView = "detail";
  selectedItemId = itemId;
  render();
}

function openItemOverlay() {
  itemOverlay.classList.remove("hidden");
  itemTitleInput.focus();
  syncIcons();
}

function closeItemOverlay() {
  itemOverlay.classList.add("hidden");
  itemTitleInput.value = "";
  itemCategorySelect.value = "uncategorized";
}

function option(category, selectedId) {
  const element = document.createElement("option");
  element.value = category.id;
  element.textContent = category.name;
  element.selected = category.id === selectedId;
  return element;
}

function renderCategorySelects() {
  const itemCreateCategoryId = itemCategorySelect.value || "uncategorized";
  const selectedItemCategoryId = selectedItem()?.categoryId ?? "uncategorized";

  itemCategorySelect.replaceChildren();
  detailCategorySelect.replaceChildren();
  categoryFilter.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "전체";
  allOption.selected = activeCategoryFilter === "all";
  categoryFilter.append(allOption);

  for (const category of categories) {
    itemCategorySelect.append(option(category, itemCreateCategoryId));
    detailCategorySelect.append(option(category, selectedItemCategoryId));
    categoryFilter.append(option(category, activeCategoryFilter));
  }
}

function renderCategories() {
  categoryList.replaceChildren();

  for (const category of categories) {
    const row = document.createElement("li");
    row.className = "category-row";

    const name = document.createElement("span");
    name.textContent = category.name;

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = category.color;
    colorInput.className = "category-color-input";
    colorInput.setAttribute("aria-label", `${category.name} color`);

    const deleteButton = document.createElement("button");
    deleteButton.className = "icon-button";
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `Delete ${category.name}`);
    deleteButton.disabled = Boolean(category.locked);
    deleteButton.innerHTML = '<i data-lucide="trash-2" aria-hidden="true"></i>';

    deleteButton.addEventListener("click", async () => {
      categories = categories.filter((entry) => entry.id !== category.id);
      items = items.map((item) =>
        item.categoryId === category.id ? { ...item, categoryId: "uncategorized" } : item
      );
      if (activeCategoryFilter === category.id) activeCategoryFilter = "all";
      await persist();
      render();
    });

    colorInput.addEventListener("change", async () => {
      categories = categories.map((entry) =>
        entry.id === category.id ? { ...entry, color: colorInput.value } : entry
      );
      await persist();
      render();
    });

    row.append(name, colorInput, deleteButton);
    categoryList.append(row);
  }
}

function blockTextBeforeCursor() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return "";

  const range = selection.getRangeAt(0);
  const block = range.startContainer.parentElement?.closest("li, div, p, blockquote");
  if (!block || !detailContent.contains(block)) return "";

  const beforeRange = document.createRange();
  beforeRange.selectNodeContents(block);
  beforeRange.setEnd(range.startContainer, range.startOffset);
  return beforeRange.toString();
}

function replaceShortcutWithList(command, shortcutText) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  if (range.startOffset < shortcutText.length) return;

  range.setStart(range.startContainer, range.startOffset - shortcutText.length);
  range.deleteContents();
  document.execCommand(command);
  scheduleContentSave();
}

function handleEditorShortcut(event) {
  if (event.key === "Tab") {
    event.preventDefault();
    document.execCommand(event.shiftKey ? "outdent" : "indent");
    scheduleContentSave();
    return;
  }

  if (event.key !== " ") return;

  const text = blockTextBeforeCursor();
  if (text === "-") {
    event.preventDefault();
    replaceShortcutWithList("insertUnorderedList", "-");
    return;
  }

  if (/^\d+\.$/.test(text)) {
    event.preventDefault();
    replaceShortcutWithList("insertOrderedList", text);
  }
}

function renderList() {
  itemList.replaceChildren();

  for (const item of visibleItems()) {
    const card = itemTemplate.content.firstElementChild.cloneNode(true);
    const expandButton = card.querySelector(".expand-button");
    const selectButton = card.querySelector(".item-select");
    const categoryTag = card.querySelector(".category-tag");
    const title = card.querySelector(".item-title");
    const meta = card.querySelector(".item-meta");
    const preview = card.querySelector(".item-preview");
    const isExpanded = expandedItemIds.has(item.id);
    const category = categoryById(item.categoryId ?? "uncategorized");

    card.classList.toggle("selected", item.id === selectedItemId);
    card.classList.toggle("expanded", isExpanded);
    categoryTag.textContent = category.name;
    categoryTag.style.setProperty("--tag-color", category.color);
    categoryTag.style.setProperty("--tag-rgb", hexToRgb(category.color));
    title.textContent = item.title;
    meta.textContent = itemProgress(item);
    expandButton.textContent = isExpanded ? "▾" : "▸";

    if (isExpanded) {
      const previewContent = document.createElement("p");
      previewContent.textContent = previewText(item);
      preview.append(previewContent);

      if (item.subtasks.length > 0) {
        const nestedList = document.createElement("ul");
        nestedList.className = "nested-subtasks";

        for (const subtask of item.subtasks.slice(0, 5)) {
          const nestedItem = document.createElement("li");
          nestedItem.classList.toggle("done", subtask.done);
          nestedItem.textContent = subtask.title;
          nestedList.append(nestedItem);
        }

        preview.append(nestedList);
      }
    }

    expandButton.addEventListener("click", () => {
      if (isExpanded) {
        expandedItemIds.delete(item.id);
      } else {
        expandedItemIds.add(item.id);
      }
      renderList();
    });

    selectButton.addEventListener("click", () => {
      showDetailView(item.id);
    });

    itemList.append(card);
  }

  counter.textContent = `${visibleItems().length}/${items.length} items`;
}

function renderDetail() {
  const item = selectedItem();

  emptyState.classList.toggle("hidden", Boolean(item));
  detailCard.classList.toggle("hidden", !item);

  if (!item) return;

  detailTitle.value = item.title;
  detailCategorySelect.value = item.categoryId ?? "uncategorized";
  if (detailContent.innerHTML !== item.content) {
    detailContent.innerHTML = item.content;
  }
  subtaskCount.textContent = `${item.subtasks.filter((subtask) => !subtask.done).length} left`;
  subtaskList.replaceChildren();

  for (const subtask of item.subtasks) {
    const row = subtaskTemplate.content.firstElementChild.cloneNode(true);
    const checkbox = row.querySelector("input");
    const title = row.querySelector("span");
    const deleteButton = row.querySelector("button");

    checkbox.checked = subtask.done;
    title.textContent = subtask.title;
    row.classList.toggle("done", subtask.done);

    checkbox.addEventListener("change", async () => {
      const nextSubtasks = item.subtasks.map((entry) =>
        entry.id === subtask.id ? { ...entry, done: checkbox.checked } : entry
      );
      await updateSelectedItem({ subtasks: nextSubtasks });
    });

    deleteButton.addEventListener("click", async () => {
      await updateSelectedItem({
        subtasks: item.subtasks.filter((entry) => entry.id !== subtask.id)
      });
    });

    subtaskList.append(row);
  }
}

function render() {
  listView.classList.toggle("hidden", currentView !== "list");
  detailView.classList.toggle("hidden", currentView !== "detail");
  backButton.classList.toggle("hidden", currentView !== "detail");
  renderCategorySelects();
  renderCategories();
  renderList();
  renderDetail();
  syncIcons();
}

itemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = itemTitleInput.value.trim();
  if (!title) return;

  const item = createItem(title);
  items = [item, ...items];
  expandedItemIds.add(item.id);
  closeItemOverlay();
  await persist();
  showDetailView(item.id);
});

newItemButton.addEventListener("click", () => {
  openItemOverlay();
});

itemOverlayClose.addEventListener("click", () => {
  closeItemOverlay();
});

itemOverlay.addEventListener("click", (event) => {
  if (event.target === itemOverlay) {
    closeItemOverlay();
  }
});

itemSearchInput.addEventListener("input", () => {
  searchQuery = itemSearchInput.value;
  renderList();
  syncIcons();
});

backButton.addEventListener("click", () => {
  showListView();
});

categoryManagerButton.addEventListener("click", () => {
  categoryOverlay.classList.remove("hidden");
  categoryNameInput.focus();
  syncIcons();
});

categoryOverlayClose.addEventListener("click", () => {
  categoryOverlay.classList.add("hidden");
});

categoryOverlay.addEventListener("click", (event) => {
  if (event.target === categoryOverlay) {
    categoryOverlay.classList.add("hidden");
  }
});

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = categoryNameInput.value.trim();
  if (!name) return;
  if (categories.some((category) => category.name === name)) return;

  categories = [...categories, { id: crypto.randomUUID(), name, color: randomHexColor(), locked: false }];
  categoryNameInput.value = "";
  await persist();
  render();
  categoryNameInput.focus();
});

categoryFilter.addEventListener("change", () => {
  activeCategoryFilter = categoryFilter.value;
  renderList();
  syncIcons();
});

detailTitle.addEventListener("change", async () => {
  const title = detailTitle.value.trim() || "제목 없음";
  await updateSelectedItem({ title });
});

detailCategorySelect.addEventListener("change", async () => {
  await updateSelectedItem({ categoryId: detailCategorySelect.value || "uncategorized" });
});

detailContent.addEventListener("keydown", handleEditorShortcut);

detailContent.addEventListener("input", () => {
  scheduleContentSave();
});

for (const button of editorButtons) {
  button.addEventListener("click", () => {
    detailContent.focus();
    document.execCommand(button.dataset.command, false, button.dataset.value ?? null);
    scheduleContentSave();
  });
}

subtaskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const item = selectedItem();
  const title = subtaskInput.value.trim();
  if (!item || !title) return;

  subtaskInput.value = "";
  await updateSelectedItem({ subtasks: [...item.subtasks, createSubtask(title)] });
});

deleteItemButton.addEventListener("click", async () => {
  if (!selectedItemId) return;

  items = items.filter((item) => item.id !== selectedItemId);
  expandedItemIds.delete(selectedItemId);
  selectedItemId = null;
  await persist();
  showListView();
});

window.dayPocketStore.load().then((state) => {
  items = state.items ?? [];
  categories = state.categories ?? categories;
  selectedItemId = null;
  currentView = "list";
  render();
});
