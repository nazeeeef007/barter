# Use a base image with Java & Maven
FROM maven:3.9.6-eclipse-temurin-17 AS build

WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy source and build the jar
COPY . .
RUN mvn clean package -DskipTests

# Final image with only JDK
FROM eclipse-temurin:17-jdk
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-Dio.netty.native.epoll=false", "-Dio.netty.native.kqueue=false", "-Dorg.apache.tomcat.util.http.parser.HttpParser.requestTargetAllow=|", "-jar", "app.jar"]
