package com.dotega.todo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TodoRepository {
    List<Todo> findAll();

    Optional<Todo> findById(UUID id);

    void create(Todo todo);

    Optional<Todo> patch(UUID id, String title, Boolean completed);

    boolean update(Todo todo);

    boolean delete(UUID id);
}
