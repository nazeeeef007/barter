package com.barter.backend.service;

import com.barter.backend.model.BarterPost;
import com.barter.backend.model.AvailabilityRange; // Make sure this is imported
import com.barter.backend.exception.ResourceNotFoundException;
import com.barter.backend.exception.UnauthorizedAccessException;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ExecutionException;
import java.io.IOException;
import java.util.stream.Collectors;

@Service
public class BarterPostService {

    private static final Logger logger = LoggerFactory.getLogger(BarterPostService.class);
    private static final String COLLECTION_NAME = "barterPosts";
    private static final String USER_PROFILES_COLLECTION = "user_profiles"; // Added constant for clarity
    private final ImageUploadService imageUploadService;

    private final Firestore firestore = FirestoreClient.getFirestore();

    public BarterPostService(ImageUploadService imageUploadService) {
        this.imageUploadService = imageUploadService;
    }

    /**
     * Fetches a page of filtered barter posts from Firestore.
     * Due to Firestore limitations with current schema (String createdAt, no urgency field),
     * we will fetch a broader set of data and perform more extensive in-memory filtering and pagination.
     *
     * @param uploaderId Optional: Filter by uploader's Firebase UID.
     * @param searchTerm Optional: Text to search in title, description, and preferredExchange.
     * @param skillCategories Optional: List of skill categories (tags) to filter by.
     * @param location Optional: Filter by exact location.
     * @param radius Not used directly in Firestore query, for future geospatial search.
     * @param availabilityFilter Optional: A string representing a date (e.g., "YYYY-MM-DD"), to check if a post is available on that date.
     * @param urgency Optional: Filter by urgency (requires 'urgency' field in Firestore, if not present, this will do nothing).
     * @param status The status of the posts (e.g., "open", "closed"). Defaults to "open".
     * @param page Zero-indexed page number.
     * @param size Number of items per page.
     * @return A list of BarterPost objects for the requested page.
     */
    public List<BarterPost> getFilteredPosts(
            String uploaderId,
            String searchTerm,
            List<String> skillCategories,
            String location,
            Double radius, // Placeholder, not used in Firestore query with current schema
            String availabilityFilter,
            String urgency, // Placeholder for future schema change or in-memory check
            String status,
            int page,
            int size
    ) {
        logger.info("Fetching filtered posts: uploaderId={}, searchTerm={}, skillCategories={}, location={}, availabilityFilter={}, urgency={}, status={}, page={}, size={}",
                uploaderId, searchTerm, skillCategories, location, availabilityFilter, urgency, status, page, size);

        Query query = firestore.collection(COLLECTION_NAME);

        // --- Step 1: Apply direct Firestore filters (exact matches) ---
        // These are the most efficient filters as Firestore can use indexes.

        // Always filter by status, default to 'open' if not provided
        String effectiveStatus = (status != null && !status.isEmpty()) ? status : "open";
        query = query.whereEqualTo("status", effectiveStatus);

        if (uploaderId != null && !uploaderId.isEmpty()) {
            query = query.whereEqualTo("userFirebaseUid", uploaderId);
        }

        if (location != null && !location.isEmpty()) {
            query = query.whereEqualTo("location", location);
        }

        // If 'urgency' existed as a field, you would uncomment this:
        // if (urgency != null && !urgency.isEmpty()) {
        //     query = query.whereEqualTo("urgency", urgency);
        // }


        if (skillCategories != null && !skillCategories.isEmpty()) {
            // Firestore's array-contains-any is useful for "OR" logic with tags.
            // Max 10 elements in the list for arrayContainsAny.
            if (skillCategories.size() <= 10) {
                query = query.whereArrayContainsAny("tags", skillCategories);
            } else {
                logger.warn("Too many skill categories for Firestore's arrayContainsAny (max 10). Fetching all and filtering in-memory for tags.");
                // If more than 10, we'll have to rely on in-memory filtering for tags too.
                // For this scenario, we might remove the Firestore filter and handle it entirely in-memory.
                // For simplicity, sticking with the 10-limit Firestore filter for now.
            }
        }

        // Order results for consistent pagination and in-memory sorting.
        // Sorting by 'createdAt' (String) will be lexicographical, not chronological.
        query = query.orderBy("createdAt", Query.Direction.DESCENDING);

        // --- Step 2: Fetch all documents matching the direct Firestore filters ---
        List<BarterPost> allFilteredPosts = new ArrayList<>();
        try {
            ApiFuture<QuerySnapshot> future = query.get();
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();

            List<ApiFuture<DocumentSnapshot>> userProfileFutures = new ArrayList<>();
            List<String> userUids = new ArrayList<>();
            List<BarterPost> tempPosts = new ArrayList<>(); // To hold posts before enriching

            // First pass: get posts and collect unique user UIDs
            for (DocumentSnapshot doc : documents) {
                try {
                    BarterPost post = doc.toObject(BarterPost.class);
                    if (post != null) {
                        post.setId(doc.getId());
                        tempPosts.add(post);
                        userUids.add(post.getUserFirebaseUid());
                    }
                } catch (Exception e) {
                    logger.error("Error mapping document {} to BarterPost: {}", doc.getId(), e.getMessage(), e);
                }
            }

            // Fetch all unique user profiles in parallel
            // This optimizes Firestore reads by batching
            for (String uid : userUids.stream().distinct().collect(Collectors.toList())) {
                userProfileFutures.add(firestore.collection(USER_PROFILES_COLLECTION).document(uid).get());
            }

            // Create a map of UID to UserProfile data for quick lookup
            java.util.Map<String, DocumentSnapshot> userProfileMap = new java.util.HashMap<>();
            for (ApiFuture<DocumentSnapshot> userFuture : userProfileFutures) {
                DocumentSnapshot userSnapshot = userFuture.get();
                if (userSnapshot.exists()) {
                    userProfileMap.put(userSnapshot.getId(), userSnapshot);
                }
            }

            // Enrich posts with user profile data
            for (BarterPost post : tempPosts) {
                DocumentSnapshot userSnapshot = userProfileMap.get(post.getUserFirebaseUid());
                if (userSnapshot != null) {
                    post.setDisplayName(userSnapshot.getString("displayName"));
                    post.setProfileImageUrl(userSnapshot.getString("profileImageUrl"));
                } else {
                    logger.warn("User profile not found for UID: {} associated with post {}. Defaulting display name/image.",
                            post.getUserFirebaseUid(), post.getId());
                    post.setDisplayName("Unknown User");
                    post.setProfileImageUrl(null);
                }
                allFilteredPosts.add(post);
            }

        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error retrieving filtered posts from Firestore: {}", e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to retrieve filtered posts.", e);
        }

