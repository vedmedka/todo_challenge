export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export type TodoChanges = Partial<Pick<Todo, 'title' | 'completed'>>;

export type TodoFilter = 'all' | 'active' | 'completed';
