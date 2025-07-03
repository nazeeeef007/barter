package com.barter.backend.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component; // <--- ADD THIS IMPORT
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component // <--- ADD THIS ANNOTATION
public class FirebaseAuthFilter extends OncePerRequestFilter {

    // If FirebaseAuth or any other dependency needs to be injected into this filter,
    // you would add a constructor here and declare them as final fields,
    // and Spring would inject them. For now, FirebaseAuth.getInstance() is fine.

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String idToken = authHeader.replace("Bearer ", "");

            try {
                FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
                String uid = decodedToken.getUid();

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(uid, null, Collections.emptyList());

                SecurityContextHolder.getContext().setAuthentication(authentication);

                request.setAttribute("firebaseUid", uid);
                request.setAttribute("firebaseToken", decodedToken); // Add this line
            } catch (Exception e) {
                // Log the exception for debugging in production
                System.err.println("Firebase token validation failed: " + e.getMessage());
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}