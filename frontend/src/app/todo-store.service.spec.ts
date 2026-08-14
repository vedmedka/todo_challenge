import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { TodoApiService } from './todo-api.service';
import { TodoStore } from './todo-store.service';
import { Todo, TodoChanges } from './todo.model';

describe('TodoStore', () => {
  let api: jasmine.SpyObj<TodoApiService>;
  let store: TodoStore;

  beforeEach(() => {
    api = jasmine.createSpyObj<TodoApiService>('TodoApiService', ['list', 'create', 'update', 'delete']);
    api.list.and.returnValue(of([
      { id: '1', title: 'Open task', completed: false },
      { id: '2', title: 'Done task', completed: true }
    ]));
    api.create.and.callFake((title: string) => of({ id: '3', title, completed: false }));
    api.update.and.callFake((id: string, changes: TodoChanges) => {
      const existing = id === '1'
        ? { id: '1', title: 'Open task', completed: false }
        : { id: '2', title: 'Done task', completed: true };
      return of({ ...existing, ...changes });
    });
    api.delete.and.returnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        TodoStore,
        { provide: TodoApiService, useValue: api }
      ]
    });

    store = TestBed.inject(TodoStore);
  });

  it('loads and filters todos', () => {
    store.loadTodos();

    expect(store.todos()).toEqual([
      { id: '1', title: 'Open task', completed: false },
      { id: '2', title: 'Done task', completed: true }
    ]);

    store.setFilter('active');
    expect(store.visibleTodos()).toEqual([{ id: '1', title: 'Open task', completed: false }]);
  });

  it('validates and creates todos', () => {
    store.setNewTitle('   ');
    store.createTodo();

    expect(store.errorMessage()).toBe('Title is required');

    store.setNewTitle('  New task  ');
    store.createTodo();

    expect(store.todos()).toEqual([{ id: '3', title: 'New task', completed: false }]);
    expect(store.newTitle()).toBe('');
    expect(store.errorMessage()).toBeNull();
  });

  it('tracks pending toggles and ignores duplicate toggle requests', () => {
    const pendingUpdate = new Subject<Todo>();
    api.update.and.returnValue(pendingUpdate.asObservable());
    const todo = { id: '1', title: 'Open task', completed: false };

    store.toggleTodo(todo);
    store.toggleTodo(todo);

    expect(api.update).toHaveBeenCalledOnceWith('1', { completed: true });
    expect(store.isTogglePending('1')).toBeTrue();

    pendingUpdate.next({ id: '1', title: 'Open task', completed: true });
    pendingUpdate.complete();

    expect(store.isTogglePending('1')).toBeFalse();
  });

  it('edits and cancels todo titles', () => {
    store.loadTodos();
    store.startEditing({ id: '1', title: 'Open task', completed: false });
    store.setEditTitle('  Edited task  ');

    store.saveEdit();

    expect(store.todos()).toContain(jasmine.objectContaining({ id: '1', title: 'Edited task' }));
    expect(store.editingId()).toBeNull();
    expect(store.editTitle()).toBe('');

    store.startEditing({ id: '2', title: 'Done task', completed: true });
    store.cancelEdit();

    expect(store.editingId()).toBeNull();
    expect(store.editTitle()).toBe('');
  });

  it('deletes todos and clears edit state for the deleted todo', () => {
    store.loadTodos();
    store.startEditing({ id: '1', title: 'Open task', completed: false });

    store.deleteTodo('1');

    expect(store.todos()).toEqual([{ id: '2', title: 'Done task', completed: true }]);
    expect(store.editingId()).toBeNull();
  });

  it('stores API error messages', () => {
    api.list.and.returnValue(throwError(() => ({ error: { message: 'Could not reach API' } })));

    store.loadTodos();

    expect(store.errorMessage()).toBe('Could not reach API');
  });
});
