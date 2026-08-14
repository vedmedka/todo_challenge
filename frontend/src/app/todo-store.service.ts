import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { TodoApiService } from './todo-api.service';
import { Todo, TodoChanges, TodoFilter } from './todo.model';
import { extractTodoErrorMessage, filterTodos } from './todo-utils';

@Injectable()
export class TodoStore {
  private readonly todoApi = inject(TodoApiService);

  readonly newTitle = signal('');
  readonly editTitle = signal('');
  readonly todos = signal<Todo[]>([]);
  readonly filter = signal<TodoFilter>('all');
  readonly errorMessage = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly pendingToggleIds = signal<ReadonlySet<string>>(new Set<string>());

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
    if (this.isTogglePending(todo.id)) {
      return;
    }

    this.setTogglePending(todo.id, true);
    this.todoApi.update(todo.id, { completed: !todo.completed }).pipe(
      finalize(() => this.setTogglePending(todo.id, false))
    ).subscribe({
      next: updated => this.replaceTodo(updated),
      error: error => this.errorMessage.set(extractTodoErrorMessage(error))
    });
  }

  isTogglePending(id: string): boolean {
    return this.pendingToggleIds().has(id);
  }

  startEditing(todo: Todo): void {
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

  cancelEdit(): void {
    this.editingId.set(null);
    this.editTitle.set('');
    this.errorMessage.set(null);
  }

  deleteTodo(id: string): void {
    this.todoApi.delete(id).subscribe({
      next: () => {
        this.todos.update(todos => todos.filter(todo => todo.id !== id));
        if (this.editingId() === id) {
          this.cancelEdit();
        }
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
}