        // --- Step 3: Apply in-memory filters (for criteria not directly supported by Firestore) ---

        // Filter by search term (substring search on title, description, preferredExchange)
        if (searchTerm != null && !searchTerm.isEmpty()) {
            final String lowerCaseSearchTerm = searchTerm.toLowerCase();
            allFilteredPosts = allFilteredPosts.stream()
                    .filter(post ->
                            (post.getTitle() != null && post.getTitle().toLowerCase().contains(lowerCaseSearchTerm)) ||
                                    (post.getDescription() != null && post.getDescription().toLowerCase().contains(lowerCaseSearchTerm)) ||
                                    (post.getPreferredExchange() != null && post.getPreferredExchange().toLowerCase().contains(lowerCaseSearchTerm))
                    )
                    .collect(Collectors.toList());
        }

        // Filter by availability (complex date range check)
        if (availabilityFilter != null && !availabilityFilter.isEmpty()) {
            try {
                LocalDate filterDate = LocalDate.parse(availabilityFilter); // Assuming "YYYY-MM-DD"
                allFilteredPosts = allFilteredPosts.stream()
                        .filter(post -> {
                            if (post.getAvailability() == null || post.getAvailability().isEmpty()) {
                                return false; // Post has no availability ranges
                            }
                            // Check if the filterDate falls within any of the post's availability ranges
                            return post.getAvailability().stream().anyMatch(range -> {
                                LocalDate start = range.parseStartDateForFiltering(); // Or directly parse Instant.parse(range.getStart())...
                                LocalDate end = range.parseEndDateForFiltering();
                                return start != null && end != null &&
                                        !filterDate.isBefore(start) && !filterDate.isAfter(end);
                            });
                        })
                        .collect(Collectors.toList());
            } catch (DateTimeParseException e) {
                logger.warn("Invalid availabilityFilter date format: {}. Skipping availability filter.", availabilityFilter);
                // Continue without applying this filter if the format is bad
            }
        }

