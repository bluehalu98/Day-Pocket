import "pretendard/dist/web/variable/pretendardvariable.css";
import "./styles.css";

import React, { FormEvent, MouseEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { EditorContent, useEditor } from "@tiptap/react";
import Color from "@tiptap/extension-color";
import { Table as TableExtension } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TextStyle } from "@tiptap/extension-text-style";
import UnderlineExtension from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUpDown,
  ArrowUp,
  Bold,
  Check,
  ChevronDown,
  CircleDot,
  Columns3,
  Eraser,
  Filter,
  Italic,
  List,
  ListOrdered,
  Palette,
  Plus,
  Quote,
  Rows3,
  Search,
  Tags,
  Table,
  Table2,
  Trash2,
  AlertTriangle,
  Underline,
  StickyNote,
  X
} from "lucide-react";

type SortKey = "updated-desc" | "updated-asc" | "created-desc" | "title-asc" | "category-asc" | "status-asc";
type Overlay = "category" | "status" | "item" | "memo" | null;
type View = "list" | "detail" | "memos";
type ConfirmDialogState = {
  title: string;
  message: string;
  onConfirm: () => void;
} | null;
type SelectOption = {
  id: string;
  name: string;
  color?: string;
};

const defaultCategory: Label = { id: "uncategorized", name: "미분류", color: "#64748b", order: 0, locked: true };
const defaultStatus: Label = { id: "unset", name: "미지정", color: "#94a3b8", order: 0, locked: true };
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

function createMemo(title: string): PocketMemo {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), title, content: "", createdAt: now, updatedAt: now };
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

function labelOrder(labels: Label[], id?: string) {
  const index = labels.findIndex((label) => label.id === id);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
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
      return labelOrder(categories, first.categoryId) - labelOrder(categories, second.categoryId);
    case "status-asc":
      return labelOrder(statuses, first.statusId) - labelOrder(statuses, second.statusId);
    case "updated-desc":
    default:
      return compareDate(second.updatedAt ?? second.createdAt, first.updatedAt ?? first.createdAt);
  }
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

function ConfirmDialog({
  dialog,
  onClose
}: {
  dialog: NonNullable<ConfirmDialogState>;
  onClose: () => void;
}) {
  return (
    <div className="overlay" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={onClose}>
      <section className="overlay-panel confirm-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <div className="confirm-dialog-icon" aria-hidden="true">
          <AlertTriangle />
        </div>
        <div>
          <p className="eyebrow">Confirm Delete</p>
          <h2 id="confirm-title">{dialog.title}</h2>
          <p className="confirm-dialog-message">{dialog.message}</p>
        </div>
        <div className="confirm-dialog-actions">
          <button className="ghost-button" type="button" onClick={onClose}>취소</button>
          <button className="danger-confirm-button" type="button" onClick={dialog.onConfirm}>삭제</button>
        </div>
      </section>
    </div>
  );
}

