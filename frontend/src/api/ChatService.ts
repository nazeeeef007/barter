// src/api/ChatService.ts
import axios, { type AxiosRequestConfig } from 'axios';
import type { ChatConversation, ChatMessage, CreateChatPayload, SendMessagePayload } from '@/types/Chat';
const BASE_URL = import.meta.env.VITE_BASE_URL;


export const chatApi = {
    /**
     * Creates a new chat conversation.
     * @param chatData The data for the new chat (participants, type, name).
     * @param config Optional AxiosRequestConfig for headers (e.g., Authorization).
     * @returns The created ChatConversation object.
     */
    createChat: async (chatData: CreateChatPayload, config?: AxiosRequestConfig): Promise<ChatConversation> => {
        const response = await axios.post<ChatConversation>(`${BASE_URL}/chats`, chatData, config);
        return response.data;
    },

    /**
     * Retrieves a specific chat conversation by its ID.
     * @param chatId The ID of the chat conversation.
     * @param config Optional AxiosRequestConfig for headers.
     * @returns The ChatConversation object.
     */
    getChatById: async (chatId: string, config?: AxiosRequestConfig): Promise<ChatConversation> => {
        const response = await axios.get<ChatConversation>(`${BASE_URL}/chats/${chatId}`, config);
        return response.data;
    },

    /**
     * Retrieves all chat conversations for a specific user.
     * @param userId The Firebase UID of the user.
     * @param config Optional AxiosRequestConfig for headers.
     * @returns A list of ChatConversation objects.
     */
    getChatsForUser: async (userId: string, config?: AxiosRequestConfig): Promise<ChatConversation[]> => {
        const response = await axios.get<ChatConversation[]>(`${BASE_URL}/chats/user/${userId}`, config);
        return response.data;
    },

    /**
     * Adds a new message to a chat conversation.
     * @param chatId The ID of the chat conversation.
     * @param messageData The message content and sender ID.
     * @param config Optional AxiosRequestConfig for headers.
     * @returns The created ChatMessage object.
     */
    addMessage: async (chatId: string, messageData: SendMessagePayload, config?: AxiosRequestConfig): Promise<ChatMessage> => {
        const response = await axios.post<ChatMessage>(`${BASE_URL}/chats/${chatId}/messages`, messageData, config);
        return response.data;
    },

    /**
     * Retrieves all messages for a specific chat conversation.
     * @param chatId The ID of the chat conversation.
     * @param config Optional AxiosRequestConfig for headers.
     * @returns A list of ChatMessage objects.
     */
    getMessagesForChat: async (chatId: string, config?: AxiosRequestConfig): Promise<ChatMessage[]> => {
        const response = await axios.get<ChatMessage[]>(`${BASE_URL}/chats/${chatId}/messages`, config);
        return response.data;
    },

    /**
     * Deletes a chat conversation.
     * @param chatId The ID of the chat conversation to delete.
     * @param config Optional AxiosRequestConfig for headers.
     */
    deleteChat: async (chatId: string, config?: AxiosRequestConfig): Promise<void> => {
        await axios.delete(`${BASE_URL}/chats/${chatId}`, config);
    },
};
