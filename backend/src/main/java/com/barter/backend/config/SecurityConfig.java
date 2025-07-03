package com.barter.backend.config;

import com.barter.backend.security.FirebaseAuthFilter;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final FirebaseAuthFilter firebaseAuthFilter;
    private final CorsConfigurationSource corsConfigurationSource;

    public SecurityConfig(FirebaseAuthFilter firebaseAuthFilter, CorsConfigurationSource corsConfigurationSource) {
        this.firebaseAuthFilter = firebaseAuthFilter;
        this.corsConfigurationSource = corsConfigurationSource;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Configure CORS using the injected CorsConfigurationSource
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                // Disable CSRF using a lambda
                .csrf(csrf -> csrf.disable())
                // Configure authorization rules
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints for Barter Posts (GET only)
                        .requestMatchers(HttpMethod.GET, "/api/posts", "/api/posts/**").permitAll()

                        // Public endpoints for User Profiles (GET only)
                        .requestMatchers(HttpMethod.GET, "/api/users/{id}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/users").permitAll()

                        // Public endpoints for Reviews (GET only)
                        .requestMatchers(HttpMethod.GET, "/api/reviews").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reviews/received").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reviews/written").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reviews/post/{barterPostId}").permitAll()

                        // Keep your existing public paths
                        .requestMatchers("/api/public/**", "/api/auth/**").permitAll()

                        // NEW: Chat API endpoints - require authentication
                        // All /api/chats/** paths require an authenticated user.
                        // The FirebaseAuthFilter will process the token, and the ChatController
                        // will perform further authorization checks (e.g., if user is a participant).
                        .requestMatchers("/api/chats/**").authenticated()

                        // All other requests also require authentication (this is a catch-all,
                        // ensuring anything not explicitly permitted is protected)
                        .anyRequest().authenticated()
                )
                // Add your FirebaseAuthFilter before Spring Security's default filters
                .addFilterBefore(
                        firebaseAuthFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}
