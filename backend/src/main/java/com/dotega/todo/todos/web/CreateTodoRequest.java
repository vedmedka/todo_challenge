package com.dotega.todo.todos.web;

import jakarta.validation.constraints.NotBlank;

public record CreateTodoRequest(@NotBlank(message = "Todo title must not be empty") String title) {
}
