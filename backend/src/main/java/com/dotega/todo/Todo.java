package com.dotega.todo;

import java.util.UUID;

public record Todo(UUID id, String title, boolean completed) {
}