function App() {
  const [items, setItems] = useState<PocketItem[]>([]);
  const [memos, setMemos] = useState<PocketMemo[]>([]);
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
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemCategoryId, setNewItemCategoryId] = useState(defaultCategory.id);
  const [newItemStatusId, setNewItemStatusId] = useState(defaultStatus.id);
  const [newLabelName, setNewLabelName] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [tablePickerSize, setTablePickerSize] = useState({ rows: 3, columns: 3 });
  const saveTimer = useRef<number | null>(null);
  const tableToolRef = useRef<HTMLDivElement | null>(null);
  const selectedItemIdRef = useRef<string | null>(selectedItemId);
  selectedItemIdRef.current = selectedItemId;
  const selectedMemoIdRef = useRef<string | null>(selectedMemoId);
  selectedMemoIdRef.current = selectedMemoId;
  const currentViewRef = useRef<View>(currentView);
  currentViewRef.current = currentView;

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      TableExtension.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content: "",
    onUpdate: ({ editor: updatedEditor }) => scheduleContentSave(updatedEditor.getHTML())
  });

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) ?? null, [items, selectedItemId]);
  const selectedMemo = useMemo(() => memos.find((memo) => memo.id === selectedMemoId) ?? null, [memos, selectedMemoId]);
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
      setMemos(state.memos ?? []);
      setCategories(state.categories ?? [defaultCategory]);
      setStatuses(state.statuses ?? [defaultStatus]);
    });
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!tableToolRef.current?.contains(event.target as Node)) setTablePickerOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const content = currentView === "detail" ? selectedItem?.content : memos.find((memo) => memo.id === selectedMemoId)?.content;
    if (!editor || content === undefined) return;
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
  }, [editor, currentView, selectedItem?.id, selectedMemoId]);

  function persist(nextItems = items, nextCategories = categories, nextStatuses = statuses, nextMemos = memos) {
    window.dayPocketStore.save({ items: nextItems, memos: nextMemos, categories: nextCategories, statuses: nextStatuses });
  }

  function updateItems(updater: (current: PocketItem[]) => PocketItem[]) {
    setItems((current) => {
      const nextItems = updater(current);
      persist(nextItems, categories, statuses, memos);
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

  function scheduleContentSave(content = editor?.getHTML() ?? "") {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const currentId = selectedItemIdRef.current;
      setItems((current) => {
        const nextItems = current.map((item) =>
          item.id === currentId ? { ...item, content, updatedAt: new Date().toISOString() } : item
        );
        if (currentViewRef.current === "memos") {
          const memoId = selectedMemoIdRef.current;
          const nextMemos = memos.map((memo) => memo.id === memoId ? { ...memo, content, updatedAt: new Date().toISOString() } : memo);
          setMemos(nextMemos);
          persist(items, categories, statuses, nextMemos);
          return current;
        }
        persist(nextItems, categories, statuses, memos);
        return nextItems;
      });
    }, 160);
  }

  function submitItem(event: FormEvent) {
    event.preventDefault();
    const title = newItemTitle.trim();
    if (!title) return;

    const item = createItem(title, newItemCategoryId, newItemStatusId);
    const nextItems = [item, ...items];
    setItems(nextItems);
    persist(nextItems, categories, statuses, memos);
    setNewItemTitle("");
    setNewItemCategoryId(defaultCategory.id);
    setNewItemStatusId(defaultStatus.id);
    setOverlay(null);
  }

  function submitMemo(event: FormEvent) {
    event.preventDefault();
    const title = newItemTitle.trim();
    if (!title) return;

    const memo = createMemo(title);
    const nextMemos = [memo, ...memos];
    setMemos(nextMemos);
    setSelectedMemoId(memo.id);
    setCurrentView("memos");
    persist(items, categories, statuses, nextMemos);
    setNewItemTitle("");
    setOverlay(null);
  }

  function updateSelectedMemo(patch: Partial<PocketMemo>) {
    const nextMemos = memos.map((memo) =>
      memo.id === selectedMemoId ? { ...memo, ...patch, updatedAt: new Date().toISOString() } : memo
    );
    setMemos(nextMemos);
    persist(items, categories, statuses, nextMemos);
  }

  function removeSelectedMemo() {
    if (!selectedMemoId) return;
    const nextMemos = memos.filter((memo) => memo.id !== selectedMemoId);
    setMemos(nextMemos);
    setSelectedMemoId(nextMemos[0]?.id ?? null);
    persist(items, categories, statuses, nextMemos);
  }

  function deleteSelectedMemo() {
    if (!selectedMemo) return;
    setConfirmDialog({
      title: "메모를 삭제할까요?",
      message: `“${selectedMemo.title}” 메모가 영구적으로 삭제됩니다.`,
      onConfirm: () => {
        removeSelectedMemo();
        setConfirmDialog(null);
      }
    });
  }

  function addLabel(kind: "category" | "status", event: FormEvent) {
    event.preventDefault();
    const name = newLabelName.trim();
    if (!name) return;

    if (kind === "category") {
      if (categories.some((category) => category.name === name)) return;
      const nextCategories = [...categories, { id: crypto.randomUUID(), name, color: randomHexColor(), order: categories.length, locked: false }];
      setCategories(nextCategories);
      persist(items, nextCategories, statuses, memos);
    } else {
      if (statuses.some((status) => status.name === name)) return;
      const nextStatuses = [...statuses, { id: crypto.randomUUID(), name, color: randomHexColor(), order: statuses.length, locked: false }];
      setStatuses(nextStatuses);
      persist(items, categories, nextStatuses, memos);
    }

    setNewLabelName("");
  }

  function moveLabel(kind: "category" | "status", id: string, direction: -1 | 1) {
    const labels = kind === "category" ? categories : statuses;
    const currentIndex = labels.findIndex((label) => label.id === id);
    if (currentIndex <= 0 || currentIndex >= labels.length || labels[currentIndex]?.locked) return;

    const nextIndex = currentIndex + direction;
    if (nextIndex <= 0 || nextIndex >= labels.length) return;
    const nextLabels = [...labels];
    [nextLabels[currentIndex], nextLabels[nextIndex]] = [nextLabels[nextIndex], nextLabels[currentIndex]];
    const orderedLabels = nextLabels.map((label, index) => ({ ...label, order: index }));

    if (kind === "category") {
      setCategories(orderedLabels);
      persist(items, orderedLabels, statuses, memos);
    } else {
      setStatuses(orderedLabels);
      persist(items, categories, orderedLabels, memos);
    }
  }

  function updateLabelColor(kind: "category" | "status", id: string, color: string) {
    if (kind === "category") {
      const nextCategories = categories.map((category) => (category.id === id ? { ...category, color } : category));
      setCategories(nextCategories);
      persist(items, nextCategories, statuses, memos);
      return;
    }

    const nextStatuses = statuses.map((status) => (status.id === id ? { ...status, color } : status));
    setStatuses(nextStatuses);
    persist(items, categories, nextStatuses, memos);
  }

  function removeLabel(kind: "category" | "status", id: string) {
    if (kind === "category") {
      const nextCategories = categories.filter((category) => category.id !== id);
      const nextItems = items.map((item) =>
        item.categoryId === id ? { ...item, categoryId: defaultCategory.id } : item
      );
      setCategories(nextCategories);
      setItems(nextItems);
      if (activeCategoryFilter === id) setActiveCategoryFilter("all");
      persist(nextItems, nextCategories, statuses, memos);
      return;
    }

    const nextStatuses = statuses.filter((status) => status.id !== id);
    const nextItems = items.map((item) => (item.statusId === id ? { ...item, statusId: defaultStatus.id } : item));
    setStatuses(nextStatuses);
    setItems(nextItems);
    if (activeStatusFilter === id) setActiveStatusFilter("all");
    persist(nextItems, categories, nextStatuses, memos);
  }

  function deleteLabel(kind: "category" | "status", id: string) {
    const labels = kind === "category" ? categories : statuses;
    const label = labels.find((currentLabel) => currentLabel.id === id);
    if (!label || label.locked) return;
    setConfirmDialog({
      title: `${kind === "category" ? "분류" : "상태"}를 삭제할까요?`,
      message: `“${label.name}” 항목을 삭제합니다. 연결된 일감은 미지정 값으로 변경됩니다.`,
      onConfirm: () => {
        removeLabel(kind, id);
        setConfirmDialog(null);
      }
    });
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

  function removeSubtask(subtaskId: string) {
    if (!selectedItem) return;
    updateSelectedItem({ subtasks: selectedItem.subtasks.filter((subtask) => subtask.id !== subtaskId) });
  }

  function deleteSubtask(subtaskId: string) {
    const subtask = selectedItem?.subtasks.find((currentSubtask) => currentSubtask.id === subtaskId);
    if (!subtask) return;
    setConfirmDialog({
      title: "하위 일감을 삭제할까요?",
      message: `“${subtask.title}” 하위 일감이 삭제됩니다.`,
      onConfirm: () => {
        removeSubtask(subtaskId);
        setConfirmDialog(null);
      }
    });
  }

  function removeSelectedItem() {
    if (!selectedItem) return;
    const nextItems = items.filter((item) => item.id !== selectedItem.id);
    setItems(nextItems);
    persist(nextItems, categories, statuses, memos);
    setExpandedItemIds((current) => {
      const nextIds = new Set(current);
      nextIds.delete(selectedItem.id);
      return nextIds;
    });
    setSelectedItemId(null);
    setCurrentView("list");
  }

  function deleteSelectedItem() {
    if (!selectedItem) return;
    setConfirmDialog({
      title: "일감을 삭제할까요?",
      message: `“${selectedItem.title}” 일감과 하위 일감이 함께 삭제됩니다.`,
      onConfirm: () => {
        removeSelectedItem();
        setConfirmDialog(null);
      }
    });
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
          <div className="view-switcher" role="tablist" aria-label="Workspace type">
            <button
              className={`ghost-button${currentView !== "memos" ? " active" : ""}`}
              type="button"
              role="tab"
              aria-selected={currentView !== "memos"}
              onClick={() => {
                setCurrentView(selectedItem ? "detail" : "list");
                setSelectedMemoId(null);
              }}
            >
              <Check aria-hidden="true" />
              <span>일감</span>
            </button>
            <button
              className={`ghost-button${currentView === "memos" ? " active" : ""}`}
              type="button"
              role="tab"
              aria-selected={currentView === "memos"}
              onClick={() => {
                setCurrentView("memos");
                setSelectedMemoId((current) => current ?? memos[0]?.id ?? null);
              }}
            >
              <StickyNote aria-hidden="true" />
              <span>메모</span>
            </button>
          </div>
          {currentView !== "memos" ? (
            <>
              <button className="ghost-button" type="button" onClick={() => openLabelOverlay("category")}>
                <Tags aria-hidden="true" />
                <span>분류</span>
              </button>
              <button className="ghost-button" type="button" onClick={() => openLabelOverlay("status")}>
                <CircleDot aria-hidden="true" />
                <span>상태</span>
              </button>
            </>
          ) : null}
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
          <div className="counter">
            {currentView === "memos" ? `메모 ${memos.length}개` : `일감 ${visibleItems.length}/${items.length}`}
          </div>
        </div>
      </header>

      <section className="workspace">
        {currentView === "memos" ? (
          <section className="memo-view" aria-label="Memos">
            <aside className="memo-list-panel">
              <div className="memo-toolbar">
                <div className="search-field">
                  <Search aria-hidden="true" />
                  <input
                    type="search"
                    placeholder="메모 검색"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
                <button className="primary-button" type="button" onClick={() => setOverlay("memo")}>
                  <Plus aria-hidden="true" />
                  <span>새 메모</span>
                </button>
              </div>
              <ul className="memo-list">
                {memos
                  .filter((memo) => `${memo.title} ${stripHtml(memo.content)}`.toLowerCase().includes(searchQuery.trim().toLowerCase()))
                  .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
                  .map((memo) => (
                    <li key={memo.id}>
                      <button
                        className={`memo-list-item${memo.id === selectedMemoId ? " selected" : ""}`}
                        type="button"
                        onClick={() => setSelectedMemoId(memo.id)}
                      >
                        <strong>{memo.title}</strong>
                        <span>{stripHtml(memo.content).trim() || "내용 없음"}</span>
                      </button>
                    </li>
                  ))}
              </ul>
            </aside>
            <article className="memo-editor-card">
              {!selectedMemo ? (
                <div className="empty-state">
                  <h2>메모가 없습니다</h2>
                  <p>새 메모를 만들어 생각과 기록을 자유롭게 남겨보세요.</p>
                </div>
              ) : (
                <>
                  <div className="detail-header">
                    <input
                      className="detail-title-input"
                      type="text"
                      aria-label="Memo title"
                      value={selectedMemo.title}
                      onChange={(event) => updateSelectedMemo({ title: event.target.value || "제목 없음" })}
                    />
                    <button className="danger-button icon-only-button" type="button" aria-label="Delete memo" onClick={deleteSelectedMemo}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                  <section className="field">
                    <span>내용</span>
                    <div className="editor-shell">
                      <div className="editor-toolbar" aria-label="Memo editor toolbar">
                        <button type="button" title="굵게" onClick={() => editor?.chain().focus().toggleBold().run()}><Bold aria-hidden="true" /></button>
                        <button type="button" title="기울임" onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic aria-hidden="true" /></button>
                        <button type="button" title="밑줄" onClick={() => editor?.chain().focus().toggleUnderline().run()}><Underline aria-hidden="true" /></button>
                        <button type="button" title="목록" onClick={() => editor?.chain().focus().toggleBulletList().run()}><List aria-hidden="true" /></button>
                        <button type="button" title="번호 목록" onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered aria-hidden="true" /></button>
                        <button type="button" title="인용" onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote aria-hidden="true" /></button>
                        <label className="editor-color-tool" title="글자색">
                          <Palette aria-hidden="true" />
                          <input type="color" aria-label="글자색" defaultValue="#f8fafc" onChange={(event) => editor?.chain().focus().setColor(event.target.value).run()} />
                        </label>
                      </div>
                      <EditorContent className="editor" editor={editor} role="textbox" aria-label="Memo content" />
                    </div>
                  </section>
                </>
              )}
            </article>
          </section>
        ) : currentView === "list" ? (
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

                <div className="detail-meta-grid">
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
                </div>

                <section className="field">
                  <span>내용</span>
                  <div className="editor-shell">
                    <div className="editor-toolbar" aria-label="Editor toolbar">
                      <button type="button" title="굵게" onClick={() => editor?.chain().focus().toggleBold().run()}>
                        <Bold aria-hidden="true" />
                      </button>
                      <button type="button" title="기울임" onClick={() => editor?.chain().focus().toggleItalic().run()}>
                        <Italic aria-hidden="true" />
                      </button>
                      <button type="button" title="밑줄" onClick={() => editor?.chain().focus().toggleUnderline().run()}>
                        <Underline aria-hidden="true" />
                      </button>
                      <button type="button" title="목록" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
                        <List aria-hidden="true" />
                      </button>
                      <button type="button" title="번호 목록" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
                        <ListOrdered aria-hidden="true" />
                      </button>
                      <button type="button" title="인용" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
                        <Quote aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        title="서식 지우기"
                        onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
                      >
                        <Eraser aria-hidden="true" />
                      </button>
                      <label className="editor-color-tool" title="글자색">
                        <Palette aria-hidden="true" />
                        <input
                          type="color"
                          aria-label="글자색"
                          defaultValue="#f8fafc"
                          onChange={(event) => editor?.chain().focus().setColor(event.target.value).run()}
                        />
                      </label>
                      <div className="table-tool" ref={tableToolRef}>
                        <button
                          type="button"
                          aria-label="Insert table"
                          title="표 삽입"
                          aria-expanded={tablePickerOpen}
                          onClick={() => setTablePickerOpen((current) => !current)}
                        >
                          <Table aria-hidden="true" />
                        </button>
                        {tablePickerOpen ? (
                          <div className="table-picker" role="dialog" aria-label="Table size">
                            <div className="table-picker-grid">
                              {Array.from({ length: 6 }, (_, rowIndex) =>
                                Array.from({ length: 6 }, (_, columnIndex) => {
                                  const rows = rowIndex + 1;
                                  const columns = columnIndex + 1;
                                  const active = rows <= tablePickerSize.rows && columns <= tablePickerSize.columns;

                                  return (
                                    <button
                                      key={`${rows}-${columns}`}
                                      type="button"
                                      className={active ? "active" : ""}
                                      aria-label={`${rows} by ${columns} table`}
                                      onMouseEnter={() => setTablePickerSize({ rows, columns })}
                                      onClick={() => {
                                        editor?.chain().focus().insertTable({ rows, cols: columns, withHeaderRow: false }).run();
                                        setTablePickerOpen(false);
                                      }}
                                    />
                                  );
                                })
                              )}
                            </div>
                            <span>{tablePickerSize.rows} x {tablePickerSize.columns}</span>
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        aria-label="Add table row"
                        title="현재 표에 행 추가"
                        onClick={() => {
                          editor?.chain().focus().addRowAfter().run();
                        }}
                      >
                        <Rows3 aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Add table column"
                        title="현재 표에 열 추가"
                        onClick={() => {
                          editor?.chain().focus().addColumnAfter().run();
                        }}
                      >
                        <Columns3 aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete table"
                        title="현재 표 삭제"
                        onClick={() => {
                          editor?.chain().focus().deleteTable().run();
                        }}
                      >
                        <Table2 aria-hidden="true" />
                      </button>
                    </div>
                    <EditorContent
                      className="editor"
                      editor={editor}
                      role="textbox"
                      aria-label="Content"
                      data-placeholder="메모, 진행 상황, 참고 내용을 적어두세요"
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
          onMove={(id, direction) => moveLabel("category", id, direction)}
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
          onMove={(id, direction) => moveLabel("status", id, direction)}
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

      {overlay === "memo" ? (
        <OverlayPanel eyebrow="New Memo" title="메모 추가" onClose={closeOverlay}>
          <form className="item-create-form" onSubmit={submitMemo}>
            <label className="field">
              <span>제목</span>
              <input
                type="text"
                placeholder="새 메모"
                value={newItemTitle}
                onChange={(event) => setNewItemTitle(event.target.value)}
                autoFocus
              />
            </label>
            <button type="submit">Add</button>
          </form>
        </OverlayPanel>
      ) : null}
      {confirmDialog ? <ConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} /> : null}
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
  onMove,
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
  onMove: (id: string, direction: -1 | 1) => void;
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
        {labels.map((label, index) => (
          <li className="category-row" key={label.id}>
            <span>{label.name}</span>
            <div className="category-order-controls" aria-label={`${label.name} order`}>
              <button
                className="icon-button"
                type="button"
                aria-label={`${label.name} move up`}
                title="위로 이동"
                disabled={Boolean(label.locked) || index <= 1}
                onClick={() => onMove(label.id, -1)}
              >
                <ArrowUp aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label={`${label.name} move down`}
                title="아래로 이동"
                disabled={Boolean(label.locked) || index === labels.length - 1}
                onClick={() => onMove(label.id, 1)}
              >
                <ArrowDown aria-hidden="true" />
              </button>
            </div>
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
