# Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS build

WORKDIR /app/backend

# Copy only backend pom.xml and download dependencies first (cache optimization)
COPY backend/pom.xml .
RUN mvn dependency:go-offline

# Copy backend source code and build jar
COPY backend/src ./src
RUN mvn clean package -DskipTests

# Final image with just JDK
FROM eclipse-temurin:17-jdk

WORKDIR /app/backend

# Copy jar from build stage
COPY --from=build /app/backend/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-Dio.netty.native.epoll=false", "-Dio.netty.native.kqueue=false", "-Dorg.apache.tomcat.util.http.parser.HttpParser.requestTargetAllow=|", "-jar", "app.jar"]
