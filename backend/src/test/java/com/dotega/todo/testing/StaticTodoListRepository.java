package com.dotega.todo.testing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.dotega.todo.todolists.application.TodoListRepository;
import com.dotega.todo.todolists.domain.TodoList;

public final class StaticTodoListRepository implements TodoListRepository {
    private final List<TodoList> lists;

    public StaticTodoListRepository(List<TodoList> lists) {
        this.lists = lists;
    }

    @Override
    public List<TodoList> findAll() {
        return lists;
    }

    @Override
    public Optional<TodoList> findById(UUID id) {
        return lists.stream()
                .filter(list -> list.id().equals(id))
                .findFirst();
    }

    @Override
    public void create(TodoList list) {
        throw new UnsupportedOperationException("Static repository is read-only");
    }

    @Override
    public Optional<TodoList> patch(UUID id, String title) {
        throw new UnsupportedOperationException("Static repository is read-only");
    }

    @Override
    public boolean delete(UUID id) {
        throw new UnsupportedOperationException("Static repository is read-only");
    }
}
