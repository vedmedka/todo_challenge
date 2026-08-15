package com.dotega.todo.common.domain;

public final class TodoTitles {
    private TodoTitles() {
    }

    public static String requireTodoTitle(String title) {
        return normalize(title, "Todo title must not be empty");
    }

    public static String requireTodoListTitle(String title) {
        return normalize(title, "Todo list title must not be empty");
    }

    private static String normalize(String title, String errorMessage) {
        if (title == null || title.trim().isEmpty()) {
            throw new InvalidTodoException(errorMessage);
        }
        return title.trim();
    }
}
