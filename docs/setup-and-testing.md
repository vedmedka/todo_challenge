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

The frontend runs at <http://localhost:4200>. The backend API is available at <http://localhost:8080/api/todos>.

PostgreSQL 18 runs in a separate `db` container. Todo data is stored in the `todo-postgres-data` Docker volume and survives backend or database container recreation.

Reset local todo data:

```bash
docker compose down -v
docker compose up --build
```

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
docker compose exec -T frontend npm test
docker compose exec -T frontend npm run e2e
```

These commands verify the Spring Boot backend, Angular ESLint, Angular unit tests, and Playwright e2e tests.
