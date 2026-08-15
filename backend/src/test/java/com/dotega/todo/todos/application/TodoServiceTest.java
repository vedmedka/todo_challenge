package com.dotega.todo.todos.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import com.dotega.todo.common.domain.InvalidTodoException;
import com.dotega.todo.testing.BlockingReadTodoRepository;
import com.dotega.todo.testing.InMemoryTodoListRepository;
import com.dotega.todo.testing.InMemoryTodoRepository;
import com.dotega.todo.testing.StaticTodoRepository;
import com.dotega.todo.todolists.application.TodoListNotFoundException;
import com.dotega.todo.todolists.domain.TodoList;
import com.dotega.todo.todos.domain.Todo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TodoServiceTest {
    private TodoService service;
    private InMemoryTodoListRepository listRepository;
    private UUID listId;

    @BeforeEach
    void setUp() {
        listRepository = new InMemoryTodoListRepository();
        listId = UUID.randomUUID();
        listRepository.create(new TodoList(listId, "Work"));
        service = new TodoService(new InMemoryTodoRepository(), listRepository);
    }

    @Test
    void createsTodoWithTrimmedTitleAndIncompleteState() {
        Todo todo = service.create(listId, "  Buy milk  ");

        assertThat(todo.title()).isEqualTo("Buy milk");
        assertThat(todo.completed()).isFalse();
        assertThat(todo.id()).isNotNull();
        assertThat(service.list(listId)).containsExactly(todo);
    }

    @Test
    void listsTodosSortedByTitleThenId() {
        Todo bTask = new Todo(UUID.fromString("00000000-0000-0000-0000-000000000003"), "B task", false);
        Todo secondATask = new Todo(UUID.fromString("00000000-0000-0000-0000-000000000002"), "A task", false);
        Todo firstATask = new Todo(UUID.fromString("00000000-0000-0000-0000-000000000001"), "A task", false);
        TodoService unorderedService = new TodoService(new StaticTodoRepository(List.of(bTask, secondATask, firstATask)), listRepository);

        assertThat(unorderedService.list(listId)).containsExactly(firstATask, secondATask, bTask);
    }

    @Test
    void rejectsBlankTitleOnCreate() {
        assertThatThrownBy(() -> service.create(listId, "   "))
                .isInstanceOf(InvalidTodoException.class)
                .hasMessage("Todo title must not be empty");
    }

    @Test
    void updatesTitleAndCompletedState() {
        Todo todo = service.create(listId, "Draft");

        Todo updated = service.update(new UpdateTodoCommand(listId, todo.id(), "  Final title  ", true));

        assertThat(updated.id()).isEqualTo(todo.id());
        assertThat(updated.title()).isEqualTo("Final title");
        assertThat(updated.completed()).isTrue();
        assertThat(service.get(listId, todo.id())).isEqualTo(updated);
    }

    @Test
    void throwsWhenTodoDoesNotExistOnGetAndUpdate() {
        UUID missingTodoId = UUID.randomUUID();

        assertThatThrownBy(() -> service.get(listId, missingTodoId))
                .isInstanceOf(TodoNotFoundException.class)
                .hasMessage("Todo not found: " + missingTodoId);

        assertThatThrownBy(() -> service.update(new UpdateTodoCommand(listId, missingTodoId, "Edited", null)))
                .isInstanceOf(TodoNotFoundException.class)
                .hasMessage("Todo not found: " + missingTodoId);
    }

    @Test
    void rejectsBlankTitleOnUpdate() {
        Todo todo = service.create(listId, "Keep");

        assertThatThrownBy(() -> service.update(new UpdateTodoCommand(listId, todo.id(), " ", null)))
                .isInstanceOf(InvalidTodoException.class)
                .hasMessage("Todo title must not be empty");
    }

    @Test
    void throwsWhenTodoDoesNotExist() {
        assertThatThrownBy(() -> service.delete(listId, UUID.randomUUID()))
                .isInstanceOf(TodoNotFoundException.class);
    }

    @Test
    void throwsWhenTodoListDoesNotExist() {
        UUID missingListId = UUID.randomUUID();

        assertThatThrownBy(() -> service.list(missingListId))
                .isInstanceOf(TodoListNotFoundException.class)
                .hasMessage("Todo list not found: " + missingListId);
        assertThatThrownBy(() -> service.create(missingListId, "Draft"))
                .isInstanceOf(TodoListNotFoundException.class);
        assertThatThrownBy(() -> service.get(missingListId, UUID.randomUUID()))
                .isInstanceOf(TodoListNotFoundException.class)
                .hasMessage("Todo list not found: " + missingListId);
        assertThatThrownBy(() -> service.update(new UpdateTodoCommand(missingListId, UUID.randomUUID(), "Edited", null)))
                .isInstanceOf(TodoListNotFoundException.class)
                .hasMessage("Todo list not found: " + missingListId);
        assertThatThrownBy(() -> service.delete(missingListId, UUID.randomUUID()))
                .isInstanceOf(TodoListNotFoundException.class)
                .hasMessage("Todo list not found: " + missingListId);
    }

    @Test
    void preservesPartialUpdatesWhenConcurrentRequestsReadTheSameOriginalTodo() throws Exception {
        BlockingReadTodoRepository repository = new BlockingReadTodoRepository();
        TodoService concurrentService = new TodoService(repository, listRepository);
        Todo todo = concurrentService.create(listId, "Original");

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Todo> titleUpdate = executor.submit(() -> concurrentService.update(new UpdateTodoCommand(listId, todo.id(), "Edited", null)));
            Future<Todo> completedUpdate = executor.submit(() -> concurrentService.update(new UpdateTodoCommand(listId, todo.id(), null, true)));

            titleUpdate.get(2, TimeUnit.SECONDS);
            completedUpdate.get(2, TimeUnit.SECONDS);
        }

        assertThat(repository.current()).isEqualTo(new Todo(todo.id(), "Edited", true));
    }
}
