package com.dotega.todo.todolists.application;

import java.util.UUID;

public class TodoListNotFoundException extends RuntimeException {
    public TodoListNotFoundException(UUID id) {
        super("Todo list not found: " + id);
    }
}
