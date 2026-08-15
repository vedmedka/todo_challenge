package com.dotega.todo.testing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import com.dotega.todo.todos.application.TodoRepository;
import com.dotega.todo.todos.domain.Todo;
import com.dotega.todo.todos.domain.TodoPatch;

public final class BlockingReadTodoRepository implements TodoRepository {
    private final AtomicReference<Todo> todo = new AtomicReference<>();
    private final AtomicInteger reads = new AtomicInteger();
    private final CountDownLatch concurrentReads = new CountDownLatch(2);

    public Todo current() {
        return todo.get();
    }

    @Override
    public List<Todo> findAll(UUID listId) {
        Todo current = todo.get();
        return current == null ? List.of() : List.of(current);
    }

    @Override
    public Optional<Todo> findById(UUID listId, UUID id) {
        Todo current = todo.get();
        if (current != null && current.id().equals(id) && reads.incrementAndGet() <= 2) {
            concurrentReads.countDown();
            awaitConcurrentReads();
        }
        return current != null && current.id().equals(id) ? Optional.of(current) : Optional.empty();
    }

    @Override
    public void create(UUID listId, Todo todo) {
        this.todo.set(todo);
    }

    @Override
    public Optional<Todo> patch(UUID listId, UUID id, TodoPatch patch) {
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
    public boolean delete(UUID listId, UUID id) {
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
