import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useSocket } from '../../contexts/SocketContext';
import { notificationService } from '../../services/notification.service';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function Header() {
  const { isAuthenticated, loading } = useAuth();
  const navigation = useNavigation();
  const { socket, isConnected } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread count khi component mount hoặc khi authenticated
  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const notifications = await notificationService.getNotifications();
      const unread = notifications.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  }, [isAuthenticated]);

  // Load unread count khi mount hoặc khi authenticated thay đổi
  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  // Reload unread count khi quay lại từ NotificationScreen
  useEffect(() => {
    if (!navigation) return;

    // Lắng nghe khi navigation state thay đổi
    const unsubscribe = navigation.addListener('state', (e) => {
      // Reload unread count khi quay lại từ NotificationScreen
      try {
        const state = navigation.getState();
        if (state) {
          // Lấy route hiện tại từ navigation state
          const routes = state.routes || [];
          const currentRoute = routes[state.index];
          
          // Nếu không phải đang ở NotificationScreen, reload unread count
          if (currentRoute && currentRoute.name !== 'Notifications') {
            // Delay một chút để đảm bảo NotificationScreen đã cập nhật xong
            setTimeout(() => {
              loadUnreadCount();
            }, 300);
          }
        }
      } catch (error) {
        console.error('Error getting navigation state:', error);
      }
    });

    return unsubscribe;
  }, [navigation, loadUnreadCount]);

  // Lắng nghe notification mới từ Socket.IO
  useEffect(() => {
    if (!socket || !isConnected || !isAuthenticated) return;

    const handleNewNotification = (notification) => {
      console.log('🔔 New notification received in Header:', notification);
      // Increment unread count only if notification is not read
      if (!notification.is_read) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    socket.on('new-notification', handleNewNotification);

    return () => {
      socket.off('new-notification', handleNewNotification);
    };
  }, [socket, isConnected, isAuthenticated]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingPlaceholder} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <TouchableOpacity
          onPress={() => {
            if (navigation) {
              navigation.navigate('Feed');
            }
          }}
          style={styles.logoContainer}
        >
          <Text style={styles.logoText}>MACha</Text>
        </TouchableOpacity>

        {/* Right side buttons */}
        <View style={styles.rightButtons}>
          {/* Search Icon */}
          <TouchableOpacity
            onPress={() => {
              if (navigation) {
                navigation.navigate('Search');
              }
            }}
            style={styles.iconButton}
          >
            <MaterialCommunityIcons name="magnify" size={24} color="#374151" />
          </TouchableOpacity>

          {/* Messages */}
          <TouchableOpacity
            onPress={() => {
              if (navigation) {
                navigation.navigate('Messages');
              }
            }}
            style={styles.iconButton}
          >
            <MaterialCommunityIcons name="message-outline" size={24} color="#374151" />
          </TouchableOpacity>

          {/* Notifications */}
          <TouchableOpacity
            onPress={() => {
              if (navigation) {
                navigation.navigate('Notifications');
              }
            }}
            style={styles.iconButton}
          >
            <View style={styles.notificationIconContainer}>
              <MaterialCommunityIcons name="bell-outline" size={24} color="#374151" />
              {/* Unread Badge */}
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(8),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
  },
  loadingContainer: {
    height: verticalScale(50),
    justifyContent: 'center',
    paddingHorizontal: scale(16),
  },
  loadingPlaceholder: {
    height: scale(30),
    backgroundColor: '#E5E7EB',
    borderRadius: scale(8),
  },
  logoContainer: {
    flex: 1,
  },
  logoText: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#10B981',
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  iconButton: {
    padding: scale(8),
  },
  notificationIconContainer: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(4),
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: '80%',
    marginTop: 'auto',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#111827',
  },
  menuCloseButton: {
    padding: scale(4),
  },
  menuItems: {
    padding: scale(16),
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: scale(16),
    marginBottom: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  userAvatar: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  userAvatarText: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#6B7280',
  },
  userName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginTop: scale(2),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(4),
    borderRadius: scale(8),
    marginBottom: scale(4),
  },
  menuItemText: {
    fontSize: moderateScale(16),
    color: '#374151',
    marginLeft: scale(12),
  },
  createCampaignText: {
    color: '#10B981',
    fontWeight: '500',
  },
  logoutText: {
    color: '#EF4444',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: scale(12),
  },
  loginButton: {
    backgroundColor: '#10B981',
    paddingVertical: scale(14),
    borderRadius: scale(8),
    alignItems: 'center',
    marginTop: scale(8),
  },
  loginButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

