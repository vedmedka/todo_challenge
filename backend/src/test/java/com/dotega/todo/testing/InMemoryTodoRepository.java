package com.dotega.todo.testing;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.dotega.todo.todos.application.TodoRepository;
import com.dotega.todo.todos.domain.Todo;
import com.dotega.todo.todos.domain.TodoPatch;

public final class InMemoryTodoRepository implements TodoRepository {
    private final LinkedHashMap<UUID, Todo> todos = new LinkedHashMap<>();

    @Override
    public List<Todo> findAll(UUID listId) {
        return List.copyOf(todos.values());
    }

    @Override
    public Optional<Todo> findById(UUID listId, UUID id) {
        return Optional.ofNullable(todos.get(id));
    }

    @Override
    public void create(UUID listId, Todo todo) {
        todos.put(todo.id(), todo);
    }

    @Override
    public Optional<Todo> patch(UUID listId, UUID id, TodoPatch patch) {
        Todo existing = todos.get(id);
        if (existing == null) {
            return Optional.empty();
        }
        Todo updated = new Todo(
                existing.id(),
                patch.title() == null ? existing.title() : patch.title(),
                patch.completed() == null ? existing.completed() : patch.completed()
        );
        todos.put(updated.id(), updated);
        return Optional.of(updated);
    }

    @Override
    public boolean delete(UUID listId, UUID id) {
        return todos.remove(id) != null;
    }
}
