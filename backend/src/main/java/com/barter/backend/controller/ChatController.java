package com.barter.backend.controller;

import com.barter.backend.model.ChatConversation;
import com.barter.backend.model.ChatMessage;
import com.barter.backend.service.ChatService;
import com.barter.backend.exception.ResourceNotFoundException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/chats")
public class ChatController {

    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);
    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    /**
     * Creates a new chat conversation.
     * Requires authentication. The authenticated user must be one of the participants.
     *
     * Request Body Example:
     * {
     * "participants": ["user1_uid", "user2_uid"],
     * "type": "direct", // or "group"
     * "name": "My Group Chat" // Required for "group" type
     * }
     */
    @PostMapping
    public ResponseEntity<?> createChat(@RequestBody ChatConversation chatRequest, HttpServletRequest request) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to create chat without Firebase token.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Firebase token missing.");
        }

        if (chatRequest.getParticipants() == null || chatRequest.getParticipants().isEmpty()) {
            return ResponseEntity.badRequest().body("Participants list is required.");
        }
        if (!chatRequest.getParticipants().contains(token.getUid())) {
            logger.warn("User {} attempted to create a chat they are not a participant of.", token.getUid());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You must be a participant in the chat you are creating.");
        }

        try {
            ChatConversation createdChat = chatService.createChat(
                    chatRequest.getParticipants(),
                    chatRequest.getName(),
                    chatRequest.getType()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(createdChat);
        } catch (IllegalArgumentException e) {
            logger.warn("Bad request for chat creation: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("Error creating chat: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Error creating chat: " + e.getMessage());
        }
    }

    /**
     * Retrieves a specific chat conversation by its ID.
     * Requires authentication. The authenticated user must be a participant of the chat.
     */
    @GetMapping("/{chatId}")
    public ResponseEntity<?> getChatById(@PathVariable String chatId, HttpServletRequest request) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to get chat {} without Firebase token.", chatId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Firebase token missing.");
        }

        try {
            return chatService.getChatById(chatId)
                    .map(chat -> {
                        if (!chat.getParticipants().contains(token.getUid())) {
                            logger.warn("User {} attempted to access chat {} they are not a participant of.", token.getUid(), chatId);
                            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to view this chat.");
                        }
                        return ResponseEntity.ok(chat);
                    })
                    .orElseGet(() -> {
                        logger.warn("Chat not found with ID: {}", chatId);
                        return ResponseEntity.notFound().build();
                    });
        } catch (Exception e) {
            logger.error("Error getting chat {}: {}", chatId, e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Error retrieving chat: " + e.getMessage());
        }
    }

    /**
     * Retrieves all chat conversations for the authenticated user.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getChatsForUser(@PathVariable String userId, HttpServletRequest request) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to get chats for user {} without Firebase token.", userId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Firebase token missing.");
        }
        if (!token.getUid().equals(userId)) {
            logger.warn("User {} attempted to access chats for user {}.", token.getUid(), userId);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to view chats for this user.");
        }

        try {
            List<ChatConversation> chats = chatService.getChatsForUser(userId);
            return ResponseEntity.ok(chats);
        } catch (Exception e) {
            logger.error("Error getting chats for user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Error retrieving chats: " + e.getMessage());
        }
    }

    /**
     * Adds a message to a chat conversation.
     * Requires authentication. The authenticated user must be a participant of the chat and the sender.
     *
     * Request Body Example:
     * {
     * "senderId": "current_user_uid",
     * "text": "Hello, how are you?"
     * }
     */
    @PostMapping("/{chatId}/messages")
    public ResponseEntity<?> addMessage(@PathVariable String chatId, @RequestBody ChatMessage messageRequest, HttpServletRequest request) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to add message to chat {} without Firebase token.", chatId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Firebase token missing.");
        }
        if (!token.getUid().equals(messageRequest.getSenderId())) {
            logger.warn("User {} attempted to send message as different user {}.", token.getUid(), messageRequest.getSenderId());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only send messages as yourself.");
        }

        try {
            // Validate if the user is a participant of the chat before allowing message
            Optional<ChatConversation> chatOpt = chatService.getChatById(chatId);
            if (chatOpt.isEmpty() || !chatOpt.get().getParticipants().contains(token.getUid())) {
                logger.warn("User {} attempted to send message to chat {} they are not a participant of.", token.getUid(), chatId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to send messages to this chat.");
            }

            ChatMessage createdMessage = chatService.addMessage(chatId, messageRequest);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdMessage);
        } catch (ResourceNotFoundException e) {
            logger.warn("Chat not found for message addition: {}", chatId);
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            logger.warn("Bad request for message addition to chat {}: {}", chatId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("Error adding message to chat {}: {}", chatId, e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Error sending message: " + e.getMessage());
        }
    }

    /**
     * Retrieves all messages for a specific chat conversation.
     * Requires authentication. The authenticated user must be a participant of the chat.
     */
    @GetMapping("/{chatId}/messages")
    public ResponseEntity<?> getMessagesForChat(@PathVariable String chatId, HttpServletRequest request) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to get messages for chat {} without Firebase token.", chatId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Firebase token missing.");
        }

        try {
            // Validate if the user is a participant of the chat before allowing message retrieval
            Optional<ChatConversation> chatOpt = chatService.getChatById(chatId);
            if (chatOpt.isEmpty() || !chatOpt.get().getParticipants().contains(token.getUid())) {
                logger.warn("User {} attempted to retrieve messages from chat {} they are not a participant of.", token.getUid(), chatId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to view messages in this chat.");
            }

            List<ChatMessage> messages = chatService.getMessagesForChat(chatId);
            return ResponseEntity.ok(messages);
        } catch (ResourceNotFoundException e) {
            logger.warn("Chat not found for message retrieval: {}", chatId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error retrieving messages for chat {}: {}", chatId, e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Error retrieving messages: " + e.getMessage());
        }
    }

    /**
     * Deletes a chat conversation and all its messages.
     * This should typically be an admin-only operation or have very strict rules.
     * For simplicity, this example requires the authenticated user to be one of the participants.
     */
    @DeleteMapping("/{chatId}")
    public ResponseEntity<?> deleteChat(@PathVariable String chatId, HttpServletRequest request) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to delete chat {} without Firebase token.", chatId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Firebase token missing.");
        }

        try {
            Optional<ChatConversation> chatOpt = chatService.getChatById(chatId);
            if (chatOpt.isEmpty()) {
                logger.warn("Attempted to delete non-existent chat with ID: {}", chatId);
                return ResponseEntity.notFound().build();
            }

            ChatConversation chat = chatOpt.get();
            // Only allow deletion if the requesting user is a participant (or add admin check)
            if (!chat.getParticipants().contains(token.getUid())) {
                logger.warn("User {} attempted to delete chat {} they are not a participant of.", token.getUid(), chatId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to delete this chat.");
            }

            chatService.deleteChat(chatId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            logger.error("Error deleting chat {}: {}", chatId, e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Error deleting chat: " + e.getMessage());
        }
    }
}
