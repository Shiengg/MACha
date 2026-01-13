import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { conversationService } from '../../services/conversation.service';
import { messageService } from '../../services/message.service';
import { useAuth } from '../../contexts/AuthContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function ShareModal({ postId, isOpen, onClose }) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [sharingToUserId, setSharingToUserId] = useState(null);

  const currentUserId = user?._id || user?.id;

  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        const data = await conversationService.getConversations();
        setConversations(data);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
    setSearchQuery('');
    setSharingToUserId(null);
  }, [isOpen, currentUserId]);

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
  const filteredUsers = allUsers.filter((userItem) => {
    if (!searchQuery.trim()) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      userItem.username?.toLowerCase().includes(searchLower) ||
      userItem.fullname?.toLowerCase().includes(searchLower) ||
      userItem.email?.toLowerCase().includes(searchLower)
    );
  });

  const handleCopyLink = async () => {
    try {
      // Construct post URL
      // Try to get base URL from environment or use default
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://macha.app';
      // Convert API URL to frontend URL (remove /api if exists, or use as is)
      const baseUrl = apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
      const postUrl = `${baseUrl}/posts/${postId}`;

      // Use React Native Share API
      const result = await Share.share({
        message: postUrl,
        url: postUrl, // iOS
        title: 'Chia sẻ bài viết',
      });

      if (result.action === Share.sharedAction) {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error sharing link:', error);
      Alert.alert('Lỗi', 'Không thể chia sẻ liên kết. Vui lòng thử lại.');
    }
  };

  const handleShareToUser = async (targetUserId) => {
    if (!currentUserId || sharingToUserId) return;

    try {
      setSharingToUserId(targetUserId);

      // Construct post URL
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://macha.app';
      // Convert API URL to frontend URL (remove /api if exists, or use as is)
      const baseUrl = apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
      const postUrl = `${baseUrl}/posts/${postId}`;

      // Tìm conversation hiện tại với user này
      let conversation = conversations.find(
        (conv) =>
          conv.members.some((m) => m._id === targetUserId) &&
          conv.members.some((m) => m._id === currentUserId)
      );

      // Nếu chưa có conversation, tạo mới
      if (!conversation) {
        conversation = await conversationService.createConversationPrivate(targetUserId);
      }

      // Gửi message với link bài viết
      await messageService.sendMessage(conversation._id, {
        content: postUrl,
        type: 'text',
      });

      // Đóng modal và navigate đến messages screen
      onClose();
      navigation.navigate('Messages', { conversationId: conversation._id });
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert(
        'Lỗi',
        error?.response?.data?.message || 'Không thể chia sẻ bài viết. Vui lòng thử lại.'
      );
      setSharingToUserId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconPlaceholder}>
              <MaterialCommunityIcons name="magnify" size={20} color="#6B7280" />
            </View>
            <Text style={styles.headerTitle}>Chia sẻ đến</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color="#9CA3AF"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Users List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10B981" />
              </View>
            ) : filteredUsers.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.usersList}
                contentContainerStyle={styles.usersListContent}
              >
                {filteredUsers.map((userItem) => {
                  const isSharing = sharingToUserId === userItem._id;
                  return (
                    <TouchableOpacity
                      key={userItem._id}
                      onPress={() => handleShareToUser(userItem._id)}
                      disabled={isSharing || !!sharingToUserId}
                      style={[
                        styles.userItem,
                        (isSharing || !!sharingToUserId) && styles.userItemDisabled,
                      ]}
                    >
                      <View style={styles.userAvatarContainer}>
                        {isSharing ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : userItem.avatar ? (
                          <Image
                            source={{ uri: userItem.avatar }}
                            style={styles.userAvatar}
                          />
                        ) : (
                          <View style={styles.userAvatarPlaceholder}>
                            <Text style={styles.userAvatarText}>
                              {(userItem.fullname || userItem.username || 'U')
                                .charAt(0)
                                .toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.userName} numberOfLines={1}>
                        {userItem.fullname || userItem.username || 'User'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? 'Không tìm thấy người dùng nào'
                    : 'Chưa có cuộc trò chuyện nào'}
                </Text>
              </View>
            )}

            {/* Divider */}
            {filteredUsers.length > 0 && <View style={styles.divider} />}

            {/* Action Buttons */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.actionsList}
              contentContainerStyle={styles.actionsListContent}
            >
              {/* Copy Link Button */}
              <TouchableOpacity
                onPress={handleCopyLink}
                style={styles.actionItem}
              >
                <View style={styles.actionIconContainer}>
                  <MaterialCommunityIcons name="link-variant" size={28} color="#FFFFFF" />
                </View>
                <Text style={styles.actionText} numberOfLines={2}>
                  {copied ? 'Đã sao chép!' : 'Sao chép liên kết'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerIconPlaceholder: {
    width: scale(36),
    height: scale(36),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: scale(4),
  },
  content: {
    padding: scale(16),
    maxHeight: verticalScale(400),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: scale(8),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(14),
    color: '#111827',
    paddingVertical: scale(10),
  },
  loadingContainer: {
    paddingVertical: scale(32),
    alignItems: 'center',
  },
  usersList: {
    marginBottom: scale(16),
  },
  usersListContent: {
    gap: scale(12),
  },
  userItem: {
    alignItems: 'center',
    minWidth: scale(70),
    gap: scale(8),
  },
  userItemDisabled: {
    opacity: 0.5,
  },
  userAvatarContainer: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  userAvatar: {
    width: '100%',
    height: '100%',
  },
  userAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: moderateScale(20),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: moderateScale(11),
    color: '#374151',
    textAlign: 'center',
    maxWidth: scale(70),
  },
  emptyContainer: {
    paddingVertical: scale(32),
    alignItems: 'center',
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: scale(16),
  },
  actionsList: {
    marginTop: scale(8),
  },
  actionsListContent: {
    gap: scale(12),
  },
  actionItem: {
    alignItems: 'center',
    minWidth: scale(80),
    gap: scale(8),
    padding: scale(8),
  },
  actionIconContainer: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: moderateScale(11),
    color: '#374151',
    textAlign: 'center',
    maxWidth: scale(80),
  },
});

