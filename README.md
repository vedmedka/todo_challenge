# Containerized TODO App

Simple TODO application with a Java 25 Spring Boot 4.1 backend and Angular 21 frontend.

## Setup and Testing

See [docs/setup-and-testing.md](docs/setup-and-testing.md) for the shared run and verification commands.

## Architecture

- `backend/`: Spring Boot REST API using Java 25, Maven, and in-memory `ConcurrentHashMap` state.
- `frontend/`: Angular 21 app using Angular ESLint and Playwright e2e tests.
- `docker-compose.yml`: starts backend and frontend containers with dependency caches in named volumes.

Todo state is intentionally in memory and resets when the backend container restarts.
