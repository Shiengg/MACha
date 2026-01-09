'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import ConversationList from '@/components/message/ConversationList';
import ChatWindow from '@/components/message/ChatWindow';
import ConversationInfo from '@/components/message/ConversationInfo';
import type { Conversation } from '@/services/conversation.service';
import { getConversations } from '@/services/conversation.service';

function MessagesPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const conversationIdFromUrl = searchParams.get('conversation');
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInfoPanel, setShowInfoPanel] = useState(false);

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
                    } else {
                        // Nếu không tìm thấy conversation trong URL, clear selection
                        setSelectedConversation(null);
                    }
                } else {
                    // Nếu không có conversationId trong URL, clear selection
                    setSelectedConversation(null);
                }
            } catch (error) {
                console.error('Error fetching conversations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAndSelectConversation();
    }, [conversationIdFromUrl]);

    const handleSelectConversation = (conversation: Conversation) => {
        setSelectedConversation(conversation);
        router.push(`/messages?conversation=${conversation._id}`);
    };

    const handleBackToList = () => {
        setSelectedConversation(null);
        router.push('/messages');
        setShowInfoPanel(false);
    };

    return (
        <div className="bg-gray-50 md:bg-gray-300">
            <div className="flex h-[calc(100vh-73px)] md:h-[calc(100vh-73px)] relative">
                {/* Left Sidebar - Conversation List */}
                <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-gray-200 bg-white flex flex-col`}>
                    <ConversationList 
                        selectedConversationId={selectedConversation?._id ?? null}
                        onSelectConversation={handleSelectConversation}
                        initialConversations={conversations}
                        loading={loading}
                    />
                </div>

                {/* Center - Chat Window */}
                {selectedConversation && (
                    <div className="flex-1 flex flex-col bg-white md:my-4 md:ml-4 md:mr-2 md:rounded-lg overflow-hidden md:shadow-sm absolute md:relative inset-0 md:inset-auto z-10">
                        <ChatWindow 
                            conversation={selectedConversation} 
                            onToggleInfoPanel={() => setShowInfoPanel(!showInfoPanel)}
                            onBackToList={handleBackToList}
                        />
                    </div>
                )}

                {/* Info Panel - Desktop: Sidebar, Mobile: Modal */}
                {showInfoPanel && selectedConversation && (
                    <>
                        {/* Desktop: Sidebar */}
                        <div className="hidden lg:flex w-80 border-l border-gray-200 bg-white flex flex-col my-4 mr-4 ml-2 rounded-lg shadow-sm">
                            <ConversationInfo 
                                conversation={selectedConversation}
                                conversationId={selectedConversation?._id ?? null}
                                onClose={() => setShowInfoPanel(false)}
                            />
                        </div>
                        
                        {/* Mobile: Full Screen Panel */}
                        <div className="lg:hidden fixed inset-0 bg-white z-[60] overflow-y-auto">
                            <ConversationInfo 
                                conversation={selectedConversation}
                                conversationId={selectedConversation?._id ?? null}
                                onClose={() => setShowInfoPanel(false)}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={
                <div className="bg-gray-300 flex items-center justify-center h-[calc(100vh-73px)]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            }>
                <MessagesPageContent />
            </Suspense>
        </ProtectedRoute>
    );
}

