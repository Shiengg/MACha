'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Loader2, Info } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useOnlineStatus } from '@/contexts/OnlineStatusContext';
import { getMessages, sendMessage, type Message } from '@/services/message.service';
import type { Conversation } from '@/services/conversation.service';

interface ChatWindowProps {
    conversation: Conversation | null;
    onToggleInfoPanel?: () => void;
}

export default function ChatWindow({ conversation, onToggleInfoPanel }: ChatWindowProps) {
    const { user } = useAuth();
    const { socket } = useSocket();
    const { isUserOnline } = useOnlineStatus();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    // Lưu các messageId vừa gửi để tránh add 2 lần (REST + Socket)
    const sentMessageIdsRef = useRef<Set<string>>(new Set());

    const currentUserId = user?._id || user?.id;
    const conversationId = conversation?._id ?? null;

    const getOtherParticipant = (
        members: Conversation['members'] | undefined,
        currentUserId: string | undefined
    ) => {
        if (!members || members.length === 0) {
            return {
                _id: 'unknown',
                username: 'Người dùng',
                avatar: undefined,
                email: '',
            };
        }
        if (!currentUserId) return members[0];
        return members.find(m => m._id !== currentUserId) || members[0];
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Load messages khi conversationId thay đổi
    useEffect(() => {
        const fetchMessages = async () => {
            if (!conversationId) {
                setMessages([]);
                setError(null);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const data = await getMessages(conversationId, 0, 50);
                // Tin nhắn mới nhất ở cuối -> đảm bảo sort theo createdAt tăng dần
                const sorted = [...data].sort(
                    (a, b) =>
                        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
                setMessages(sorted);
            } catch (err: any) {
                console.error('Error fetching messages:', err);
                setError(err?.response?.data?.message || 'Không thể tải tin nhắn');
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, [conversationId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Listen for realtime messages from Socket.IO
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (incoming: any) => {
            const msg = incoming?.message || incoming;
            if (!msg || !conversationId) return;
            if (msg.conversationId?.toString() !== conversationId.toString()) return;

            const idStr = String(msg._id);

            // Nếu message này mình vừa thêm từ REST thì bỏ qua event socket
            if (sentMessageIdsRef.current.has(idStr)) {
                sentMessageIdsRef.current.delete(idStr);
                return;
            }

            setMessages((prev) => {
                if (prev.some((m) => String(m._id) === idStr)) {
                    return prev;
                }
                return [...prev, msg];
            });
        };

        socket.on("chat:message:new", handleNewMessage);

        return () => {
            socket.off("chat:message:new", handleNewMessage);
        };
    }, [socket, conversationId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = message.trim();

        if (!trimmed || !conversationId || !currentUserId || sending) {
            return;
        }

        try {
            setSending(true);
            setError(null);

            const newMessage = await sendMessage(conversationId, {
                content: trimmed,
                type: 'text',
            });

            const idStr = String(newMessage._id);

            setMessages((prev) => {
                if (prev.some((m) => String(m._id) === idStr)) {
                    return prev;
                }
                return [...prev, newMessage];
            });
            sentMessageIdsRef.current.add(idStr);
            setMessage('');
        } catch (err: any) {
            console.error('Error sending message:', err);
            setError(err?.response?.data?.message || 'Không thể gửi tin nhắn');
        } finally {
            setSending(false);
        }
    };

    const formatMessageTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    if (!conversationId || !conversation) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                        <svg
                            className="w-12 h-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        Chọn một cuộc trò chuyện
                    </h3>
                    <p className="text-gray-500">
                        Bắt đầu trò chuyện với bạn bè của bạn
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        {(() => {
                            const otherParticipant = getOtherParticipant(conversation.members, currentUserId);
                            const isOnline = otherParticipant._id && isUserOnline(otherParticipant._id);
                            return (
                                <>
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                                            {otherParticipant.avatar ? (
                                                <Image
                                                    src={otherParticipant.avatar}
                                                    alt={otherParticipant.fullname || otherParticipant.username || 'User avatar'}
                                                    fill
                                                    sizes="40px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                (otherParticipant.fullname?.charAt(0).toUpperCase() || 'U')
                                            )}
                                        </div>
                                        {/* Online Status Indicator */}
                                        {isOnline && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">
                                            {otherParticipant.fullname || otherParticipant.username || 'Người dùng'}
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            {isOnline ? 'Đang hoạt động' : 'Offline'}
                                        </p>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                    {/* Info Button */}
                    {onToggleInfoPanel && (
                        <button
                            onClick={onToggleInfoPanel}
                            className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center text-white transition-colors"
                            aria-label="Toggle info panel"
                        >
                            <span className="text-sm font-semibold">i</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-2">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                            <p className="text-gray-500 text-sm">Đang tải tin nhắn...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-red-500 text-sm">{error}</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-400">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const sender =
                            typeof msg.senderId === 'string'
                                ? { _id: msg.senderId }
                                : msg.senderId || { _id: 'unknown' };

                        const senderId = sender._id;
                        const isOwnMessage = senderId && currentUserId && senderId === currentUserId;

                        const prev = index > 0 ? messages[index - 1] : null;
                        const next = index < messages.length - 1 ? messages[index + 1] : null;

                        const prevSenderId =
                            prev && (typeof prev.senderId === 'string'
                                ? prev.senderId
                                : prev.senderId?._id);
                        const nextSenderId =
                            next && (typeof next.senderId === 'string'
                                ? next.senderId
                                : next.senderId?._id);

                        const isFirstOfGroup = !prev || prevSenderId !== senderId;
                        const isLastOfGroup = !next || nextSenderId !== senderId;

                        const bubbleBaseClasses = isOwnMessage
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                            : 'bg-gray-200 text-gray-800 border border-gray-200';

                        let bubbleShapeClasses = '';

                        if (isFirstOfGroup && isLastOfGroup) {
                            bubbleShapeClasses = 'rounded-2xl';
                        } else if (isFirstOfGroup) {
                            bubbleShapeClasses = isOwnMessage
                                ? 'rounded-t-2xl rounded-bl-2xl rounded-br-none'
                                : 'rounded-t-2xl rounded-br-2xl rounded-bl-none';
                        } else if (isLastOfGroup) {
                            bubbleShapeClasses = isOwnMessage
                                ? 'rounded-b-2xl rounded-tl-2xl rounded-tr-none'
                                : 'rounded-b-2xl rounded-tr-2xl rounded-tl-none';
                        } else {
                            bubbleShapeClasses = isOwnMessage
                                ? 'rounded-l-2xl rounded-r-none'
                                : 'rounded-r-2xl rounded-l-none';
                        }

                        if (isOwnMessage) {
                            return (
                                <div
                                    key={msg._id}
                                    className="flex justify-end"
                                >
                                    <div className="max-w-[70%] flex flex-row-reverse gap-2">
                                        <div className="flex flex-col">
                                            <div
                                                className={`px-4 py-2 ${bubbleBaseClasses} ${bubbleShapeClasses}`}
                                            >
                                                <p className="text-base whitespace-pre-wrap break-words">
                                                    {msg.content}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={msg._id} className="flex justify-start">
                                <div className="relative max-w-[70%]">
                                    {/* Cột bubble, luôn thẳng hàng, chừa chỗ avatar bên trái */}
                                    <div className="ml-10 flex flex-col">
                                        <div
                                            className={`px-4 py-2 ${bubbleBaseClasses} ${bubbleShapeClasses}`}
                                        >
                                            <p className="text-base whitespace-pre-wrap break-words">
                                                {msg.content}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Avatar chỉ hiện cho tin cuối nhóm, đặt absolute để không làm lệch bubble */}
                                    {isLastOfGroup && (
                                        <div className="absolute left-0 bottom-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs overflow-hidden">
                                            {sender.avatar ? (
                                                <Image
                                                    src={sender.avatar}
                                                    alt={sender.username || 'User avatar'}
                                                    fill
                                                    sizes="32px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                (sender.username?.charAt(0).toUpperCase() || 'U')
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="px-4 pb-4 pt-2 bg-gray-50">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    {/* Attachment Button */}
                    <button
                        type="button"
                        className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Attach file"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>

                    {/* Message Input - Bo tròn 2 đầu */}
                    <div className="flex-1 relative flex items-end">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            placeholder={sending ? "Đang gửi..." : "Nhập tin nhắn..."}
                            rows={1}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-all text-sm self-end"
                            style={{
                                maxHeight: '120px',
                                minHeight: '44px',
                            }}
                        />
                    </div>

                    {/* Send Button */}
                    <button
                        type="submit"
                        disabled={!message.trim() || sending}
                        className="flex-shrink-0 p-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Send message"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}

