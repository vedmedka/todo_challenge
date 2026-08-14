import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { TodoApiService } from './todo-api.service';
import { TodoStore } from './todo-store.service';
import { Todo, TodoChanges } from './todo.model';

describe('TodoStore', () => {
  let api: jasmine.SpyObj<TodoApiService>;
  let store: TodoStore;

  beforeEach(() => {
    api = jasmine.createSpyObj<TodoApiService>('TodoApiService', [
      'listTodoLists',
      'createTodoList',
      'updateTodoList',
      'deleteTodoList',
      'listTodos',
      'createTodo',
      'updateTodo',
      'deleteTodo'
    ]);
    api.listTodoLists.and.returnValue(of([
      { id: 'list-1', title: 'Inbox' },
      { id: 'list-2', title: 'Work' }
    ]));
    api.listTodos.and.returnValue(of([
      { id: '1', title: 'Open task', completed: false },
      { id: '2', title: 'Done task', completed: true }
    ]));
    api.createTodoList.and.callFake((title: string) => of({ id: 'list-3', title }));
    api.updateTodoList.and.callFake((id: string, title: string) => of({ id, title }));
    api.deleteTodoList.and.returnValue(of(undefined));
    api.createTodo.and.callFake((_listId: string, title: string) => of({ id: '3', title, completed: false }));
    api.updateTodo.and.callFake((_listId: string, id: string, changes: TodoChanges) => {
      const existing = id === '1'
        ? { id: '1', title: 'Open task', completed: false }
        : { id: '2', title: 'Done task', completed: true };
      return of({ ...existing, ...changes });
    });
    api.deleteTodo.and.returnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        TodoStore,
        { provide: TodoApiService, useValue: api }
      ]
    });

    store = TestBed.inject(TodoStore);
  });

  it('loads todo lists, selects the first list, and filters its todos', () => {
    store.loadTodos();

    expect(store.todoLists()).toEqual([
      { id: 'list-1', title: 'Inbox' },
      { id: 'list-2', title: 'Work' }
    ]);
    expect(store.selectedListId()).toBe('list-1');
    expect(api.listTodos).toHaveBeenCalledWith('list-1');
    expect(store.todos()).toEqual([
      { id: '1', title: 'Open task', completed: false },
      { id: '2', title: 'Done task', completed: true }
    ]);

    store.setFilter('active');
    expect(store.visibleTodos()).toEqual([{ id: '1', title: 'Open task', completed: false }]);
  });

  it('selects a list and loads only its todos', () => {
    api.listTodos.withArgs('list-2').and.returnValue(of([{ id: '4', title: 'Work task', completed: false }]));

    store.loadTodos();
    store.selectTodoList('list-2');

    expect(store.selectedListId()).toBe('list-2');
    expect(store.todos()).toEqual([{ id: '4', title: 'Work task', completed: false }]);
  });

  it('creates, renames, and deletes todo lists', () => {
    store.loadTodos();

    store.setNewListTitle('  Errands  ');
    store.createTodoList();

    expect(api.createTodoList).toHaveBeenCalledWith('Errands');
    expect(store.todoLists()).toContain(jasmine.objectContaining({ id: 'list-3', title: 'Errands' }));
    expect(store.selectedListId()).toBe('list-3');
    expect(store.newListTitle()).toBe('');

    store.startEditingTodoList({ id: 'list-3', title: 'Errands' });
    store.setEditListTitle('  Home  ');
    store.saveTodoListEdit();

    expect(api.updateTodoList).toHaveBeenCalledWith('list-3', 'Home');
    expect(store.todoLists()).toContain(jasmine.objectContaining({ id: 'list-3', title: 'Home' }));

    store.deleteTodoList('list-3');

    expect(api.deleteTodoList).toHaveBeenCalledWith('list-3');
    expect(store.todoLists()).toEqual([
      { id: 'list-1', title: 'Inbox' },
      { id: 'list-2', title: 'Work' }
    ]);
    expect(store.selectedListId()).toBe('list-1');
  });

  it('supports deleting the last todo list and leaves an empty app state', () => {
    api.listTodoLists.and.returnValue(of([{ id: 'list-1', title: 'Inbox' }]));
    store.loadTodos();

    store.deleteTodoList('list-1');

    expect(store.todoLists()).toEqual([]);
    expect(store.selectedListId()).toBeNull();
    expect(store.todos()).toEqual([]);
  });

  it('validates and creates todos', () => {
    store.loadTodos();

    store.setNewTitle('   ');
    store.createTodo();

    expect(store.errorMessage()).toBe('Title is required');

    store.setNewTitle('  New task  ');
    store.createTodo();

    expect(api.createTodo).toHaveBeenCalledWith('list-1', 'New task');
    expect(store.todos()).toEqual([
      { id: '1', title: 'Open task', completed: false },
      { id: '2', title: 'Done task', completed: true },
      { id: '3', title: 'New task', completed: false }
    ]);
    expect(store.newTitle()).toBe('');
    expect(store.errorMessage()).toBeNull();
  });

  it('tracks pending toggles and ignores duplicate toggle requests', () => {
    const pendingUpdate = new Subject<Todo>();
    api.updateTodo.and.returnValue(pendingUpdate.asObservable());
    const todo = { id: '1', title: 'Open task', completed: false };

    store.loadTodos();

    store.toggleTodo(todo);
    store.toggleTodo(todo);

    expect(api.updateTodo).toHaveBeenCalledOnceWith('list-1', '1', { completed: true });
    expect(store.isTogglePending('1')).toBeTrue();

    pendingUpdate.next({ id: '1', title: 'Open task', completed: true });
    pendingUpdate.complete();

    expect(store.isTogglePending('1')).toBeFalse();
  });

  it('keeps toggled todos visible while they fade out of the current filter', fakeAsync(() => {
    store.loadTodos();
    store.setFilter('active');

    store.toggleTodo({ id: '1', title: 'Open task', completed: false });

    expect(store.isTodoExiting('1')).toBeTrue();
    expect(store.visibleTodos()).toEqual([{ id: '1', title: 'Open task', completed: false }]);

    tick(180);

    expect(store.isTodoExiting('1')).toBeFalse();
    expect(store.visibleTodos()).toEqual([]);
  }));

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

  it('saves edits and moves to the next todo', () => {
    store.loadTodos();
    store.startEditing({ id: '1', title: 'Open task', completed: false });
    store.setEditTitle('  Saved first task  ');

    store.saveEditAndMove('next');

    expect(api.updateTodo).toHaveBeenCalledWith('list-1', '1', { title: 'Saved first task' });
    expect(store.todos()).toContain(jasmine.objectContaining({ id: '1', title: 'Saved first task' }));
    expect(store.editingId()).toBe('2');
    expect(store.editTitle()).toBe('Done task');
  });

  it('wraps edit navigation at the top and bottom of the visible list', () => {
    store.loadTodos();
    store.startEditing({ id: '1', title: 'Open task', completed: false });
    store.setEditTitle('Top saved task');

    store.saveEditAndMove('previous');

    expect(api.updateTodo).toHaveBeenCalledWith('list-1', '1', { title: 'Top saved task' });
    expect(store.editingId()).toBe('2');
    expect(store.editTitle()).toBe('Done task');

    store.setEditTitle('Bottom saved task');
    store.saveEditAndMove('next');

    expect(api.updateTodo).toHaveBeenCalledWith('list-1', '2', { title: 'Bottom saved task' });
    expect(store.editingId()).toBe('1');
    expect(store.editTitle()).toBe('Top saved task');
  });

  it('deletes todos after the fade-out state completes and clears edit state for the deleted todo', fakeAsync(() => {
    store.loadTodos();
    store.startEditing({ id: '1', title: 'Open task', completed: false });

    store.deleteTodo('1');

    expect(store.isTodoExiting('1')).toBeTrue();
    expect(store.todos()).toContain(jasmine.objectContaining({ id: '1' }));

    tick(180);

    expect(store.todos()).toEqual([{ id: '2', title: 'Done task', completed: true }]);
    expect(store.isTodoExiting('1')).toBeFalse();
    expect(store.editingId()).toBeNull();
  }));

  it('stores API error messages', () => {
    api.listTodoLists.and.returnValue(throwError(() => ({ error: { message: 'Could not reach API' } })));

    store.loadTodos();

    expect(store.errorMessage()).toBe('Could not reach API');
  });
});
