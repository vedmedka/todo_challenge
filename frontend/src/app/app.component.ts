import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { TodoApiService } from './todo-api.service';
import { Todo, TodoFilter } from './todo.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private readonly todoApi = inject(TodoApiService);

  readonly newTitle = new FormControl('', { nonNullable: true });
  readonly editTitle = new FormControl('', { nonNullable: true });
  readonly todos = signal<Todo[]>([]);
  readonly filter = signal<TodoFilter>('all');
  readonly errorMessage = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly pendingToggleIds = signal<ReadonlySet<string>>(new Set<string>());

  readonly visibleTodos = computed(() => {
    const selectedFilter = this.filter();
    return this.todos().filter(todo => {
      if (selectedFilter === 'active') {
        return !todo.completed;
      }
      if (selectedFilter === 'completed') {
        return todo.completed;
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.todoApi.list().subscribe({
      next: todos => this.todos.set(todos),
      error: () => this.errorMessage.set('Could not load todos')
    });
  }

  createTodo(): void {
    const title = this.newTitle.value.trim();
    if (!title) {
      this.errorMessage.set('Title is required');
      return;
    }

    this.todoApi.create(title).subscribe({
      next: todo => {
        this.todos.update(todos => [...todos, todo]);
        this.newTitle.reset('');
        this.errorMessage.set(null);
      },
      error: error => this.errorMessage.set(this.extractError(error))
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
      error: error => this.errorMessage.set(this.extractError(error))
    });
  }

  isTogglePending(id: string): boolean {
    return this.pendingToggleIds().has(id);
  }

  startEditing(todo: Todo): void {
    this.editingId.set(todo.id);
    this.editTitle.setValue(todo.title);
    this.errorMessage.set(null);
  }

  saveEdit(): void {
    const id = this.editingId();
    if (!id) {
      return;
    }

    const title = this.editTitle.value.trim();
    if (!title) {
      this.errorMessage.set('Title is required');
      return;
    }

    this.todoApi.update(id, { title }).subscribe({
      next: updated => {
        this.replaceTodo(updated);
        this.editingId.set(null);
        this.editTitle.reset('');
        this.errorMessage.set(null);
      },
      error: error => this.errorMessage.set(this.extractError(error))
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editTitle.reset('');
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
      error: error => this.errorMessage.set(this.extractError(error))
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

  private extractError(error: unknown): string {
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
}
