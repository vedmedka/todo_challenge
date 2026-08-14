import { Component } from '@angular/core';

import { TodoPageComponent } from './todos/todo-page/todo-page';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TodoPageComponent],
  template: '<app-todo-page />'
})
export class AppComponent {}
