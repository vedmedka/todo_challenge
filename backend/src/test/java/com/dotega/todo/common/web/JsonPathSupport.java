package com.dotega.todo.common.web;

import com.jayway.jsonpath.JsonPath;
import org.springframework.test.web.servlet.MvcResult;

public final class JsonPathSupport {
    private JsonPathSupport() {
    }

    public static String read(MvcResult result, String path) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), path);
    }
}
