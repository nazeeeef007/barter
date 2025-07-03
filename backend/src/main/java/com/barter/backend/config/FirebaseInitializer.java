package com.barter.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import io.github.cdimascio.dotenv.Dotenv;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.Base64;

@Configuration
public class FirebaseInitializer {

    @PostConstruct
    public void init() {
        try {
            // Load from .env file
            Dotenv dotenv = Dotenv.load();
            String base64ServiceAccount = dotenv.get("FIREBASE_SA_BASE64");

            if (base64ServiceAccount == null || base64ServiceAccount.isEmpty()) {
                throw new IllegalStateException("FIREBASE_SA_BASE64 is not set in .env");
            }

            byte[] decodedBytes = Base64.getDecoder().decode(base64ServiceAccount);
            InputStream serviceAccountStream = new ByteArrayInputStream(decodedBytes);

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccountStream))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
            }
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to initialize Firebase", e);
        }
    }
}
