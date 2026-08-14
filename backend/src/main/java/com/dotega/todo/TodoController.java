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
@RequestMapping("/api/todos")
public class TodoController {
    private final TodoService todoService;

    public TodoController(TodoService todoService) {
        this.todoService = todoService;
    }

    @GetMapping
    public List<Todo> list() {
        return todoService.list();
    }

    @PostMapping
    public ResponseEntity<Todo> create(@RequestBody CreateTodoRequest request) {
        Todo created = todoService.create(request == null ? null : request.title());
        return ResponseEntity.created(URI.create("/api/todos/" + created.id())).body(created);
    }

    @PatchMapping("/{id}")
    public Todo update(@PathVariable UUID id, @RequestBody UpdateTodoRequest request) {
        return todoService.update(
                id,
                request == null ? null : request.title(),
                request == null ? null : request.completed()
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        todoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
