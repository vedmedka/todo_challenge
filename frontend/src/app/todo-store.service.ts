import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { TodoApiService } from './todo-api.service';
import { Todo, TodoChanges, TodoFilter, TodoList } from './todo.model';
import { extractTodoErrorMessage, filterTodos } from './todo-utils';

const TODO_EXIT_ANIMATION_MS = 180;

export type EditMoveDirection = 'previous' | 'next';

@Injectable()
export class TodoStore {
  private readonly todoApi = inject(TodoApiService);
  private readonly exitTimers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly newListTitle = signal('');
  readonly newTitle = signal('');
  readonly editListTitle = signal('');
  readonly editTitle = signal('');
  readonly todoLists = signal<TodoList[]>([]);
  readonly selectedListId = signal<string | null>(null);
  readonly todos = signal<Todo[]>([]);
  readonly filter = signal<TodoFilter>('all');
  readonly errorMessage = signal<string | null>(null);
  readonly editingListId = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly pendingListDeleteIds = signal<ReadonlySet<string>>(new Set<string>());
  readonly pendingToggleIds = signal<ReadonlySet<string>>(new Set<string>());
  readonly pendingDeleteIds = signal<ReadonlySet<string>>(new Set<string>());
  readonly exitingTodoIds = signal<ReadonlySet<string>>(new Set<string>());
  readonly activeTodoCounts = signal<Readonly<Record<string, number>>>({});

  readonly selectedTodoList = computed(() => {
    const selectedListId = this.selectedListId();
    return this.todoLists().find(list => list.id === selectedListId) ?? null;
  });
  readonly activeTodos = computed(() => this.todos().filter(todo => !todo.completed));
  readonly completedTodos = computed(() => this.todos().filter(todo => todo.completed));
  readonly visibleTodos = computed(() => filterTodos(this.todos(), this.filter()));

  loadTodos(): void {
    this.todoApi.listTodoLists().subscribe({
      next: lists => {
        this.todoLists.set(lists);
        const currentListId = this.selectedListId();
        const selectedList = currentListId && lists.some(list => list.id === currentListId)
          ? currentListId
          : (lists[0]?.id ?? null);
        this.selectedListId.set(selectedList);

        if (selectedList) {
          this.loadTodosForList(selectedList);
        } else {
          this.todos.set([]);
        }
        this.refreshActiveCounts(lists, selectedList);
      },
      error: error => this.errorMessage.set(extractTodoErrorMessage(error))
    });
  }

  activeTodoCountForList(id: string): number {
    return this.activeTodoCounts()[id] ?? 0;
  }

  setNewListTitle(title: string): void {
    this.newListTitle.set(title);
  }

  setNewTitle(title: string): void {
    this.newTitle.set(title);
  }

  setEditListTitle(title: string): void {
    this.editListTitle.set(title);
  }

  setEditTitle(title: string): void {
    this.editTitle.set(title);
  }

  createTodoList(): void {
    const title = this.newListTitle().trim();
    if (!title) {
      this.errorMessage.set('List title is required');
      return;
    }

    this.todoApi.createTodoList(title).subscribe({
      next: list => {
        this.todoLists.update(lists => [...lists, list]);
        this.selectedListId.set(list.id);
        this.todos.set([]);
        this.setActiveTodoCount(list.id, 0);
        this.newListTitle.set('');
        this.cancelTodoListEdit();
        this.errorMessage.set(null);
      },
      error: error => this.errorMessage.set(extractTodoErrorMessage(error))
    });
  }

  selectTodoList(id: string): void {
    if (this.selectedListId() === id) {
      return;
    }

    this.selectedListId.set(id);
    this.cancelEdit();
    this.cancelTodoListEdit();
    this.filter.set('all');
    this.todos.set([]);
    this.loadTodosForList(id);
  }

  startEditingTodoList(list: TodoList): void {
    this.editingListId.set(list.id);
    this.editListTitle.set(list.title);
    this.errorMessage.set(null);
  }

  saveTodoListEdit(): void {
    const id = this.editingListId();
    if (!id) {
      return;
    }

    const title = this.editListTitle().trim();
    if (!title) {
      this.errorMessage.set('List title is required');
      return;
    }

    this.todoApi.updateTodoList(id, title).subscribe({
      next: updated => {
        this.todoLists.update(lists => lists.map(list => list.id === updated.id ? updated : list));
        this.cancelTodoListEdit();
        this.errorMessage.set(null);
      },
      error: error => this.errorMessage.set(extractTodoErrorMessage(error))
    });
  }

  cancelTodoListEdit(): void {
    this.editingListId.set(null);
    this.editListTitle.set('');
  }

