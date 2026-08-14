package com.dotega.todo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TodoServiceTest {
    private TodoService service;

    @BeforeEach
    void setUp() {
        service = new TodoService();
    }

    @Test
    void createsTodoWithTrimmedTitleAndIncompleteState() {
        Todo todo = service.create("  Buy milk  ");

        assertThat(todo.title()).isEqualTo("Buy milk");
        assertThat(todo.completed()).isFalse();
        assertThat(todo.id()).isNotNull();
        assertThat(service.list()).containsExactly(todo);
    }

    @Test
    void rejectsBlankTitleOnCreate() {
        assertThatThrownBy(() -> service.create("   "))
                .isInstanceOf(InvalidTodoException.class)
                .hasMessage("Todo title must not be empty");
    }

    @Test
    void updatesTitleAndCompletedState() {
        Todo todo = service.create("Draft");

        Todo updated = service.update(todo.id(), "  Final title  ", true);

        assertThat(updated.id()).isEqualTo(todo.id());
        assertThat(updated.title()).isEqualTo("Final title");
        assertThat(updated.completed()).isTrue();
        assertThat(service.get(todo.id())).isEqualTo(updated);
    }

    @Test
    void rejectsBlankTitleOnUpdate() {
        Todo todo = service.create("Keep");

        assertThatThrownBy(() -> service.update(todo.id(), " ", null))
                .isInstanceOf(InvalidTodoException.class)
                .hasMessage("Todo title must not be empty");
    }

    @Test
    void throwsWhenTodoDoesNotExist() {
        assertThatThrownBy(() -> service.delete(java.util.UUID.randomUUID()))
                .isInstanceOf(TodoNotFoundException.class);
    }
}
