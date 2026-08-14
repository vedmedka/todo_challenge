import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { TodoApiService } from './todo-api.service';

describe('TodoApiService', () => {
  let service: TodoApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TodoApiService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(TodoApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads todo lists from the REST API', () => {
    const expected = [{ id: 'list-1', title: 'Inbox' }];

    service.listTodoLists().subscribe(lists => {
      expect(lists).toEqual(expected);
    });

    const req = http.expectOne('/api/todo-lists');
    expect(req.request.method).toBe('GET');
    req.flush(expected);
  });

  it('creates todo lists through the REST API', () => {
    service.createTodoList('Work').subscribe(list => {
      expect(list.title).toBe('Work');
    });

    const req = http.expectOne('/api/todo-lists');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Work' });
    req.flush({ id: 'list-2', title: 'Work' });
  });

  it('updates todo lists through the REST API', () => {
    service.updateTodoList('list-3', 'Home').subscribe(list => {
      expect(list.title).toBe('Home');
    });

    const req = http.expectOne('/api/todo-lists/list-3');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ title: 'Home' });
    req.flush({ id: 'list-3', title: 'Home' });
  });

  it('deletes todo lists through the REST API', () => {
    service.deleteTodoList('list-4').subscribe();

    const req = http.expectOne('/api/todo-lists/list-4');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('loads todos from the selected todo list REST API', () => {
    const expected = [{ id: '1', title: 'Test', completed: false }];

    service.listTodos('list-1').subscribe(todos => {
      expect(todos).toEqual(expected);
    });

    const req = http.expectOne('/api/todo-lists/list-1/todos');
    expect(req.request.method).toBe('GET');
    req.flush(expected);
  });

  it('creates todos through the selected todo list REST API', () => {
    service.createTodo('list-2', 'New').subscribe(todo => {
      expect(todo.title).toBe('New');
    });

    const req = http.expectOne('/api/todo-lists/list-2/todos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'New' });
    req.flush({ id: '2', title: 'New', completed: false });
  });

  it('updates todos through the selected todo list REST API', () => {
    service.updateTodo('list-3', '3', { title: 'Edited', completed: true }).subscribe(todo => {
      expect(todo.completed).toBeTrue();
    });

    const req = http.expectOne('/api/todo-lists/list-3/todos/3');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ title: 'Edited', completed: true });
    req.flush({ id: '3', title: 'Edited', completed: true });
  });

  it('deletes todos through the selected todo list REST API', () => {
    service.deleteTodo('list-4', '4').subscribe();

    const req = http.expectOne('/api/todo-lists/list-4/todos/4');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
