# Containerized TODO App

Simple TODO application with a Java 25 Spring Boot 4.1 backend, PostgreSQL 18 persistence, Flyway migrations, and an Angular 21 frontend.

## Setup and Testing

See [docs/setup-and-testing.md](docs/setup-and-testing.md) for the shared run and verification commands.

## Architecture

- `backend/`: Spring Boot REST API using Java 25, Maven, Spring JDBC, PostgreSQL, and Flyway migrations.
- `frontend/`: Angular 21 app using Angular ESLint and Playwright e2e tests.
- `docker-compose.yml`: starts PostgreSQL, backend, and frontend containers with dependency caches and database data in named volumes.

Todo state persists in the `todo-postgres-data` Docker volume until that volume is removed.
