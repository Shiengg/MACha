'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import ConversationList from '@/components/message/ConversationList';
import ChatWindow from '@/components/message/ChatWindow';
import type { Conversation } from '@/services/conversation.service';

export default function MessagesPage() {
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

    return (
        <ProtectedRoute>
            <div className="bg-gray-50">
                <div className="flex h-[calc(100vh-73px)]">
                    {/* Left Sidebar - Conversation List */}
                    <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
                        <ConversationList 
                            selectedConversationId={selectedConversation?._id ?? null}
                            onSelectConversation={setSelectedConversation}
                        />
                    </div>

                    {/* Center - Chat Window */}
                    <div className="flex-1 flex flex-col bg-white">
                        <ChatWindow conversation={selectedConversation} />
                    </div>

                    {/* Right Sidebar - Placeholder */}
                    <div className="w-80 border-l border-gray-200 bg-yellow-100 flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-yellow-800 font-medium text-lg">Làm sau</p>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}

