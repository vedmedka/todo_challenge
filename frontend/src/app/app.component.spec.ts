import { of, Subject } from 'rxjs';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { TodoApiService } from './todo-api.service';
import { Todo, TodoChanges } from './todo.model';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let api: jasmine.SpyObj<TodoApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<TodoApiService>('TodoApiService', [
      'listTodoLists',
      'createTodoList',
      'updateTodoList',
      'deleteTodoList',
      'listTodos',
      'createTodo',
      'updateTodo',
      'deleteTodo'
    ]);
    api.listTodoLists.and.returnValue(of([
      { id: 'list-1', title: 'Inbox' },
      { id: 'list-2', title: 'Work' }
    ]));
    api.listTodos.and.returnValue(of([
      { id: '1', title: 'Open task', completed: false },
      { id: '2', title: 'Done task', completed: true }
    ]));
    api.createTodoList.and.callFake((title: string) => of({ id: 'list-3', title }));
    api.updateTodoList.and.callFake((id: string, title: string) => of({ id, title }));
    api.deleteTodoList.and.returnValue(of(undefined));
    api.createTodo.and.callFake((_listId: string, title: string) => of({ id: '3', title, completed: false }));
    api.updateTodo.and.callFake((_listId: string, id: string, changes: TodoChanges) => {
      const existing = id === '1'
        ? { id: '1', title: 'Open task', completed: false }
        : { id: '2', title: 'Done task', completed: true };
      return of({ ...existing, ...changes });
    });
    api.deleteTodo.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: TodoApiService, useValue: api }]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  it('renders todos loaded from the backend', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Inbox');
    expect(text).toContain('Work');
    expect(text).toContain('Open task');
    expect(text).toContain('Done task');
  });

  it('creates and selects todo lists from the sidebar', () => {
    fillInput('#new-list-title', 'Errands');

    clickButton('Add list');
    fixture.detectChanges();

    expect(api.createTodoList).toHaveBeenCalledWith('Errands');
    expect(fixture.nativeElement.textContent).toContain('Errands');
    expect(fixture.componentInstance.store.selectedListId()).toBe('list-3');
  });

  it('renames todo lists inline', () => {
    getButtonWithin(getListItem('Inbox'), 'Rename').click();
    fixture.detectChanges();

    fillInput('#edit-list-title', 'Personal');
    dispatchListEditKey('Enter');
    fixture.detectChanges();

    expect(api.updateTodoList).toHaveBeenCalledWith('list-1', 'Personal');
    expect(fixture.nativeElement.textContent).toContain('Personal');
  });

  it('confirms before deleting todo lists', () => {
    spyOn(window, 'confirm').and.returnValues(false, true);

    const inbox = getListItem('Inbox');
    getButtonWithin(inbox, 'Delete list').click();
    fixture.detectChanges();

    expect(api.deleteTodoList).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Inbox');

    getButtonWithin(inbox, 'Delete list').click();
    fixture.detectChanges();

    expect(api.deleteTodoList).toHaveBeenCalledWith('list-1');
    expect(fixture.nativeElement.textContent).not.toContain('Inbox');
  });

  it('validates empty todo titles before creating', () => {
    fillInput('#new-title', '   ');

    clickButton('Add');
    fixture.detectChanges();

    expect(api.createTodo).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Title is required');
  });

  it('creates todos and adds them to the list', () => {
    fillInput('#new-title', 'New task');

    clickButton('Add');
    fixture.detectChanges();

    expect(api.createTodo).toHaveBeenCalledWith('list-1', 'New task');
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

    expect(api.updateTodo).toHaveBeenCalledWith('list-1', '1', { completed: true });
  });

  it('disables the checkbox while a toggle update is pending', () => {
    const pendingUpdate = new Subject<Todo>();
    api.updateTodo.and.returnValue(pendingUpdate.asObservable());

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
    expect(api.updateTodo).toHaveBeenCalledWith('list-1', '1', { title: 'Edited task' });
  });

  it('saves inline edits when Enter is pressed', () => {
    const firstTodo = fixture.nativeElement.querySelector('[data-testid="todo-item"]') as HTMLElement;
    const titleButton = firstTodo.querySelector('.todo-title-button') as HTMLButtonElement;
    titleButton.click();
    fixture.detectChanges();
    fixture.detectChanges();

    fillInput('#edit-title', 'Keyboard saved task');
    dispatchEditKey('Enter');

    expect(api.updateTodo).toHaveBeenCalledWith('list-1', '1', { title: 'Keyboard saved task' });
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
    expect(api.updateTodo).toHaveBeenCalledWith('list-1', '1', { title: 'Arrow saved task' });
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

    expect(api.updateTodo).not.toHaveBeenCalledWith('list-1', '1', { title: 'Escaped task' });
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

    expect(api.updateTodo).not.toHaveBeenCalledWith('list-1', '1', { title: 'Draft before delete' });
    expect(api.deleteTodo).toHaveBeenCalledWith('list-1', '1');

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

    expect(api.deleteTodo).toHaveBeenCalledWith('list-1', '1');
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

  function dispatchListEditKey(key: string): void {
    const input = fixture.nativeElement.querySelector('#edit-list-title') as HTMLInputElement;
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

  function getListItem(label: string): HTMLElement {
    const items = Array.from(fixture.nativeElement.querySelectorAll('[data-testid="todo-list-item"]')) as HTMLElement[];
    return items
      .find(item => item.textContent?.includes(label)) as HTMLElement;
  }

  function getButtonWithin(element: HTMLElement, label: string): HTMLButtonElement {
    return Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.trim() === label) as HTMLButtonElement;
  }

  function buttonExists(label: string): boolean {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    return buttons.some(candidate => candidate.textContent?.trim() === label);
  }
});
