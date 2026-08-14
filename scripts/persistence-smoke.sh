#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_URL="${API_URL:-http://backend:8080/api/todo-lists}"
TODO_TITLE="${TODO_TITLE:-Persistence smoke $(date -u +%Y%m%dT%H%M%SZ)}"
LIST_TITLE="${LIST_TITLE:-Persistence smoke list $(date -u +%Y%m%dT%H%M%SZ)}"

cd "$ROOT_DIR"

created_id="$(
  docker compose exec -T \
    -e API_URL="$API_URL" \
    -e LIST_TITLE="$LIST_TITLE" \
    -e TODO_TITLE="$TODO_TITLE" \
    frontend node <<'NODE'
const apiUrl = process.env.API_URL;
const listTitle = process.env.LIST_TITLE;
const title = process.env.TODO_TITLE;

async function waitForBackend() {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(apiUrl);
      if (response.ok) {
        return;
      }
      lastError = new Error(`GET ${apiUrl} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw lastError;
}

await waitForBackend();

const listResponse = await fetch(apiUrl, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title: listTitle }),
});

if (!listResponse.ok) {
  throw new Error(`POST ${apiUrl} returned ${listResponse.status}: ${await listResponse.text()}`);
}

const list = await listResponse.json();
const todoUrl = `${apiUrl}/${list.id}/todos`;

const response = await fetch(todoUrl, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title }),
});

if (!response.ok) {
  throw new Error(`POST ${todoUrl} returned ${response.status}: ${await response.text()}`);
}

const todo = await response.json();
console.log(`${list.id}:${todo.id}`);
NODE
)"

created_list_id="${created_id%%:*}"
created_todo_id="${created_id#*:}"

docker compose restart backend >/dev/null

docker compose exec -T \
  -e API_URL="$API_URL" \
  -e CREATED_LIST_ID="$created_list_id" \
  -e CREATED_TODO_ID="$created_todo_id" \
  frontend node <<'NODE'
const apiUrl = process.env.API_URL;
const createdListId = process.env.CREATED_LIST_ID;
const createdTodoId = process.env.CREATED_TODO_ID;
const todoUrl = `${apiUrl}/${createdListId}/todos`;

async function waitForTodo() {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(todoUrl);
      if (response.ok) {
        const todos = await response.json();
        if (todos.some((todo) => todo.id === createdTodoId)) {
          return;
        }
        lastError = new Error(`todo ${createdTodoId} was not returned`);
      } else {
        lastError = new Error(`GET ${todoUrl} returned ${response.status}`);
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw lastError;
}

await waitForTodo();

const deleteResponse = await fetch(`${apiUrl}/${createdListId}`, { method: 'DELETE' });
if (!deleteResponse.ok && deleteResponse.status !== 404) {
  throw new Error(`DELETE ${createdListId} returned ${deleteResponse.status}: ${await deleteResponse.text()}`);
}
NODE

printf 'Persistence smoke passed for todo %s in list %s.\n' "$created_todo_id" "$created_list_id"
