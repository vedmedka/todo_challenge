import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { TodoApiService } from './todo-api.service';
import { Todo, TodoChanges, TodoFilter } from './todo.model';
import { extractTodoErrorMessage, filterTodos } from './todo-utils';

const TODO_EXIT_ANIMATION_MS = 180;

export type EditMoveDirection = 'previous' | 'next';

@Injectable()
export class TodoStore {
  private readonly todoApi = inject(TodoApiService);
  private readonly exitTimers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly newTitle = signal('');
  readonly editTitle = signal('');
  readonly todos = signal<Todo[]>([]);
  readonly filter = signal<TodoFilter>('all');
  readonly errorMessage = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly pendingToggleIds = signal<ReadonlySet<string>>(new Set<string>());
  readonly pendingDeleteIds = signal<ReadonlySet<string>>(new Set<string>());
  readonly exitingTodoIds = signal<ReadonlySet<string>>(new Set<string>());

  readonly visibleTodos = computed(() => filterTodos(this.todos(), this.filter()));

  loadTodos(): void {
    this.todoApi.list().subscribe({
      next: todos => this.todos.set(todos),
      error: error => this.errorMessage.set(extractTodoErrorMessage(error))
    });
  }

  setNewTitle(title: string): void {
    this.newTitle.set(title);
  }

  setEditTitle(title: string): void {
    this.editTitle.set(title);
  }

  createTodo(): void {
    const title = this.newTitle().trim();
    if (!title) {
      this.errorMessage.set('Title is required');
      return;
    }

    this.todoApi.create(title).subscribe({
      next: todo => {
        this.todos.update(todos => [...todos, todo]);
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
    if (this.isTogglePending(todo.id) || this.isTodoExiting(todo.id)) {
      return;
    }

    this.setTogglePending(todo.id, true);
    this.todoApi.update(todo.id, { completed: !todo.completed }).pipe(
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
    const id = this.editingId();
    if (!id) {
      return;
    }

    const title = this.editTitle().trim();
    if (!title) {
      this.errorMessage.set('Title is required');
      return;
    }

    const changes: TodoChanges = { title };
    this.todoApi.update(id, changes).subscribe({
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
    const id = this.editingId();
    if (!id) {
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

    this.todoApi.update(id, changes).subscribe({
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
    if (this.isDeletePending(id) || this.isTodoExiting(id)) {
      return;
    }

    this.setDeletePending(id, true);
    this.todoApi.delete(id).pipe(
      finalize(() => this.setDeletePending(id, false))
    ).subscribe({
      next: () => {
        if (this.editingId() === id) {
          this.cancelEdit();
        }
        this.startTodoExit(id, () => this.todos.update(todos => todos.filter(todo => todo.id !== id)));
      },
      error: error => this.errorMessage.set(extractTodoErrorMessage(error))
    });
  }

  trackTodo(_index: number, todo: Todo): string {
    return todo.id;
  }

  private replaceTodo(updated: Todo): void {
    this.todos.update(todos => todos.map(todo => todo.id === updated.id ? updated : todo));
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
