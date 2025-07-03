package com.barter.backend.model;

import com.google.cloud.firestore.annotation.DocumentId;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class Review {

    @DocumentId
    private String id;
    private int rating; // Rating score, e.g., 1-5
    private String comment;
    private String toUserFirebaseUid; // The Firebase UID of the user who received the review
    private String fromUserFirebaseUid; // The Firebase UID of the user who wrote the review
    private String createdAt; // ISO_DATE_TIME string
    private String barterPostId; // Optional: ID of the barter post this review is related to

    // Nested class to represent the user who wrote the review for display purposes
    public static class ReviewUser {
        private String firebaseUid;
        private String displayName; // Display name of the user

        // Constructors
        public ReviewUser() {}
        public ReviewUser(String firebaseUid, String displayName) {
            this.firebaseUid = firebaseUid;
            this.displayName = displayName;
        }

        // Getters and Setters
        public String getFirebaseUid() { return firebaseUid; }
        public void setFirebaseUid(String firebaseUid) { this.firebaseUid = firebaseUid; }
        public String getDisplayName() { return displayName; }
        public void setDisplayName(String displayName) { this.displayName = displayName; }
    }

    // This field will hold the populated fromUser object for the frontend
    private ReviewUser fromUser;

    // Constructors
    public Review() {}

    // Method to initialize default values, like createdAt
    public void initDefaults() {
        if (this.createdAt == null || this.createdAt.isEmpty()) {
            this.createdAt = LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME);
        }
    }

    // Getters and Setters for all fields
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public String getToUserFirebaseUid() { return toUserFirebaseUid; } // Corrected: was toUserId
    public void setToUserFirebaseUid(String toUserFirebaseUid) { this.toUserFirebaseUid = toUserFirebaseUid; } // Corrected: was toUserId
    public String getFromUserFirebaseUid() { return fromUserFirebaseUid; } // Corrected: was fromUserId
    public void setFromUserFirebaseUid(String fromUserFirebaseUid) { this.fromUserFirebaseUid = fromUserFirebaseUid; } // Corrected: was fromUserId
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public String getBarterPostId() { return barterPostId; }
    public void setBarterPostId(String barterPostId) { this.barterPostId = barterPostId; }

    // Getter and Setter for the nested ReviewUser
    public ReviewUser getFromUser() { return fromUser; }
    public void setFromUser(ReviewUser fromUser) { this.fromUser = fromUser; }
}