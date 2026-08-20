const itemForm = document.querySelector("#item-form");
const itemTitleInput = document.querySelector("#item-title-input");
const itemList = document.querySelector("#item-list");
const counter = document.querySelector("#counter");
const itemTemplate = document.querySelector("#item-template");
const subtaskTemplate = document.querySelector("#subtask-template");

const emptyState = document.querySelector("#empty-state");
const detailCard = document.querySelector("#detail-card");
const detailTitle = document.querySelector("#detail-title");
const detailContent = document.querySelector("#detail-content");
const deleteItemButton = document.querySelector("#delete-item-button");
const subtaskForm = document.querySelector("#subtask-form");
const subtaskInput = document.querySelector("#subtask-input");
const subtaskList = document.querySelector("#subtask-list");
const subtaskCount = document.querySelector("#subtask-count");

let items = [];
let selectedItemId = null;
const expandedItemIds = new Set();

function createItem(title) {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title,
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

function itemProgress(item) {
  if (item.subtasks.length === 0) return "하위 일감 0개";

  const done = item.subtasks.filter((subtask) => subtask.done).length;
  return `하위 일감 ${done}/${item.subtasks.length}`;
}

function previewText(item) {
  const content = item.content.trim();
  if (!content) return "내용 없음";
  return content.length > 120 ? `${content.slice(0, 120)}...` : content;
}

async function persist() {
  await window.dayPocketStore.save(items);
}

async function updateSelectedItem(patch) {
  items = items.map((item) =>
    item.id === selectedItemId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
  );
  await persist();
  render();
}

function renderList() {
  itemList.replaceChildren();

  for (const item of items) {
    const card = itemTemplate.content.firstElementChild.cloneNode(true);
    const expandButton = card.querySelector(".expand-button");
    const selectButton = card.querySelector(".item-select");
    const title = card.querySelector(".item-title");
    const meta = card.querySelector(".item-meta");
    const preview = card.querySelector(".item-preview");
    const isExpanded = expandedItemIds.has(item.id);

    card.classList.toggle("selected", item.id === selectedItemId);
    card.classList.toggle("expanded", isExpanded);
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
      selectedItemId = item.id;
      render();
    });

    itemList.append(card);
  }

  counter.textContent = `${items.length} items`;
}

function renderDetail() {
  const item = selectedItem();

  emptyState.classList.toggle("hidden", Boolean(item));
  detailCard.classList.toggle("hidden", !item);

  if (!item) return;

  detailTitle.value = item.title;
  detailContent.value = item.content;
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
  renderList();
  renderDetail();
}

itemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = itemTitleInput.value.trim();
  if (!title) return;

  const item = createItem(title);
  items = [item, ...items];
  selectedItemId = item.id;
  expandedItemIds.add(item.id);
  itemTitleInput.value = "";
  await persist();
  render();
});

detailTitle.addEventListener("change", async () => {
  const title = detailTitle.value.trim() || "제목 없음";
  await updateSelectedItem({ title });
});

detailContent.addEventListener("change", async () => {
  await updateSelectedItem({ content: detailContent.value });
});

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
  selectedItemId = items[0]?.id ?? null;
  await persist();
  render();
});

window.dayPocketStore.load().then((loadedItems) => {
  items = loadedItems;
  selectedItemId = items[0]?.id ?? null;
  render();
});
