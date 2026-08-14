package com.dotega.todo;

import java.net.URI;
import java.util.List;
import java.util.UUID;

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
public class TodoController {
    private final TodoService todoService;
    private final TodoListService todoListService;

    public TodoController(TodoService todoService, TodoListService todoListService) {
        this.todoService = todoService;
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

    @GetMapping("/{listId}/todos")
    public List<Todo> listTodos(@PathVariable UUID listId) {
        return todoService.list(listId);
    }

    @PostMapping("/{listId}/todos")
    public ResponseEntity<Todo> createTodo(@PathVariable UUID listId, @RequestBody CreateTodoRequest request) {
        Todo created = todoService.create(listId, request == null ? null : request.title());
        return ResponseEntity.created(URI.create("/api/todo-lists/" + listId + "/todos/" + created.id())).body(created);
    }

    @PatchMapping("/{listId}/todos/{id}")
    public Todo updateTodo(@PathVariable UUID listId, @PathVariable UUID id, @RequestBody UpdateTodoRequest request) {
        return todoService.update(
                listId,
                id,
                request == null ? null : request.title(),
                request == null ? null : request.completed()
        );
    }

    @DeleteMapping("/{listId}/todos/{id}")
    public ResponseEntity<Void> deleteTodo(@PathVariable UUID listId, @PathVariable UUID id) {
        todoService.delete(listId, id);
        return ResponseEntity.noContent().build();
    }
}
