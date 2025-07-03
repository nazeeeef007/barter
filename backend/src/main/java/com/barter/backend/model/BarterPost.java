package com.barter.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

public class BarterPost {

    private String id;
    private String userFirebaseUid;
    private String title;
    private String description;
    private String type;
    private List<String> tags;
    private String preferredExchange;
    private String imageUrl;
    private String location;
    private List<AvailabilityRange> availability;
    private String status;
    private String createdAt; // 🔁 Changed from LocalDateTime
    private String displayName;
    private String profileImageUrl;

    public BarterPost() {
    }

    public BarterPost(String id, String userFirebaseUid, String title, String description,
                      String type, List<String> tags, String preferredExchange, String imageUrl,
                      String location, List<AvailabilityRange> availability, String status,
                      String createdAt, String displayName,
                      String profileImageUrl) {
        this.id = id;
        this.userFirebaseUid = userFirebaseUid;
        this.title = title;
        this.description = description;
        this.type = type;
        this.tags = tags;
        this.preferredExchange = preferredExchange;
        this.imageUrl = imageUrl;
        this.location = location;
        this.availability = availability;
        this.status = status;
        this.createdAt = createdAt;
        this.displayName = displayName;
        this.profileImageUrl = profileImageUrl;
    }

    public void initDefaults() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME);
        }
        if (this.status == null || this.status.isEmpty()) {
            this.status = "open";
        }
    }

    // --- Getters and Setters ---

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserFirebaseUid() {
        return userFirebaseUid;
    }

    public void setUserFirebaseUid(String userFirebaseUid) {
        this.userFirebaseUid = userFirebaseUid;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public String getPreferredExchange() {
        return preferredExchange;
    }

    public void setPreferredExchange(String preferredExchange) {
        this.preferredExchange = preferredExchange;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public List<AvailabilityRange> getAvailability() {
        return availability;
    }

    public void setAvailability(List<AvailabilityRange> availability) {
        this.availability = availability;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getDisplayName(){
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getProfileImageUrl(){
        return profileImageUrl;
    }

    public void setProfileImageUrl(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }


}
