import "pretendard/dist/web/variable/pretendardvariable.css";
import "./styles.css";

import React, { FormEvent, KeyboardEvent, MouseEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowUpDown,
  Bold,
  Check,
  ChevronDown,
  CircleDot,
  Eraser,
  Filter,
  Italic,
  List,
  ListOrdered,
  Plus,
  Quote,
  Search,
  Tags,
  Trash2,
  Underline,
  X
} from "lucide-react";

type SortKey = "updated-desc" | "updated-asc" | "created-desc" | "title-asc" | "category-asc" | "status-asc";
type Overlay = "category" | "status" | "item" | null;
type View = "list" | "detail";
type SelectOption = {
  id: string;
  name: string;
  color?: string;
};

const defaultCategory: Label = { id: "uncategorized", name: "미분류", color: "#64748b", locked: true };
const defaultStatus: Label = { id: "unset", name: "미지정", color: "#94a3b8", locked: true };
const sortOptions: SelectOption[] = [
  { id: "updated-desc", name: "최근 수정순" },
  { id: "updated-asc", name: "오래된 수정순" },
  { id: "created-desc", name: "최근 생성순" },
  { id: "title-asc", name: "제목순" },
  { id: "category-asc", name: "분류순" },
  { id: "status-asc", name: "상태순" }
];

