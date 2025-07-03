// src/pages/ChatListPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { chatApi } from '@/api/ChatService';
import { ChatPreviewCard } from '@/components/chat/ChatPreviewCard';
import type { ChatConversation } from '@/types/Chat';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';

// Import Firebase Firestore functions
import { getFirestore, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { app } from '@/firebase'; // Assuming you export your Firebase app instance

export default function ChatListPage() {
    const { user, loading: authLoading } = useAuth();
    const [chats, setChats] = useState<ChatConversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading || !user) {
            setIsLoading(false);
            if (!user) setError("Please log in to view your chats.");
            return;
        }

        setIsLoading(true);
        setError(null);

        const db = getFirestore(app);
        const chatsCollectionRef = collection(db, 'chats');

        // Query for chats where the current user is a participant
        const q = query(
            chatsCollectionRef,
            where('participants', 'array-contains', user.uid),
            orderBy('updatedAt', 'desc') // Order by most recent activity
        );

        // Set up real-time listener
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedChats: ChatConversation[] = [];
            snapshot.forEach(doc => {
                const chatData = doc.data() as ChatConversation;
                fetchedChats.push({ ...chatData, id: doc.id });
            });
            setChats(fetchedChats);
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching real-time chats:", err);
            setError("Failed to load chats. Please try again.");
            setIsLoading(false);
            toast.error("Error loading chats", { description: "Could not retrieve your conversations." });
        });

        // Cleanup listener on component unmount
        return () => unsubscribe();
    }, [user, authLoading]);

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 max-w-2xl text-center text-neutral-400">
                Loading chats...
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-4 max-w-2xl text-center text-red-500">
                <p>{error}</p>
                {!user && <Button onClick={() => window.location.href = '/login'} className="mt-4">Log In</Button>}
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container mx-auto p-4 max-w-2xl text-center text-neutral-400">
                You need to be logged in to view your chats.
                <Button onClick={() => window.location.href = '/login'} className="mt-4">Log In</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 max-w-2xl bg-neutral-950 text-neutral-100 min-h-[calc(100vh-64px)]">
            <Card className="bg-neutral-900 border-neutral-800 shadow-xl">
                <CardHeader className="pb-4">
                    <CardTitle className="text-3xl font-bold text-neutral-100">Your Chats</CardTitle>
                    <CardDescription className="text-neutral-400">
                        All your conversations in one place.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {chats.length === 0 ? (
                        <div className="text-center py-8 text-neutral-400">
                            <p className="mb-4">You don't have any active chats yet.</p>
                            <p>Start a conversation from a user's profile or a listing!</p>
                            {/* Example of a button to potentially start a new chat, e.g., browse users */}
                            <Link to="/browse-listings">
                                <Button variant="outline" className="mt-4 text-teal-400 border-teal-400 hover:bg-teal-900 hover:text-teal-300">
                                    <MessageSquarePlus className="mr-2 h-4 w-4" /> Start a New Chat
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <ScrollArea className="h-[60vh] pr-4">
                            <div className="space-y-4">
                                {chats.map(chat => (
                                    <ChatPreviewCard key={chat.id} chat={chat} currentUserId={user.uid} />
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
