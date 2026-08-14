import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Todo, TodoChanges, TodoList } from './todo.model';

@Injectable({ providedIn: 'root' })
export class TodoApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/todo-lists';

  listTodoLists(): Observable<TodoList[]> {
    return this.http.get<TodoList[]>(this.baseUrl);
  }

  createTodoList(title: string): Observable<TodoList> {
    return this.http.post<TodoList>(this.baseUrl, { title });
  }

  updateTodoList(id: string, title: string): Observable<TodoList> {
    return this.http.patch<TodoList>(`${this.baseUrl}/${id}`, { title });
  }

  deleteTodoList(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  listTodos(todoListId: string): Observable<Todo[]> {
    return this.http.get<Todo[]>(this.todosUrl(todoListId));
  }

  createTodo(todoListId: string, title: string): Observable<Todo> {
    return this.http.post<Todo>(this.todosUrl(todoListId), { title });
  }

  updateTodo(todoListId: string, id: string, changes: TodoChanges): Observable<Todo> {
    return this.http.patch<Todo>(`${this.todosUrl(todoListId)}/${id}`, changes);
  }

  deleteTodo(todoListId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.todosUrl(todoListId)}/${id}`);
  }

  private todosUrl(todoListId: string): string {
    return `${this.baseUrl}/${todoListId}/todos`;
  }
}
