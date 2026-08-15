package com.dotega.todo.testing;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.dotega.todo.todolists.application.TodoListRepository;
import com.dotega.todo.todolists.domain.TodoList;

public final class InMemoryTodoListRepository implements TodoListRepository {
    private final LinkedHashMap<UUID, TodoList> lists = new LinkedHashMap<>();

    @Override
    public List<TodoList> findAll() {
        return List.copyOf(lists.values());
    }

    @Override
    public Optional<TodoList> findById(UUID id) {
        return Optional.ofNullable(lists.get(id));
    }

    @Override
    public void create(TodoList list) {
        lists.put(list.id(), list);
    }

    @Override
    public Optional<TodoList> patch(UUID id, String title) {
        TodoList existing = lists.get(id);
        if (existing == null) {
            return Optional.empty();
        }
        TodoList updated = new TodoList(existing.id(), title);
        lists.put(updated.id(), updated);
        return Optional.of(updated);
    }

    @Override
    public boolean delete(UUID id) {
        return lists.remove(id) != null;
    }
}
