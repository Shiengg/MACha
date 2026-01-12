import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { conversationService } from '../../services/conversation.service';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function ConversationList({
  selectedConversationId,
  onSelectConversation,
  initialConversations,
  loading: externalLoading,
}) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState(initialConversations || []);
  const [loading, setLoading] = useState(externalLoading ?? true);
  const [error, setError] = useState(null);

  const currentUserId = user?._id || user?.id;

  // Sync với initialConversations từ parent
  useEffect(() => {
    if (initialConversations) {
      setConversations(initialConversations);
    }
  }, [initialConversations]);

  useEffect(() => {
    if (externalLoading !== undefined) {
      setLoading(externalLoading);
    }
  }, [externalLoading]);

  useEffect(() => {
    // Chỉ fetch nếu không có initialConversations từ parent
    if (initialConversations !== undefined || !currentUserId) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await conversationService.getConversations();

        const sortedData = data.sort((a, b) => {
          const dateA = new Date(a.updatedAt).getTime();
          const dateB = new Date(b.updatedAt).getTime();
          return dateB - dateA;
        });
        setConversations(sortedData);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError(err?.response?.data?.message || 'Không thể tải danh sách cuộc trò chuyện');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [currentUserId, initialConversations]);

  // Listen for realtime message updates to update conversation list
  useEffect(() => {
    if (!socket || !isConnected || !currentUserId) return;

    const handleNewMessage = (incoming) => {
      const msg = incoming?.message || incoming;
      if (!msg || !msg.conversationId) return;

      setConversations((prev) => {
        const conversationId = msg.conversationId?.toString();
        const existingIndex = prev.findIndex((c) => c._id === conversationId);

        if (existingIndex >= 0) {
          // Conversation đã tồn tại: cập nhật lastMessage và đưa lên đầu
          const updated = [...prev];
          const conversation = updated[existingIndex];

          updated[existingIndex] = {
            ...conversation,
            lastMessage: {
              content: msg.content,
              senderId: msg.senderId,
              createdAt: msg.createdAt,
            },
            updatedAt: msg.createdAt || new Date().toISOString(),
          };

          // Sắp xếp lại: conversation có tin nhắn mới nhất lên đầu
          const sorted = updated.sort((a, b) => {
            const dateA = new Date(a.updatedAt).getTime();
            const dateB = new Date(b.updatedAt).getTime();
            return dateB - dateA;
          });

          return sorted;
        } else {
          // Conversation chưa có trong list: có thể là conversation mới được tạo
          return prev;
        }
      });
    };

    socket.on('chat:message:new', handleNewMessage);

    return () => {
      socket.off('chat:message:new', handleNewMessage);
    };
  }, [socket, isConnected, currentUserId]);

  const getOtherParticipant = (members, currentUserId) => {
    if (!currentUserId) return members[0];
    return members.find((p) => p._id !== currentUserId) || members[0];
  };

  const formatTime = (dateString) => {
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

  const isCloudinaryImageUrl = (content) => {
    if (!content) return false;
    return content.includes('cloudinary.com') || content.includes('res.cloudinary.com');
  };

  const formatLastMessageContent = (content) => {
    if (isCloudinaryImageUrl(content)) {
      return 'Đã gửi ảnh';
    }
    return content;
  };

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conversation) => {
    if (!searchQuery.trim()) return true;

    const otherParticipant = getOtherParticipant(conversation.members, currentUserId);
    const searchLower = searchQuery.toLowerCase();

    const lastMessageText = conversation.lastMessage
      ? isCloudinaryImageUrl(conversation.lastMessage.content)
        ? 'đã gửi ảnh'
        : conversation.lastMessage.content.toLowerCase()
      : '';

    return (
      otherParticipant.username?.toLowerCase().includes(searchLower) ||
      otherParticipant.email?.toLowerCase().includes(searchLower) ||
      lastMessageText.includes(searchLower)
    );
  });

  const renderConversationItem = ({ item: conversation }) => {
    const otherParticipant = getOtherParticipant(conversation.members, currentUserId);
    const isSelected = selectedConversationId === conversation._id;

    const lastMessageSenderId = conversation.lastMessage
      ? typeof conversation.lastMessage.senderId === 'string'
        ? conversation.lastMessage.senderId
        : conversation.lastMessage.senderId?._id
      : null;
    const isLastFromCurrentUser = lastMessageSenderId && currentUserId && lastMessageSenderId === currentUserId;

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          isSelected && styles.conversationItemSelected,
        ]}
        onPress={() => onSelectConversation(conversation)}
        activeOpacity={0.7}
      >
        <View style={styles.conversationContent}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              {otherParticipant.avatar ? (
                <Image
                  source={{ uri: otherParticipant.avatar }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {otherParticipant.fullname?.charAt(0).toUpperCase() ||
                      otherParticipant.username?.charAt(0).toUpperCase() ||
                      'U'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Content */}
          <View style={styles.conversationTextContainer}>
            <View style={styles.conversationHeader}>
              <Text style={styles.conversationName} numberOfLines={1}>
                {otherParticipant?.fullname || otherParticipant?.username || 'Người dùng'}
              </Text>
              {conversation.lastMessage && (
                <Text style={styles.conversationTime}>
                  {formatTime(conversation.lastMessage.createdAt)}
                </Text>
              )}
            </View>
            {conversation.lastMessage && (
              <Text style={styles.conversationLastMessage} numberOfLines={1}>
                {isLastFromCurrentUser ? 'Bạn: ' : ''}
                {formatLastMessageContent(conversation.lastMessage.content)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="message-outline" size={64} color="#D1D5DB" />
        <Text style={styles.errorTitle}>Lỗi</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color="#9CA3AF"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm cuộc trò chuyện..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Conversation List */}
      {filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="message-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'Không tìm thấy cuộc trò chuyện nào' : 'Chưa có cuộc trò chuyện nào'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? 'Thử tìm kiếm với từ khóa khác'
              : 'Bắt đầu trò chuyện với bạn bè của bạn'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item._id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    marginHorizontal: scale(16),
    marginTop: scale(12),
    marginBottom: scale(8),
  },
  searchIcon: {
    marginRight: scale(8),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(14),
    color: '#111827',
  },
  listContent: {
    paddingHorizontal: scale(8),
    paddingBottom: scale(16),
  },
  conversationItem: {
    padding: scale(12),
    borderRadius: scale(12),
    marginVertical: scale(4),
    marginHorizontal: scale(8),
  },
  conversationItemSelected: {
    backgroundColor: '#D1FAE5',
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
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
  conversationTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  conversationName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  conversationTime: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    marginLeft: scale(8),
  },
  conversationLastMessage: {
    fontSize: moderateScale(14),
    color: '#6B7280',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(32),
  },
  errorTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#EF4444',
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  errorText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(32),
  },
  emptyText: {
    fontSize: moderateScale(16),
    fontWeight: '500',
    color: '#6B7280',
    marginTop: scale(16),
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: moderateScale(14),
    color: '#9CA3AF',
    marginTop: scale(8),
    textAlign: 'center',
  },
});