  deleteTodoList(id: string): void {
    if (this.isListDeletePending(id)) {
      return;
    }

    this.setListDeletePending(id, true);
    this.todoApi.deleteTodoList(id).pipe(
      finalize(() => this.setListDeletePending(id, false))
    ).subscribe({
      next: () => {
        const remainingLists = this.todoLists().filter(list => list.id !== id);
        this.todoLists.set(remainingLists);
        this.removeActiveTodoCount(id);

        if (this.editingListId() === id) {
          this.cancelTodoListEdit();
        }

        if (this.selectedListId() !== id) {
          return;
        }

        const nextListId = remainingLists[0]?.id ?? null;
        this.selectedListId.set(nextListId);
        this.cancelEdit();
        if (nextListId) {
          this.loadTodosForList(nextListId);
        } else {
          this.todos.set([]);
        }
      },
      error: error => this.errorMessage.set(extractTodoErrorMessage(error))
    });
  }

  isListDeletePending(id: string): boolean {
    return this.pendingListDeleteIds().has(id);
  }

  createTodo(): void {
    const selectedListId = this.selectedListId();
    if (!selectedListId) {
      this.errorMessage.set('Create a list first');
      return;
    }

    const title = this.newTitle().trim();
    if (!title) {
      this.errorMessage.set('Title is required');
      return;
    }

    this.todoApi.createTodo(selectedListId, title).subscribe({
      next: todo => {
        this.todos.update(todos => [...todos, todo]);
        this.updateActiveCountForSelectedTodos();
        this.newTitle.set('');
        this.errorMessage.set(null);
      },
      error: error => this.errorMessage.set(extractTodoErrorMessage(error))
    });
  }

  setFilter(filter: TodoFilter): void {
    this.filter.set(filter);
  }

  toggleTodo(todo: Todo): void {
    const selectedListId = this.selectedListId();
    if (!selectedListId) {
      return;
    }

    if (this.isTogglePending(todo.id) || this.isTodoExiting(todo.id)) {
      return;
    }

    this.setTogglePending(todo.id, true);
    this.todoApi.updateTodo(selectedListId, todo.id, { completed: !todo.completed }).pipe(
      finalize(() => this.setTogglePending(todo.id, false))
    ).subscribe({
      next: updated => {
        if (this.shouldFadeBeforeReplacing(todo, updated)) {
          this.startTodoExit(todo.id, () => this.replaceTodo(updated));
          return;
        }

        this.replaceTodo(updated);
      },
      error: error => this.errorMessage.set(extractTodoErrorMessage(error))
    });
  }

  isTogglePending(id: string): boolean {
    return this.pendingToggleIds().has(id);
  }

  isDeletePending(id: string): boolean {
    return this.pendingDeleteIds().has(id);
  }

  isTodoExiting(id: string): boolean {
    return this.exitingTodoIds().has(id);
  }

  startEditing(todo: Todo): void {
    if (this.isTodoExiting(todo.id)) {
      return;
    }

    this.editingId.set(todo.id);
    this.editTitle.set(todo.title);
    this.errorMessage.set(null);
  }

  saveEdit(): void {
    const selectedListId = this.selectedListId();
    const id = this.editingId();
    if (!selectedListId || !id) {
      return;
    }

    const title = this.editTitle().trim();
    if (!title) {
      this.errorMessage.set('Title is required');
      return;
    }

    const changes: TodoChanges = { title };
    this.todoApi.updateTodo(selectedListId, id, changes).subscribe({
      next: updated => {
        this.replaceTodo(updated);
        this.editingId.set(null);
        this.editTitle.set('');
        this.errorMessage.set(null);
      },
      error: error => this.errorMessage.set(extractTodoErrorMessage(error))
    });
  }

