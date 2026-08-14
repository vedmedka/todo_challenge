package com.dotega.todo.todos.application;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import com.dotega.todo.common.domain.InvalidTodoException;
import com.dotega.todo.todolists.application.TodoListNotFoundException;
import com.dotega.todo.todolists.application.TodoListRepository;
import com.dotega.todo.todos.domain.Todo;
import com.dotega.todo.todos.domain.TodoPatch;
import org.springframework.stereotype.Service;

@Service
public class TodoService {
    private final TodoRepository todoRepository;
    private final TodoListRepository todoListRepository;

    public TodoService(TodoRepository todoRepository, TodoListRepository todoListRepository) {
        this.todoRepository = todoRepository;
        this.todoListRepository = todoListRepository;
    }

    public List<Todo> list(UUID todoListId) {
        requireTodoList(todoListId);
        return todoRepository.findAll(todoListId).stream()
                .sorted(Comparator.comparing(Todo::title).thenComparing(Todo::id))
                .toList();
    }

    public Todo get(UUID todoListId, UUID id) {
        requireTodoList(todoListId);
        return todoRepository.findById(todoListId, id)
                .orElseThrow(() -> new TodoNotFoundException(id));
    }

    public Todo create(UUID todoListId, String title) {
        requireTodoList(todoListId);
        String normalizedTitle = normalizeTitle(title);
        Todo todo = new Todo(UUID.randomUUID(), normalizedTitle, false);
        todoRepository.create(todoListId, todo);
        return todo;
    }

    public Todo update(UUID todoListId, UUID id, String title, Boolean completed) {
        requireTodoList(todoListId);
        String nextTitle = title == null ? null : normalizeTitle(title);
        return todoRepository.patch(todoListId, id, new TodoPatch(nextTitle, completed))
                .orElseThrow(() -> new TodoNotFoundException(id));
    }

    public void delete(UUID todoListId, UUID id) {
        requireTodoList(todoListId);
        if (!todoRepository.delete(todoListId, id)) {
            throw new TodoNotFoundException(id);
        }
    }

    private void requireTodoList(UUID todoListId) {
        if (todoListRepository.findById(todoListId).isEmpty()) {
            throw new TodoListNotFoundException(todoListId);
        }
    }

    private static String normalizeTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            throw new InvalidTodoException("Todo title must not be empty");
        }
        return title.trim();
    }
}
