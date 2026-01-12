import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { notificationService } from '../../services/notification.service';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { postService } from '../../services/post.service';
import PostCard from '../../components/post/PostCard';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Vừa xong';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;

  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'like':
      return 'heart';
    case 'comment':
      return 'comment';
    case 'follow':
      return 'account-plus';
    case 'donation':
      return 'cash';
    case 'campaign_approved':
      return 'check-circle';
    case 'campaign_rejected':
      return 'close-circle';
    default:
      return 'bell';
  }
};

const getNotificationIconColor = (type) => {
  switch (type) {
    case 'like':
      return '#EF4444';
    case 'comment':
      return '#3B82F6';
    case 'follow':
      return '#10B981';
    case 'donation':
      return '#F59E0B';
    case 'campaign_approved':
      return '#10B981';
    case 'campaign_rejected':
      return '#EF4444';
    default:
      return '#6B7280';
  }
};

export default function NotificationScreen() {
  const navigation = useNavigation();
  const { socket, isConnected } = useSocket();
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      Alert.alert('Lỗi', 'Không thể tải thông báo. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Lắng nghe notification mới từ Socket.IO
  useEffect(() => {
    if (!socket || !isConnected || !isAuthenticated) return;

    const handleNewNotification = (notification) => {
      console.log('🔔 New notification received:', notification);

      // Check xem notification đã tồn tại chưa (tránh duplicate)
      setNotifications((prev) => {
        const exists = prev.some((n) => n._id === notification._id);
        if (exists) return prev;
        return [notification, ...prev];
      });
    };

    socket.on('new-notification', handleNewNotification);

    return () => {
      socket.off('new-notification', handleNewNotification);
    };
  }, [socket, isConnected, isAuthenticated]);

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllAsRead(true);
      await notificationService.markAllAsRead();

      setNotifications((prev) =>
        prev.map((n) => (n.is_read ? n : { ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      Alert.alert('Lỗi', 'Không thể đánh dấu tất cả là đã đọc. Vui lòng thử lại sau.');
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  const handleNotificationPress = async (notification) => {
    // Đánh dấu là đã đọc nếu chưa đọc
    if (!notification.is_read) {
      try {
        await notificationService.markAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notification._id ? { ...n, is_read: true } : n
          )
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Nếu notification có liên quan đến campaign, redirect đến campaign
    if (notification.campaign && notification.campaign._id) {
      navigation.navigate('CampaignDetail', { campaignId: notification.campaign._id });
      return;
    }

    // Nếu notification có liên quan đến event, redirect đến event
    if (notification.event && notification.event._id) {
      navigation.navigate('EventDetail', { eventId: notification.event._id });
      return;
    }

    // Nếu notification có liên quan đến post, mở modal
    if (notification.post && notification.post._id) {
      try {
        const post = await postService.getPostById(notification.post._id);
        setSelectedPost(post);
        setShowPostModal(true);
      } catch (error) {
        console.error('Failed to load post:', error);
        Alert.alert('Lỗi', 'Không thể tải bài viết. Vui lòng thử lại sau.');
      }
    }
    // TODO: Handle other notification types (follow, etc.)
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const renderNotificationItem = ({ item: notification }) => {
    const iconName = getNotificationIcon(notification.type);
    const iconColor = getNotificationIconColor(notification.type);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !notification.is_read && styles.notificationItemUnread,
        ]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              {notification.sender?.avatar ? (
                <Image
                  source={{ uri: notification.sender.avatar }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {notification.sender?.username?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>

            {/* Type Icon Badge */}
            <View style={[styles.typeIconBadge, { backgroundColor: iconColor }]}>
              <MaterialCommunityIcons name={iconName} size={14} color="#FFFFFF" />
            </View>
          </View>

          {/* Content */}
          <View style={styles.notificationTextContainer}>
            <Text style={styles.notificationText}>
              {/* Với campaign_approved/rejected, chỉ hiển thị message */}
              {notification.type === 'campaign_approved' ||
              notification.type === 'campaign_rejected' ? (
                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>
              ) : (
                <>
                  <Text style={styles.notificationSender}>
                    {notification.sender?.username || 'Unknown User'}
                  </Text>
                  {' '}
                  <Text style={styles.notificationMessage}>
                    {notification.message}
                  </Text>
                </>
              )}
            </Text>

            {/* Post Preview */}
            {notification.post && (
              <Text style={styles.previewText} numberOfLines={1}>
                "{notification.post.content_text}"
              </Text>
            )}

            {/* Campaign Preview */}
            {notification.campaign && (
              <Text style={styles.previewText} numberOfLines={1}>
                "{notification.campaign.title}"
              </Text>
            )}

            {/* Event Preview */}
            {notification.event && (
              <Text style={styles.previewText} numberOfLines={1}>
                "{notification.event.title}"
              </Text>
            )}

            {/* Time */}
            <Text style={styles.timeText}>
              {formatTimeAgo(notification.createdAt)}
            </Text>
          </View>

          {/* Unread Dot */}
          {!notification.is_read && (
            <View style={styles.unreadDot} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="bell-outline"
        size={64}
        color="#D1D5DB"
      />
      <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
    </View>
  );

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thông báo</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải thông báo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={styles.markAllButton}
            disabled={markingAllAsRead}
          >
            {markingAllAsRead ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text style={styles.markAllText}>Đánh dấu đã xem</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderNotificationItem}
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyListContainer : styles.listContainer
        }
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Post Modal */}
      <Modal
        visible={showPostModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPostModal(false);
          setSelectedPost(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bài viết</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPostModal(false);
                  setSelectedPost(null);
                }}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            {selectedPost && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <PostCard post={selectedPost} navigation={navigation} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: scale(4),
  },
  headerTitle: {
    flex: 1,
    marginLeft: scale(8),
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#111827',
  },
  markAllButton: {
    paddingVertical: scale(4),
    paddingHorizontal: scale(8),
  },
  markAllText: {
    fontSize: moderateScale(13),
    color: '#2563EB',
    fontWeight: '500',
  },
  placeholder: {
    width: scale(100),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  listContainer: {
    paddingVertical: scale(8),
  },
  emptyListContainer: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notificationItemUnread: {
    backgroundColor: '#EFF6FF',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: scale(12),
  },
  avatarWrapper: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D1D5DB',
  },
  avatarText: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#6B7280',
  },
  typeIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  notificationText: {
    fontSize: moderateScale(14),
    color: '#111827',
    lineHeight: moderateScale(20),
  },
  notificationSender: {
    fontWeight: '600',
    color: '#111827',
  },
  notificationMessage: {
    color: '#374151',
  },
  previewText: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    marginTop: scale(4),
    fontStyle: 'italic',
  },
  timeText: {
    fontSize: moderateScale(12),
    color: '#2563EB',
    marginTop: scale(4),
    fontWeight: '500',
  },
  unreadDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#2563EB',
    marginTop: scale(8),
    marginLeft: scale(8),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(32),
  },
  emptyText: {
    marginTop: scale(16),
    fontSize: moderateScale(16),
    color: '#6B7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: '90%',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    padding: scale(4),
  },
  modalBody: {
    flex: 1,
  },
});

