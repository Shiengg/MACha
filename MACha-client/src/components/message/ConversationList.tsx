'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search, MessageCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getConversations, type Conversation } from '@/services/conversation.service';

interface ConversationListProps {
    selectedConversationId: string | null;
    onSelectConversation: (conversation: Conversation) => void;
}

export default function ConversationList({ 
    selectedConversationId, 
    onSelectConversation 
}: ConversationListProps) {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const currentUserId = user?._id || user?.id;

    useEffect(() => {
        const fetchConversations = async () => {
            if (!currentUserId) return;

            try {
                setLoading(true);
                setError(null);
                const data = await getConversations();
                
                const sortedData = data.sort((a, b) => {
                    const dateA = new Date(a.updatedAt).getTime();
                    const dateB = new Date(b.updatedAt).getTime();
                    return dateB - dateA;
                });
                setConversations(sortedData);
            } catch (err: any) {
                console.error('Error fetching conversations:', err);
                setError(err?.response?.data?.message || 'Không thể tải danh sách cuộc trò chuyện');
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();
    }, [currentUserId]);

    const getOtherParticipant = (members: Conversation['members'], currentUserId: string | undefined) => {
        if (!currentUserId) return members[0];
        return members.find(p => p._id !== currentUserId) || members[0];
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 168) {
            return date.toLocaleDateString('vi-VN', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        }
    };

    // Filter conversations by search query
    const filteredConversations = conversations.filter((conversation) => {
        if (!searchQuery.trim()) return true;
        
        const otherParticipant = getOtherParticipant(conversation.members, currentUserId);
        const searchLower = searchQuery.toLowerCase();
        
        return (
            otherParticipant.username?.toLowerCase().includes(searchLower) ||
            otherParticipant.email?.toLowerCase().includes(searchLower) ||
            conversation.lastMessage?.content.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Tin nhắn</h2>
                
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm cuộc trò chuyện..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all"
                    />
                </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                        <p className="text-gray-500 text-sm">Đang tải...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                        <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-red-500 font-medium mb-2">Lỗi</p>
                        <p className="text-gray-400 text-sm">{error}</p>
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                        <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-gray-500 font-medium">
                            {searchQuery ? 'Không tìm thấy cuộc trò chuyện nào' : 'Chưa có cuộc trò chuyện nào'}
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                            {searchQuery 
                                ? 'Thử tìm kiếm với từ khóa khác' 
                                : 'Bắt đầu trò chuyện với bạn bè của bạn'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredConversations.map((conversation) => {
                            const otherParticipant = getOtherParticipant(
                                conversation.members,
                                currentUserId
                            );
                            const isSelected = selectedConversationId === conversation._id;

                            return (
                                <button
                                    key={conversation._id}
                                    onClick={() => onSelectConversation(conversation)}
                                    className={`w-full p-4 hover:bg-gray-50 transition-colors text-left ${
                                        isSelected ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Avatar */}
                                        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex-shrink-0 flex items-center justify-center text-white font-semibold overflow-hidden">
                                            {otherParticipant.avatar ? (
                                                <Image
                                                    src={otherParticipant.avatar}
                                                    alt={otherParticipant.username}
                                                    fill
                                                    sizes="48px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                otherParticipant.username?.charAt(0).toUpperCase() || 'U'
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="font-semibold text-gray-800 truncate">
                                                    {otherParticipant.username}
                                                </h3>
                                                {conversation.lastMessage && (
                                                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                                        {formatTime(conversation.lastMessage.createdAt)}
                                                    </span>
                                                )}
                                            </div>
                                            {conversation.lastMessage && (
                                                <p className="text-sm text-gray-600 truncate">
                                                    {conversation.lastMessage.content}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

