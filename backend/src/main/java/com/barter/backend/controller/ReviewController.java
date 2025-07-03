package com.barter.backend.controller;

import com.barter.backend.model.Review;
import com.barter.backend.service.ReviewService;
import com.barter.backend.exception.ResourceNotFoundException;
import com.barter.backend.exception.UnauthorizedAccessException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections; // Import for emptyList
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private static final Logger logger = LoggerFactory.getLogger(ReviewController.class);
    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    public ResponseEntity<List<Review>> getAllReviews(HttpServletRequest request) { // Added HttpServletRequest for token check
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to get all reviews without Firebase token.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.emptyList()); // Return empty list on unauthorized
        }
        logger.info("Received request to get all reviews by user {}", token.getUid());
        try {
            List<Review> reviews = reviewService.getAllReviews();
            logger.info("Fetched {} reviews.", reviews.size());
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            logger.error("Error fetching all reviews: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }

    // NEW ENDPOINT: Matches frontend's /api/reviews/toUser/{firebaseUid}
    // This is the one your ListingDetailPage.tsx is calling
    @GetMapping("/toUser/{firebaseUid}")
    public ResponseEntity<List<Review>> getReviewsToUserByPath( // Renamed method to avoid conflict
                                                                @PathVariable String firebaseUid,
                                                                HttpServletRequest request
    ) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to get reviews for user {} without Firebase token (path variable).", firebaseUid);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.emptyList());
        }

        logger.info("Fetching reviews for user (toUser) with Firebase UID: {} by requesting user {}", firebaseUid, token.getUid());
        try {
            List<Review> reviews = reviewService.getReviewsToUser(firebaseUid);
            logger.info("Fetched {} reviews for user {}.", reviews.size(), firebaseUid);
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            logger.error("Error fetching reviews for user {}: {}", firebaseUid, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }

    // Existing endpoint, updated @RequestParam name and added HttpServletRequest
    @GetMapping("/received")
    public ResponseEntity<List<Review>> getReviewsReceived(
            @RequestParam("toUserId") String toUserFirebaseUid, // Matches frontend's param name
            HttpServletRequest request
    ) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to get received reviews for user {} without Firebase token (query param).", toUserFirebaseUid);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.emptyList());
        }
        logger.info("Received request to get reviews received by user: {} by requesting user {}", toUserFirebaseUid, token.getUid());
        try {
            List<Review> reviews = reviewService.getReviewsToUser(toUserFirebaseUid); // Call the same service method
            logger.info("Fetched {} reviews received by user {}.", reviews.size(), toUserFirebaseUid);
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            logger.error("Error fetching reviews received by user {}: {}", toUserFirebaseUid, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }

    // Existing endpoint, updated @RequestParam name and added HttpServletRequest
    @GetMapping("/written")
    public ResponseEntity<List<Review>> getReviewsWrittenByUser(
            @RequestParam("fromUserId") String fromUserFirebaseUid, // Matches frontend's param name
            HttpServletRequest request
    ) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to get written reviews by user {} without Firebase token.", fromUserFirebaseUid);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.emptyList());
        }
        logger.info("Received request to get reviews written by user: {} by requesting user {}", fromUserFirebaseUid, token.getUid());
        try {
            List<Review> reviews = reviewService.getReviewsWrittenByUser(fromUserFirebaseUid);
            logger.info("Fetched {} reviews written by user {}.", reviews.size(), fromUserFirebaseUid);
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            logger.error("Error fetching reviews written by user {}: {}", fromUserFirebaseUid, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }

    @GetMapping("/post/{barterPostId}")
    public ResponseEntity<List<Review>> getReviewsForBarterPost(
            @PathVariable String barterPostId,
            HttpServletRequest request
    ) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to get reviews for post {} without Firebase token.", barterPostId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.emptyList());
        }
        logger.info("Received request to get reviews for barter post: {} by requesting user {}", barterPostId, token.getUid());
        try {
            List<Review> reviews = reviewService.getReviewsForBarterPost(barterPostId);
            logger.info("Fetched {} reviews for barter post {}.", reviews.size(), barterPostId);
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            logger.error("Error fetching reviews for barter post {}: {}", barterPostId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }

    @PostMapping
    public ResponseEntity<Review> createReview(@RequestBody Review review, HttpServletRequest request) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        String firebaseUid = (token != null) ? token.getUid() : null;

        if (firebaseUid == null || firebaseUid.isEmpty()) {
            logger.warn("Attempted to create review without Firebase token.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build(); // No body for unauthorized
        }

        if (review.getFromUserFirebaseUid() == null || !review.getFromUserFirebaseUid().equals(firebaseUid)) {
            logger.warn("Reviewer UID mismatch. Token UID: {}, Review 'fromUserFirebaseUid': {}", firebaseUid, review.getFromUserFirebaseUid());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build(); // No body for forbidden
        }

        try {
            Review createdReview = reviewService.createReview(review);
            logger.info("Created new review with ID: {} from user {} to user {}", createdReview.getId(), createdReview.getFromUserFirebaseUid(), createdReview.getToUserFirebaseUid());
            return ResponseEntity.status(HttpStatus.CREATED).body(createdReview);
        } catch (IllegalArgumentException e) {
            logger.warn("Bad request for review creation: {}", e.getMessage());
            return ResponseEntity.badRequest().build(); // No body for bad request
        } catch (Exception e) {
            logger.error("Error creating review from {} to {}: {}", review.getFromUserFirebaseUid(), review.getToUserFirebaseUid(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build(); // No body for internal server error
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReview(@PathVariable String id, HttpServletRequest request) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        String firebaseUid = (token != null) ? token.getUid() : null;

        if (firebaseUid == null || firebaseUid.isEmpty()) {
            logger.warn("Attempted to delete review {} without Firebase token.", id);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Review> optionalReview = reviewService.getReviewById(id);
        if (optionalReview.isEmpty()) {
            logger.warn("Review not found for deletion with ID: {}", id);
            return ResponseEntity.notFound().build();
        }

        Review review = optionalReview.get();
        if (!firebaseUid.equals(review.getFromUserFirebaseUid())) {
            logger.warn("Unauthorized attempt by user {} to delete review {} (owner: {}).", firebaseUid, id, review.getFromUserFirebaseUid());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            reviewService.deleteReview(id);
            logger.info("Deleted review with ID: {} by user {}.", id, firebaseUid);
            return ResponseEntity.noContent().build();
        } catch (ResourceNotFoundException e) {
            logger.warn("Review not found during deletion attempt by service: {}", id);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error deleting review {} by user {}: {}", id, firebaseUid, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}