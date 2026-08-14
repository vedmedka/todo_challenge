package com.dotega.todo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class JdbcTodoRepository implements TodoRepository {
    private final JdbcClient jdbcClient;

    JdbcTodoRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public List<Todo> findAll() {
        return jdbcClient.sql("""
                        select id, title, completed
                        from todos
                        """)
                .query(Todo.class)
                .list();
    }

    @Override
    public Optional<Todo> findById(UUID id) {
        return jdbcClient.sql("select id, title, completed from todos where id = :id")
                .param("id", id)
                .query(Todo.class)
                .optional();
    }

    @Override
    public void create(Todo todo) {
        jdbcClient.sql("""
                        insert into todos (id, title, completed)
                        values (:id, :title, :completed)
                        """)
                .param("id", todo.id())
                .param("title", todo.title())
                .param("completed", todo.completed())
                .update();
    }

    @Override
    public Optional<Todo> patch(UUID id, TodoPatch patch) {
        return jdbcClient.sql("""
                        update todos
                        set title = case when :replaceTitle then :title else title end,
                            completed = case when :replaceCompleted then :completed else completed end,
                            updated_at = now()
                        where id = :id
                        returning id, title, completed
                        """)
                .param("id", id)
                .param("replaceTitle", patch.title() != null)
                .param("title", patch.title())
                .param("replaceCompleted", patch.completed() != null)
                .param("completed", patch.completed())
                .query(Todo.class)
                .optional();
    }

    @Override
    public boolean delete(UUID id) {
        int deletedRows = jdbcClient.sql("delete from todos where id = :id")
                .param("id", id)
                .update();
        return deletedRows > 0;
    }
}
