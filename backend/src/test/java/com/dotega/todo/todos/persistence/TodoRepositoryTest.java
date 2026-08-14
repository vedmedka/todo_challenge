package com.dotega.todo.todos.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.dotega.todo.todolists.application.TodoListRepository;
import com.dotega.todo.todolists.domain.TodoList;
import com.dotega.todo.todos.application.TodoRepository;
import com.dotega.todo.todos.domain.Todo;
import com.dotega.todo.todos.domain.TodoPatch;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class TodoRepositoryTest {
    @Autowired
    private TodoRepository repository;

    @Autowired
    private TodoListRepository todoListRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void clearTodos() {
        jdbcTemplate.update("truncate table todo_lists cascade");
    }

    @AfterEach
    void clearTodosAfterTest() {
        clearTodos();
    }

    @Test
    void storesAndReadsTodosFromDatabase() {
        UUID listId = createList("Work");
        Todo first = new Todo(UUID.randomUUID(), "Write migration", false);
        Todo second = new Todo(UUID.randomUUID(), "Add repository", true);

        repository.create(listId, first);
        repository.create(listId, second);

        assertThat(repository.findById(listId, first.id())).contains(first);
        assertThat(repository.findAll(listId)).containsExactlyInAnyOrder(first, second);
    }

    @Test
    void scopesTodosByListInDatabase() {
        UUID firstListId = createList("Work");
        UUID secondListId = createList("Home");
        Todo first = new Todo(UUID.randomUUID(), "Shared title", false);
        Todo second = new Todo(UUID.randomUUID(), "Shared title", true);

        repository.create(firstListId, first);
        repository.create(secondListId, second);

        assertThat(repository.findAll(firstListId)).containsExactly(first);
        assertThat(repository.findAll(secondListId)).containsExactly(second);
        assertThat(repository.findById(firstListId, second.id())).isEqualTo(Optional.empty());
    }

    @Test
    void deletesTodosInDatabaseWithinTheirList() {
        UUID listId = createList("Work");
        UUID id = UUID.randomUUID();
        repository.create(listId, new Todo(id, "Draft", false));

        assertThat(repository.delete(listId, id)).isTrue();
        assertThat(repository.findById(listId, id)).isEqualTo(Optional.empty());
    }

    @Test
    void patchesOnlyProvidedFieldsInDatabase() {
        UUID listId = createList("Work");
        UUID id = UUID.randomUUID();
        repository.create(listId, new Todo(id, "Original", false));

        assertThat(repository.patch(listId, id, new TodoPatch(null, true))).contains(new Todo(id, "Original", true));
        assertThat(repository.patch(listId, id, new TodoPatch("Edited", null))).contains(new Todo(id, "Edited", true));
        assertThat(repository.patch(listId, UUID.randomUUID(), new TodoPatch("Missing", true))).isEqualTo(Optional.empty());
    }

    @Test
    void reportsMissingRowsWithoutCreatingThem() {
        UUID listId = createList("Work");
        UUID missingId = UUID.randomUUID();

        assertThat(repository.delete(listId, missingId)).isFalse();
        assertThat(repository.findAll(listId)).isEqualTo(List.of());
    }

    private UUID createList(String title) {
        TodoList list = new TodoList(UUID.randomUUID(), title);
        todoListRepository.create(list);
        return list.id();
    }
}
