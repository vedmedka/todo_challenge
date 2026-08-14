package com.dotega.todo.todos.web;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dotega.todo.common.web.JsonPathSupport;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class TodoControllerTest {
    @Autowired
    private MockMvc mockMvc;

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
    void createsAndListsTodosInsideTodoList() throws Exception {
        String listId = createTodoList("Work");

        MvcResult result = mockMvc.perform(post("/api/todo-lists/{listId}/todos", listId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\" Write tests \"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.title").value("Write tests"))
                .andExpect(jsonPath("$.completed").value(false))
                .andReturn();

        String id = JsonPathSupport.read(result, "$.id");

        mockMvc.perform(get("/api/todo-lists/{listId}/todos", listId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(id)));
    }

    @Test
    void updatesTodoTitleAndCompletedState() throws Exception {
        String listId = createTodoList("Work");
        String id = createTodo(listId, "Draft");

        mockMvc.perform(patch("/api/todo-lists/{listId}/todos/{id}", listId, id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Done\",\"completed\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.title").value("Done"))
                .andExpect(jsonPath("$.completed").value(true));
    }

    @Test
    void deletesTodo() throws Exception {
        String listId = createTodoList("Work");
        String id = createTodo(listId, "Remove");

        mockMvc.perform(delete("/api/todo-lists/{listId}/todos/{id}", listId, id))
                .andExpect(status().isNoContent());

        mockMvc.perform(patch("/api/todo-lists/{listId}/todos/{id}", listId, id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"completed\":true}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void returnsValidationErrorForBlankTodoTitle() throws Exception {
        String listId = createTodoList("Work");

        mockMvc.perform(post("/api/todo-lists/{listId}/todos", listId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\" \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Todo title must not be empty"));
    }

    @Test
    void returnsNotFoundForMissingTodo() throws Exception {
        String listId = createTodoList("Work");

        mockMvc.perform(delete("/api/todo-lists/{listId}/todos/{id}", listId, "00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void returnsNotFoundForMissingTodoList() throws Exception {
        mockMvc.perform(get("/api/todo-lists/{listId}/todos", "00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Todo list not found: 00000000-0000-0000-0000-000000000000"));
    }

    private String createTodoList(String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/todo-lists")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPathSupport.read(result, "$.id");
    }

    private String createTodo(String listId, String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/todo-lists/{listId}/todos", listId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPathSupport.read(result, "$.id");
    }
}
