export {};

declare global {
  interface Window {
    dayPocketStore: {
      load: () => Promise<AppState>;
      save: (state: AppState) => Promise<AppState>;
    };
  }

  type Label = {
    id: string;
    name: string;
    color: string;
    order?: number;
    locked?: boolean;
  };

  type Subtask = {
    id: string;
    title: string;
    done: boolean;
    createdAt: string;
  };

  type PocketItem = {
    id: string;
    title: string;
    categoryId: string;
    statusId: string;
    content: string;
    subtasks: Subtask[];
    createdAt: string;
    updatedAt: string;
  };

  type PocketMemo = {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  };

  type AppState = {
    items: PocketItem[];
    memos: PocketMemo[];
    categories: Label[];
    statuses: Label[];
  };
}
