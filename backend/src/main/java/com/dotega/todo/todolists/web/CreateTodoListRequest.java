package com.dotega.todo.todolists.web;

import jakarta.validation.constraints.NotBlank;

public record CreateTodoListRequest(@NotBlank(message = "Todo list title must not be empty") String title) {
}
