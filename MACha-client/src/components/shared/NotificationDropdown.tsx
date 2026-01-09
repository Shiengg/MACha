'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { getNotifications, Notification, markAllAsRead } from '@/services/notification.service';
import PostModal from './PostModal';

export default function NotificationDropdown() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  // Load notifications từ database khi component mount
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const data = await getNotifications();
        setNotifications(data);

        // Đếm số unread
        const unread = data.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [isAuthenticated]);

  // Lắng nghe notification mới từ Socket.IO
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('new-notification', (notification: Notification) => {
      console.log('🔔 New notification received:', notification);

      // Check xem notification đã tồn tại chưa (tránh duplicate)
      setNotifications(prev => {
        const exists = prev.some(n => n._id === notification._id);
        if (exists) return prev;
        return [notification, ...prev];
      });

      setUnreadCount(prev => prev + 1);

      // Play sound (optional)
      playNotificationSound();
    });

    return () => {
      socket.off('new-notification');
    };
  }, [socket, isConnected]);

  // Close dropdown khi click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const playNotificationSound = () => {
    // Optional: Play notification sound
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Audio play failed:', err));
  };

  const toggleDropdown = async () => {
    const nextIsOpen = !isOpen;
    setIsOpen(nextIsOpen);

    if (!isOpen && unreadCount > 0) {
      try {
        await markAllAsRead();

        setNotifications((prev) =>
          prev.map((n) => (n.is_read ? n : { ...n, is_read: true }))
        );
        setUnreadCount(0);
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;

    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return '❤️';
      case 'comment':
        return '💬';
      case 'follow':
        return '👤';
      case 'donation':
        return '💰';
      case 'campaign_approved':
        return '✅';
      case 'campaign_rejected':
        return '❌';
      default:
        return '🔔';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Nếu notification có liên quan đến campaign, redirect đến campaign
    if (notification.campaign && notification.campaign._id) {
      router.push(`/campaigns/${notification.campaign._id}`);
      setIsOpen(false); // Đóng dropdown
      return;
    }
    
    // Nếu notification có liên quan đến event, redirect đến event
    if (notification.event && notification.event._id) {
      router.push(`/events/${notification.event._id}`);
      setIsOpen(false); // Đóng dropdown
      return;
    }
    
    // Nếu notification có liên quan đến post, mở modal
    if (notification.post && notification.post._id) {
      setSelectedPostId(notification.post._id);
      setIsPostModalOpen(true);
      setIsOpen(false); // Đóng dropdown
    }
    // TODO: Handle other notification types (follow, etc.)
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={toggleDropdown}
        className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all flex-shrink-0"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-3rem)] sm:w-96 max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Thông báo
            </h3>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-2"></div>
                <p>Đang tải...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Chưa có thông báo nào</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 transition-colors ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                  >
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                          {notification.sender?.avatar ? (
                            <Image
                              src={notification.sender.avatar}
                              alt={notification.sender.username || 'User'}
                              width={48}
                              height={48}
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-semibold text-lg">
                              {notification.sender?.username?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                        </div>

                        {/* Type Icon Badge - Nằm góc trên bên phải */}
                        <div className="absolute -top-1 -right-1 w-7 h-7 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-base border-2 border-white dark:border-gray-800 shadow-sm">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {/* Với campaign_approved/rejected, chỉ hiển thị message */}
                          {notification.type === 'campaign_approved' || notification.type === 'campaign_rejected' ? (
                            <span className="text-gray-700 dark:text-gray-300">
                              {notification.message}
                            </span>
                          ) : (
                            <>
                              <span className="font-semibold">{notification.sender?.username || 'Unknown User'}</span>
                              {' '}
                              <span className="text-gray-700 dark:text-gray-300">
                                {notification.message}
                              </span>
                            </>
                          )}
                        </p>

                        {/* Post Preview */}
                        {notification.post && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                            "{notification.post.content_text}"
                          </p>
                        )}

                        {/* Campaign Preview */}
                        {notification.campaign && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                            "{notification.campaign.title}"
                          </p>
                        )}

                        {/* Event Preview */}
                        {notification.event && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                            "{notification.event.title}"
                          </p>
                        )}

                        {/* Time */}
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>

                      {/* Unread Dot */}
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Xem tất cả thông báo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Post Modal */}
      {selectedPostId && (
        <PostModal
          postId={selectedPostId}
          isOpen={isPostModalOpen}
          onClose={() => {
            setIsPostModalOpen(false);
            setSelectedPostId(null);
          }}
        />
      )}
    </div>
  );
}
