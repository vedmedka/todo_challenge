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

## Run Verification

Run all checks inside containers:

```bash
docker compose exec -T backend mvn verify
docker compose exec -T frontend npm run lint
docker compose exec -T frontend npm test
docker compose exec -T frontend npm run e2e
```

These commands verify the Spring Boot backend, Angular ESLint, Angular unit tests, and Playwright e2e tests.
