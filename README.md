# Containerized TODO App

Simple TODO application with a Java 25 Spring Boot 4.1 backend and Angular 21 frontend.

## Prerequisites

Docker with Docker Compose. Java, Maven, Node, npm, Angular CLI, and browser tooling are not required on the MacOS host.

## Run

```bash
docker compose up --build
```

Open the app at <http://localhost:4200>. The backend API is available at <http://localhost:8080/api/todos>.

## Checks

Run checks inside containers:

```bash
docker compose exec backend mvn verify
docker compose exec frontend npm run lint
docker compose exec frontend npm test
docker compose exec frontend npm run e2e
```

## Architecture

- `backend/`: Spring Boot REST API using Java 25, Maven, and in-memory `ConcurrentHashMap` state.
- `frontend/`: Angular 21 app using Angular ESLint and Playwright e2e tests.
- `docker-compose.yml`: starts backend and frontend containers with dependency caches in named volumes.

Todo state is intentionally in memory and resets when the backend container restarts.
