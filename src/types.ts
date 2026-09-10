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
      { id: 'todo', name: 'A Fazer', position: 0 },
      { id: 'doing', name: 'Em Andamento', position: 1 },
      { id: 'done', name: 'Concluído', position: 2 },
    ],
    tasks: [],
    nextTaskId: 1,
  };
}
