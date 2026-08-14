import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodoList } from '../todo.model';
import { TodoListsComponent } from './todo-lists';

describe('TodoListsComponent', () => {
  let fixture: ComponentFixture<TodoListsComponent>;
  let component: TodoListsComponent;
  const lists: TodoList[] = [
    { id: 'list-1', title: 'Inbox' },
    { id: 'list-2', title: 'Work' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodoListsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TodoListsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('todoLists', lists);
    fixture.componentRef.setInput('selectedListId', 'list-1');
    fixture.componentRef.setInput('editingListId', null);
    fixture.componentRef.setInput('newListTitle', '');
    fixture.componentRef.setInput('editListTitle', '');
    fixture.componentRef.setInput('activeTodoCounts', { 'list-1': 1, 'list-2': 0 });
    fixture.componentRef.setInput('pendingListDeleteIds', new Set<string>());
    fixture.detectChanges();
  });

  it('renders lists, counts, and stable e2e selectors', () => {
    const items = fixture.nativeElement.querySelectorAll('[data-testid="todo-list-item"]');
    const text = fixture.nativeElement.textContent as string;

    expect(items.length).toBe(2);
    expect(text).toContain('2 LISTS');
    expect(text).toContain('Inbox');
    expect(text).toContain('Work');
    expect(text).toContain('1');
  });

  it('emits sidebar actions from presentation controls', () => {
    const selected: string[] = [];
    const edited: TodoList[] = [];
    const deleted: string[] = [];
    component.selectTodoList.subscribe(value => selected.push(value));
    component.startEditingTodoList.subscribe(value => edited.push(value));
    component.deleteTodoList.subscribe(value => deleted.push(value));

    const workItem = getListItem('Work');
    (workItem.querySelector('.list-title-button') as HTMLButtonElement).click();
    getButtonWithin(workItem, 'Rename list').click();
    getButtonWithin(workItem, 'Delete list').click();

    expect(selected).toEqual(['list-2']);
    expect(edited).toEqual([{ id: 'list-2', title: 'Work' }]);
    expect(deleted).toEqual(['list-2']);
  });

  it('renders list edit mode and emits form changes', () => {
    const titles: string[] = [];
    let saved = 0;
    let cancelled = 0;
    component.setEditListTitle.subscribe(value => titles.push(value));
    component.saveTodoListEdit.subscribe(() => saved += 1);
    component.cancelTodoListEdit.subscribe(() => cancelled += 1);
    fixture.componentRef.setInput('editingListId', 'list-1');
    fixture.componentRef.setInput('editListTitle', 'Inbox');
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#edit-list-title') as HTMLInputElement;
    input.value = 'Personal';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(titles).toEqual(['Personal']);
    expect(saved).toBe(1);
    expect(cancelled).toBe(1);
  });

  function getListItem(label: string): HTMLElement {
    const items = Array.from(fixture.nativeElement.querySelectorAll('[data-testid="todo-list-item"]')) as HTMLElement[];
    return items.find(item => item.textContent?.includes(label)) as HTMLElement;
  }

  function getButtonWithin(element: HTMLElement, label: string): HTMLButtonElement {
    return Array.from(element.querySelectorAll('button'))
      .find(button => (button.getAttribute('aria-label') ?? button.textContent?.trim()) === label) as HTMLButtonElement;
  }
});
