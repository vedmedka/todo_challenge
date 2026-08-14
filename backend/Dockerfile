FROM maven:3.9.11-eclipse-temurin-25

ENV MAVEN_OPTS=--sun-misc-unsafe-memory-access=allow

WORKDIR /app

COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

COPY src ./src

EXPOSE 8080

CMD ["mvn", "spring-boot:run"]