  saveEditAndMove(direction: EditMoveDirection): void {
    const selectedListId = this.selectedListId();
    const id = this.editingId();
    if (!selectedListId || !id) {
      return;
    }

    const currentTodos = this.visibleTodos();
    const currentIndex = currentTodos.findIndex(todo => todo.id === id);
    if (currentIndex === -1 || currentTodos.length === 0) {
      return;
    }

    const title = this.editTitle().trim();
    if (!title) {
      this.errorMessage.set('Title is required');
      return;
    }

    const nextIndex = this.getMovedEditIndex(currentIndex, currentTodos.length, direction);
    const nextTodo = currentTodos[nextIndex];
    const changes: TodoChanges = { title };

    this.todoApi.updateTodo(selectedListId, id, changes).subscribe({
      next: updated => {
        this.replaceTodo(updated);
        this.startEditing(nextTodo.id === updated.id ? updated : nextTodo);
      },
      error: error => this.errorMessage.set(extractTodoErrorMessage(error))
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editTitle.set('');
    this.errorMessage.set(null);
  }

  deleteTodo(id: string): void {
    const selectedListId = this.selectedListId();
    if (!selectedListId) {
      return;
    }

    if (this.isDeletePending(id) || this.isTodoExiting(id)) {
      return;
    }

    this.setDeletePending(id, true);
    this.todoApi.deleteTodo(selectedListId, id).pipe(
      finalize(() => this.setDeletePending(id, false))
    ).subscribe({
      next: () => {
        if (this.editingId() === id) {
          this.cancelEdit();
        }
        this.startTodoExit(id, () => {
          this.todos.update(todos => todos.filter(todo => todo.id !== id));
          this.updateActiveCountForSelectedTodos();
        });
      },
      error: error => this.errorMessage.set(extractTodoErrorMessage(error))
    });
  }

  trackTodo(_index: number, todo: Todo): string {
    return todo.id;
  }

  private replaceTodo(updated: Todo): void {
    this.todos.update(todos => todos.map(todo => todo.id === updated.id ? updated : todo));
    this.updateActiveCountForSelectedTodos();
  }

  private shouldFadeBeforeReplacing(current: Todo, updated: Todo): boolean {
    const visibleBeforeUpdate = filterTodos([current], this.filter()).length > 0;
    const visibleAfterUpdate = filterTodos([updated], this.filter()).length > 0;

    return visibleBeforeUpdate && !visibleAfterUpdate;
  }

  private getMovedEditIndex(currentIndex: number, todoCount: number, direction: EditMoveDirection): number {
    if (direction === 'previous') {
      return currentIndex === 0 ? todoCount - 1 : currentIndex - 1;
    }

    return currentIndex === todoCount - 1 ? 0 : currentIndex + 1;
  }

  private startTodoExit(id: string, afterExit: () => void): void {
    this.setTodoExiting(id, true);

    const existingTimer = this.exitTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.exitTimers.delete(id);
      afterExit();
      this.setTodoExiting(id, false);
    }, TODO_EXIT_ANIMATION_MS);
    this.exitTimers.set(id, timer);
  }

  private loadTodosForList(todoListId: string): void {
    this.todoApi.listTodos(todoListId).subscribe({
      next: todos => {
        this.setActiveTodoCount(todoListId, this.countActiveTodos(todos));
        if (this.selectedListId() === todoListId) {
          this.todos.set(todos);
          this.errorMessage.set(null);
        }
      },
      error: error => this.errorMessage.set(extractTodoErrorMessage(error))
    });
  }

  private refreshActiveCounts(lists: TodoList[], selectedListId: string | null): void {
    for (const list of lists) {
      if (list.id === selectedListId) {
        continue;
      }

      this.todoApi.listTodos(list.id).subscribe({
        next: todos => this.setActiveTodoCount(list.id, this.countActiveTodos(todos)),
        error: error => this.errorMessage.set(extractTodoErrorMessage(error))
      });
    }
  }

  private updateActiveCountForSelectedTodos(): void {
    const selectedListId = this.selectedListId();
    if (!selectedListId) {
      return;
    }

    this.setActiveTodoCount(selectedListId, this.countActiveTodos(this.todos()));
  }

  private setActiveTodoCount(listId: string, count: number): void {
    this.activeTodoCounts.update(counts => ({ ...counts, [listId]: count }));
  }

  private removeActiveTodoCount(listId: string): void {
    this.activeTodoCounts.update(counts => {
      const { [listId]: _removed, ...remainingCounts } = counts;
      return remainingCounts;
    });
  }

  private countActiveTodos(todos: Todo[]): number {
    return todos.filter(todo => !todo.completed).length;
  }

  private setListDeletePending(id: string, pending: boolean): void {
    this.pendingListDeleteIds.update(ids => {
      const nextIds = new Set(ids);
      if (pending) {
        nextIds.add(id);
      } else {
        nextIds.delete(id);
      }
      return nextIds;
    });
  }

  private setTogglePending(id: string, pending: boolean): void {
    this.pendingToggleIds.update(ids => {
      const nextIds = new Set(ids);
      if (pending) {
        nextIds.add(id);
      } else {
        nextIds.delete(id);
      }
      return nextIds;
    });
  }

  private setDeletePending(id: string, pending: boolean): void {
    this.pendingDeleteIds.update(ids => {
      const nextIds = new Set(ids);
      if (pending) {
        nextIds.add(id);
      } else {
        nextIds.delete(id);
      }
      return nextIds;
    });
  }

  private setTodoExiting(id: string, exiting: boolean): void {
    this.exitingTodoIds.update(ids => {
      const nextIds = new Set(ids);
      if (exiting) {
        nextIds.add(id);
      } else {
        nextIds.delete(id);
      }
      return nextIds;
    });
  }
}
