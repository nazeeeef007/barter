# Stage 1: Build with Maven and JDK 17
FROM maven:3.9.6-eclipse-temurin-17 AS build

WORKDIR /app

# Copy only pom.xml first and download dependencies (cache)
COPY backend/pom.xml .

RUN mvn dependency:go-offline

# Copy all source files from backend directory
COPY backend/src ./src

# Build the jar without running tests
RUN mvn clean package -DskipTests

# Stage 2: Run with JDK 17 Alpine
FROM eclipse-temurin:17-jdk-alpine

WORKDIR /app

# Copy the built jar from the build stage
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
