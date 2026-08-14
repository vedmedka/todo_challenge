package com.dotega.todo;

import java.util.UUID;

class TodoNotFoundException extends RuntimeException {
    TodoNotFoundException(UUID id) {
        super("Todo not found: " + id);
    }
}
