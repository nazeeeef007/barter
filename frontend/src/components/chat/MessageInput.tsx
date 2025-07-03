// src/components/chat/MessageInput.tsx
import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface MessageInputProps {
    onSendMessage: (text: string) => void;
    isLoading: boolean;
}

export function MessageInput({ onSendMessage, isLoading }: MessageInputProps) {
    const [message, setMessage] = useState('');

    const handleSend = () => {
        if (message.trim()) {
            onSendMessage(message.trim());
            setMessage('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line
            handleSend();
        }
    };

    return (
        <div className="flex items-end space-x-2 p-4 bg-neutral-900 border-t border-neutral-800 sticky bottom-0">
            <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="flex-1 min-h-[40px] max-h-[120px] resize-none bg-neutral-800 text-neutral-100 border-neutral-700 focus:border-teal-500"
                rows={1}
                disabled={isLoading}
            />
            <Button
                onClick={handleSend}
                disabled={isLoading || !message.trim()}
                className="bg-teal-600 hover:bg-teal-700 text-white"
            >
                <Send className="h-5 w-5" />
            </Button>
        </div>
    );
}
