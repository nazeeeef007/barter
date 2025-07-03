// src/pages/ChatRoomPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { chatApi } from '@/api/ChatService';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import type { ChatConversation, ChatMessage, SendMessagePayload } from '@/types/Chat';
import type { UserProfile } from '@/types/UserProfile';
import { reviewApi } from '@/api/ReviewService'; // For fetching user profiles
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

// Import Firebase Firestore functions - ENSURE 'doc' IS IMPORTED HERE!
import { getFirestore, collection, doc, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { app } from '@/firebase'; // Assuming you export your Firebase app instance

interface ChatRoomPageParams extends Record<string, string | undefined> {
    chatId: string;
}

export default function ChatRoomPage() {
    const { chatId } = useParams<ChatRoomPageParams>();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    const [chat, setChat] = useState<ChatConversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoadingChat, setIsLoadingChat] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(true);
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Effect to fetch chat details and set up real-time message listener
    useEffect(() => {
        if (authLoading || !user || !chatId) {
            setIsLoadingChat(false);
            setIsLoadingMessages(false);
            if (!user) setError("Please log in to view this chat.");
            return;
        }

        const db = getFirestore(app);

        // Corrected: Use doc() for specific document reference
        const chatDocRef = doc(db, 'chats', chatId);
        // Corrected: Use collection() for subcollection, passing parent document reference
        const messagesCollectionRef = collection(chatDocRef, 'messages');

        // 1. Listen for chat conversation details
        const unsubscribeChat = onSnapshot(chatDocRef, async (docSnapshot) => {
            if (docSnapshot.exists()) {
                const fetchedChat = { ...docSnapshot.data() as ChatConversation, id: docSnapshot.id };
                // Basic authorization check: ensure current user is a participant
                if (!fetchedChat.participants.includes(user.uid)) {
                    setError("You are not authorized to view this chat.");
                    setIsLoadingChat(false);
                    setIsLoadingMessages(false);
                    toast.error("Unauthorized Access", { description: "You are not a participant of this chat." });
                    return;
                }
                setChat(fetchedChat);
                setIsLoadingChat(false);
            } else {
                setError("Chat not found.");
                setIsLoadingChat(false);
                setIsLoadingMessages(false);
                toast.error("Chat Not Found", { description: "The conversation you are looking for does not exist." });
            }
        }, (err) => {
            console.error("Error fetching real-time chat details:", err);
            setError("Failed to load chat details.");
            setIsLoadingChat(false);
            toast.error("Error loading chat", { description: "Could not retrieve conversation details." });
        });

        // 2. Listen for real-time messages
        const q = query(messagesCollectionRef, orderBy('createdAt', 'asc')); // Order by timestamp
        const unsubscribeMessages = onSnapshot(q, async (snapshot) => {
            const fetchedMessages: ChatMessage[] = [];
            const senderUids: Set<string> = new Set();

            snapshot.forEach(doc => {
                const messageData = doc.data() as ChatMessage;
                fetchedMessages.push({ ...messageData, id: doc.id, chatId: chatId });
                senderUids.add(messageData.senderId);
            });

            // Fetch sender display names and profile images in batch
            const userProfilesMap = new Map<string, UserProfile>();
            if (senderUids.size > 0) {
                const profilePromises = Array.from(senderUids).map(uid => reviewApi.getUserProfile(uid));
                const profiles = await Promise.allSettled(profilePromises);

                profiles.forEach(result => {
                    if (result.status === 'fulfilled') {
                        userProfilesMap.set(result.value.firebaseUid, result.value);
                    } else {
                        console.warn("Failed to fetch profile for a message sender:", result.reason);
                    }
                });
            }

            // Enrich messages with sender display name and profile image
            const enrichedMessages = fetchedMessages.map(msg => ({
                ...msg,
                senderDisplayName: userProfilesMap.get(msg.senderId)?.displayName || 'Unknown User',
                senderProfileImageUrl: userProfilesMap.get(msg.senderId)?.profileImageUrl || undefined,
            }));

            setMessages(enrichedMessages);
            setIsLoadingMessages(false);
        }, (err) => {
            console.error("Error fetching real-time messages:", err);
            setError("Failed to load messages. Please try again.");
            setIsLoadingMessages(false);
            toast.error("Error loading messages", { description: "Could not retrieve chat messages." });
        });

        // Cleanup listeners on component unmount
        return () => {
            unsubscribeChat();
            unsubscribeMessages();
        };
    }, [user, authLoading, chatId, navigate]);

    // Scroll to bottom of messages when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (text: string) => {
        if (!user || !chatId || !text.trim() || isSendingMessage) return;

        setIsSendingMessage(true);
        try {
            const idToken = await user.getIdToken(true);
            const headers = { Authorization: `Bearer ${idToken}` };

            const messagePayload: SendMessagePayload = {
                senderId: user.uid,
                text: text.trim(),
            };

            // Call backend API to add message
            await chatApi.addMessage(chatId, messagePayload, { headers });
            // Firestore listener will automatically update the messages state
            toast.success("Message sent!");
        } catch (err: any) {
            console.error('Failed to send message:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to send message. Please try again.';
            setError(errorMessage);
            toast.error("Message Failed", { description: errorMessage });
        } finally {
            setIsSendingMessage(false);
        }
    };

    if (isLoadingChat || isLoadingMessages) {
        return (
            <div className="container mx-auto p-4 max-w-2xl text-center text-neutral-400">
                Loading chat...
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-4 max-w-2xl text-center text-red-500">
                <p>{error}</p>
                <Button onClick={() => navigate(-1)} className="mt-4 bg-neutral-700 hover:bg-neutral-600 text-neutral-100">Go Back</Button>
            </div>
        );
    }

    if (!chat) { // Should not happen if error handling is correct, but for type safety
        return (
            <div className="container mx-auto p-4 max-w-2xl text-center text-neutral-400">
                Chat data not available.
            </div>
        );
    }

    const chatDisplayName = chat.type === 'group' ? chat.name : (
        chat.participants.find(pId => pId !== user?.uid) // Find the other participant's UID
            ? (messages.find(msg => msg.senderId !== user?.uid)?.senderDisplayName || 'Other User') // Try to get display name from messages
            : 'You' // If only one participant (self-chat, though unlikely for DMs)
    );


    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-neutral-950 text-neutral-100">
            <Card className="flex-1 flex flex-col bg-neutral-900 border-neutral-800 rounded-none shadow-none">
                <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-neutral-800">
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/chats')} className="mr-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <CardTitle className="text-xl font-bold text-neutral-100">{chatDisplayName}</CardTitle>
                            <CardDescription className="text-neutral-400">
                                {chat.type === 'direct' ? 'Direct Message' : 'Group Chat'}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4 custom-scrollbar">
                    {messages.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-neutral-400">
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                isOwnMessage={msg.senderId === user?.uid}
                            />
                        ))
                    )}
                    <div ref={messagesEndRef} /> {/* Scroll target */}
                </CardContent>
            </Card>
            <MessageInput onSendMessage={handleSendMessage} isLoading={isSendingMessage} />
        </div>
    );
}