package com.dotega.todo.todolists.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;

import com.dotega.todo.common.domain.InvalidTodoException;
import com.dotega.todo.testing.InMemoryTodoListRepository;
import com.dotega.todo.testing.StaticTodoListRepository;
import com.dotega.todo.todolists.domain.TodoList;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TodoListServiceTest {
    private TodoListService service;

    @BeforeEach
    void setUp() {
        service = new TodoListService(new InMemoryTodoListRepository());
    }

    @Test
    void createsTodoListWithTrimmedTitle() {
        TodoList list = service.create("  Work  ");

        assertThat(list.title()).isEqualTo("Work");
        assertThat(list.id()).isNotNull();
        assertThat(service.list()).containsExactly(list);
    }

    @Test
    void getsTodoListById() {
        TodoList list = service.create("Work");

        assertThat(service.get(list.id())).isEqualTo(list);
    }

    @Test
    void listsTodoListsSortedByTitleThenId() {
        TodoList bList = new TodoList(UUID.fromString("00000000-0000-0000-0000-000000000003"), "B list");
        TodoList secondAList = new TodoList(UUID.fromString("00000000-0000-0000-0000-000000000002"), "A list");
        TodoList firstAList = new TodoList(UUID.fromString("00000000-0000-0000-0000-000000000001"), "A list");
        TodoListService unorderedService = new TodoListService(new StaticTodoListRepository(List.of(bList, secondAList, firstAList)));

        assertThat(unorderedService.list()).containsExactly(firstAList, secondAList, bList);
    }

    @Test
    void rejectsBlankTitleOnCreateAndUpdate() {
        TodoList list = service.create("Work");

        assertThatThrownBy(() -> service.create("   "))
                .isInstanceOf(InvalidTodoException.class)
                .hasMessage("Todo list title must not be empty");

        assertThatThrownBy(() -> service.update(list.id(), " "))
                .isInstanceOf(InvalidTodoException.class)
                .hasMessage("Todo list title must not be empty");
    }

    @Test
    void updatesAndDeletesTodoLists() {
        TodoList list = service.create("Draft");

        TodoList updated = service.update(list.id(), "  Home  ");

        assertThat(updated).isEqualTo(new TodoList(list.id(), "Home"));
        service.delete(list.id());
        assertThat(service.list()).isEmpty();
    }

    @Test
    void throwsWhenTodoListDoesNotExist() {
        UUID missingId = UUID.randomUUID();

        assertThatThrownBy(() -> service.get(missingId))
                .isInstanceOf(TodoListNotFoundException.class)
                .hasMessage("Todo list not found: " + missingId);
        assertThatThrownBy(() -> service.update(missingId, "Edited"))
                .isInstanceOf(TodoListNotFoundException.class)
                .hasMessage("Todo list not found: " + missingId);
        assertThatThrownBy(() -> service.delete(missingId))
                .isInstanceOf(TodoListNotFoundException.class);
    }
}
