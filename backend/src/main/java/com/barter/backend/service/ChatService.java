package com.barter.backend.service;

import com.barter.backend.model.ChatConversation;
import com.barter.backend.model.ChatMessage;
import com.barter.backend.model.UserProfile;
import com.barter.backend.exception.ResourceNotFoundException;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private static final Logger logger = LoggerFactory.getLogger(ChatService.class);
    private static final String CHATS_COLLECTION_NAME = "chats";
    private static final String MESSAGES_SUBCOLLECTION_NAME = "messages";
    private static final String USER_PROFILES_COLLECTION = "user_profiles"; // For fetching display names

    private final Firestore firestore = FirestoreClient.getFirestore();
    private final UserProfileService userProfileService; // Inject UserProfileService to get user details

    public ChatService(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    /**
     * Creates a new chat conversation.
     * For direct messages (type "direct"), it checks if a conversation already exists between the two participants.
     *
     * @param participantUids List of Firebase UIDs of the participants.
     * @param chatName Optional name for the chat (e.g., for group chats).
     * @param chatType Type of chat (e.g., "direct", "group").
     * @return The created ChatConversation object.
     * @throws IllegalArgumentException if participants list is invalid or chatType is unknown.
     * @throws RuntimeException if there's an error during Firestore access.
     */
    public ChatConversation createChat(List<String> participantUids, String chatName, String chatType) {
        if (participantUids == null || participantUids.isEmpty()) {
            throw new IllegalArgumentException("Participants list cannot be empty.");
        }
        if (!"direct".equals(chatType) && !"group".equals(chatType)) {
            throw new IllegalArgumentException("Invalid chat type. Must be 'direct' or 'group'.");
        }

        // For direct messages, ensure only two participants and check for existing chat
        if ("direct".equals(chatType)) {
            if (participantUids.size() != 2) {
                throw new IllegalArgumentException("Direct messages must have exactly two participants.");
            }
            // Sort UIDs to create a consistent chat ID for direct messages
            List<String> sortedUids = new ArrayList<>(participantUids);
            Collections.sort(sortedUids);
            String directChatId = String.join("_", sortedUids);

            try {
                // Check if a direct chat already exists
                DocumentSnapshot existingChatDoc = firestore.collection(CHATS_COLLECTION_NAME).document(directChatId).get().get();
                if (existingChatDoc.exists()) {
                    logger.info("Direct chat already exists between {} and {}. Returning existing chat.", sortedUids.get(0), sortedUids.get(1));
                    ChatConversation existingChat = existingChatDoc.toObject(ChatConversation.class);
                    if (existingChat != null) {
                        existingChat.setId(existingChatDoc.getId());
                    }
                    return existingChat;
                }
            } catch (InterruptedException | ExecutionException e) {
                logger.error("Error checking for existing direct chat: {}", e.getMessage(), e);
                Thread.currentThread().interrupt();
                throw new RuntimeException("Failed to check for existing direct chat.", e);
            }

            // If not found, proceed to create
            chatName = null; // Direct messages usually don't have a specific "chat name"
        } else { // "group" chat
            if (chatName == null || chatName.trim().isEmpty()) {
                throw new IllegalArgumentException("Group chats must have a name.");
            }
        }

        ChatConversation newChat = new ChatConversation();
        newChat.setParticipants(participantUids);
        newChat.setType(chatType);
        newChat.setName(chatName);
        newChat.initDefaults(); // Sets createdAt and updatedAt

        DocumentReference docRef;
        if ("direct".equals(chatType)) {
            // Use the consistent directChatId for direct messages
            List<String> sortedUids = new ArrayList<>(participantUids);
            Collections.sort(sortedUids);
            String directChatId = String.join("_", sortedUids);
            docRef = firestore.collection(CHATS_COLLECTION_NAME).document(directChatId);
        } else {
            // Let Firestore generate ID for group chats
            docRef = firestore.collection(CHATS_COLLECTION_NAME).document();
        }

        try {
            ApiFuture<WriteResult> future = docRef.set(newChat);
            future.get(); // Blocks until write completes
            newChat.setId(docRef.getId()); // Set the ID from the document reference
            logger.info("Successfully created new chat conversation with ID: {} and type: {}", newChat.getId(), newChat.getType());
            return newChat;
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error creating chat conversation: {}", e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to create chat conversation.", e);
        }
    }

    /**
     * Adds a new message to a chat conversation and updates the parent conversation's lastMessage.
     *
     * @param chatId The ID of the chat conversation.
     * @param message The ChatMessage object to add.
     * @return The created ChatMessage object.
     * @throws ResourceNotFoundException if the chat conversation does not exist.
     * @throws IllegalArgumentException if message data is invalid.
     * @throws RuntimeException if there's an error during Firestore access.
     */
    public ChatMessage addMessage(String chatId, ChatMessage message) {
        if (chatId == null || chatId.isEmpty()) {
            throw new IllegalArgumentException("Chat ID cannot be null or empty.");
        }
        if (message.getSenderId() == null || message.getSenderId().isEmpty() ||
                message.getText() == null || message.getText().isEmpty()) {
            throw new IllegalArgumentException("Message senderId and text are required.");
        }

        DocumentReference chatDocRef = firestore.collection(CHATS_COLLECTION_NAME).document(chatId);
        CollectionReference messagesCollectionRef = chatDocRef.collection(MESSAGES_SUBCOLLECTION_NAME);

        message.initDefaults(); // Set createdAt timestamp

        try {
            // Fetch sender's display name and profile image for the message object
            Optional<UserProfile> senderProfileOpt = userProfileService.getUserProfileByFirebaseUid(message.getSenderId());
            if (senderProfileOpt.isPresent()) {
                UserProfile senderProfile = senderProfileOpt.get();
                message.setSenderDisplayName(senderProfile.getDisplayName());
                message.setSenderProfileImageUrl(senderProfile.getProfileImageUrl());
            } else {
                logger.warn("Sender profile not found for UID: {}. Message will have 'Unknown User'.", message.getSenderId());
                message.setSenderDisplayName("Unknown User");
                message.setSenderProfileImageUrl(null);
            }

            // Add the message to the subcollection
            ApiFuture<DocumentReference> addMessageFuture = messagesCollectionRef.add(message);
            DocumentReference messageDocRef = addMessageFuture.get();
            message.setId(messageDocRef.getId()); // Set the ID on the returned message object
            message.setChatId(chatId); // Ensure chatId is set on the message object

            // Update the lastMessage and updatedAt fields on the parent chat conversation
            ChatConversation.LastMessage lastMessageUpdate = new ChatConversation.LastMessage(
                    message.getSenderId(),
                    message.getText(),
                    message.getCreatedAt()
            );

            Map<String, Object> updates = new HashMap<>();
            updates.put("lastMessage", lastMessageUpdate);
            updates.put("updatedAt", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));

            ApiFuture<WriteResult> updateChatFuture = chatDocRef.update(updates);
            updateChatFuture.get(); // Blocks until update completes

            logger.info("Successfully added message with ID: {} to chat: {}", message.getId(), chatId);
            return message;
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error adding message to chat {}: {}", chatId, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to add message to chat.", e);
        } catch (ResourceNotFoundException e) {
            logger.error("Chat conversation not found for ID {}: {}", chatId, e.getMessage());
            throw new ResourceNotFoundException("Chat conversation not found with ID: " + chatId);
        }
    }

    /**
     * Retrieves a specific chat conversation by its ID.
     *
     * @param chatId The ID of the chat conversation.
     * @return An Optional containing the ChatConversation if found, otherwise empty.
     * @throws RuntimeException if there's an error during Firestore access.
     */
    public Optional<ChatConversation> getChatById(String chatId) {
        try {
            DocumentSnapshot doc = firestore.collection(CHATS_COLLECTION_NAME).document(chatId).get().get();
            if (doc.exists()) {
                ChatConversation chat = doc.toObject(ChatConversation.class);
                if (chat != null) {
                    chat.setId(doc.getId());
                }
                return Optional.ofNullable(chat);
            }
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error retrieving chat by ID {}: {}", chatId, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to retrieve chat by ID: " + chatId, e);
        }
        return Optional.empty();
    }

    /**
     * Retrieves all chat conversations for a given user.
     *
     * @param userId The Firebase UID of the user.
     * @return A list of ChatConversation objects the user is a participant of, sorted by updatedAt.
     * @throws RuntimeException if there's an error during Firestore access.
     */
    public List<ChatConversation> getChatsForUser(String userId) {
        List<ChatConversation> chats = new ArrayList<>();
        try {
            ApiFuture<QuerySnapshot> future = firestore.collection(CHATS_COLLECTION_NAME)
                    .whereArrayContains("participants", userId)
                    .orderBy("updatedAt", Query.Direction.DESCENDING) // Sort by most recent message
                    .get();
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();

            for (DocumentSnapshot doc : documents) {
                try {
                    ChatConversation chat = doc.toObject(ChatConversation.class);
                    if (chat != null) {
                        chat.setId(doc.getId());
                        chats.add(chat);
                    }
                } catch (Exception e) {
                    logger.error("Error mapping document {} to ChatConversation: {}", doc.getId(), e.getMessage(), e);
                }
            }
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error retrieving chats for user {}: {}", userId, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to retrieve chats for user: " + userId, e);
        }
        return chats;
    }

    /**
     * Retrieves all messages for a specific chat conversation.
     *
     * @param chatId The ID of the chat conversation.
     * @return A list of ChatMessage objects, sorted by createdAt.
     * @throws RuntimeException if there's an error during Firestore access.
     */
    public List<ChatMessage> getMessagesForChat(String chatId) {
        List<ChatMessage> messages = new ArrayList<>();
        try {
            ApiFuture<QuerySnapshot> future = firestore.collection(CHATS_COLLECTION_NAME)
                    .document(chatId)
                    .collection(MESSAGES_SUBCOLLECTION_NAME)
                    .orderBy("createdAt", Query.Direction.ASCENDING) // Order chronologically
                    .get();
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();

            for (DocumentSnapshot doc : documents) {
                try {
                    ChatMessage message = doc.toObject(ChatMessage.class);
                    if (message != null) {
                        message.setId(doc.getId());
                        message.setChatId(chatId); // Ensure chat ID is set on message object
                        messages.add(message);
                    }
                } catch (Exception e) {
                    logger.error("Error mapping document {} to ChatMessage for chat {}: {}", doc.getId(), chatId, e.getMessage(), e);
                }
            }
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error retrieving messages for chat {}: {}", chatId, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to retrieve messages for chat: " + chatId, e);
        }
        return messages;
    }

    /**
     * Deletes a chat conversation and all its messages.
     * This operation should typically be restricted to admins or very specific user actions.
     *
     * @param chatId The ID of the chat conversation to delete.
     * @throws ResourceNotFoundException if the chat is not found.
     * @throws RuntimeException if there's an error during Firestore access.
     */
    public void deleteChat(String chatId) {
        DocumentReference chatDocRef = firestore.collection(CHATS_COLLECTION_NAME).document(chatId);

        try {
            // First, delete all messages in the subcollection
            ApiFuture<QuerySnapshot> messagesFuture = chatDocRef.collection(MESSAGES_SUBCOLLECTION_NAME).get();
            List<QueryDocumentSnapshot> messages = messagesFuture.get().getDocuments();
            for (DocumentSnapshot messageDoc : messages) {
                messageDoc.getReference().delete();
            }
            logger.info("Deleted all messages for chat: {}", chatId);

            // Then, delete the chat conversation document itself
            ApiFuture<WriteResult> deleteChatFuture = chatDocRef.delete();
            deleteChatFuture.get();
            logger.info("Successfully deleted chat conversation with ID: {}", chatId);
        } catch (InterruptedException | ExecutionException e) {
            logger.error("Error deleting chat {}: {}", chatId, e.getMessage(), e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to delete chat: " + chatId, e);
        }
    }
}
