package com.dotega.todo.todos.domain;

import java.util.UUID;

public record Todo(UUID id, String title, boolean completed) {
}
