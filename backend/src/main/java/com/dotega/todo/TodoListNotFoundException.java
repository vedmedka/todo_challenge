package com.dotega.todo;

import java.util.UUID;

class TodoListNotFoundException extends RuntimeException {
    TodoListNotFoundException(UUID id) {
        super("Todo list not found: " + id);
    }
}
