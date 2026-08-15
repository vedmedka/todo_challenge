package com.dotega.todo.todos.web;

import jakarta.validation.constraints.Pattern;

public record UpdateTodoRequest(
        @Pattern(regexp = ".*\\S.*", message = "Todo title must not be empty") String title,
        Boolean completed
) {
}
