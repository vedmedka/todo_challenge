import { of, Subject } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';

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

  it('edits todo titles', () => {
    fixture.componentInstance.store.startEditing({ id: '1', title: 'Open task', completed: false });
    fixture.detectChanges();
    fillInput('#edit-title', 'Edited task');

    clickButton('Save');

    expect(api.update).toHaveBeenCalledWith('1', { title: 'Edited task' });
  });

  it('deletes todos', () => {
    const firstTodo = fixture.nativeElement.querySelector('[data-testid="todo-item"]') as HTMLElement;
    const deleteButton = Array.from(firstTodo.querySelectorAll('button'))
      .find(button => button.textContent?.trim() === 'Delete') as HTMLButtonElement;
    deleteButton.click();

    expect(api.delete).toHaveBeenCalledWith('1');
    expect(fixture.componentInstance.store.todos()).not.toContain(jasmine.objectContaining({ id: '1' }));
  });

  function fillInput(selector: string, value: string): void {
    const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function clickButton(label: string): void {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const button = buttons
      .find(candidate => candidate.textContent?.trim() === label) as HTMLButtonElement;
    button.click();
  }
});
