'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Link2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getConversations, createConversationPrivate, type Conversation } from '@/services/conversation.service';
import { sendMessage } from '@/services/message.service';
import { useAuth } from '@/contexts/AuthContext';

interface ShareModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ postId, isOpen, onClose }: ShareModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [sharingToUserId, setSharingToUserId] = useState<string | null>(null);

  const currentUserId = user?._id || user?.id;

  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        const data = await getConversations();
        setConversations(data);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
    setSearchQuery(''); // Reset search when modal opens
    setSharingToUserId(null); // Reset sharing state when modal opens
  }, [isOpen, currentUserId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Get unique users from conversations
  const getUniqueUsers = () => {
    const userMap = new Map();
    
    conversations.forEach((conversation) => {
      conversation.members.forEach((member) => {
        if (member._id !== currentUserId && !userMap.has(member._id)) {
          userMap.set(member._id, member);
        }
      });
    });

    return Array.from(userMap.values());
  };

  const allUsers = getUniqueUsers();

  // Filter users by search query
  const filteredUsers = allUsers.filter((user) => {
    if (!searchQuery.trim()) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.fullname?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  const handleCopyLink = async () => {
    try {
      // Construct post URL - adjust this path based on your routing structure
      const postUrl = `${window.location.origin}/posts/${postId}`;
      
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Error copying link:', error);
      alert('Không thể sao chép liên kết. Vui lòng thử lại.');
    }
  };

  const handleShareToUser = async (targetUserId: string) => {
    if (!currentUserId || sharingToUserId) return;

    try {
      setSharingToUserId(targetUserId);

      // Construct post URL
      const postUrl = `${window.location.origin}/posts/${postId}`;

      // Tìm conversation hiện tại với user này
      let conversation = conversations.find(conv => 
        conv.members.some(m => m._id === targetUserId) && 
        conv.members.some(m => m._id === currentUserId)
      );

      // Nếu chưa có conversation, tạo mới
      if (!conversation) {
        conversation = await createConversationPrivate(targetUserId);
      }

      // Gửi message với link bài viết
      await sendMessage(conversation._id, {
        content: postUrl,
        type: 'text',
      });

      // Đóng modal và navigate đến messages page
      onClose();
      router.push(`/messages?conversation=${conversation._id}`);
    } catch (error: any) {
      console.error('Error sharing post:', error);
      alert(error?.response?.data?.message || 'Không thể chia sẻ bài viết. Vui lòng thử lại.');
      setSharingToUserId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="w-9 h-9 flex items-center justify-center">
            {/* Placeholder for search icon - will be functional later */}
            <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Chia sẻ đến
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Search Input */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white dark:focus:bg-gray-600 transition-all text-gray-900 dark:text-white"
              />
            </div>
          </div>
          {/* Users List - First Row */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="mb-4">
              <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                {filteredUsers.map((userItem) => {
                  const isSharing = sharingToUserId === userItem._id;
                  return (
                    <button
                      key={userItem._id}
                      onClick={() => handleShareToUser(userItem._id)}
                      disabled={isSharing || !!sharingToUserId}
                      className="flex flex-col items-center gap-2 flex-shrink-0 min-w-[70px] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                      <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                        {isSharing ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : userItem.avatar ? (
                          <Image
                            src={userItem.avatar}
                            alt={userItem.username || 'User'}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          (userItem.fullname || userItem.username || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-xs text-gray-700 dark:text-gray-300 text-center truncate w-full">
                        {userItem.fullname || userItem.username || 'User'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {searchQuery ? 'Không tìm thấy người dùng nào' : 'Chưa có cuộc trò chuyện nào'}
              </p>
            </div>
          )}

          {/* Divider */}
          {filteredUsers.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 my-4" />
          )}

          {/* Action Buttons - Second Row */}
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
            {/* Copy Link Button */}
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-2 flex-shrink-0 min-w-[80px] p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center">
                <Link2 className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs text-gray-700 dark:text-gray-300 text-center">
                {copied ? 'Đã sao chép!' : 'Sao chép liên kết'}
              </span>
            </button>

            {/* Placeholder for future share options */}
            {/* Add more share buttons here in the future */}
          </div>
        </div>
      </div>
    </div>
  );
}

