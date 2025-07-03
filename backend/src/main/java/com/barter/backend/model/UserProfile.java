package com.barter.backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserProfile {

    private String id; // Firestore doc ID (set manually if needed)

    private String firebaseUid;
    private String displayName;
    private String email;
    private String location;
    private String bio;
    private List<String> skillsOffered;
    private List<String> needs;
    private Double rating;
    private String createdAt;
    private String profileImageUrl;

    // Manual initialization logic (called by service code, NOT with @PrePersist)
    public void initDefaults() {
        if (this.createdAt == null) {
            this.createdAt = java.time.LocalDateTime.now().toString();
        }
        if (this.rating == null) {
            this.rating = 0.0;
        }
        if (this.bio == null) {
            this.bio = "";
        }
    }

    // --- Manual Getters and Setters as requested ---
    public String getFirebaseUid() {
        return this.firebaseUid;
    }

    public void setFirebaseUid(String firebaseUid) {
        this.firebaseUid = firebaseUid;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEmail() {
        return this.email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDisplayName() {
        return this.displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getLocation() {
        return this.location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getBio() {
        return this.bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public List<String> getSkillsOffered() {
        return this.skillsOffered;
    }

    public void setSkillsOffered(List<String> skillsOffered) {
        this.skillsOffered = skillsOffered;
    }

    public List<String> getNeeds() {
        return this.needs;
    }

    public void setNeeds(List<String> needs) {
        this.needs = needs;
    }

    public Double getRating() {
        return this.rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public String getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public void setProfileImageUrl(String imageUrl) {
        this.profileImageUrl = imageUrl;
    }
}
