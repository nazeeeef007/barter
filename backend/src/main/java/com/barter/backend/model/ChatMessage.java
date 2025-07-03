package com.barter.backend.model;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class ChatMessage {
    private String id; // Firestore document ID for the message
    private String chatId; // ID of the parent chat conversation (useful for context, though Firestore subcollection handles hierarchy)
    private String senderId; // Firebase UID of the sender
    private String text;
    private String createdAt; // ISO_DATE_TIME string for consistent sorting
    private String senderDisplayName; // Populated from UserProfile for display
    private String senderProfileImageUrl; // Populated from UserProfile for display

    // Default constructor
    public ChatMessage() {
    }

    // All-args constructor
    public ChatMessage(String id, String chatId, String senderId, String text, String createdAt, String senderDisplayName, String senderProfileImageUrl) {
        this.id = id;
        this.chatId = chatId;
        this.senderId = senderId;
        this.text = text;
        this.createdAt = createdAt;
        this.senderDisplayName = senderDisplayName;
        this.senderProfileImageUrl = senderProfileImageUrl;
    }

    // Manual initialization for default values
    public void initDefaults() {
        if (this.createdAt == null || this.createdAt.isEmpty()) {
            this.createdAt = LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME);
        }
    }

    // Getters and Setters for ChatMessage fields

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getChatId() {
        return chatId;
    }

    public void setChatId(String chatId) {
        this.chatId = chatId;
    }

    public String getSenderId() {
        return senderId;
    }

    public void setSenderId(String senderId) {
        this.senderId = senderId;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getSenderDisplayName() {
        return senderDisplayName;
    }

    public void setSenderDisplayName(String senderDisplayName) {
        this.senderDisplayName = senderDisplayName;
    }

    public String getSenderProfileImageUrl() {
        return senderProfileImageUrl;
    }

    public void setSenderProfileImageUrl(String senderProfileImageUrl) {
        this.senderProfileImageUrl = senderProfileImageUrl;
    }

    // Nested MessageSender class with manual getters, setters, and constructors
    public static class MessageSender {
        private String firebaseUid;
        private String displayName;
        private String profileImageUrl;

        // Default constructor for MessageSender
        public MessageSender() {
        }

        // All-args constructor for MessageSender
        public MessageSender(String firebaseUid, String displayName, String profileImageUrl) {
            this.firebaseUid = firebaseUid;
            this.displayName = displayName;
            this.profileImageUrl = profileImageUrl;
        }

        // Getters and Setters for MessageSender fields

        public String getFirebaseUid() {
            return firebaseUid;
        }

        public void setFirebaseUid(String firebaseUid) {
            this.firebaseUid = firebaseUid;
        }

        public String getDisplayName() {
            return displayName;
        }

        public void setDisplayName(String displayName) {
            this.displayName = displayName;
        }

        public String getProfileImageUrl() {
            return profileImageUrl;
        }

        public void setProfileImageUrl(String profileImageUrl) {
            this.profileImageUrl = profileImageUrl;
        }
    }
}