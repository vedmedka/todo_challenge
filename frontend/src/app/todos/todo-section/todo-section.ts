import { NgTemplateOutlet } from '@angular/common';
import { Component, input, output } from '@angular/core';

import { Todo } from '../todo.model';
import { EditMoveDirection } from '../todo-store.service';
import { TodoItemComponent, TodoStatus } from '../todo-item/todo-item';

@Component({
  selector: 'app-todo-section',
  standalone: true,
  imports: [NgTemplateOutlet, TodoItemComponent],
  templateUrl: './todo-section.html'
})
export class TodoSectionComponent {
  readonly todos = input.required<readonly Todo[]>();
  readonly status = input.required<TodoStatus>();
  readonly label = input.required<string>();
  readonly headingId = input<string | null>(null);
  readonly heading = input<string | null>(null);
  readonly emptyMessage = input.required<string>();
  readonly editingId = input<string | null>(null);
  readonly editTitle = input('');
  readonly pendingToggleIds = input<ReadonlySet<string>>(new Set<string>());
  readonly pendingDeleteIds = input<ReadonlySet<string>>(new Set<string>());
  readonly exitingTodoIds = input<ReadonlySet<string>>(new Set<string>());

  readonly toggleTodo = output<Todo>();
  readonly startEditing = output<Todo>();
  readonly setEditTitle = output<string>();
  readonly saveEdit = output<void>();
  readonly saveEditAndMove = output<EditMoveDirection>();
  readonly cancelEdit = output<void>();
  readonly deleteTodo = output<string>();

  protected isTogglePending(id: string): boolean {
    return this.pendingToggleIds().has(id);
  }

  protected isDeletePending(id: string): boolean {
    return this.pendingDeleteIds().has(id);
  }

  protected isTodoExiting(id: string): boolean {
    return this.exitingTodoIds().has(id);
  }

  protected trackTodo(_index: number, todo: Todo): string {
    return todo.id;
  }
}
