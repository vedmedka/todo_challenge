#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_URL="${API_URL:-http://backend:8080/api/todos}"
TODO_TITLE="${TODO_TITLE:-Persistence smoke $(date -u +%Y%m%dT%H%M%SZ)}"

cd "$ROOT_DIR"

created_id="$(
  docker compose exec -T \
    -e API_URL="$API_URL" \
    -e TODO_TITLE="$TODO_TITLE" \
    frontend node <<'NODE'
const apiUrl = process.env.API_URL;
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

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title }),
});

if (!response.ok) {
  throw new Error(`POST ${apiUrl} returned ${response.status}: ${await response.text()}`);
}

const todo = await response.json();
console.log(todo.id);
NODE
)"

docker compose restart backend >/dev/null

docker compose exec -T \
  -e API_URL="$API_URL" \
  -e CREATED_ID="$created_id" \
  frontend node <<'NODE'
const apiUrl = process.env.API_URL;
const createdId = process.env.CREATED_ID;

async function waitForTodo() {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(apiUrl);
      if (response.ok) {
        const todos = await response.json();
        if (todos.some((todo) => todo.id === createdId)) {
          return;
        }
        lastError = new Error(`todo ${createdId} was not returned`);
      } else {
        lastError = new Error(`GET ${apiUrl} returned ${response.status}`);
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw lastError;
}

await waitForTodo();

const deleteResponse = await fetch(`${apiUrl}/${createdId}`, { method: 'DELETE' });
if (!deleteResponse.ok && deleteResponse.status !== 404) {
  throw new Error(`DELETE ${createdId} returned ${deleteResponse.status}: ${await deleteResponse.text()}`);
}
NODE

printf 'Persistence smoke passed for todo %s.\n' "$created_id"
