import { Component, input, output } from '@angular/core';

import { Todo } from '../todo.model';
import { EditMoveDirection } from '../todo-store.service';

export type TodoStatus = 'active' | 'done';

@Component({
  selector: 'app-todo-item',
  standalone: true,
  templateUrl: './todo-item.html'
})
export class TodoItemComponent {
  readonly todo = input.required<Todo>();
  readonly status = input.required<TodoStatus>();
  readonly editingId = input<string | null>(null);
  readonly editTitle = input('');
  readonly togglePending = input(false);
  readonly deletePending = input(false);
  readonly exiting = input(false);

  readonly toggleTodo = output<Todo>();
  readonly startEditing = output<Todo>();
  readonly setEditTitle = output<string>();
  readonly saveEdit = output<void>();
  readonly saveEditAndMove = output<EditMoveDirection>();
  readonly cancelEdit = output<void>();
  readonly deleteTodo = output<string>();

  protected saveEditAndMoveFromKeyboard(event: Event, direction: EditMoveDirection): void {
    event.preventDefault();
    this.saveEditAndMove.emit(direction);
  }
}
