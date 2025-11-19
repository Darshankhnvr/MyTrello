export interface Task {
  _id: string;
  title: string;
  description?: string;
  columnId: string;
  order: number;
  tags?: string[];
  dueDate?: string | null; // ISO date string
  completed?: boolean;
  completedAt?: string | null; // ISO date string when completed
  previousColumnId?: string | null;
}

export interface Column {
  _id: string;
  title: string;
  tasks: Task[];
  order: number;
}

export interface BoardState {
  columns: Column[];
}

export type Theme = 'light' | 'dark';