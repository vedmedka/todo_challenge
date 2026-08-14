package com.dotega.todo.todolists.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.dotega.todo.todolists.application.TodoListRepository;
import com.dotega.todo.todolists.domain.TodoList;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class JdbcTodoListRepository implements TodoListRepository {
    private final JdbcClient jdbcClient;

    JdbcTodoListRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public List<TodoList> findAll() {
        return jdbcClient.sql("""
                        select id, title
                        from todo_lists
                        """)
                .query(TodoList.class)
                .list();
    }

    @Override
    public Optional<TodoList> findById(UUID id) {
        return jdbcClient.sql("select id, title from todo_lists where id = :id")
                .param("id", id)
                .query(TodoList.class)
                .optional();
    }

    @Override
    public void create(TodoList list) {
        jdbcClient.sql("""
                        insert into todo_lists (id, title)
                        values (:id, :title)
                        """)
                .param("id", list.id())
                .param("title", list.title())
                .update();
    }

    @Override
    public Optional<TodoList> patch(UUID id, String title) {
        return jdbcClient.sql("""
                        update todo_lists
                        set title = :title,
                            updated_at = now()
                        where id = :id
                        returning id, title
                        """)
                .param("id", id)
                .param("title", title)
                .query(TodoList.class)
                .optional();
    }

    @Override
    public boolean delete(UUID id) {
        int deletedRows = jdbcClient.sql("delete from todo_lists where id = :id")
                .param("id", id)
                .update();
        return deletedRows > 0;
    }
}
