import { Component, ElementRef, OnDestroy, OnInit, ViewEncapsulation, effect, inject } from '@angular/core';

import { TodoListsComponent } from '../todo-lists/todo-lists';
import { TodoSectionComponent } from '../todo-section/todo-section';
import { EditMoveDirection, TodoStore } from '../todo-store.service';

@Component({
  selector: 'app-todo-page',
  standalone: true,
  imports: [TodoListsComponent, TodoSectionComponent],
  providers: [TodoStore],
  templateUrl: './todo-page.html',
  styleUrl: './todo-page.css',
  encapsulation: ViewEncapsulation.None
})
export class TodoPageComponent implements OnInit, OnDestroy {
  readonly store = inject(TodoStore);
  private readonly hostElement = inject(ElementRef<HTMLElement>);

  private focusedEditingId: string | null = null;
  private focusTimer: ReturnType<typeof setTimeout> | null = null;
  private skipNextEditBlur = false;
  private readonly editFocusEffect = effect(() => {
    const editingId = this.store.editingId();

    if (!editingId) {
      this.focusedEditingId = null;
      return;
    }

    if (this.focusedEditingId === editingId) {
      return;
    }

    this.focusedEditingId = editingId;
    this.scheduleEditInputFocus(editingId);
  });

  ngOnInit(): void {
    this.store.loadTodos();
  }

  ngOnDestroy(): void {
    if (this.focusTimer) {
      clearTimeout(this.focusTimer);
    }
  }

  protected saveEditOnBlur(): void {
    if (this.skipNextEditBlur) {
      this.skipNextEditBlur = false;
      return;
    }

    this.store.saveEdit();
  }

  protected saveEditAndMove(direction: EditMoveDirection): void {
    this.skipNextEditBlur = true;
    this.store.saveEditAndMove(direction);
  }

  protected confirmDeleteTodoList(id: string): void {
    if (!window.confirm('Delete this list and all todos in it?')) {
      return;
    }

    this.store.deleteTodoList(id);
  }

  private scheduleEditInputFocus(editingId: string): void {
    if (this.focusTimer) {
      clearTimeout(this.focusTimer);
    }

    this.focusTimer = setTimeout(() => {
      this.focusEditInput(editingId);
      this.focusTimer = setTimeout(() => {
        this.focusEditInput(editingId);
        this.focusTimer = null;
      }, 20);
    });
  }

  private focusEditInput(editingId: string): void {
    if (this.store.editingId() !== editingId) {
      return;
    }

    const input = this.findEditInput();
    if (!input) {
      return;
    }

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  private findEditInput(): HTMLInputElement | null {
    return this.hostElement.nativeElement.querySelector('#edit-title');
  }
}
