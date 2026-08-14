import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { TodoApiService } from './todos/todo-api.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    const api = jasmine.createSpyObj<TodoApiService>('TodoApiService', [
      'listTodoLists',
      'listTodos'
    ]);
    api.listTodoLists.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: TodoApiService, useValue: api }]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  it('renders the todo page shell', () => {
    expect(fixture.nativeElement.querySelector('app-todo-page')).not.toBeNull();
  });
});
