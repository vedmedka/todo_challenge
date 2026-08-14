package com.dotega.todo.todolists.application;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import com.dotega.todo.common.domain.InvalidTodoException;
import com.dotega.todo.todolists.domain.TodoList;
import org.springframework.stereotype.Service;

@Service
public class TodoListService {
    private final TodoListRepository todoListRepository;

    public TodoListService(TodoListRepository todoListRepository) {
        this.todoListRepository = todoListRepository;
    }

    public List<TodoList> list() {
        return todoListRepository.findAll().stream()
                .sorted(Comparator.comparing(TodoList::title).thenComparing(TodoList::id))
                .toList();
    }

    public TodoList get(UUID id) {
        return todoListRepository.findById(id)
                .orElseThrow(() -> new TodoListNotFoundException(id));
    }

    public TodoList create(String title) {
        String normalizedTitle = normalizeTitle(title);
        TodoList list = new TodoList(UUID.randomUUID(), normalizedTitle);
        todoListRepository.create(list);
        return list;
    }

    public TodoList update(UUID id, String title) {
        String normalizedTitle = normalizeTitle(title);
        return todoListRepository.patch(id, normalizedTitle)
                .orElseThrow(() -> new TodoListNotFoundException(id));
    }

    public void delete(UUID id) {
        if (!todoListRepository.delete(id)) {
            throw new TodoListNotFoundException(id);
        }
    }

    private static String normalizeTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            throw new InvalidTodoException("Todo list title must not be empty");
        }
        return title.trim();
    }
}
