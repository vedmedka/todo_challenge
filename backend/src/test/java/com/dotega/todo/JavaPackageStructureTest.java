package com.dotega.todo;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class JavaPackageStructureTest {
    @Test
    void structuresBackendPackagesByFeatureThenLayer() throws Exception {
        assertThat(packageName("com.dotega.todo.TodoApplication")).isEqualTo("com.dotega.todo");
        assertThat(packageName("com.dotega.todo.todolists.domain.TodoList")).isEqualTo("com.dotega.todo.todolists.domain");
        assertThat(packageName("com.dotega.todo.todolists.application.TodoListService")).isEqualTo("com.dotega.todo.todolists.application");
        assertThat(packageName("com.dotega.todo.todolists.persistence.JdbcTodoListRepository")).isEqualTo("com.dotega.todo.todolists.persistence");
        assertThat(packageName("com.dotega.todo.todolists.web.CreateTodoListRequest")).isEqualTo("com.dotega.todo.todolists.web");
        assertThat(packageName("com.dotega.todo.todolists.web.TodoListController")).isEqualTo("com.dotega.todo.todolists.web");
        assertThat(packageName("com.dotega.todo.todos.domain.Todo")).isEqualTo("com.dotega.todo.todos.domain");
        assertThat(packageName("com.dotega.todo.todos.application.TodoService")).isEqualTo("com.dotega.todo.todos.application");
        assertThat(packageName("com.dotega.todo.todos.persistence.JdbcTodoRepository")).isEqualTo("com.dotega.todo.todos.persistence");
        assertThat(packageName("com.dotega.todo.todos.web.CreateTodoRequest")).isEqualTo("com.dotega.todo.todos.web");
        assertThat(packageName("com.dotega.todo.todos.web.TodoController")).isEqualTo("com.dotega.todo.todos.web");
        assertThat(packageName("com.dotega.todo.common.web.ApiError")).isEqualTo("com.dotega.todo.common.web");
        assertThat(packageName("com.dotega.todo.common.domain.InvalidTodoException")).isEqualTo("com.dotega.todo.common.domain");
    }

    private static String packageName(String className) throws Exception {
        return Class.forName(className).getPackageName();
    }
}
