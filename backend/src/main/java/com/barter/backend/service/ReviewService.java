package com.barter.backend.service;

import com.barter.backend.model.Review;
import com.barter.backend.model.UserProfile; // Import UserProfile model
import com.barter.backend.exception.ResourceNotFoundException;
import com.barter.backend.exception.UnauthorizedAccessException;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.HashMap;
import java.util.Objects;
import java.math.BigDecimal; // For precise decimal calculations
import java.math.RoundingMode; // For rounding mode

@Service
public class ReviewService {

    private static final Logger logger = LoggerFactory.getLogger(ReviewService.class);
    private static final String REVIEWS_COLLECTION_NAME = "reviews";
    private static final String USER_PROFILES_COLLECTION = "user_profiles"; // Used for fetching display names

    private final Firestore firestore = FirestoreClient.getFirestore();
    private final UserProfileService userProfileService; // Inject UserProfileService

    // Constructor to inject UserProfileService
    public ReviewService(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    /**
     * Retrieves all Review documents from the Firestore collection.
     * Enriches 'fromUser' with displayName.
     *
     * @return A list of all Review objects.
     * @throws RuntimeException if there's an error during Firestore access.
     */
    public List<Review> getAllReviews() {
        List<Review> reviews = new ArrayList<>();
        try {
            ApiFuture<QuerySnapshot> future = firestore.collection(REVIEWS_COLLECTION_NAME).get();
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();

            // Collect unique fromUserFirebaseUid to fetch their display names in batch
            List<String> fromUserUids = documents.stream()
                    .map(doc -> doc.getString("fromUserFirebaseUid"))
                    .filter(Objects::nonNull)
                    .distinct()
                    .collect(Collectors.toList());

            Map<String, String> fromUserDisplayNames = fetchDisplayNamesForUids(fromUserUids);

            for (DocumentSnapshot doc : documents) {
                try {
                    Review review = doc.toObject(Review.class);
                    if (review != null) {
                        review.setId(doc.getId());
                        populateReviewFromUser(review, fromUserDisplayNames); // Populate the nested fromUser object
                        reviews.add(review);
                    }
                } catch (Exception e) {
                    logger.error("Error mapping document {} to Review: {}", doc.getId(), e.getMessage(), e);
                }
            }
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error retrieving all reviews from Firestore: {}", e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to retrieve all reviews.", e);
        }
        return reviews;
    }

