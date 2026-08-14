package com.dotega.todo.todolists.web;

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
class TodoListControllerTest {
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
    void createsUpdatesAndDeletesTodoLists() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/todo-lists")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\" Work \"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.title").value("Work"))
                .andReturn();

        String listId = JsonPathSupport.read(result, "$.id");

        mockMvc.perform(get("/api/todo-lists"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(listId)));

        mockMvc.perform(patch("/api/todo-lists/{listId}", listId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Home\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(listId))
                .andExpect(jsonPath("$.title").value("Home"));

        mockMvc.perform(delete("/api/todo-lists/{listId}", listId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/todo-lists"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id").isEmpty());
    }

    @Test
    void returnsValidationErrorForBlankTodoListTitle() throws Exception {
        mockMvc.perform(post("/api/todo-lists")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\" \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Todo list title must not be empty"));
    }

    @Test
    void deletingTodoListCascadesItsTodos() throws Exception {
        String listId = createTodoList("Work");
        String todoId = createTodo(listId, "Remove with list");

        mockMvc.perform(delete("/api/todo-lists/{listId}", listId))
                .andExpect(status().isNoContent());

        mockMvc.perform(patch("/api/todo-lists/{listId}/todos/{id}", listId, todoId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"completed\":true}"))
                .andExpect(status().isNotFound());
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
