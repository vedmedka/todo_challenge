package com.dotega.todo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TodoServiceTest {
    private TodoService service;

    @BeforeEach
    void setUp() {
        service = new TodoService(new InMemoryTodoRepository());
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
    void listsTodosSortedByTitleThenId() {
        Todo bTask = new Todo(UUID.fromString("00000000-0000-0000-0000-000000000003"), "B task", false);
        Todo secondATask = new Todo(UUID.fromString("00000000-0000-0000-0000-000000000002"), "A task", false);
        Todo firstATask = new Todo(UUID.fromString("00000000-0000-0000-0000-000000000001"), "A task", false);
        TodoService unorderedService = new TodoService(new StaticTodoRepository(List.of(bTask, secondATask, firstATask)));

        assertThat(unorderedService.list()).containsExactly(firstATask, secondATask, bTask);
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

    @Test
    void preservesPartialUpdatesWhenConcurrentRequestsReadTheSameOriginalTodo() throws Exception {
        BlockingReadTodoRepository repository = new BlockingReadTodoRepository();
        TodoService concurrentService = new TodoService(repository);
        Todo todo = concurrentService.create("Original");

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Todo> titleUpdate = executor.submit(() -> concurrentService.update(todo.id(), "Edited", null));
            Future<Todo> completedUpdate = executor.submit(() -> concurrentService.update(todo.id(), null, true));

            titleUpdate.get(2, TimeUnit.SECONDS);
            completedUpdate.get(2, TimeUnit.SECONDS);
        }

        assertThat(repository.current()).isEqualTo(new Todo(todo.id(), "Edited", true));
    }

    private static final class InMemoryTodoRepository implements TodoRepository {
        private final LinkedHashMap<UUID, Todo> todos = new LinkedHashMap<>();

        @Override
        public List<Todo> findAll() {
            return todos.values().stream()
                    .sorted(Comparator.comparing(Todo::title).thenComparing(Todo::id))
                    .toList();
        }

        @Override
        public Optional<Todo> findById(UUID id) {
            return Optional.ofNullable(todos.get(id));
        }

        @Override
        public void create(Todo todo) {
            todos.put(todo.id(), todo);
        }

        @Override
        public Optional<Todo> patch(UUID id, TodoPatch patch) {
            Todo existing = todos.get(id);
            if (existing == null) {
                return Optional.empty();
            }
            Todo updated = new Todo(
                    existing.id(),
                    patch.title() == null ? existing.title() : patch.title(),
                    patch.completed() == null ? existing.completed() : patch.completed()
            );
            todos.put(updated.id(), updated);
            return Optional.of(updated);
        }

        @Override
        public boolean delete(UUID id) {
            return todos.remove(id) != null;
        }
    }

    private static final class StaticTodoRepository implements TodoRepository {
        private final List<Todo> todos;

        StaticTodoRepository(List<Todo> todos) {
            this.todos = todos;
        }

        @Override
        public List<Todo> findAll() {
            return todos;
        }

        @Override
        public Optional<Todo> findById(UUID id) {
            return todos.stream()
                    .filter(todo -> todo.id().equals(id))
                    .findFirst();
        }

        @Override
        public void create(Todo todo) {
            throw new UnsupportedOperationException("Static repository is read-only");
        }

        @Override
        public Optional<Todo> patch(UUID id, TodoPatch patch) {
            throw new UnsupportedOperationException("Static repository is read-only");
        }

        @Override
        public boolean delete(UUID id) {
            throw new UnsupportedOperationException("Static repository is read-only");
        }
    }

    private static final class BlockingReadTodoRepository implements TodoRepository {
        private final AtomicReference<Todo> todo = new AtomicReference<>();
        private final AtomicInteger reads = new AtomicInteger();
        private final CountDownLatch concurrentReads = new CountDownLatch(2);

        Todo current() {
            return todo.get();
        }

        @Override
        public List<Todo> findAll() {
            Todo current = todo.get();
            return current == null ? List.of() : List.of(current);
        }

        @Override
        public Optional<Todo> findById(UUID id) {
            Todo current = todo.get();
            if (current != null && current.id().equals(id) && reads.incrementAndGet() <= 2) {
                concurrentReads.countDown();
                awaitConcurrentReads();
            }
            return current != null && current.id().equals(id) ? Optional.of(current) : Optional.empty();
        }

        @Override
        public void create(Todo todo) {
            this.todo.set(todo);
        }

        @Override
        public Optional<Todo> patch(UUID id, TodoPatch patch) {
            Todo updated = todo.updateAndGet(existing -> {
                if (existing == null || !existing.id().equals(id)) {
                    return existing;
                }
                return new Todo(
                        existing.id(),
                        patch.title() == null ? existing.title() : patch.title(),
                        patch.completed() == null ? existing.completed() : patch.completed()
                );
            });
            return updated != null && updated.id().equals(id) ? Optional.of(updated) : Optional.empty();
        }

        @Override
        public boolean delete(UUID id) {
            return this.todo.getAndSet(null) != null;
        }

        private void awaitConcurrentReads() {
            try {
                if (!concurrentReads.await(2, TimeUnit.SECONDS)) {
                    throw new AssertionError("Timed out waiting for concurrent reads");
                }
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new AssertionError("Interrupted while waiting for concurrent reads", exception);
            }
        }
    }
}
