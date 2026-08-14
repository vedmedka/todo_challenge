package com.dotega.todo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TodoListRepository {
    List<TodoList> findAll();

    Optional<TodoList> findById(UUID id);

    void create(TodoList list);

    Optional<TodoList> patch(UUID id, String title);

    boolean delete(UUID id);
}
