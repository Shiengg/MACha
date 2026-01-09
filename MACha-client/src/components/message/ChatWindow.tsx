'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Loader2, Info, X, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useOnlineStatus } from '@/contexts/OnlineStatusContext';
import { getMessages, sendMessage, type Message } from '@/services/message.service';
import type { Conversation } from '@/services/conversation.service';
import { cloudinaryService } from '@/services/cloudinary.service';

interface ChatWindowProps {
    conversation: Conversation | null;
    onToggleInfoPanel?: () => void;
    onBackToList?: () => void;
}

export default function ChatWindow({ conversation, onToggleInfoPanel, onBackToList }: ChatWindowProps) {
    const { user } = useAuth();
    const { socket } = useSocket();
    const { isUserOnline } = useOnlineStatus();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
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

    // Handle tooltip delay when hoveredMessageId changes
    useEffect(() => {
        if (hoveredMessageId) {
            setShowTooltip(false);
            // Clear existing timeout
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
            // Set timeout to show tooltip after 1 second
            hoverTimeoutRef.current = setTimeout(() => {
                setShowTooltip(true);
            }, 1000);
        } else {
            setShowTooltip(false);
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
            }
        }

        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, [hoveredMessageId]);

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

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Chỉ chấp nhận file ảnh');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('File ảnh quá lớn (tối đa 5MB)');
            return;
        }

        setSelectedImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        setError(null);
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                
                const file = item.getAsFile();
                if (!file) return;

                if (!file.type.startsWith('image/')) {
                    setError('Chỉ chấp nhận file ảnh');
                    return;
                }

                if (file.size > 5 * 1024 * 1024) {
                    setError('File ảnh quá lớn (tối đa 5MB)');
                    return;
                }

                setSelectedImage(file);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreview(reader.result as string);
                };
                reader.readAsDataURL(file);
                setError(null);
                break;
            }
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = message.trim();

        if (!trimmed && !selectedImage) {
            return;
        }

        if (!conversationId || !currentUserId || sending || uploadingImage) {
            return;
        }

        try {
            setSending(true);
            setError(null);

            let content = trimmed;
            let type: 'text' | 'image' = 'text';

            if (selectedImage) {
                setUploadingImage(true);
                try {
                    const uploadResult = await cloudinaryService.uploadImage(selectedImage, 'messages');
                    content = uploadResult.secure_url;
                    type = 'image';
                } catch (uploadErr: any) {
                    console.error('Error uploading image:', uploadErr);
                    setError('Không thể tải ảnh lên. Vui lòng thử lại.');
                    setUploadingImage(false);
                    setSending(false);
                    return;
                }
                setUploadingImage(false);
            }

            const newMessage = await sendMessage(conversationId, {
                content,
                type,
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
            handleRemoveImage();
        } catch (err: any) {
            console.error('Error sending message:', err);
            setError(err?.response?.data?.message || 'Không thể gửi tin nhắn');
        } finally {
            setSending(false);
            setUploadingImage(false);
        }
    };

    const formatMessageTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatMessageTimeWithDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        
        // Check if same day
        const isSameDay = 
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();
        
        const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        
        if (isSameDay) {
            return timeStr;
        } else {
            const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            return `${timeStr} ${dateStr}`;
        }
    };

    const renderMessageContent = (content: string) => {
        // Regex to match URLs (http, https, or www)
        const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
        const parts: Array<{ text: string; isUrl: boolean }> = [];
        let lastIndex = 0;
        let match;
        let hasUrl = false;
        
        urlRegex.lastIndex = 0;
        
        while ((match = urlRegex.exec(content)) !== null) {
            hasUrl = true;
            if (match.index > lastIndex) {
                parts.push({ text: content.substring(lastIndex, match.index), isUrl: false });
            }
            parts.push({ text: match[0], isUrl: true });
            lastIndex = urlRegex.lastIndex;
        }
        
        if (!hasUrl) {
            return <>{content}</>;
        }
        
        if (lastIndex < content.length) {
            parts.push({ text: content.substring(lastIndex), isUrl: false });
        }
        
        return (
            <>
                {parts.map((part, index) => {
                    if (part.isUrl) {
                        const href = part.text.startsWith('www.') ? `http://${part.text}` : part.text;
                        return (
                            <a
                                key={index}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:opacity-80 break-all"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {part.text}
                            </a>
                        );
                    }
                    return <span key={index}>{part.text}</span>;
                })}
            </>
        );
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
            <div className="p-3 sm:p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        {/* Back Button - Mobile Only */}
                        {onBackToList && (
                            <button
                                onClick={onBackToList}
                                className="md:hidden flex-shrink-0 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                                aria-label="Back to conversation list"
                            >
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        {(() => {
                            const otherParticipant = getOtherParticipant(conversation.members, currentUserId);
                            const isOnline = otherParticipant._id && isUserOnline(otherParticipant._id);
                            return (
                                <>
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-semibold overflow-hidden">
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
                                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                                            {otherParticipant.fullname || otherParticipant.username || 'Người dùng'}
                                        </h3>
                                        <p className="text-xs text-gray-500 truncate">
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
                            className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center text-white transition-colors touch-manipulation"
                            style={{ touchAction: 'manipulation' }}
                            aria-label="Toggle info panel"
                        >
                            <span className="text-xs sm:text-sm font-semibold">i</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-gray-50 space-y-2 relative">
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
                                    onMouseEnter={() => setHoveredMessageId(msg._id)}
                                    onMouseLeave={() => setHoveredMessageId(null)}
                                >
                                    <div className="max-w-[85%] sm:max-w-[70%] flex flex-row-reverse gap-1.5 sm:gap-2 relative">
                                        <div className="flex flex-col relative">
                                            <div
                                                className={`${msg.type === 'image' ? 'p-1' : 'px-3 py-1.5 sm:px-4 sm:py-2'} ${bubbleBaseClasses} ${bubbleShapeClasses}`}
                                            >
                                                {msg.type === 'image' ? (
                                                    <div className="relative rounded-lg overflow-hidden max-w-xs sm:max-w-sm">
                                                        <Image
                                                            src={msg.content}
                                                            alt="Message image"
                                                            width={400}
                                                            height={400}
                                                            className="object-contain max-h-64 sm:max-h-96 w-auto"
                                                            unoptimized
                                                        />
                                                    </div>
                                                ) : (
                                                    <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                                                        {renderMessageContent(msg.content)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {hoveredMessageId === msg._id && showTooltip && (
                                            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap z-50 pointer-events-none transition-opacity duration-200 ease-in-out opacity-100">
                                                {formatMessageTimeWithDate(msg.createdAt)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div 
                                key={msg._id} 
                                className="flex justify-start"
                                onMouseEnter={() => {
                                    const messageId = msg._id;
                                    setHoveredMessageId(messageId);
                                    setShowTooltip(false);
                                    // Clear existing timeout
                                    if (hoverTimeoutRef.current) {
                                        clearTimeout(hoverTimeoutRef.current);
                                    }
                                    // Set timeout to show tooltip after 1 second
                                    hoverTimeoutRef.current = setTimeout(() => {
                                        setShowTooltip(true);
                                    }, 1000);
                                }}
                                onMouseLeave={() => {
                                    setHoveredMessageId(null);
                                    setShowTooltip(false);
                                    if (hoverTimeoutRef.current) {
                                        clearTimeout(hoverTimeoutRef.current);
                                        hoverTimeoutRef.current = null;
                                    }
                                }}
                            >
                                <div className="relative max-w-[85%] sm:max-w-[70%]">
                                    {/* Cột bubble, luôn thẳng hàng, chừa chỗ avatar bên trái */}
                                    <div className="ml-8 sm:ml-10 flex flex-col relative group">
                                        <div
                                            className={`${msg.type === 'image' ? 'p-1' : 'px-3 py-1.5 sm:px-4 sm:py-2'} ${bubbleBaseClasses} ${bubbleShapeClasses}`}
                                        >
                                            {msg.type === 'image' ? (
                                                <div className="relative rounded-lg overflow-hidden max-w-xs sm:max-w-sm">
                                                    <Image
                                                        src={msg.content}
                                                        alt="Message image"
                                                        width={400}
                                                        height={400}
                                                        className="object-contain max-h-64 sm:max-h-96 w-auto"
                                                        unoptimized
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                                                    {renderMessageContent(msg.content)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {hoveredMessageId === msg._id && showTooltip && (
                                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap z-50 pointer-events-none transition-opacity duration-200 ease-in-out opacity-100">
                                            {formatMessageTimeWithDate(msg.createdAt)}
                                        </div>
                                    )}

                                    {/* Avatar chỉ hiện cho tin cuối nhóm, đặt absolute để không làm lệch bubble */}
                                    {isLastOfGroup && (
                                        <div className="absolute left-0 bottom-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs overflow-hidden">
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

            {/* Image Preview */}
            {imagePreview && (
                <div className="px-3 sm:px-4 pt-2 bg-gray-50">
                    <div className="relative inline-block">
                        <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border-2 border-orange-500">
                            <Image
                                src={imagePreview}
                                alt="Preview"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors touch-manipulation"
                            style={{ touchAction: 'manipulation' }}
                        >
                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Message Input */}
            <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 bg-gray-50 border-t border-gray-200">
                <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 sm:gap-2">
                    {/* Image Upload Button */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage || sending}
                        className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                        style={{ touchAction: 'manipulation' }}
                        aria-label="Attach image"
                    >
                        {uploadingImage ? (
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        ) : (
                            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                    </button>

                    {/* Message Input - Bo tròn 2 đầu */}
                    <div className="flex-1 relative flex items-end">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onPaste={handlePaste}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            placeholder={sending || uploadingImage ? "Đang gửi..." : "Nhập tin nhắn..."}
                            rows={1}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-all text-sm sm:text-base self-end"
                            style={{
                                maxHeight: '120px',
                                minHeight: '44px',
                            }}
                        />
                    </div>

                    {/* Send Button */}
                    <button
                        type="submit"
                        disabled={(!message.trim() && !selectedImage) || sending || uploadingImage}
                        className="flex-shrink-0 p-2 sm:p-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                        style={{ touchAction: 'manipulation' }}
                        aria-label="Send message"
                    >
                        {sending || uploadingImage ? (
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