    /**
     * Retrieves a single Review by its Firestore document ID.
     * Enriches 'fromUser' with displayName.
     *
     * @param id The Firestore document ID of the review.
     * @return An Optional containing the Review if found, otherwise empty.
     * @throws RuntimeException if there's an error during Firestore access.
     */
    public Optional<Review> getReviewById(String id) {
        try {
            DocumentSnapshot doc = firestore.collection(REVIEWS_COLLECTION_NAME).document(id).get().get();
            if (doc.exists()) {
                Review review = doc.toObject(Review.class);
                if (review != null) {
                    review.setId(doc.getId());
                    // Fetch display name for single review's fromUser
                    Map<String, String> fromUserDisplayNames = fetchDisplayNamesForUids(
                            List.of(review.getFromUserFirebaseUid())
                    );
                    populateReviewFromUser(review, fromUserDisplayNames);
                    return Optional.of(review);
                }
            }
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error retrieving review by ID {}: {}", id, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to retrieve review by ID: " + id, e);
        }
        return Optional.empty();
    }

    /**
     * Retrieves a list of Reviews where the `toUserFirebaseUid` matches.
     * This method now matches the frontend's expected path logic.
     * Enriches 'fromUser' with displayName.
     *
     * @param toUserFirebaseUid The Firebase UID of the user who received the reviews.
     * @return A list of Review objects.
     * @throws RuntimeException if there's an error during Firestore access.
     */
    public List<Review> getReviewsToUser(String toUserFirebaseUid) { // Renamed from getReviewsReceivedByUser
        List<Review> reviews = new ArrayList<>();
        try {
            ApiFuture<QuerySnapshot> future = firestore.collection(REVIEWS_COLLECTION_NAME)
                    .whereEqualTo("toUserFirebaseUid", toUserFirebaseUid)
                    .orderBy("createdAt", com.google.cloud.firestore.Query.Direction.DESCENDING) // Added sorting
                    .get();
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();

            List<String> fromUserUids = documents.stream()
                    .map(doc -> doc.getString("fromUserFirebaseUid"))
                    .filter(Objects::nonNull)
                    .distinct()
                    .collect(Collectors.toList());

            Map<String, String> fromUserDisplayNames = fetchDisplayNamesForUids(fromUserUids);

            for (DocumentSnapshot doc : documents) {
                try {
                    Review review = doc.toObject(Review.class);
                    if (review != null) {
                        review.setId(doc.getId());
                        populateReviewFromUser(review, fromUserDisplayNames); // Populate the nested fromUser object
                        reviews.add(review);
                    }
                } catch (Exception e) {
                    logger.error("Error mapping document {} to Review in getReviewsToUser: {}", doc.getId(), e.getMessage(), e);
                }
            }
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error retrieving reviews to user {}: {}", toUserFirebaseUid, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to retrieve reviews to user: " + toUserFirebaseUid, e);
        }
        return reviews;
    }

    /**
     * Retrieves a list of Reviews where the `fromUserFirebaseUid` matches.
     * Enriches 'fromUser' with displayName.
     *
     * @param fromUserFirebaseUid The Firebase UID of the user who wrote the reviews.
     * @return A list of Review objects.
     * @throws RuntimeException if there's an error during Firestore access.
     */
    public List<Review> getReviewsWrittenByUser(String fromUserFirebaseUid) {
        List<Review> reviews = new ArrayList<>();
        try {
            ApiFuture<QuerySnapshot> future = firestore.collection(REVIEWS_COLLECTION_NAME)
                    .whereEqualTo("fromUserFirebaseUid", fromUserFirebaseUid)
                    .orderBy("createdAt", com.google.cloud.firestore.Query.Direction.DESCENDING) // Added sorting
                    .get();
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();

            // For reviews written by a user, the 'fromUser' will always be the queried user.
            // We can pre-fetch their display name once.
            String reviewerDisplayName = null;
            Map<String, String> fromUserDisplayNames = new HashMap<>(); // To pass to helper
            try {
                DocumentSnapshot userSnapshot = firestore.collection(USER_PROFILES_COLLECTION).document(fromUserFirebaseUid).get().get();
                if (userSnapshot.exists()) {
                    reviewerDisplayName = userSnapshot.getString("displayName");
                    fromUserDisplayNames.put(fromUserFirebaseUid, reviewerDisplayName);
                } else {
                    logger.warn("Reviewer profile not found for UID: {}.", fromUserFirebaseUid);
                    fromUserDisplayNames.put(fromUserFirebaseUid, "Unknown User");
                }
            } catch (Exception e) {
                logger.error("Error fetching reviewer display name for {}: {}", fromUserFirebaseUid, e.getMessage());
                fromUserDisplayNames.put(fromUserFirebaseUid, "Unknown User");
            }

            for (DocumentSnapshot doc : documents) {
                try {
                    Review review = doc.toObject(Review.class);
                    if (review != null) {
                        review.setId(doc.getId());
                        populateReviewFromUser(review, fromUserDisplayNames); // Populate the nested fromUser object
                        reviews.add(review);
                    }
                } catch (Exception e) {
                    logger.error("Error mapping document {} to Review in getReviewsWrittenByUser: {}", doc.getId(), e.getMessage(), e);
                }
            }
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error retrieving reviews written by user {}: {}", fromUserFirebaseUid, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to retrieve reviews written by user: " + fromUserFirebaseUid, e);
        }
        return reviews;
    }

    /**
     * Retrieves a list of Reviews associated with a specific BarterPost.
     * Enriches 'fromUser' with displayName.
     *
     * @param barterPostId The ID of the related BarterPost.
     * @return A list of Review objects.
     * @throws RuntimeException if there's an error during Firestore access.
     */
    public List<Review> getReviewsForBarterPost(String barterPostId) {
        List<Review> reviews = new ArrayList<>();
        try {
            ApiFuture<QuerySnapshot> future = firestore.collection(REVIEWS_COLLECTION_NAME)
                    .whereEqualTo("barterPostId", barterPostId)
                    .orderBy("createdAt", com.google.cloud.firestore.Query.Direction.DESCENDING) // Added sorting
                    .get();
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();

            List<String> fromUserUids = documents.stream()
                    .map(doc -> doc.getString("fromUserFirebaseUid"))
                    .filter(Objects::nonNull)
                    .distinct()
                    .collect(Collectors.toList());

            Map<String, String> fromUserDisplayNames = fetchDisplayNamesForUids(fromUserUids);

            for (DocumentSnapshot doc : documents) {
                try {
                    Review review = doc.toObject(Review.class);
                    if (review != null) {
                        review.setId(doc.getId());
                        populateReviewFromUser(review, fromUserDisplayNames); // Populate the nested fromUser object
                        reviews.add(review);
                    }
                } catch (Exception e) {
                    logger.error("Error mapping document {} to Review in getReviewsForBarterPost: {}", doc.getId(), e.getMessage(), e);
                }
            }
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error retrieving reviews for barter post {}: {}", barterPostId, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to retrieve reviews for barter post: " + barterPostId, e);
        }
        return reviews;
    }

    /**
     * Creates a new Review document in Firestore.
     * Populates 'createdAt' and ensures the 'fromUser' nested object is set for persistence.
     * ALSO UPDATES THE RECIPIENT USER'S OVERALL RATING.
     *
     * @param review The Review object to create.
     * @return The created Review object, with its Firestore document ID and populated 'fromUser'.
     * @throws IllegalArgumentException if required fields are missing or invalid.
     * @throws RuntimeException if there's an error during Firestore access.
     */
    public Review createReview(Review review) {
        if (review.getFromUserFirebaseUid() == null || review.getFromUserFirebaseUid().isEmpty()) {
            throw new IllegalArgumentException("fromUserFirebaseUid is required.");
        }
        if (review.getToUserFirebaseUid() == null || review.getToUserFirebaseUid().isEmpty()) {
            throw new IllegalArgumentException("toUserFirebaseUid is required.");
        }
        if (review.getRating() < 1 || review.getRating() > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5.");
        }

        review.initDefaults(); // Set createdAt if missing

        try {
            // Fetch the display name of the 'fromUser' (the reviewer)
            DocumentSnapshot fromUserSnapshot = firestore.collection(USER_PROFILES_COLLECTION)
                    .document(review.getFromUserFirebaseUid()).get().get();

            if (fromUserSnapshot.exists()) {
                Review.ReviewUser fromUser = new Review.ReviewUser();
                fromUser.setFirebaseUid(review.getFromUserFirebaseUid());
                fromUser.setDisplayName(fromUserSnapshot.getString("displayName"));
                review.setFromUser(fromUser); // Set the nested fromUser object for persistence
            } else {
                logger.warn("Reviewer profile not found for UID: {}. Creating review with default 'fromUser' display name.", review.getFromUserFirebaseUid());
                Review.ReviewUser fromUser = new Review.ReviewUser();
                fromUser.setFirebaseUid(review.getFromUserFirebaseUid());
                fromUser.setDisplayName("Unknown User"); // Default if profile not found
                review.setFromUser(fromUser);
            }
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error fetching 'fromUser' profile for review creation: {}", e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to fetch reviewer profile during review creation.", e);
        }

        // Let Firestore generate a document ID automatically
        DocumentReference docRef = firestore.collection(REVIEWS_COLLECTION_NAME).document();
        review.setId(docRef.getId()); // Set Firestore generated ID to the POJO's ID field

        ApiFuture<WriteResult> writeResult = docRef.set(review); // Write the POJO to Firestore
        try {
            writeResult.get(); // Blocks until the write operation completes
            logger.info("Successfully created review with ID: {} from user {} to user {}",
                    review.getId(), review.getFromUserFirebaseUid(), review.getToUserFirebaseUid());

            // --- START: Update recipient's rating ---
            recalculateAndSaveUserRating(review.getToUserFirebaseUid());
            // --- END: Update recipient's rating ---

            return review;
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error creating review from {} to {}: {}", review.getFromUserFirebaseUid(), review.getToUserFirebaseUid(), e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to create review.", e);
        }
    }

    /**
     * Deletes a Review from Firestore by its ID.
     * ALSO UPDATES THE RECIPIENT USER'S OVERALL RATING.
     *
     * @param id The ID of the review to delete.
     * @throws ResourceNotFoundException if the review is not found.
     * @throws RuntimeException if there's an error during Firestore access.
     */
    public void deleteReview(String id) {
        DocumentReference docRef = firestore.collection(REVIEWS_COLLECTION_NAME).document(id);
        String toUserFirebaseUid = null; // Store the recipient's UID

        try {
            ApiFuture<DocumentSnapshot> futureSnapshot = docRef.get();
            DocumentSnapshot snapshot = futureSnapshot.get();

            if (!snapshot.exists()) {
                logger.warn("Attempted to delete non-existent review with ID: {}", id);
                throw new ResourceNotFoundException("Review not found with ID: " + id);
            }

            Review reviewToDelete = snapshot.toObject(Review.class); // Convert to Review object
            if (reviewToDelete == null || reviewToDelete.getToUserFirebaseUid() == null) {
                logger.error("Failed to convert snapshot to Review object or toUserFirebaseUid is null for review ID: {}", id);
                throw new RuntimeException("Invalid review data for deletion.");
            }
            toUserFirebaseUid = reviewToDelete.getToUserFirebaseUid();


            ApiFuture<WriteResult> deleteResult = docRef.delete();
            deleteResult.get(); // Blocks until deletion completes
            logger.info("Successfully deleted review with ID: {}", id);

            // --- START: Update recipient's rating ---
            // Only recalculate if we successfully got the recipient's UID
            if (toUserFirebaseUid != null) {
                recalculateAndSaveUserRating(toUserFirebaseUid);
            }
            // --- END: Update recipient's rating ---

        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error deleting review {}: {}", id, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to delete review: " + id, e);
        } catch (ResourceNotFoundException e) {
            throw e; // Re-throw custom not found exception
        } catch (Exception e) {
            logger.error("Unexpected error during review deletion: {}", e.getMessage(), e);
            throw new RuntimeException("An unexpected error occurred during review deletion.", e);
        }
    }

    /**
     * Helper method to fetch display names for a list of Firebase UIDs.
     *
     * @param uids List of Firebase UIDs.
     * @return A map from Firebase UID to display name.
     */
    private Map<String, String> fetchDisplayNamesForUids(List<String> uids) {
        Map<String, String> displayNames = new HashMap<>();
        if (uids.isEmpty()) {
            return displayNames;
        }
        try {
            List<ApiFuture<DocumentSnapshot>> userFutures = uids.stream()
                    .map(uid -> firestore.collection(USER_PROFILES_COLLECTION).document(uid).get())
                    .collect(Collectors.toList());

            for (ApiFuture<DocumentSnapshot> userFuture : userFutures) {
                DocumentSnapshot userSnapshot = userFuture.get();
                if (userSnapshot.exists()) {
                    displayNames.put(userSnapshot.getId(), userSnapshot.getString("displayName"));
                } else {
                    logger.warn("User profile not found for UID: {}.", userSnapshot.getId());
                    displayNames.put(userSnapshot.getId(), "Unknown User");
                }
            }
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error fetching display names for UIDs: {}", e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to fetch user display names.", e);
        }
        return displayNames;
    }

    /**
     * Helper method to populate the nested 'fromUser' object in a Review.
     *
     * @param review The Review object to populate.
     * @param fromUserDisplayNames A map of Firebase UIDs to display names.
     */
    private void populateReviewFromUser(Review review, Map<String, String> fromUserDisplayNames) {
        if (review.getFromUserFirebaseUid() != null) {
            Review.ReviewUser fromUser = new Review.ReviewUser();
            fromUser.setFirebaseUid(review.getFromUserFirebaseUid());
            fromUser.setDisplayName(fromUserDisplayNames.getOrDefault(review.getFromUserFirebaseUid(), "Unknown User"));
            review.setFromUser(fromUser);
        }
    }

    /**
     * Recalculates the average rating for a specific user based on ALL reviews they have received
     * and updates their UserProfile document in Firestore.
     * This is used when a review is created or deleted.
     *
     * @param userFirebaseUid The Firebase UID of the user whose rating needs to be recalculated.
     */
    private void recalculateAndSaveUserRating(String userFirebaseUid) {
        try {
            // Fetch all reviews for this user
            List<Review> reviewsToUser = getReviewsToUser(userFirebaseUid); // Re-use existing method

            double totalRatingSum = 0;
            int reviewCount = 0;

            for (Review review : reviewsToUser) {
                totalRatingSum += review.getRating();
                reviewCount++;
            }

            double newRating = 0.0;
            if (reviewCount > 0) {
                newRating = new BigDecimal(totalRatingSum).divide(new BigDecimal(reviewCount), 2, RoundingMode.HALF_UP).doubleValue();
            }

            // Update only the 'rating' field in the user's profile
            Map<String, Object> updates = new HashMap<>();
            updates.put("rating", newRating);

            userProfileService.updateUserProfileFields(userFirebaseUid, updates);
            logger.info("Recalculated and updated rating for user {}: new rating = {} (based on {} reviews)",
                    userFirebaseUid, newRating, reviewCount);

        } catch (Exception e) {
            logger.error("Error recalculating and saving rating for user {}: {}", userFirebaseUid, e.getMessage(), e);
            // Log the error but allow the review creation/deletion to complete if possible
        }
    }
}