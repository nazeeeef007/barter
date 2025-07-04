// src/components/chat/ChatPreviewCard.tsx
import  { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNowStrict } from 'date-fns';
import type { ChatConversation } from '@/types/Chat';
import type { UserProfile } from '@/types/UserProfile';
import { reviewApi } from '@/api/ReviewService'; // Re-using reviewApi for user profiles

interface ChatPreviewCardProps {
    chat: ChatConversation;
    currentUserId: string;
}

export function ChatPreviewCard({ chat, currentUserId }: ChatPreviewCardProps) {
    const [otherParticipant, setOtherParticipant] = useState<UserProfile | null>(null);
    const [isLoadingParticipant, setIsLoadingParticipant] = useState(true);

    useEffect(() => {
        const fetchOtherParticipant = async () => {
            if (chat.type === 'direct' && chat.participants.length === 2) {
                const otherUid = chat.participants.find(uid => uid !== currentUserId);
                if (otherUid) {
                    try {
                        const userProfile = await reviewApi.getUserProfile(otherUid);
                        setOtherParticipant(userProfile);
                    } catch (error) {
                        console.error("Failed to fetch other participant profile:", error);
                        setOtherParticipant({
                            id: otherUid,
                            firebaseUid: otherUid,
                            displayName: 'Unknown User',
                            email: '',
                            location: '',
                            bio: '',
                            skillsOffered: [],
                            needs: [],
                            rating: 0,
                            profileImageUrl: '',
                            createdAt: new Date().toISOString(),
                            });

                    } finally {
                        setIsLoadingParticipant(false);
                    }
                } else {
                    setIsLoadingParticipant(false);
                }
            } else {
                // For group chats or chats with unusual participant counts,
                // we might not display a single "other participant"
                setIsLoadingParticipant(false);
            }
        };

        fetchOtherParticipant();
    }, [chat.participants, chat.type, currentUserId]);

    const chatName = chat.type === 'group' ? chat.name : (otherParticipant?.displayName || 'Direct Message');
    const chatAvatar = chat.type === 'group' ? null : (otherParticipant?.profileImageUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${chatName}`);
    const chatFallback = chat.type === 'group' ? chat.name?.charAt(0) || 'G' : otherParticipant?.displayName?.charAt(0) || '?';

    const lastMessageTime = chat.lastMessage?.createdAt
        ? formatDistanceToNowStrict(new Date(chat.lastMessage.createdAt), { addSuffix: true })
        : 'No messages yet';

    if (isLoadingParticipant && chat.type === 'direct') {
        return (
            <Card className="flex items-center space-x-4 p-4 animate-pulse bg-neutral-800 border-neutral-700">
                <div className="h-12 w-12 rounded-full bg-neutral-700"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
                    <div className="h-4 bg-neutral-700 rounded w-1/2"></div>
                </div>
            </Card>
        );
    }

    return (
        <Link to={`/chats/${chat.id}`} className="block">
            <Card className="flex items-center p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 bg-neutral-900 text-neutral-100 border-neutral-800 hover:bg-neutral-800">
                <Avatar className="h-12 w-12 border border-neutral-700">
                    <AvatarImage src={chatAvatar || undefined} alt={chatName} />
                    <AvatarFallback className="bg-neutral-700 text-neutral-200">{chatFallback}</AvatarFallback>
                </Avatar>
                <div className="flex-1 ml-4 overflow-hidden">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg truncate">{chatName}</h3>
                        <span className="text-xs text-neutral-400 flex-shrink-0">{lastMessageTime}</span>
                    </div>
                    <p className="text-sm text-neutral-300 truncate mt-1">
                        {chat.lastMessage?.text || 'Start a conversation...'}
                    </p>
                </div>
            </Card>
        </Link>
    );
}
