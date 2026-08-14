import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

import { TodoStore } from './todo-store.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  providers: [TodoStore],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  readonly store = inject(TodoStore);

  ngOnInit(): void {
    this.store.loadTodos();
  }
}
