package com.dotega.todo;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

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
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void clearTodos() {
        jdbcTemplate.update("truncate table todos");
    }

    @AfterEach
    void clearTodosAfterTest() {
        clearTodos();
    }

    @Test
    void storesAndReadsTodosFromDatabase() {
        Todo first = new Todo(UUID.randomUUID(), "Write migration", false);
        Todo second = new Todo(UUID.randomUUID(), "Add repository", true);

        repository.create(first);
        repository.create(second);

        assertThat(repository.findById(first.id())).contains(first);
        assertThat(repository.findAll()).containsExactlyInAnyOrder(first, second);
    }

    @Test
    void deletesTodosInDatabase() {
        UUID id = UUID.randomUUID();
        repository.create(new Todo(id, "Draft", false));

        assertThat(repository.delete(id)).isTrue();
        assertThat(repository.findById(id)).isEqualTo(Optional.empty());
    }

    @Test
    void patchesOnlyProvidedFieldsInDatabase() {
        UUID id = UUID.randomUUID();
        repository.create(new Todo(id, "Original", false));

        assertThat(repository.patch(id, new TodoPatch(null, true))).contains(new Todo(id, "Original", true));
        assertThat(repository.patch(id, new TodoPatch("Edited", null))).contains(new Todo(id, "Edited", true));
        assertThat(repository.patch(UUID.randomUUID(), new TodoPatch("Missing", true))).isEqualTo(Optional.empty());
    }

    @Test
    void reportsMissingRowsWithoutCreatingThem() {
        UUID missingId = UUID.randomUUID();

        assertThat(repository.delete(missingId)).isFalse();
        assertThat(repository.findAll()).isEqualTo(List.of());
    }
}
