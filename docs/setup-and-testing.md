# Setup and Testing

## Prerequisite

Install Docker and Docker Compose on the host computer. If Docker is missing, use Docker's official installation entry points:

- [Get Started with Docker](https://www.docker.com/get-started/) for Docker Desktop downloads.
- [Install Docker Engine](https://docs.docker.com/engine/install/) for Linux/server-style installations.
- [Install Docker Compose](https://docs.docker.com/compose/install/) if Compose is not included in your Docker installation.

Java, Maven, Node, npm, Angular CLI, and browser tooling are provided by containers and should not be installed for this project.

Verify the required host tools:

```bash
docker --version
docker compose version
```

## Start the Application

```bash
docker compose up --build
```

The frontend runs at <http://localhost:4200>. The backend API is available at <http://localhost:8080/api/todo-lists>.

PostgreSQL 18 runs in a separate `db` container. Todo lists and todos are stored in the `todo-postgres-data` Docker volume and survive backend or database container recreation.

Reset local todo data:

```bash
docker compose down -v
docker compose up --build
```

The multi-list migration intentionally resets older single-list todo rows before creating `todo_lists` and list-scoped todos. A fresh database starts with an `Inbox` list, but users may delete every list.

## API Overview

Todo lists:

```text
GET    /api/todo-lists
POST   /api/todo-lists
PATCH  /api/todo-lists/{listId}
DELETE /api/todo-lists/{listId}
```

Todos are always scoped to a list:

```text
GET    /api/todo-lists/{listId}/todos
POST   /api/todo-lists/{listId}/todos
PATCH  /api/todo-lists/{listId}/todos/{todoId}
DELETE /api/todo-lists/{listId}/todos/{todoId}
```

Blank todo or list titles return `400`. Missing todo lists or todos return `404`. Deleting a todo list also deletes all todos in that list.

## Run Verification

Run the full test sweep and collect results:

```bash
./scripts/full-test-sweep.sh
```

The script starts fresh Docker Compose services with `docker compose up -d --build --force-recreate`, runs all verification commands inside containers, prints a readable result table, and writes collected logs, reports, per-suite `summary.json` files, and `latest-summary.json` under `test-results/full-sweep/`.

Run all checks inside containers:

```bash
docker compose exec -T backend mvn verify
./scripts/persistence-smoke.sh
docker compose exec -T frontend npm run lint
docker compose exec -T frontend npm run test:coverage
docker compose exec -T frontend npm run e2e
```

These commands verify the Spring Boot backend, Angular ESLint, Angular unit tests with coverage, and Playwright e2e tests.

The frontend coverage report is generated under `frontend/coverage/todo-frontend/`. The full sweep prints the coverage percentages in its result table, records them in `latest-summary.json` and the `frontend-unit` suite summary, and copies the HTML report into the corresponding suite artifacts under `test-results/full-sweep/`.
