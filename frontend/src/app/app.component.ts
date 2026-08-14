import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, effect, inject } from '@angular/core';

import { EditMoveDirection, TodoStore } from './todo-store.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  providers: [TodoStore],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
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

  saveEditOnBlur(): void {
    if (this.skipNextEditBlur) {
      this.skipNextEditBlur = false;
      return;
    }

    this.store.saveEdit();
  }

  saveEditAndMove(event: Event, direction: EditMoveDirection): void {
    event.preventDefault();
    this.skipNextEditBlur = true;
    this.store.saveEditAndMove(direction);
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
