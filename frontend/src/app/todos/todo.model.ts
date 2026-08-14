export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export interface TodoList {
  id: string;
  title: string;
}

export type TodoChanges = Partial<Pick<Todo, 'title' | 'completed'>>;

export type TodoFilter = 'all' | 'active' | 'completed';
