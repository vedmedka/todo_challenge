package com.dotega.todo.todolists.application;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.dotega.todo.todolists.domain.TodoList;

public interface TodoListRepository {
    List<TodoList> findAll();

    Optional<TodoList> findById(UUID id);

    void create(TodoList list);

    Optional<TodoList> patch(UUID id, String title);

    boolean delete(UUID id);
}
