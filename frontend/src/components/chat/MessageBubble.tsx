// src/components/chat/MessageBubble.tsx
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { ChatMessage } from '@/types/Chat';

interface MessageBubbleProps {
    message: ChatMessage;
    isOwnMessage: boolean;
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
    const bubbleClasses = cn(
        "max-w-[70%] p-3 rounded-lg shadow-sm",
        isOwnMessage
            ? "bg-teal-700 text-white ml-auto rounded-br-none" // Your messages
            : "bg-neutral-700 text-neutral-100 rounded-bl-none" // Other user's messages
    );

    const avatarClasses = cn(
        "h-8 w-8 flex-shrink-0 border border-neutral-600",
        isOwnMessage ? "order-2 ml-2" : "order-1 mr-2"
    );

    const containerClasses = cn(
        "flex items-end mb-4",
        isOwnMessage ? "justify-end" : "justify-start"
    );

    const timeClasses = cn(
        "text-xs text-neutral-400 mt-1",
        isOwnMessage ? "text-right" : "text-left"
    );

    return (
        <div className={containerClasses}>
            <Avatar className={avatarClasses}>
                <AvatarImage src={message.senderProfileImageUrl || undefined} alt={message.senderDisplayName} />
                <AvatarFallback className="bg-neutral-600 text-neutral-200">{message.senderDisplayName?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div className={isOwnMessage ? "flex flex-col items-end" : "flex flex-col items-start"}>
                <div className={bubbleClasses}>
                    <p className="font-medium text-sm mb-1">{message.senderDisplayName || 'Unknown User'}</p>
                    <p className="text-base break-words">{message.text}</p>
                </div>
                <span className={timeClasses}>
                    {message.createdAt ? format(new Date(message.createdAt), 'h:mm a') : ''}
                </span>
            </div>
        </div>
    );
}
