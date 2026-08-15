package com.dotega.todo.testing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.dotega.todo.todos.application.TodoRepository;
import com.dotega.todo.todos.domain.Todo;
import com.dotega.todo.todos.domain.TodoPatch;

public final class StaticTodoRepository implements TodoRepository {
    private final List<Todo> todos;

    public StaticTodoRepository(List<Todo> todos) {
        this.todos = todos;
    }

    @Override
    public List<Todo> findAll(UUID listId) {
        return todos;
    }

    @Override
    public Optional<Todo> findById(UUID listId, UUID id) {
        return todos.stream()
                .filter(todo -> todo.id().equals(id))
                .findFirst();
    }

    @Override
    public void create(UUID listId, Todo todo) {
        throw new UnsupportedOperationException("Static repository is read-only");
    }

    @Override
    public Optional<Todo> patch(UUID listId, UUID id, TodoPatch patch) {
        throw new UnsupportedOperationException("Static repository is read-only");
    }

    @Override
    public boolean delete(UUID listId, UUID id) {
        throw new UnsupportedOperationException("Static repository is read-only");
    }
}
