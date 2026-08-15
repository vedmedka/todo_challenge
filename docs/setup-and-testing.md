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

Backend `mvn verify` also runs the pragmatic code-quality gates:

- JaCoCo line/instruction and branch coverage checks, with the HTML report under `backend/target/site/jacoco/`.
- ArchUnit package-boundary tests for domain, application, web, and persistence dependencies.
- SpotBugs static bug detection, with XML output at `backend/target/spotbugsXml.xml`.
- PIT mutation testing for the application/domain slice, with reports under `backend/target/pit-reports/`.

The full sweep prints backend coverage in its result table, prints backend metric report links below the table, copies backend quality reports into the backend suite artifacts under `test-results/full-sweep/`, and records named report links in each backend suite summary's `metric_references` field.

The frontend coverage report is generated under `frontend/coverage/todo-frontend/`. The full sweep prints the coverage percentages in its result table, records them in `latest-summary.json` and the `frontend-unit` suite summary, and copies the HTML report into the corresponding suite artifacts under `test-results/full-sweep/`.

## GitHub CI

Local parity for GitHub CI is still:

```bash
./scripts/full-test-sweep.sh
```

The `CI` workflow runs that Docker-first full sweep for pull requests to `main`, pushes to `main`, and manual dispatches. It uploads `test-results/full-sweep/` as the `full-sweep-results` artifact with a 3-day retention window even when the sweep fails, then removes Compose containers, volumes, and orphans.

The `Dependency Review` workflow runs only for pull requests to `main` and fails when dependency changes introduce new `high` or `critical` vulnerabilities. It intentionally uses `pull_request`, not `pull_request_target`, so pull request code does not receive privileged tokens.

Required repository settings:

- Protect `main`.
- Require a pull request before merge.
- Require branches to be up to date before merge.
- Require the `CI` status check.
- Require the `Dependency Review` status check after the workflow has run successfully at least once and GitHub exposes it as selectable.
- Block force pushes and branch deletion.
- Enable the dependency graph.
- Enable Dependabot alerts and Dependabot security updates.
- Enable secret scanning and push protection where available for the repository plan and visibility.

If dependency review is unavailable because the repository is private and does not have the required GitHub Advanced Security capability, keep Dependabot and `CI` required and record `Dependency Review` as blocked by repository licensing.
