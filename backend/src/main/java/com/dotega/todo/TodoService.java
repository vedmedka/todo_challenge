package com.dotega.todo;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.stereotype.Service;

@Service
public class TodoService {
    private final ConcurrentMap<UUID, Todo> todos = new ConcurrentHashMap<>();

    public List<Todo> list() {
        return todos.values().stream()
                .sorted(Comparator.comparing(Todo::title).thenComparing(Todo::id))
                .toList();
    }

    public Todo get(UUID id) {
        Todo todo = todos.get(id);
        if (todo == null) {
            throw new TodoNotFoundException(id);
        }
        return todo;
    }

    public Todo create(String title) {
        String normalizedTitle = normalizeTitle(title);
        Todo todo = new Todo(UUID.randomUUID(), normalizedTitle, false);
        todos.put(todo.id(), todo);
        return todo;
    }

    public Todo update(UUID id, String title, Boolean completed) {
        return todos.compute(id, (key, existing) -> {
            if (existing == null) {
                throw new TodoNotFoundException(id);
            }

            String nextTitle = title == null ? existing.title() : normalizeTitle(title);
            boolean nextCompleted = completed == null ? existing.completed() : completed;
            return new Todo(existing.id(), nextTitle, nextCompleted);
        });
    }

    public void delete(UUID id) {
        if (todos.remove(id) == null) {
            throw new TodoNotFoundException(id);
        }
    }

    private static String normalizeTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            throw new InvalidTodoException("Todo title must not be empty");
        }
        return title.trim();
    }
}
