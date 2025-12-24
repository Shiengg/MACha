'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import ConversationList from '@/components/message/ConversationList';
import ChatWindow from '@/components/message/ChatWindow';
import type { Conversation } from '@/services/conversation.service';
import { getConversations } from '@/services/conversation.service';

export default function MessagesPage() {
    const searchParams = useSearchParams();
    const conversationIdFromUrl = searchParams.get('conversation');
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    // Load conversations và tự động chọn conversation từ URL
    useEffect(() => {
        const fetchAndSelectConversation = async () => {
            try {
                setLoading(true);
                const data = await getConversations();
                const sorted = data.sort((a, b) => {
                    const dateA = new Date(a.updatedAt).getTime();
                    const dateB = new Date(b.updatedAt).getTime();
                    return dateB - dateA;
                });
                setConversations(sorted);

                // Nếu có conversationId từ URL, tìm và chọn conversation đó
                if (conversationIdFromUrl) {
                    const found = sorted.find(c => c._id === conversationIdFromUrl);
                    if (found) {
                        setSelectedConversation(found);
                    }
                }
            } catch (error) {
                console.error('Error fetching conversations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAndSelectConversation();
    }, [conversationIdFromUrl]);

    return (
        <ProtectedRoute>
            <div className="bg-gray-50">
                <div className="flex h-[calc(100vh-73px)]">
                    {/* Left Sidebar - Conversation List */}
                    <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
                        <ConversationList 
                            selectedConversationId={selectedConversation?._id ?? null}
                            onSelectConversation={setSelectedConversation}
                            initialConversations={conversations}
                            loading={loading}
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

