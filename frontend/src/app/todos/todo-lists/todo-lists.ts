import { Component, input, output } from '@angular/core';

import { TodoList } from '../todo.model';

@Component({
  selector: 'app-todo-lists',
  standalone: true,
  templateUrl: './todo-lists.html'
})
export class TodoListsComponent {
  readonly todoLists = input.required<readonly TodoList[]>();
  readonly selectedListId = input<string | null>(null);
  readonly editingListId = input<string | null>(null);
  readonly newListTitle = input('');
  readonly editListTitle = input('');
  readonly activeTodoCounts = input<Readonly<Record<string, number>>>({});
  readonly pendingListDeleteIds = input<ReadonlySet<string>>(new Set<string>());

  readonly selectTodoList = output<string>();
  readonly startEditingTodoList = output<TodoList>();
  readonly deleteTodoList = output<string>();
  readonly setNewListTitle = output<string>();
  readonly createTodoList = output<void>();
  readonly setEditListTitle = output<string>();
  readonly saveTodoListEdit = output<void>();
  readonly cancelTodoListEdit = output<void>();

  protected activeTodoCountForList(id: string): number {
    return this.activeTodoCounts()[id] ?? 0;
  }

  protected isListDeletePending(id: string): boolean {
    return this.pendingListDeleteIds().has(id);
  }
}
