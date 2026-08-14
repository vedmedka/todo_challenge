import { Todo, TodoFilter } from './todo.model';

export function filterTodos(todos: readonly Todo[], filter: TodoFilter): Todo[] {
  return todos.filter(todo => {
    if (filter === 'active') {
      return !todo.completed;
    }
    if (filter === 'completed') {
      return todo.completed;
    }
    return true;
  });
}

export function extractTodoErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof error.error === 'object' &&
    error.error !== null &&
    'message' in error.error &&
    typeof error.error.message === 'string'
  ) {
    return error.error.message;
  }
  return 'Request failed';
}
