package com.dotega.todo;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

@Service
public class TodoService {
    private final TodoRepository todoRepository;

    public TodoService(TodoRepository todoRepository) {
        this.todoRepository = todoRepository;
    }

    public List<Todo> list() {
        return todoRepository.findAll().stream()
                .sorted(Comparator.comparing(Todo::title).thenComparing(Todo::id))
                .toList();
    }

    public Todo get(UUID id) {
        return todoRepository.findById(id)
                .orElseThrow(() -> new TodoNotFoundException(id));
    }

    public Todo create(String title) {
        String normalizedTitle = normalizeTitle(title);
        Todo todo = new Todo(UUID.randomUUID(), normalizedTitle, false);
        todoRepository.create(todo);
        return todo;
    }

    public Todo update(UUID id, String title, Boolean completed) {
        String nextTitle = title == null ? null : normalizeTitle(title);
        return todoRepository.patch(id, new TodoPatch(nextTitle, completed))
                .orElseThrow(() -> new TodoNotFoundException(id));
    }

    public void delete(UUID id) {
        if (!todoRepository.delete(id)) {
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
