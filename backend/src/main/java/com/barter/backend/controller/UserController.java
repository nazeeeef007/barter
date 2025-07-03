package com.barter.backend.controller;

import com.barter.backend.model.UserProfile;
import com.barter.backend.service.UserProfileService;
import com.barter.backend.exception.ResourceNotFoundException;
import com.barter.backend.exception.UnauthorizedAccessException; // Keep if used elsewhere
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    private final UserProfileService userService;

    public UserController(UserProfileService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserProfile> getAllUsers() {
        logger.info("Received request to get all user profiles.");
        List<UserProfile> users = userService.getAllUsers();
        logger.info("Fetched {} user profiles.", users.size());
        return users;
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserProfile> getUser(@PathVariable String id) {
        // This endpoint can be used for public viewing of a user profile
        // No authentication required if public profiles are allowed
        logger.info("Received request to get user profile by ID: {}", id);
        // --- FIX START ---
        // Changed from userService.getId(id) to userService.getUserProfileByFirebaseUid(id)
        return userService.getUserProfileByFirebaseUid(id)
                .map(userProfile -> {
                    logger.info("Fetched user profile for ID: {}", id);
                    return ResponseEntity.ok(userProfile);
                })
                .orElseGet(() -> { // Use orElseGet for lazy evaluation of notFound().build()
                    logger.warn("User profile not found for ID: {}", id);
                    return ResponseEntity.notFound().build();
                });
        // --- FIX END ---
    }

    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<?> createUser(
            @RequestPart("user") UserProfile user,
            @RequestPart(value = "image", required = false) MultipartFile image,
            HttpServletRequest request
    ) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to create user profile without Firebase token.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Firebase token missing");
        }

        if (!token.getUid().equals(user.getFirebaseUid())) {
            logger.warn("Mismatched Firebase UID during user profile creation. Token UID: {}, Request UID: {}", token.getUid(), user.getFirebaseUid());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Authenticated user does not match the user being created.");
        }

        try {
            user.setFirebaseUid(token.getUid());
            if (user.getEmail() == null || user.getEmail().isEmpty()) {
                user.setEmail(token.getEmail());
            }

            UserProfile createdUser = userService.createUser(user, image);
            logger.info("Created new user profile with Firebase UID: {}", createdUser.getFirebaseUid());
            return ResponseEntity.status(HttpStatus.CREATED).body(createdUser);
        } catch (IllegalArgumentException e) {
            logger.warn("Bad request for user profile creation: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("Error creating user profile for UID {}: {}", token.getUid(), e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Error creating user: " + e.getMessage());
        }
    }

    @PutMapping(value = "/{firebaseUid}", consumes = {"multipart/form-data"})
    public ResponseEntity<?> updateUser(
            @PathVariable String firebaseUid,
            @RequestPart("user") UserProfile updatedUser,
            @RequestPart(value = "image", required = false) MultipartFile newImage,
            HttpServletRequest request
    ) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to update user profile {} without Firebase token.", firebaseUid);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Firebase token missing.");
        }

        if (!token.getUid().equals(firebaseUid)) {
            logger.warn("Unauthorized attempt by user {} to update profile {}.", token.getUid(), firebaseUid);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to update this profile.");
        }

        try {
            UserProfile result = userService.updateUser(firebaseUid, updatedUser, newImage);
            logger.info("Updated user profile with Firebase UID: {}", firebaseUid);
            return ResponseEntity.ok(result);
        } catch (ResourceNotFoundException e) {
            logger.warn("User profile not found for update: {}", firebaseUid);
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        } catch (IllegalArgumentException e) {
            logger.warn("Bad request for user profile update {}: {}", firebaseUid, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("Error updating user profile {} for user {}: {}", firebaseUid, token.getUid(), e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Error updating user profile: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id, HttpServletRequest request) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to delete user profile {} without Firebase token.", id);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Firebase token missing.");
        }
        if (!token.getUid().equals(id)) {
            logger.warn("Unauthorized attempt by user {} to delete profile {}.", token.getUid(), id);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to delete this profile.");
        }

        try {
            userService.deleteUser(id);
            logger.info("Deleted user profile with Firebase UID: {}", id);
            return ResponseEntity.noContent().build();
        } catch (ResourceNotFoundException e) {
            logger.warn("User profile not found for deletion: {}", id);
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            logger.error("Error deleting user profile {}: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Error deleting user profile: " + e.getMessage());
        }
    }
}