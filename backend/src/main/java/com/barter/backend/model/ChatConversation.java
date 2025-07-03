package com.barter.backend.model;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map; // Although not directly used for fields, often included with Map types

public class ChatConversation {
    private String id; // Firestore document ID for the conversation

    private List<String> participants; // List of Firebase UIDs of participants
    private String type; // e.g., "direct", "group"
    private String name; // Name for group chats, or derived for direct messages
    private String createdAt;
    private String updatedAt;

    // Nested object for the last message in the conversation
    // This helps display chat list previews without fetching all messages
    private LastMessage lastMessage;

    // Default constructor
    public ChatConversation() {
    }

    // All-args constructor
    public ChatConversation(String id, List<String> participants, String type, String name, String createdAt, String updatedAt, LastMessage lastMessage) {
        this.id = id;
        this.participants = participants;
        this.type = type;
        this.name = name;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.lastMessage = lastMessage;
    }

    // Manual initialization for default values
    public void initDefaults() {
        if (this.createdAt == null || this.createdAt.isEmpty()) {
            this.createdAt = LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME);
        }
        if (this.updatedAt == null || this.updatedAt.isEmpty()) {
            this.updatedAt = this.createdAt; // Initially, updated time is same as created time
        }
    }

    // Getters and Setters for ChatConversation fields

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public List<String> getParticipants() {
        return participants;
    }

    public void setParticipants(List<String> participants) {
        this.participants = participants;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public LastMessage getLastMessage() {
        return lastMessage;
    }

    public void setLastMessage(LastMessage lastMessage) {
        this.lastMessage = lastMessage;
    }

    // Nested LastMessage class with manual getters, setters, and constructors
    public static class LastMessage {
        private String senderId;
        private String text;
        private String createdAt;

        // Default constructor for LastMessage
        public LastMessage() {
        }

        // All-args constructor for LastMessage
        public LastMessage(String senderId, String text, String createdAt) {
            this.senderId = senderId;
            this.text = text;
            this.createdAt = createdAt;
        }

        // Getters and Setters for LastMessage fields

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
    }
}