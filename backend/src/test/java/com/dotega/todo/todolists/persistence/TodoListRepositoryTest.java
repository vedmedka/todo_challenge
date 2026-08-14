package com.dotega.todo.todolists.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.dotega.todo.todolists.application.TodoListRepository;
import com.dotega.todo.todolists.domain.TodoList;
import com.dotega.todo.todos.application.TodoRepository;
import com.dotega.todo.todos.domain.Todo;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class TodoListRepositoryTest {
    @Autowired
    private TodoRepository todoRepository;

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
    void storesUpdatesAndDeletesTodoListsInDatabase() {
        TodoList list = new TodoList(UUID.randomUUID(), "Work");

        todoListRepository.create(list);

        assertThat(todoListRepository.findAll()).containsExactly(list);
        assertThat(todoListRepository.patch(list.id(), "Home")).contains(new TodoList(list.id(), "Home"));
        assertThat(todoListRepository.delete(list.id())).isTrue();
        assertThat(todoListRepository.findById(list.id())).isEqualTo(Optional.empty());
    }

    @Test
    void deletingTodoListCascadesItsTodos() {
        UUID listId = createList("Work");
        Todo todo = new Todo(UUID.randomUUID(), "Draft", false);
        todoRepository.create(listId, todo);

        assertThat(todoListRepository.delete(listId)).isTrue();

        assertThat(todoRepository.findAll(listId)).isEqualTo(List.of());
    }

    private UUID createList(String title) {
        TodoList list = new TodoList(UUID.randomUUID(), title);
        todoListRepository.create(list);
        return list.id();
    }
}
