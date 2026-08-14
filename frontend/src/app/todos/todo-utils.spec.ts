import { filterTodos, extractTodoErrorMessage } from './todo-utils';
import { Todo } from './todo.model';

describe('todo utils', () => {
  const todos: Todo[] = [
    { id: '1', title: 'Open task', completed: false },
    { id: '2', title: 'Done task', completed: true }
  ];

  it('filters todos by selected completion state', () => {
    expect(filterTodos(todos, 'all')).toEqual(todos);
    expect(filterTodos(todos, 'active')).toEqual([{ id: '1', title: 'Open task', completed: false }]);
    expect(filterTodos(todos, 'completed')).toEqual([{ id: '2', title: 'Done task', completed: true }]);
  });

  it('extracts backend error messages with a generic fallback', () => {
    expect(extractTodoErrorMessage({ error: { message: 'Todo title must not be empty' } })).toBe('Todo title must not be empty');
    expect(extractTodoErrorMessage({ error: { detail: 'unexpected shape' } })).toBe('Request failed');
  });
});