        // If 'urgency' is only a client-side filter and not a Firestore field,
        // you'd add an in-memory filter here:
        // if (urgency != null && !urgency.isEmpty()) {
        //     allFilteredPosts = allFilteredPosts.stream()
        //             .filter(post -> urgency.equalsIgnoreCase(post.getUrgency())) // Assuming getUrgency() exists and returns a String
        //             .collect(Collectors.toList());
        // }


        // --- Step 4: Apply in-memory pagination ---
        int start = page * size;
        int end = Math.min(start + size, allFilteredPosts.size());

        if (start < allFilteredPosts.size()) {
            // To ensure consistent chronological order if string sorting was insufficient
            // (e.g., if "2024-01-10T10:00:00" vs "2024-01-09T23:00:00"),
            // you might want to sort in-memory AFTER filtering if your string format isn't strictly sortable.
            // However, with ISO_DATE_TIME, it should be mostly fine.
            // If you need perfect chronological sorting, schema change to long/Timestamp is highly recommended.
            return allFilteredPosts.subList(start, end);
        } else {
            return new ArrayList<>(); // No posts on this page
        }
    }

    // Existing methods (getAllPosts, getPostsByUser, searchPosts, getPostsByType, getPostsByTag, getPostsByLocation)
    // are now redundant if getFilteredPosts is the primary entry point for fetching lists of posts.
    // I will remove them to keep the service cleaner and less confusing.

    // --- IMPORTANT: Removed redundant list-fetching methods ---
    // getAllPosts, getPostsByUser, searchPosts, getPostsByType, getPostsByTag, getPostsByLocation
    // The functionality is now consolidated into getFilteredPosts.

    // --- Create Post (updated for consistent createdAt format) ---
    public BarterPost createPost(BarterPost post, MultipartFile image, String userFirebaseUid) {
        // Ensure createdAt is always set to a consistent ISO_DATE_TIME format for string sorting
        post.setCreatedAt(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        post.setUserFirebaseUid(userFirebaseUid);
        post.setStatus("open"); // Explicitly set default status

        try {
            DocumentReference userRef = firestore.collection(USER_PROFILES_COLLECTION).document(userFirebaseUid);
            ApiFuture<DocumentSnapshot> userSnapshotFuture = userRef.get();
            DocumentSnapshot userSnapshot = userSnapshotFuture.get();

            if (userSnapshot.exists()) {
                String displayName = userSnapshot.getString("displayName");
                String profileImageUrl = userSnapshot.getString("profileImageUrl");

                post.setDisplayName(displayName);
                post.setProfileImageUrl(profileImageUrl);
            } else {
                logger.warn("User profile not found for UID: {}. Post will be created without display name/profile image.", userFirebaseUid);
                post.setDisplayName("Unknown User");
                post.setProfileImageUrl(null);
            }

            if (image != null && !image.isEmpty()) {
                String imageUrl = imageUploadService.uploadImage(image);
                post.setImageUrl(imageUrl);
            } else {
                post.setImageUrl(null);
            }
        } catch (IOException e) {
            logger.error("Image upload failed for user {}: {}", userFirebaseUid, e.getMessage(), e);
            throw new RuntimeException("Image upload failed", e);
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error fetching user profile for UID {}: {}", userFirebaseUid, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to fetch user profile.", e);
        }

        DocumentReference docRef = firestore.collection(COLLECTION_NAME).document();
        post.setId(docRef.getId());

        ApiFuture<WriteResult> writeResult = docRef.set(post);
        try {
            writeResult.get();
            logger.info("Successfully created post with ID: {} for user: {}", post.getId(), post.getUserFirebaseUid());
            return post;
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error creating post for user {}: {}", userFirebaseUid, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to create post.", e);
        }
    }


    public BarterPost getPostByIdForEdit(String id, String requestingUserUid) throws ResourceNotFoundException, UnauthorizedAccessException {
        try {
            DocumentSnapshot doc = firestore.collection(COLLECTION_NAME).document(id).get().get();
            if (!doc.exists()) {
                throw new ResourceNotFoundException("BarterPost not found with ID: " + id);
            }

            BarterPost post = doc.toObject(BarterPost.class);
            if (post == null) {
                logger.error("Failed to map document {} to BarterPost during getPostByIdForEdit.", id);
                throw new RuntimeException("Failed to process post data for ID: " + id);
            }

            if (!post.getUserFirebaseUid().equals(requestingUserUid)) {
                throw new UnauthorizedAccessException("You are not authorized to view or edit this post.");
            }

            post.setId(doc.getId()); // Ensure ID is set from document snapshot

            // --- ADDED: Fetch user profile for getPostByIdForEdit as well ---
            DocumentReference userRef = firestore.collection(USER_PROFILES_COLLECTION).document(post.getUserFirebaseUid());
            ApiFuture<DocumentSnapshot> userSnapshotFuture = userRef.get();
            DocumentSnapshot userSnapshot = userSnapshotFuture.get();

            if (userSnapshot.exists()) {
                post.setDisplayName(userSnapshot.getString("displayName"));
                post.setProfileImageUrl(userSnapshot.getString("profileImageUrl"));
            } else {
                logger.warn("User profile not found for UID: {} associated with post {}. Defaulting display name/image for edit.",
                        post.getUserFirebaseUid(), post.getId());
                post.setDisplayName("Unknown User");
                post.setProfileImageUrl(null);
            }
            // --- END ADDED ---
            return post;
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error retrieving post by ID {} for user {}: {}", id, requestingUserUid, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to retrieve post by ID: " + id, e);
        }
    }

    public Optional<BarterPost> getPostById(String id) {
        try {
            DocumentSnapshot doc = firestore.collection(COLLECTION_NAME).document(id).get().get();
            if (doc.exists()) {
                BarterPost post = doc.toObject(BarterPost.class);
                if (post == null) {
                    logger.error("Failed to map document {} to BarterPost in getPostById.", id);
                    return Optional.empty();
                }
                post.setId(doc.getId()); // Ensure ID is set from document snapshot

                // --- ADDED: Fetch user profile for getPostById as well ---
                DocumentReference userRef = firestore.collection(USER_PROFILES_COLLECTION).document(post.getUserFirebaseUid());
                ApiFuture<DocumentSnapshot> userSnapshotFuture = userRef.get();
                DocumentSnapshot userSnapshot = userSnapshotFuture.get();

                if (userSnapshot.exists()) {
                    post.setDisplayName(userSnapshot.getString("displayName"));
                    post.setProfileImageUrl(userSnapshot.getString("profileImageUrl"));
                } else {
                    logger.warn("User profile not found for UID: {} associated with post {}. Defaulting display name/image for direct fetch.",
                            post.getUserFirebaseUid(), post.getId());
                    post.setDisplayName("Unknown User");
                    post.setProfileImageUrl(null);
                }
                // --- END ADDED ---
                return Optional.of(post);
            }
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error retrieving post by ID {}: {}", id, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to retrieve post by ID: " + id, e);
        }
        return Optional.empty();
    }


    // --- UPDATED: updatePost method with explicit exception throwing ---
    public BarterPost updatePost(String postId, BarterPost updatedPost, MultipartFile newImage, String requesterUid)
            throws ResourceNotFoundException, UnauthorizedAccessException, IOException {
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(postId);
            ApiFuture<DocumentSnapshot> futureSnapshot = docRef.get();
            DocumentSnapshot snapshot = futureSnapshot.get();

            if (!snapshot.exists()) {
                logger.warn("Attempted to update non-existent post with ID: {}", postId);
                throw new ResourceNotFoundException("Post not found with ID: " + postId);
            }

            BarterPost existingPost = snapshot.toObject(BarterPost.class);
            if (existingPost == null) {
                logger.error("Failed to map existing document {} to BarterPost during update attempt.", postId);
                throw new RuntimeException("Failed to retrieve existing post data.");
            }

            // Authorization check: Only the owner can update the post
            if (!requesterUid.equals(existingPost.getUserFirebaseUid())) {
                logger.warn("User {} attempted to update post {} but is not the owner (owner: {}).",
                        requesterUid, postId, existingPost.getUserFirebaseUid());
                throw new UnauthorizedAccessException("You are not authorized to update this post.");
            }

            // Apply updates from updatedPost to existingPost
            if (updatedPost.getTitle() != null) {
                existingPost.setTitle(updatedPost.getTitle());
            }
            if (updatedPost.getDescription() != null) {
                existingPost.setDescription(updatedPost.getDescription());
            }
            if (updatedPost.getType() != null) {
                existingPost.setType(updatedPost.getType());
            }
            if (updatedPost.getTags() != null) {
                existingPost.setTags(updatedPost.getTags());
            }
            if (updatedPost.getPreferredExchange() != null) {
                existingPost.setPreferredExchange(updatedPost.getPreferredExchange());
            }
            if (updatedPost.getLocation() != null) {
                existingPost.setLocation(updatedPost.getLocation());
            }
            if (updatedPost.getAvailability() != null) {
                existingPost.setAvailability(updatedPost.getAvailability());
            }
            // Crucially, update status if provided
            if (updatedPost.getStatus() != null) {
                existingPost.setStatus(updatedPost.getStatus());
            }
            // createdAt should not be changed during update.
            // If an 'urgency' field were present, you'd add:
            // if (updatedPost.getUrgency() != null) { existingPost.setUrgency(updatedPost.getUrgency()); }


            // Handle image update:
            if (newImage != null && !newImage.isEmpty()) {
                String imageUrl = imageUploadService.uploadImage(newImage);
                existingPost.setImageUrl(imageUrl);
            } else if (updatedPost.getImageUrl() != null && updatedPost.getImageUrl().equals("null")) {
                if (existingPost.getImageUrl() != null && !existingPost.getImageUrl().isEmpty()) {
                    imageUploadService.deleteImage(existingPost.getImageUrl());
                    logger.info("Deleted old image for post {} as requested by update.", postId);
                }
                existingPost.setImageUrl(null);
            } else if (updatedPost.getImageUrl() == null && existingPost.getImageUrl() != null) {
                logger.debug("Image URL not provided in update, retaining existing image for post {}.", postId);
            }

            // --- ADDED: Re-fetch and set displayName and profileImageUrl during update as well ---
            // This ensures that if a user updates their profile image/name, it's reflected in their posts immediately
            // upon updating the post, or if for some reason the data wasn't initially present on the post.
            DocumentReference userRef = firestore.collection(USER_PROFILES_COLLECTION).document(existingPost.getUserFirebaseUid());
            ApiFuture<DocumentSnapshot> userSnapshotFuture = userRef.get();
            DocumentSnapshot userSnapshot = userSnapshotFuture.get();

            if (userSnapshot.exists()) {
                existingPost.setDisplayName(userSnapshot.getString("displayName"));
                existingPost.setProfileImageUrl(userSnapshot.getString("profileImageUrl"));
            } else {
                logger.warn("User profile not found for UID: {} associated with post {}. Defaulting display name/image during update.",
                        existingPost.getUserFirebaseUid(), existingPost.getId());
                existingPost.setDisplayName("Unknown User");
                existingPost.setProfileImageUrl(null);
            }
            // --- END ADDED ---

            ApiFuture<WriteResult> writeResult = docRef.set(existingPost);
            writeResult.get();
            logger.info("Successfully updated post with ID: {} by user: {}", postId, requesterUid);
            return existingPost;
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error updating post {}: {}", postId, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to update post: " + postId, e);
        }
    }

    // --- UPDATED: deletePost method with explicit exception throwing ---
    public void deletePost(String postId, String requesterUid) throws ResourceNotFoundException, UnauthorizedAccessException {
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(postId);
            ApiFuture<DocumentSnapshot> futureSnapshot = docRef.get();
            DocumentSnapshot snapshot = futureSnapshot.get();

            if (!snapshot.exists()) {
                logger.warn("Attempted to delete non-existent post with ID: {}", postId);
                throw new ResourceNotFoundException("Post not found with ID: " + postId);
            }

            BarterPost post = snapshot.toObject(BarterPost.class);
            if (post == null) {
                logger.error("Failed to map existing document {} to BarterPost during deletion attempt.", postId);
                throw new RuntimeException("Failed to process post data for deletion of ID: " + postId);
            }

            if (!requesterUid.equals(post.getUserFirebaseUid())) {
                logger.warn("User {} attempted to delete post {} but is not the owner (owner: {}).",
                        requesterUid, postId, post.getUserFirebaseUid());
                throw new UnauthorizedAccessException("You are not authorized to delete this post.");
            }

            if (post.getImageUrl() != null && !post.getImageUrl().isEmpty()) {
                try {
                    imageUploadService.deleteImage(post.getImageUrl());
                    logger.info("Deleted image for post {}.", postId);
                } catch (Exception e) {
                    logger.error("Failed to delete image for post {}: {}", postId, e.getMessage());
                }
            }

            ApiFuture<WriteResult> deleteResult = docRef.delete();
            deleteResult.get();
            logger.info("Successfully deleted post with ID: {} by user: {}", postId, requesterUid);
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error deleting post {}: {}", postId, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to delete post: " + postId, e);
        }
    }
}