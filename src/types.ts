export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  children: ChecklistItem[];
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: number;
  columnId: string;
  title: string;
  description: string;
  checklist: ChecklistItem[];
  comments: Comment[];
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  name: string;
  position: number;
}

export interface Board {
  columns: Column[];
  tasks: Task[];
  nextTaskId: number;
}

export function emptyBoard(): Board {
  return {
    columns: [
      { id: 'todo', name: 'To Do', position: 0 },
      { id: 'doing', name: 'In Progress', position: 1 },
      { id: 'done', name: 'Done', position: 2 },
    ],
    tasks: [],
    nextTaskId: 1,
  };
}
