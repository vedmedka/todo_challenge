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

  it('loads todos from the REST API', () => {
    const expected = [{ id: '1', title: 'Test', completed: false }];

    service.list().subscribe(todos => {
      expect(todos).toEqual(expected);
    });

    const req = http.expectOne('/api/todos');
    expect(req.request.method).toBe('GET');
    req.flush(expected);
  });

  it('creates todos through the REST API', () => {
    service.create('New').subscribe(todo => {
      expect(todo.title).toBe('New');
    });

    const req = http.expectOne('/api/todos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'New' });
    req.flush({ id: '2', title: 'New', completed: false });
  });

  it('updates todos through the REST API', () => {
    service.update('3', { title: 'Edited', completed: true }).subscribe(todo => {
      expect(todo.completed).toBeTrue();
    });

    const req = http.expectOne('/api/todos/3');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ title: 'Edited', completed: true });
    req.flush({ id: '3', title: 'Edited', completed: true });
  });

  it('deletes todos through the REST API', () => {
    service.delete('4').subscribe();

    const req = http.expectOne('/api/todos/4');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
