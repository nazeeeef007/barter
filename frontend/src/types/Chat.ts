// src/types/Chat.ts

// Represents the nested LastMessage object within ChatConversation
export interface LastMessage {
    senderId: string;
    text: string;
    createdAt: string; // ISO_DATE_TIME string
}

// Represents a chat conversation document in Firestore
export interface ChatConversation {
    id: string; // Firestore document ID for the conversation
    participants: string[]; // Firebase UIDs of participants
    type: 'direct' | 'group'; // "direct" or "group"
    name?: string; // Optional: Name for group chats, or derived for direct messages
    createdAt: string; // ISO_DATE_TIME string
    updatedAt: string; // ISO_DATE_TIME string, updated with last message
    lastMessage?: LastMessage; // Optional: Summary of the last message
}

// Represents an individual message document in a chat subcollection
export interface ChatMessage {
    id: string; // Firestore document ID for the message
    chatId: string; // ID of the parent chat conversation
    senderId: string; // Firebase UID of the sender
    text: string;
    createdAt: string; // ISO_DATE_TIME string
    senderDisplayName?: string; // Populated from UserProfile for display
    senderProfileImageUrl?: string; // Populated from UserProfile for display
}

// Payload for creating a new chat conversation
export interface CreateChatPayload {
    participants: string[];
    type: 'direct' | 'group';
    name?: string;
}

// Payload for sending a new message
export interface SendMessagePayload {
    senderId: string;
    text: string;
}
