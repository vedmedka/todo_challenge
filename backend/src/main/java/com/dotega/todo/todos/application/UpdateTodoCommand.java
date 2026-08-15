package com.dotega.todo.todos.application;

import java.util.UUID;

public record UpdateTodoCommand(UUID todoListId, UUID id, String title, Boolean completed) {
}