function randomHexColor() {
  const channel = () => Math.floor(96 + Math.random() * 128);
  return `#${[channel(), channel(), channel()]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

function stripHtml(html: string) {
  const element = document.createElement("div");
  element.innerHTML = html;
  return element.textContent ?? "";
}

function createItem(title: string, categoryId: string, statusId: string): PocketItem {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title,
    categoryId,
    statusId,
    content: "",
    subtasks: [],
    createdAt: now,
    updatedAt: now
  };
}

function createSubtask(title: string): Subtask {
  return {
    id: crypto.randomUUID(),
    title,
    done: false,
    createdAt: new Date().toISOString()
  };
}

function itemProgress(item: PocketItem) {
  if (item.subtasks.length === 0) return "하위 일감 0개";

  const done = item.subtasks.filter((subtask) => subtask.done).length;
  return `하위 일감 ${done}/${item.subtasks.length}`;
}

function previewText(item: PocketItem) {
  const content = stripHtml(item.content).trim();
  if (!content) return "내용 없음";
  return content.length > 120 ? `${content.slice(0, 120)}...` : content;
}

function byId(labels: Label[], fallback: Label, id?: string) {
  return labels.find((label) => label.id === id) ?? labels[0] ?? fallback;
}

function compareItems(first: PocketItem, second: PocketItem, sortKey: SortKey, categories: Label[], statuses: Label[]) {
  const compareText = (a: string, b: string) => a.localeCompare(b, "ko-KR", { sensitivity: "base", numeric: true });
  const dateValue = (value?: string) => (value ? new Date(value).getTime() : 0);
  const compareDate = (a?: string, b?: string) => dateValue(a) - dateValue(b);

  switch (sortKey) {
    case "updated-asc":
      return compareDate(first.updatedAt ?? first.createdAt, second.updatedAt ?? second.createdAt);
    case "created-desc":
      return compareDate(second.createdAt, first.createdAt);
    case "title-asc":
      return compareText(first.title, second.title);
    case "category-asc":
      return compareText(
        byId(categories, defaultCategory, first.categoryId).name,
        byId(categories, defaultCategory, second.categoryId).name
      );
    case "status-asc":
      return compareText(byId(statuses, defaultStatus, first.statusId).name, byId(statuses, defaultStatus, second.statusId).name);
    case "updated-desc":
    default:
      return compareDate(second.updatedAt ?? second.createdAt, first.updatedAt ?? first.createdAt);
  }
}

function execEditorCommand(command: string, value?: string) {
  document.execCommand(command, false, value ?? undefined);
}

function blockTextBeforeCursor() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return "";

  const range = selection.getRangeAt(0);
  const block = range.startContainer.parentElement?.closest("div, p, li");
  if (!block) return "";

  const beforeRange = range.cloneRange();
  beforeRange.selectNodeContents(block);
  beforeRange.setEnd(range.startContainer, range.startOffset);
  return beforeRange.toString().trim();
}

function replaceShortcutWithList(command: string, token: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  range.setStart(range.startContainer, Math.max(0, range.startOffset - token.length));
  range.deleteContents();
  execEditorCommand(command);
}

function CustomSelect({
  value,
  options,
  ariaLabel,
  icon,
  onChange
}: {
  value: string;
  options: SelectOption[];
  ariaLabel: string;
  icon?: ReactNode;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.id === value) ?? options[0];

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div className="custom-select" ref={rootRef}>
      <button
        type="button"
        className="custom-select-trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {icon ? <span className="select-leading-icon">{icon}</span> : null}
        {selected?.color ? (
          <span className="select-swatch" style={{ "--select-color": selected.color } as React.CSSProperties} />
        ) : null}
        <span className="select-value">{selected?.name ?? "선택"}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open ? (
        <div className="custom-select-menu" role="listbox">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="custom-select-option"
              aria-selected={option.id === value}
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
            >
              {option.color ? (
                <span className="select-swatch" style={{ "--select-color": option.color } as React.CSSProperties} />
              ) : null}
              <span>{option.name}</span>
              {option.id === value ? <Check aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LabelTag({ label, dashed = false }: { label: Label; dashed?: boolean }) {
  return (
    <span
      className={dashed ? "status-tag" : "category-tag"}
      style={
        {
          "--tag-color": label.color,
          "--tag-rgb": hexToRgb(label.color)
        } as React.CSSProperties
      }
    >
      {label.name}
    </span>
  );
}

function OverlayPanel({
  eyebrow,
  title,
  onClose,
  children
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <section className="overlay-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="overlay-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close overlay" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function App() {
  const [items, setItems] = useState<PocketItem[]>([]);
  const [categories, setCategories] = useState<Label[]>([defaultCategory]);
  const [statuses, setStatuses] = useState<Label[]>([defaultStatus]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>("list");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all");
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [activeSort, setActiveSort] = useState<SortKey>("updated-desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemCategoryId, setNewItemCategoryId] = useState(defaultCategory.id);
  const [newItemStatusId, setNewItemStatusId] = useState(defaultStatus.id);
  const [newLabelName, setNewLabelName] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const saveTimer = useRef<number | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) ?? null, [items, selectedItemId]);
  const categoryOptions = useMemo(() => categories.map(({ id, name, color }) => ({ id, name, color })), [categories]);
  const statusOptions = useMemo(() => statuses.map(({ id, name, color }) => ({ id, name, color })), [statuses]);
  const categoryFilterOptions = useMemo(() => [{ id: "all", name: "전체" }, ...categoryOptions], [categoryOptions]);
  const statusFilterOptions = useMemo(() => [{ id: "all", name: "전체" }, ...statusOptions], [statusOptions]);

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filteredItems = items.filter((item) => {
      const categoryMatches = activeCategoryFilter === "all" || item.categoryId === activeCategoryFilter;
      const statusMatches = activeStatusFilter === "all" || item.statusId === activeStatusFilter;
      const searchTarget = `${item.title} ${stripHtml(item.content)}`.toLowerCase();
      return categoryMatches && statusMatches && (!query || searchTarget.includes(query));
    });

    return [...filteredItems].sort((first, second) => compareItems(first, second, activeSort, categories, statuses));
  }, [activeCategoryFilter, activeSort, activeStatusFilter, categories, items, searchQuery, statuses]);

  useEffect(() => {
    window.dayPocketStore.load().then((state) => {
      setItems(state.items ?? []);
      setCategories(state.categories ?? [defaultCategory]);
      setStatuses(state.statuses ?? [defaultStatus]);
    });
  }, []);

  useEffect(() => {
    if (!selectedItem || !editorRef.current) return;
    if (editorRef.current.innerHTML !== selectedItem.content) {
      editorRef.current.innerHTML = selectedItem.content;
    }
  }, [selectedItem?.id, selectedItem?.content, selectedItem]);

  function persist(nextItems = items, nextCategories = categories, nextStatuses = statuses) {
    window.dayPocketStore.save({ items: nextItems, categories: nextCategories, statuses: nextStatuses });
  }

  function updateItems(updater: (current: PocketItem[]) => PocketItem[]) {
    setItems((current) => {
      const nextItems = updater(current);
      persist(nextItems, categories, statuses);
      return nextItems;
    });
  }

  function updateSelectedItem(patch: Partial<PocketItem>) {
    updateItems((current) =>
      current.map((item) =>
        item.id === selectedItemId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
      )
    );
  }

  function scheduleContentSave() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const content = editorRef.current?.innerHTML ?? "";
      updateSelectedItem({ content });
    }, 160);
  }

  function handleEditorShortcut(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Tab") {
      event.preventDefault();
      execEditorCommand(event.shiftKey ? "outdent" : "indent");
      scheduleContentSave();
      return;
    }

    if (event.key !== " ") return;

    const text = blockTextBeforeCursor();
    if (text === "-") {
      event.preventDefault();
      replaceShortcutWithList("insertUnorderedList", "-");
      scheduleContentSave();
      return;
    }

    if (/^\d+\.$/.test(text)) {
      event.preventDefault();
      replaceShortcutWithList("insertOrderedList", text);
      scheduleContentSave();
    }
  }

  function submitItem(event: FormEvent) {
    event.preventDefault();
    const title = newItemTitle.trim();
    if (!title) return;

    const item = createItem(title, newItemCategoryId, newItemStatusId);
    const nextItems = [item, ...items];
    setItems(nextItems);
    persist(nextItems, categories, statuses);
    setNewItemTitle("");
    setNewItemCategoryId(defaultCategory.id);
    setNewItemStatusId(defaultStatus.id);
    setOverlay(null);
  }

  function addLabel(kind: "category" | "status", event: FormEvent) {
    event.preventDefault();
    const name = newLabelName.trim();
    if (!name) return;

    if (kind === "category") {
      if (categories.some((category) => category.name === name)) return;
      const nextCategories = [...categories, { id: crypto.randomUUID(), name, color: randomHexColor(), locked: false }];
      setCategories(nextCategories);
      persist(items, nextCategories, statuses);
    } else {
      if (statuses.some((status) => status.name === name)) return;
      const nextStatuses = [...statuses, { id: crypto.randomUUID(), name, color: randomHexColor(), locked: false }];
      setStatuses(nextStatuses);
      persist(items, categories, nextStatuses);
    }

    setNewLabelName("");
  }

  function updateLabelColor(kind: "category" | "status", id: string, color: string) {
    if (kind === "category") {
      const nextCategories = categories.map((category) => (category.id === id ? { ...category, color } : category));
      setCategories(nextCategories);
      persist(items, nextCategories, statuses);
      return;
    }

    const nextStatuses = statuses.map((status) => (status.id === id ? { ...status, color } : status));
    setStatuses(nextStatuses);
    persist(items, categories, nextStatuses);
  }

  function deleteLabel(kind: "category" | "status", id: string) {
    if (kind === "category") {
      const nextCategories = categories.filter((category) => category.id !== id);
      const nextItems = items.map((item) =>
        item.categoryId === id ? { ...item, categoryId: defaultCategory.id } : item
      );
      setCategories(nextCategories);
      setItems(nextItems);
      if (activeCategoryFilter === id) setActiveCategoryFilter("all");
      persist(nextItems, nextCategories, statuses);
      return;
    }

    const nextStatuses = statuses.filter((status) => status.id !== id);
    const nextItems = items.map((item) => (item.statusId === id ? { ...item, statusId: defaultStatus.id } : item));
    setStatuses(nextStatuses);
    setItems(nextItems);
    if (activeStatusFilter === id) setActiveStatusFilter("all");
    persist(nextItems, categories, nextStatuses);
  }

  function toggleExpanded(itemId: string) {
    setExpandedItemIds((current) => {
      const nextIds = new Set(current);
      if (nextIds.has(itemId)) {
        nextIds.delete(itemId);
      } else {
        nextIds.add(itemId);
      }
      return nextIds;
    });
  }

  function submitSubtask(event: FormEvent) {
    event.preventDefault();
    const title = newSubtaskTitle.trim();
    if (!title || !selectedItem) return;

    updateSelectedItem({ subtasks: [...selectedItem.subtasks, createSubtask(title)] });
    setNewSubtaskTitle("");
  }

  function updateSubtask(subtaskId: string, patch: Partial<Subtask>) {
    if (!selectedItem) return;
    updateSelectedItem({
      subtasks: selectedItem.subtasks.map((subtask) => (subtask.id === subtaskId ? { ...subtask, ...patch } : subtask))
    });
  }

  function deleteSubtask(subtaskId: string) {
    if (!selectedItem) return;
    updateSelectedItem({ subtasks: selectedItem.subtasks.filter((subtask) => subtask.id !== subtaskId) });
  }

  function deleteSelectedItem() {
    if (!selectedItem) return;
    const nextItems = items.filter((item) => item.id !== selectedItem.id);
    setItems(nextItems);
    persist(nextItems, categories, statuses);
    setExpandedItemIds((current) => {
      const nextIds = new Set(current);
      nextIds.delete(selectedItem.id);
      return nextIds;
    });
    setSelectedItemId(null);
    setCurrentView("list");
  }

  function closeOverlay() {
    setOverlay(null);
    setNewLabelName("");
    setNewItemTitle("");
    setNewItemCategoryId(defaultCategory.id);
    setNewItemStatusId(defaultStatus.id);
  }

  function openLabelOverlay(kind: "category" | "status") {
    setNewLabelName("");
    setOverlay(kind);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local Planner</p>
          <h1>Day Pocket</h1>
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" type="button" onClick={() => openLabelOverlay("category")}>
            <Tags aria-hidden="true" />
            <span>분류</span>
          </button>
          <button className="ghost-button" type="button" onClick={() => openLabelOverlay("status")}>
            <CircleDot aria-hidden="true" />
            <span>상태</span>
          </button>
          {currentView === "detail" ? (
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setCurrentView("list");
                setSelectedItemId(null);
              }}
            >
              <ArrowLeft aria-hidden="true" />
              <span>Back</span>
            </button>
          ) : null}
          <div className="counter">{visibleItems.length}/{items.length} items</div>
        </div>
      </header>

      <section className="workspace">
        {currentView === "list" ? (
          <section className="list-view" aria-label="Items">
            <div className="list-toolbar">
              <CustomSelect
                ariaLabel="Filter by category"
                value={activeCategoryFilter}
                options={categoryFilterOptions}
                icon={<Filter aria-hidden="true" />}
                onChange={setActiveCategoryFilter}
              />
              <CustomSelect
                ariaLabel="Filter by status"
                value={activeStatusFilter}
                options={statusFilterOptions}
                icon={<CircleDot aria-hidden="true" />}
                onChange={setActiveStatusFilter}
              />
              <CustomSelect
                ariaLabel="Sort items"
                value={activeSort}
                options={sortOptions}
                icon={<ArrowUpDown aria-hidden="true" />}
                onChange={(value) => setActiveSort(value as SortKey)}
              />

              <div className="search-field">
                <Search aria-hidden="true" />
                <input
                  type="search"
                  placeholder="일감 검색"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>

              <button className="primary-button" type="button" onClick={() => setOverlay("item")}>
                <Plus aria-hidden="true" />
                <span>New</span>
              </button>
            </div>

            <ul className="item-list">
              {visibleItems.map((item) => {
                const category = byId(categories, defaultCategory, item.categoryId);
                const status = byId(statuses, defaultStatus, item.statusId);
                const expanded = expandedItemIds.has(item.id);

                return (
                  <li className={`item-card${expanded ? " expanded" : ""}`} key={item.id}>
                    <div className="item-main">
                      <button
                        type="button"
                        className="expand-button"
                        aria-label="Toggle item"
                        onClick={() => toggleExpanded(item.id)}
                      >
                        {expanded ? "▾" : "▸"}
                      </button>
                      <button
                        type="button"
                        className="item-select"
                        onClick={() => {
                          setSelectedItemId(item.id);
                          setCurrentView("detail");
                        }}
                      >
                        <span className="item-heading">
                          <LabelTag label={category} />
                          {status.id !== defaultStatus.id ? <LabelTag label={status} dashed /> : null}
                          <span className="item-title">{item.title}</span>
                        </span>
                        <span className="item-meta">{itemProgress(item)}</span>
                      </button>
                    </div>
                    {expanded ? (
                      <div className="item-preview">
                        <p>{previewText(item)}</p>
                        {item.subtasks.length > 0 ? (
                          <ul className="nested-subtasks">
                            {item.subtasks.slice(0, 5).map((subtask) => (
                              <li className={subtask.done ? "done" : ""} key={subtask.id}>
                                {subtask.title}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <section className="detail-view" aria-label="Item detail">
            {!selectedItem ? (
              <div className="empty-state">
                <h2>선택된 항목이 없습니다</h2>
                <p>목록에서 일감이나 프로젝트를 선택하면 상세 내용을 편집할 수 있습니다.</p>
              </div>
            ) : (
              <article className="detail-card">
                <div className="detail-header">
                  <input
                    className="detail-title-input"
                    type="text"
                    aria-label="Title"
                    value={selectedItem.title}
                    onChange={(event) => updateSelectedItem({ title: event.target.value || "제목 없음" })}
                  />
                  <button className="danger-button icon-only-button" type="button" aria-label="Delete item" onClick={deleteSelectedItem}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>

                <label className="field compact-field">
                  <span>분류</span>
                  <CustomSelect
                    ariaLabel="Detail category"
                    value={selectedItem.categoryId}
                    options={categoryOptions}
                    onChange={(value) => updateSelectedItem({ categoryId: value })}
                  />
                </label>
                <label className="field compact-field">
                  <span>상태</span>
                  <CustomSelect
                    ariaLabel="Detail status"
                    value={selectedItem.statusId}
                    options={statusOptions}
                    onChange={(value) => updateSelectedItem({ statusId: value })}
                  />
                </label>

                <section className="field">
                  <span>내용</span>
                  <div className="editor-shell">
                    <div className="editor-toolbar" aria-label="Editor toolbar">
                      {[
                        ["bold", <Bold aria-hidden="true" />],
                        ["italic", <Italic aria-hidden="true" />],
                        ["underline", <Underline aria-hidden="true" />],
                        ["insertUnorderedList", <List aria-hidden="true" />],
                        ["insertOrderedList", <ListOrdered aria-hidden="true" />],
                        ["formatBlock", <Quote aria-hidden="true" />, "<blockquote>"],
                        ["removeFormat", <Eraser aria-hidden="true" />]
                      ].map(([command, icon, value]) => (
                        <button
                          key={command as string}
                          type="button"
                          onClick={() => {
                            editorRef.current?.focus();
                            execEditorCommand(command as string, value as string | undefined);
                            scheduleContentSave();
                          }}
                        >
                          {icon as ReactNode}
                        </button>
                      ))}
                    </div>
                    <div
                      ref={editorRef}
                      className="editor"
                      contentEditable
                      suppressContentEditableWarning
                      role="textbox"
                      aria-label="Content"
                      data-placeholder="메모, 진행 상황, 참고 내용을 적어두세요"
                      onKeyDown={handleEditorShortcut}
                      onInput={scheduleContentSave}
                    />
                  </div>
                </section>

                <section className="subtasks">
                  <div className="section-title">
                    <h2>하위 일감</h2>
                    <span>{selectedItem.subtasks.filter((subtask) => !subtask.done).length} left</span>
                  </div>

                  <form className="subtask-form" onSubmit={submitSubtask}>
                    <input
                      type="text"
                      placeholder="하위 일감 추가"
                      value={newSubtaskTitle}
                      onChange={(event) => setNewSubtaskTitle(event.target.value)}
                    />
                    <button type="submit">Add</button>
                  </form>

                  <ul className="subtask-list">
                    {selectedItem.subtasks.map((subtask) => (
                      <li className={`subtask-item${subtask.done ? " done" : ""}`} key={subtask.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={subtask.done}
                            onChange={(event) => updateSubtask(subtask.id, { done: event.target.checked })}
                          />
                          <span>{subtask.title}</span>
                        </label>
                        <button className="icon-button" type="button" aria-label="Delete subtask" onClick={() => deleteSubtask(subtask.id)}>
                          <X aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              </article>
            )}
          </section>
        )}
      </section>

      {overlay === "category" ? (
        <LabelManager
          eyebrow="Categories"
          title="분류 관리"
          labels={categories}
          newLabelName={newLabelName}
          onNameChange={setNewLabelName}
          onClose={closeOverlay}
          onSubmit={(event) => addLabel("category", event)}
          onColorChange={(id, color) => updateLabelColor("category", id, color)}
          onDelete={(id) => deleteLabel("category", id)}
        />
      ) : null}

      {overlay === "status" ? (
        <LabelManager
          eyebrow="Statuses"
          title="상태 관리"
          labels={statuses}
          newLabelName={newLabelName}
          onNameChange={setNewLabelName}
          onClose={closeOverlay}
          onSubmit={(event) => addLabel("status", event)}
          onColorChange={(id, color) => updateLabelColor("status", id, color)}
          onDelete={(id) => deleteLabel("status", id)}
        />
      ) : null}

      {overlay === "item" ? (
        <OverlayPanel eyebrow="New Item" title="일감 추가" onClose={closeOverlay}>
          <form className="item-create-form" onSubmit={submitItem}>
            <label className="field">
              <span>제목</span>
              <input
                type="text"
                placeholder="새 일감 또는 프로젝트"
                value={newItemTitle}
                onChange={(event) => setNewItemTitle(event.target.value)}
                autoFocus
              />
            </label>
            <label className="field">
              <span>분류</span>
              <CustomSelect
                ariaLabel="Category"
                value={newItemCategoryId}
                options={categoryOptions}
                onChange={setNewItemCategoryId}
              />
            </label>
            <label className="field">
              <span>상태</span>
              <CustomSelect ariaLabel="Status" value={newItemStatusId} options={statusOptions} onChange={setNewItemStatusId} />
            </label>
            <button type="submit">Add</button>
          </form>
        </OverlayPanel>
      ) : null}
    </main>
  );
}

function LabelManager({
  eyebrow,
  title,
  labels,
  newLabelName,
  onNameChange,
  onClose,
  onSubmit,
  onColorChange,
  onDelete
}: {
  eyebrow: string;
  title: string;
  labels: Label[];
  newLabelName: string;
  onNameChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onColorChange: (id: string, color: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <OverlayPanel eyebrow={eyebrow} title={title} onClose={onClose}>
      <form className="category-form" onSubmit={onSubmit}>
        <input
          type="text"
          placeholder={`새 ${title.replace(" 관리", "")} 이름`}
          value={newLabelName}
          onChange={(event) => onNameChange(event.target.value)}
          autoFocus
        />
        <button type="submit">Add</button>
      </form>

      <ul className="category-list">
        {labels.map((label) => (
          <li className="category-row" key={label.id}>
            <span>{label.name}</span>
            <input
              className="category-color-input"
              type="color"
              aria-label={`${label.name} color`}
              value={label.color}
              onChange={(event) => onColorChange(label.id, event.target.value)}
            />
            <button
              className="icon-button"
              type="button"
              aria-label={`Delete ${label.name}`}
              disabled={Boolean(label.locked)}
              onClick={() => onDelete(label.id)}
            >
              <Trash2 aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </OverlayPanel>
  );
}

const rootElement = document.querySelector("#root");
if (!rootElement) throw new Error("Root element was not found.");

createRoot(rootElement).render(<App />);
