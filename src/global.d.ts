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

  type AppState = {
    items: PocketItem[];
    categories: Label[];
    statuses: Label[];
  };
}
