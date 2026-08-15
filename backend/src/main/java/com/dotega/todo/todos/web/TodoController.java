package com.dotega.todo.todos.web;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.dotega.todo.todos.application.TodoService;
import com.dotega.todo.todos.application.UpdateTodoCommand;
import com.dotega.todo.todos.domain.Todo;
import jakarta.validation.Valid;
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

    public TodoController(TodoService todoService) {
        this.todoService = todoService;
    }

    @GetMapping("/{listId}/todos")
    public List<Todo> listTodos(@PathVariable UUID listId) {
        return todoService.list(listId);
    }

    @PostMapping("/{listId}/todos")
    public ResponseEntity<Todo> createTodo(@PathVariable UUID listId, @Valid @RequestBody(required = false) CreateTodoRequest request) {
        Todo created = todoService.create(listId, request == null ? null : request.title());
        return ResponseEntity.created(URI.create("/api/todo-lists/" + listId + "/todos/" + created.id())).body(created);
    }

    @PatchMapping("/{listId}/todos/{id}")
    public Todo updateTodo(@PathVariable UUID listId, @PathVariable UUID id, @Valid @RequestBody(required = false) UpdateTodoRequest request) {
        return todoService.update(new UpdateTodoCommand(
                listId,
                id,
                request == null ? null : request.title(),
                request == null ? null : request.completed()
        ));
    }

    @DeleteMapping("/{listId}/todos/{id}")
    public ResponseEntity<Void> deleteTodo(@PathVariable UUID listId, @PathVariable UUID id) {
        todoService.delete(listId, id);
        return ResponseEntity.noContent().build();
    }
}
