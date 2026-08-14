package com.dotega.todo;

class InvalidTodoException extends RuntimeException {
    InvalidTodoException(String message) {
        super(message);
    }
}
