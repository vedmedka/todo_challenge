# Containerized TODO App

Simple multi-list TODO application with a Java 25 Spring Boot 4.1 backend, PostgreSQL 18 persistence, Flyway migrations, and an Angular 21 frontend.

## Setup and Testing

See [docs/setup-and-testing.md](docs/setup-and-testing.md) for the shared run and verification commands.

## Architecture

- `backend/`: Spring Boot REST API using Java 25, Maven, Spring JDBC, PostgreSQL, and Flyway migrations.
- `frontend/`: Angular 21 app using Angular ESLint and Playwright e2e tests.
- `docker-compose.yml`: starts PostgreSQL, backend, and frontend containers with dependency caches and database data in named volumes.

Todo lists and todo state persist in the `todo-postgres-data` Docker volume until that volume is removed.

## API

The backend exposes list resources first, then todos scoped to a list:

- `GET /api/todo-lists`
- `POST /api/todo-lists`
- `PATCH /api/todo-lists/{listId}`
- `DELETE /api/todo-lists/{listId}`
- `GET /api/todo-lists/{listId}/todos`
- `POST /api/todo-lists/{listId}/todos`
- `PATCH /api/todo-lists/{listId}/todos/{todoId}`
- `DELETE /api/todo-lists/{listId}/todos/{todoId}`

Deleting a todo list deletes all todos in that list through the database foreign key cascade. Fresh databases are seeded with an `Inbox` list by Flyway; deleting the last list is allowed and leaves the app without a selected list until a new one is created.
