import { of, Subject } from 'rxjs';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { TodoApiService } from './todo-api.service';
import { Todo, TodoChanges } from './todo.model';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let api: jasmine.SpyObj<TodoApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<TodoApiService>('TodoApiService', ['list', 'create', 'update', 'delete']);
    api.list.and.returnValue(of([
      { id: '1', title: 'Open task', completed: false },
      { id: '2', title: 'Done task', completed: true }
    ]));
    api.create.and.callFake((title: string) => of({ id: '3', title, completed: false }));
    api.update.and.callFake((id: string, changes: TodoChanges) => {
      const existing = id === '1'
        ? { id: '1', title: 'Open task', completed: false }
        : { id: '2', title: 'Done task', completed: true };
      return of({ ...existing, ...changes });
    });
    api.delete.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: TodoApiService, useValue: api }]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  it('renders todos loaded from the backend', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Open task');
    expect(text).toContain('Done task');
  });

  it('validates empty todo titles before creating', () => {
    fillInput('#new-title', '   ');

    clickButton('Add');
    fixture.detectChanges();

    expect(api.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Title is required');
  });

  it('creates todos and adds them to the list', () => {
    fillInput('#new-title', 'New task');

    clickButton('Add');
    fixture.detectChanges();

    expect(api.create).toHaveBeenCalledWith('New task');
    expect(fixture.nativeElement.textContent).toContain('New task');
  });

  it('filters active and completed todos', () => {
    clickButton('Active');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Open task');
    expect(fixture.nativeElement.textContent).not.toContain('Done task');

    clickButton('Completed');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Open task');
    expect(fixture.nativeElement.textContent).toContain('Done task');
  });

  it('toggles todo completion', () => {
    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.click();

    expect(api.update).toHaveBeenCalledWith('1', { completed: true });
  });

  it('disables the checkbox while a toggle update is pending', () => {
    const pendingUpdate = new Subject<Todo>();
    api.update.and.returnValue(pendingUpdate.asObservable());

    fixture.componentInstance.store.toggleTodo({ id: '1', title: 'Open task', completed: false });
    fixture.detectChanges();

    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.disabled).toBeTrue();

    pendingUpdate.next({ id: '1', title: 'Open task', completed: true });
    pendingUpdate.complete();
    fixture.detectChanges();

    expect(checkbox.disabled).toBeFalse();
  });

  it('starts inline editing from the todo title without rendering an edit button', fakeAsync(() => {
    const firstTodo = fixture.nativeElement.querySelector('[data-testid="todo-item"]') as HTMLElement;
    const titleButton = firstTodo.querySelector('.todo-title-button') as HTMLButtonElement;

    expect(Array.from(firstTodo.querySelectorAll('button'))
      .some(button => button.textContent?.trim() === 'Edit')).toBeFalse();

    titleButton.click();
    fixture.detectChanges();
    fixture.detectChanges();
    tick(20);

    const editInput = fixture.nativeElement.querySelector('#edit-title') as HTMLInputElement;
    expect(editInput).not.toBeNull();
    expect(document.activeElement).toBe(editInput);
  }));

  it('saves inline edits when the input loses focus', () => {
    const firstTodo = fixture.nativeElement.querySelector('[data-testid="todo-item"]') as HTMLElement;
    const titleButton = firstTodo.querySelector('.todo-title-button') as HTMLButtonElement;
    titleButton.click();
    fixture.detectChanges();
    fixture.detectChanges();

    fillInput('#edit-title', 'Edited task');
    blurEditInput();

    expect(buttonExists('Save')).toBeFalse();
    expect(buttonExists('Cancel')).toBeFalse();
    expect(api.update).toHaveBeenCalledWith('1', { title: 'Edited task' });
  });

  it('saves inline edits when Enter is pressed', () => {
    const firstTodo = fixture.nativeElement.querySelector('[data-testid="todo-item"]') as HTMLElement;
    const titleButton = firstTodo.querySelector('.todo-title-button') as HTMLButtonElement;
    titleButton.click();
    fixture.detectChanges();
    fixture.detectChanges();

    fillInput('#edit-title', 'Keyboard saved task');
    dispatchEditKey('Enter');

    expect(api.update).toHaveBeenCalledWith('1', { title: 'Keyboard saved task' });
  });

  it('saves inline edits and activates the next todo when ArrowDown is pressed', fakeAsync(() => {
    const firstTodo = fixture.nativeElement.querySelector('[data-testid="todo-item"]') as HTMLElement;
    const titleButton = firstTodo.querySelector('.todo-title-button') as HTMLButtonElement;
    titleButton.click();
    fixture.detectChanges();
    fixture.detectChanges();
    tick(20);

    fillInput('#edit-title', 'Arrow saved task');
    dispatchEditKey('ArrowDown');
    fixture.detectChanges();
    fixture.detectChanges();
    tick(20);

    const editInput = fixture.nativeElement.querySelector('#edit-title') as HTMLInputElement;
    expect(api.update).toHaveBeenCalledWith('1', { title: 'Arrow saved task' });
    expect(fixture.componentInstance.store.editingId()).toBe('2');
    expect(editInput.value).toBe('Done task');
    expect(document.activeElement).toBe(editInput);
  }));

  it('cancels inline edits when Escape is pressed', () => {
    const firstTodo = fixture.nativeElement.querySelector('[data-testid="todo-item"]') as HTMLElement;
    const titleButton = firstTodo.querySelector('.todo-title-button') as HTMLButtonElement;
    titleButton.click();
    fixture.detectChanges();
    fixture.detectChanges();

    fillInput('#edit-title', 'Escaped task');
    dispatchEditKey('Escape');
    fixture.detectChanges();

    expect(api.update).not.toHaveBeenCalledWith('1', { title: 'Escaped task' });
    expect(fixture.nativeElement.querySelector('#edit-title')).toBeNull();
  });

  it('deletes todos from inline edit mode without saving the draft', fakeAsync(() => {
    const firstTodo = fixture.nativeElement.querySelector('[data-testid="todo-item"]') as HTMLElement;
    const titleButton = firstTodo.querySelector('.todo-title-button') as HTMLButtonElement;
    titleButton.click();
    fixture.detectChanges();
    fixture.detectChanges();

    fillInput('#edit-title', 'Draft before delete');
    const deleteButton = Array.from(firstTodo.querySelectorAll('button'))
      .find(button => button.textContent?.trim() === 'Delete') as HTMLButtonElement;
    deleteButton.click();
    fixture.detectChanges();

    expect(api.update).not.toHaveBeenCalledWith('1', { title: 'Draft before delete' });
    expect(api.delete).toHaveBeenCalledWith('1');

    tick(180);
    fixture.detectChanges();

    expect(fixture.componentInstance.store.todos()).not.toContain(jasmine.objectContaining({ id: '1' }));
  }));

  it('fades deleted todos out before removing them', fakeAsync(() => {
    const firstTodo = fixture.nativeElement.querySelector('[data-testid="todo-item"]') as HTMLElement;
    const deleteButton = Array.from(firstTodo.querySelectorAll('button'))
      .find(button => button.textContent?.trim() === 'Delete') as HTMLButtonElement;
    deleteButton.click();
    fixture.detectChanges();

    expect(api.delete).toHaveBeenCalledWith('1');
    expect(firstTodo.classList).toContain('exiting');
    expect(fixture.componentInstance.store.todos()).toContain(jasmine.objectContaining({ id: '1' }));

    tick(180);
    fixture.detectChanges();

    expect(fixture.componentInstance.store.todos()).not.toContain(jasmine.objectContaining({ id: '1' }));
  }));

  function fillInput(selector: string, value: string): void {
    const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function dispatchEditKey(key: string): void {
    const input = fixture.nativeElement.querySelector('#edit-title') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key }));
  }

  function blurEditInput(): void {
    const input = fixture.nativeElement.querySelector('#edit-title') as HTMLInputElement;
    input.dispatchEvent(new FocusEvent('blur'));
  }

  function clickButton(label: string): void {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const button = buttons
      .find(candidate => candidate.textContent?.trim() === label) as HTMLButtonElement;
    button.click();
  }

  function buttonExists(label: string): boolean {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    return buttons.some(candidate => candidate.textContent?.trim() === label);
  }
});
