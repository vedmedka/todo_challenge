package com.dotega.todo.todos.application;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.dotega.todo.todos.domain.Todo;
import com.dotega.todo.todos.domain.TodoPatch;

public interface TodoRepository {
    List<Todo> findAll(UUID todoListId);

    Optional<Todo> findById(UUID todoListId, UUID id);

    void create(UUID todoListId, Todo todo);

    Optional<Todo> patch(UUID todoListId, UUID id, TodoPatch patch);

    boolean delete(UUID todoListId, UUID id);
}
