import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Todo } from '../todo.model';
import { TodoItemComponent } from './todo-item';

describe('TodoItemComponent', () => {
  let fixture: ComponentFixture<TodoItemComponent>;
  let component: TodoItemComponent;
  const todo: Todo = { id: 'todo-1', title: 'Write tests', completed: false };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodoItemComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TodoItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('todo', todo);
    fixture.componentRef.setInput('status', 'active');
    fixture.componentRef.setInput('editingId', null);
    fixture.componentRef.setInput('editTitle', '');
    fixture.componentRef.setInput('togglePending', false);
    fixture.componentRef.setInput('deletePending', false);
    fixture.componentRef.setInput('exiting', false);
    fixture.detectChanges();
  });

  it('renders a stable todo row for e2e selectors', () => {
    const item = fixture.nativeElement.querySelector('[data-testid="todo-item"]') as HTMLElement;
    const titleButton = fixture.nativeElement.querySelector('.todo-title-button') as HTMLButtonElement;

    expect(item.getAttribute('data-status')).toBe('active');
    expect(titleButton.textContent?.trim()).toBe('Write tests');
  });

  it('emits todo row actions from presentation controls', () => {
    const toggled: Todo[] = [];
    const edited: Todo[] = [];
    const deleted: string[] = [];
    component.toggleTodo.subscribe(value => toggled.push(value));
    component.startEditing.subscribe(value => edited.push(value));
    component.deleteTodo.subscribe(value => deleted.push(value));

    (fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    (fixture.nativeElement.querySelector('.todo-title-button') as HTMLButtonElement).click();
    getButton('Delete todo').click();

    expect(toggled).toEqual([todo]);
    expect(edited).toEqual([todo]);
    expect(deleted).toEqual(['todo-1']);
  });

  it('renders edit mode and emits keyboard edit actions', () => {
    const titles: string[] = [];
    const moveDirections: string[] = [];
    let saved = 0;
    let cancelled = 0;
    component.setEditTitle.subscribe(value => titles.push(value));
    component.saveEdit.subscribe(() => saved += 1);
    component.saveEditAndMove.subscribe(value => moveDirections.push(value));
    component.cancelEdit.subscribe(() => cancelled += 1);
    fixture.componentRef.setInput('editingId', 'todo-1');
    fixture.componentRef.setInput('editTitle', 'Write tests');
    fixture.detectChanges();

    const editInput = fixture.nativeElement.querySelector('#edit-title') as HTMLInputElement;
    editInput.value = 'Edited title';
    editInput.dispatchEvent(new Event('input'));
    editInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    editInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    editInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(titles).toEqual(['Edited title']);
    expect(saved).toBe(1);
    expect(moveDirections).toEqual(['next']);
    expect(cancelled).toBe(1);
  });

  function getButton(label: string): HTMLButtonElement {
    return (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[])
      .find(button => (button.getAttribute('aria-label') ?? button.textContent?.trim()) === label) as HTMLButtonElement;
  }
});
