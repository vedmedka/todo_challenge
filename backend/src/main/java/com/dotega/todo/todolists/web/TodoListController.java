package com.dotega.todo.todolists.web;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.dotega.todo.todolists.application.TodoListService;
import com.dotega.todo.todolists.domain.TodoList;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/todo-lists")
public class TodoListController {
    private final TodoListService todoListService;

    public TodoListController(TodoListService todoListService) {
        this.todoListService = todoListService;
    }

    @GetMapping
    public List<TodoList> listTodoLists() {
        return todoListService.list();
    }

    @PostMapping
    public ResponseEntity<TodoList> createTodoList(@RequestBody CreateTodoListRequest request) {
        TodoList created = todoListService.create(request == null ? null : request.title());
        return ResponseEntity.created(URI.create("/api/todo-lists/" + created.id())).body(created);
    }

    @PatchMapping("/{listId}")
    public TodoList updateTodoList(@PathVariable UUID listId, @RequestBody UpdateTodoListRequest request) {
        return todoListService.update(listId, request == null ? null : request.title());
    }

    @DeleteMapping("/{listId}")
    public ResponseEntity<Void> deleteTodoList(@PathVariable UUID listId) {
        todoListService.delete(listId);
        return ResponseEntity.noContent().build();
    }
}
