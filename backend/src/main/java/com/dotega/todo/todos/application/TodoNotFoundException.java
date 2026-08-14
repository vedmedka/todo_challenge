package com.dotega.todo.todos.application;

import java.util.UUID;

public class TodoNotFoundException extends RuntimeException {
    TodoNotFoundException(UUID id) {
        super("Todo not found: " + id);
    }
}
