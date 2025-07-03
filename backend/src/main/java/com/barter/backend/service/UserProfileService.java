package com.barter.backend.service;

import com.barter.backend.model.UserProfile;
import com.barter.backend.exception.ResourceNotFoundException;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ExecutionException;

@Service
public class UserProfileService {

    private static final Logger logger = LoggerFactory.getLogger(UserProfileService.class);
    private static final String COLLECTION_NAME = "user_profiles";
    private final Firestore firestore = FirestoreClient.getFirestore();
    private final ImageUploadService imageUploadService;

    public UserProfileService(ImageUploadService imageUploadService) {
        this.imageUploadService = imageUploadService;
    }

    public List<UserProfile> getAllUsers() {
        List<UserProfile> users = new ArrayList<>();
        try {
            ApiFuture<QuerySnapshot> future = firestore.collection(COLLECTION_NAME).get();
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();
            for (QueryDocumentSnapshot doc : documents) {
                UserProfile user = doc.toObject(UserProfile.class);
                if (user != null) {
                    user.setId(doc.getId()); // Ensure ID is set from document snapshot
                    user.initDefaults(); // Initialize rating fields if they are null from Firestore
                    users.add(user);
                }
            }
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Failed to fetch all user profiles: {}", e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to fetch users", e);
        }
        return users;
    }

    /**
     * Retrieves a user profile by their Firebase UID.
     * Renamed from getUserById for clarity and consistency.
     *
     * @param firebaseUid The Firebase UID of the user.
     * @return An Optional containing the UserProfile if found, otherwise empty.
     */
    public Optional<UserProfile> getUserProfileByFirebaseUid(String firebaseUid) {
        try {
            DocumentSnapshot doc = firestore.collection(COLLECTION_NAME)
                    .document(firebaseUid) // Document ID is the Firebase UID
                    .get().get();
            if (doc.exists()) {
                UserProfile user = doc.toObject(UserProfile.class);
                if (user != null) {
                    user.setId(doc.getId()); // Set Firestore doc ID, which is the firebaseUid
                    user.initDefaults(); // Initialize rating fields if they are null from Firestore
                }
                return Optional.ofNullable(user);
            }
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Failed to fetch user profile by Firebase UID {}: {}", firebaseUid, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to fetch user by Firebase UID", e);
        }
        return Optional.empty();
    }

    public UserProfile createUser(UserProfile user, MultipartFile image) {
        // Ensure creation date is set consistently
        user.initDefaults(); // Call initDefaults to set createdAt and initialize rating fields
        if (user.getCreatedAt() == null || user.getCreatedAt().isEmpty()) { // Double-check after initDefaults
            user.setCreatedAt(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        }


        try {
            if (image != null && !image.isEmpty()) {
                String imageUrl = imageUploadService.uploadImage(image);
                user.setProfileImageUrl(imageUrl);
            } else {
                user.setProfileImageUrl(null); // No image provided on creation
            }
        } catch (IOException e) {
            logger.error("Image upload failed during user profile creation for UID {}: {}", user.getFirebaseUid(), e.getMessage(), e);
            throw new RuntimeException("Image upload failed during profile creation", e);
        }

        String docId = user.getFirebaseUid(); // Use Firebase UID as Firestore document ID
        if (docId == null || docId.isEmpty()) {
            throw new IllegalArgumentException("Firebase UID must be provided to create a user profile.");
        }

        ApiFuture<WriteResult> future = firestore.collection(COLLECTION_NAME)
                .document(docId)
                .set(user); // Use set to create or overwrite
        try {
            future.get();
            user.setId(docId); // Set the ID on the returned object
            logger.info("Successfully created user profile for Firebase UID: {}", docId);
            return user;
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Failed to create user profile in Firestore for UID {}: {}", docId, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to create user profile in Firestore", e);
        }
    }

    public UserProfile updateUser(String firebaseUid, UserProfile updatedProfile, MultipartFile newImage)
            throws ResourceNotFoundException, IOException {
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(firebaseUid);
            ApiFuture<DocumentSnapshot> futureSnapshot = docRef.get();
            DocumentSnapshot snapshot = futureSnapshot.get();

            if (!snapshot.exists()) {
                logger.warn("Attempted to update non-existent user profile with Firebase UID: {}", firebaseUid);
                throw new ResourceNotFoundException("User profile not found with ID: " + firebaseUid);
            }

            UserProfile existingProfile = snapshot.toObject(UserProfile.class);
            if (existingProfile == null) {
                logger.error("Failed to map existing document {} to UserProfile during update attempt.", firebaseUid);
                throw new RuntimeException("Failed to retrieve existing user profile data.");
            }

            // Apply updates from updatedProfile to existingProfile
            // Only update fields if they are explicitly provided in the updatedProfile object
            if (updatedProfile.getDisplayName() != null) {
                existingProfile.setDisplayName(updatedProfile.getDisplayName());
            }
            if (updatedProfile.getLocation() != null) {
                existingProfile.setLocation(updatedProfile.getLocation());
            }
            if (updatedProfile.getBio() != null) {
                existingProfile.setBio(updatedProfile.getBio());
            }
            if (updatedProfile.getSkillsOffered() != null) {
                existingProfile.setSkillsOffered(updatedProfile.getSkillsOffered());
            }
            if (updatedProfile.getNeeds() != null) {
                existingProfile.setNeeds(updatedProfile.getNeeds());
            }

            // IMPORTANT: Do NOT update rating, reviewCount, totalRatingSum directly here
            // These should only be updated by the ReviewService.
            // If the updatedProfile object *contains* these fields, ensure they are ignored here
            // or handled carefully to prevent accidental overwrites.
            // For now, assuming these fields are NOT sent via the general updateUser endpoint.

            // Handle profile image update:
            if (newImage != null && !newImage.isEmpty()) {
                String newImageUrl = imageUploadService.uploadImage(newImage);
                if (existingProfile.getProfileImageUrl() != null && !existingProfile.getProfileImageUrl().isEmpty()) {
                    try {
                        imageUploadService.deleteImage(existingProfile.getProfileImageUrl());
                        logger.info("Deleted old profile image for user {}.", firebaseUid);
                    } catch (Exception e) {
                        logger.warn("Failed to delete old profile image for user {}: {}", firebaseUid, e.getMessage());
                    }
                }
                existingProfile.setProfileImageUrl(newImageUrl);
            } else if (updatedProfile.getProfileImageUrl() != null && updatedProfile.getProfileImageUrl().equals("null")) {
                if (existingProfile.getProfileImageUrl() != null && !existingProfile.getProfileImageUrl().isEmpty()) {
                    try {
                        imageUploadService.deleteImage(existingProfile.getProfileImageUrl());
                        logger.info("Removed profile image for user {} as explicitly requested.", firebaseUid);
                    } catch (Exception e) {
                        logger.warn("Failed to delete profile image for user {}: {}", firebaseUid, e.getMessage());
                    }
                }
                existingProfile.setProfileImageUrl(null);
            }

            ApiFuture<WriteResult> writeResult = docRef.set(existingProfile); // Overwrite the entire document
            writeResult.get();
            existingProfile.setId(firebaseUid); // Ensure the ID is set on the returned object
            logger.info("Successfully updated user profile for Firebase UID: {}", firebaseUid);
            return existingProfile; // Return the updated object
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error updating user profile {}: {}", firebaseUid, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to update user profile: " + firebaseUid, e);
        }
    }

    /**
     * Updates specific fields of an existing user profile without overwriting the entire document.
     * This method is designed for partial updates, particularly for rating calculations.
     *
     * @param firebaseUid The Firebase UID of the user profile to update.
     * @param updates A map of field names to their new values.
     * @throws ResourceNotFoundException if the user profile does not exist.
     * @throws RuntimeException if there's an error during Firestore access.
     */
    public void updateUserProfileFields(String firebaseUid, Map<String, Object> updates) throws ResourceNotFoundException {
        if (firebaseUid == null || firebaseUid.isEmpty()) {
            throw new IllegalArgumentException("User Firebase UID must not be null for update.");
        }
        if (updates == null || updates.isEmpty()) {
            logger.warn("No updates provided for user profile {}. Skipping update.", firebaseUid);
            return; // No operation needed
        }

        DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(firebaseUid);
        try {
            ApiFuture<DocumentSnapshot> futureSnapshot = docRef.get();
            if (!futureSnapshot.get().exists()) {
                throw new ResourceNotFoundException("User profile not found for UID: " + firebaseUid);
            }

            ApiFuture<WriteResult> writeResult = docRef.update(updates); // Use update for partial updates
            writeResult.get();
            logger.info("Successfully updated fields for user profile with UID: {}", firebaseUid);
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error updating user profile fields for UID {}: {}", firebaseUid, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to update user profile fields.", e);
        }
    }


    public void deleteUser(String id) throws ResourceNotFoundException {
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
            ApiFuture<DocumentSnapshot> futureSnapshot = docRef.get();
            DocumentSnapshot snapshot = futureSnapshot.get();

            if (!snapshot.exists()) {
                logger.warn("Attempted to delete non-existent user profile with ID: {}", id);
                throw new ResourceNotFoundException("User profile not found with ID: " + id);
            }

            UserProfile userProfile = snapshot.toObject(UserProfile.class);
            if (userProfile == null) {
                logger.error("Failed to map existing document {} to UserProfile during deletion attempt.", id);
                throw new RuntimeException("Failed to process user profile data for deletion of ID: " + id);
            }

            // Optional: Delete the profile image from GCS when the profile is deleted
            if (userProfile.getProfileImageUrl() != null && !userProfile.getProfileImageUrl().isEmpty()) {
                try {
                    imageUploadService.deleteImage(userProfile.getProfileImageUrl());
                    logger.info("Deleted profile image for user {}.", id);
                } catch (Exception e) {
                    logger.error("Failed to delete profile image for user {}: {}", id, e.getMessage());
                }
            }

            ApiFuture<WriteResult> deleteResult = docRef.delete();
            deleteResult.get();
            logger.info("Successfully deleted user profile with Firebase UID: {}", id);
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error deleting user profile {}: {}", id, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to delete user profile: " + id, e);
        }
    }
}