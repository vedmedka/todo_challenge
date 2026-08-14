package com.dotega.todo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

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
        assertThatThrownBy(() -> service.delete(missingId))
                .isInstanceOf(TodoListNotFoundException.class);
    }

    static final class InMemoryTodoListRepository implements TodoListRepository {
        private final LinkedHashMap<UUID, TodoList> lists = new LinkedHashMap<>();

        @Override
        public List<TodoList> findAll() {
            return lists.values().stream()
                    .sorted(Comparator.comparing(TodoList::title).thenComparing(TodoList::id))
                    .toList();
        }

        @Override
        public Optional<TodoList> findById(UUID id) {
            return Optional.ofNullable(lists.get(id));
        }

        @Override
        public void create(TodoList list) {
            lists.put(list.id(), list);
        }

        @Override
        public Optional<TodoList> patch(UUID id, String title) {
            TodoList existing = lists.get(id);
            if (existing == null) {
                return Optional.empty();
            }
            TodoList updated = new TodoList(existing.id(), title);
            lists.put(updated.id(), updated);
            return Optional.of(updated);
        }

        @Override
        public boolean delete(UUID id) {
            return lists.remove(id) != null;
        }
    }

    private static final class StaticTodoListRepository implements TodoListRepository {
        private final List<TodoList> lists;

        StaticTodoListRepository(List<TodoList> lists) {
            this.lists = lists;
        }

        @Override
        public List<TodoList> findAll() {
            return lists;
        }

        @Override
        public Optional<TodoList> findById(UUID id) {
            return lists.stream()
                    .filter(list -> list.id().equals(id))
                    .findFirst();
        }

        @Override
        public void create(TodoList list) {
            throw new UnsupportedOperationException("Static repository is read-only");
        }

        @Override
        public Optional<TodoList> patch(UUID id, String title) {
            throw new UnsupportedOperationException("Static repository is read-only");
        }

        @Override
        public boolean delete(UUID id) {
            throw new UnsupportedOperationException("Static repository is read-only");
        }
    }
}
