# Repository Guidelines

## Project Structure & Module Organization

This repository contains a containerized TODO application split into two modules:

- `backend/`: Java 25 Spring Boot 4.1 REST API using Maven. Source lives in `backend/src/main/java`, tests in `backend/src/test/java`.
- `frontend/`: Angular 21 application. App source lives in `frontend/src/app`, browser entry files in `frontend/src`, and Playwright e2e tests in `frontend/e2e`.
- `docker-compose.yml`: starts backend and frontend containers.

The backend stores todos in memory with `ConcurrentHashMap`; state resets when the backend container restarts.

## Build, Test, and Development Commands

The host prerequisite is Docker. Use the shared setup and verification commands in [docs/setup-and-testing.md](docs/setup-and-testing.md). Do not require Java, Maven, Node, npm, Angular CLI, or browser tooling on the host.

## Coding Style & Naming Conventions

Java uses package `com.dotega.todo`, records for simple DTOs, and service/controller names such as `TodoService` and `TodoController`. Prefer clear REST request/response types over raw maps.

Angular uses standalone components, strict TypeScript, signals for component state, and Angular ESLint. Use kebab-case component selectors and descriptive method names such as `createTodo`, `toggleTodo`, and `deleteTodo`.

## Testing Guidelines

Develop behavior in TDD style: add or update a failing test first, implement the smallest fix, then rerun the relevant suite.

Backend tests use JUnit/Spring Boot test and should cover service behavior plus REST status/error contracts. Frontend tests use Karma/Jasmine for components/services and Playwright for user-visible flows. Name tests by expected behavior, for example `disables the checkbox while a toggle update is pending`.

## Commit & Pull Request Guidelines

Existing history uses Conventional Commits-style messages, for example `feat: initial todo app added` and `fix: not proper checkbox state change on backend error`. Continue with short prefixes such as `feat:`, `fix:`, `test:`, and `docs:`.

Pull requests should include a concise summary, verification commands run, and screenshots or notes for visible UI changes.

## Agent-Specific Instructions

Keep changes container-first and repository-scoped. Do not introduce a database unless requirements change. After frontend behavior changes, run the checks listed in [docs/setup-and-testing.md](docs/setup-and-testing.md) before reporting completion.

Apply SOLID principles when changing production code:

- Keep each class, service, component, and helper focused on one responsibility; extract state, validation, persistence, or UI orchestration when a file starts doing multiple jobs.
- Prefer extension through small, explicit interfaces and value types instead of widening existing contracts with nullable or loosely typed parameters.
- Keep abstractions substitutable: document and test repository/service contracts when behavior depends on ordering, partial updates, missing records, or error handling.
- Do not force consumers to implement unused interface methods; split or shrink interfaces when only one operation is required.
- Depend on stable abstractions at module boundaries, such as services depending on repositories and components depending on app services/stores instead of low-level HTTP or persistence details.
