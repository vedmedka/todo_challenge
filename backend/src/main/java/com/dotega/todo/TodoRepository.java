package com.dotega.todo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TodoRepository {
    List<Todo> findAll(UUID todoListId);

    Optional<Todo> findById(UUID todoListId, UUID id);

    void create(UUID todoListId, Todo todo);

    Optional<Todo> patch(UUID todoListId, UUID id, TodoPatch patch);

    boolean delete(UUID todoListId, UUID id);
}
