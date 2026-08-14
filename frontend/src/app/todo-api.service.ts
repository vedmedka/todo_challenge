import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Todo, TodoChanges } from './todo.model';

@Injectable({ providedIn: 'root' })
export class TodoApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/todos';

  list(): Observable<Todo[]> {
    return this.http.get<Todo[]>(this.baseUrl);
  }

  create(title: string): Observable<Todo> {
    return this.http.post<Todo>(this.baseUrl, { title });
  }

  update(id: string, changes: TodoChanges): Observable<Todo> {
    return this.http.patch<Todo>(`${this.baseUrl}/${id}`, changes);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
