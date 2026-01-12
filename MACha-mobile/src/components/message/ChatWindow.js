import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { messageService } from '../../services/message.service';
import { cloudinaryService } from '../../services/cloudinary.service';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function ChatWindow({ conversation, onToggleInfoPanel, onBackToList }) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef(null);
  const sentMessageIdsRef = useRef(new Set());

  const currentUserId = user?._id || user?.id;
  const conversationId = conversation?._id ?? null;

  const getOtherParticipant = (members, currentUserId) => {
    if (!members || members.length === 0) {
      return {
        _id: 'unknown',
        username: 'Người dùng',
        avatar: undefined,
        email: '',
      };
    }
    if (!currentUserId) return members[0];
    return members.find((m) => m._id !== currentUserId) || members[0];
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollToEnd({ animated: true });
    }
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
        const data = await messageService.getMessages(conversationId, 0, 50);
        // Tin nhắn mới nhất ở cuối -> đảm bảo sort theo createdAt tăng dần
        const sorted = [...data].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setMessages(sorted);
      } catch (err) {
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
    if (!socket || !isConnected) return;

    const handleNewMessage = (incoming) => {
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

    socket.on('chat:message:new', handleNewMessage);

    return () => {
      socket.off('chat:message:new', handleNewMessage);
    };
  }, [socket, isConnected, conversationId]);

  const handleImageSelect = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        if (asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('Lỗi', 'File ảnh quá lớn (tối đa 5MB)');
          return;
        }

        setSelectedImage(asset);
        setImagePreview(asset.uri);
        setError(null);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSendMessage = async () => {
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
      let type = 'text';

      if (selectedImage) {
        setUploadingImage(true);
        try {
          const uploadResult = await cloudinaryService.uploadImage(selectedImage.uri, 'messages');
          content = uploadResult.secure_url;
          type = 'image';
        } catch (uploadErr) {
          console.error('Error uploading image:', uploadErr);
          Alert.alert('Lỗi', 'Không thể tải ảnh lên. Vui lòng thử lại.');
          setUploadingImage(false);
          setSending(false);
          return;
        }
        setUploadingImage(false);
      }

      const newMessage = await messageService.sendMessage(conversationId, {
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
    } catch (err) {
      console.error('Error sending message:', err);
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
      setUploadingImage(false);
    }
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageTimeWithDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();

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

  const renderMessageContent = (content) => {
    // Simple URL detection and linking
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = [];
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
      return <Text>{content}</Text>;
    }

    if (lastIndex < content.length) {
      parts.push({ text: content.substring(lastIndex), isUrl: false });
    }

    return (
      <Text>
        {parts.map((part, index) => {
          if (part.isUrl) {
            return (
              <Text
                key={index}
                style={styles.urlText}
                onPress={() => {
                  const href = part.text.startsWith('www.') ? `http://${part.text}` : part.text;
                  // Open URL in browser
                  // Linking.openURL(href);
                }}
              >
                {part.text}
              </Text>
            );
          }
          return <Text key={index}>{part.text}</Text>;
        })}
      </Text>
    );
  };

  if (!conversationId || !conversation) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="message-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Chọn một cuộc trò chuyện</Text>
        <Text style={styles.emptyText}>Bắt đầu trò chuyện với bạn bè của bạn</Text>
      </View>
    );
  }

  const otherParticipant = getOtherParticipant(conversation.members, currentUserId);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Chat Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {onBackToList && (
            <TouchableOpacity
              onPress={onBackToList}
              style={styles.backButton}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
            </TouchableOpacity>
          )}
          <View style={styles.avatarContainer}>
            {otherParticipant.avatar ? (
              <Image
                source={{ uri: otherParticipant.avatar }}
                style={styles.headerAvatar}
              />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Text style={styles.headerAvatarText}>
                  {otherParticipant.fullname?.charAt(0).toUpperCase() ||
                    otherParticipant.username?.charAt(0).toUpperCase() ||
                    'U'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherParticipant.fullname || otherParticipant.username || 'Người dùng'}
            </Text>
            <Text style={styles.headerStatus}>Offline</Text>
          </View>
          {onToggleInfoPanel && (
            <TouchableOpacity
              onPress={onToggleInfoPanel}
              style={styles.infoButton}
            >
              <Text style={styles.infoButtonText}>i</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Messages Area */}
      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        ref={messagesEndRef}
        onContentSizeChange={scrollToBottom}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Đang tải tin nhắn...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyMessagesContainer}>
            <Text style={styles.emptyMessagesText}>
              Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
            </Text>
          </View>
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
              prev &&
              (typeof prev.senderId === 'string' ? prev.senderId : prev.senderId?._id);
            const nextSenderId =
              next &&
              (typeof next.senderId === 'string' ? next.senderId : next.senderId?._id);

            const isFirstOfGroup = !prev || prevSenderId !== senderId;
            const isLastOfGroup = !next || nextSenderId !== senderId;

            if (isOwnMessage) {
              return (
                <View key={msg._id} style={styles.messageRowRight}>
                  <View style={styles.messageBubbleRight}>
                    {msg.type === 'image' ? (
                      <Image source={{ uri: msg.content }} style={styles.messageImage} />
                    ) : (
                      <Text style={styles.messageTextRight}>
                        {renderMessageContent(msg.content)}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.messageTimeRight}>
                    {formatMessageTimeWithDate(msg.createdAt)}
                  </Text>
                </View>
              );
            }

            return (
              <View key={msg._id} style={styles.messageRowLeft}>
                {isLastOfGroup && (
                  <View style={styles.messageAvatar}>
                    {sender.avatar ? (
                      <Image source={{ uri: sender.avatar }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                          {sender.username?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                <View style={styles.messageContentLeft}>
                  <View style={styles.messageBubbleLeft}>
                    {msg.type === 'image' ? (
                      <Image source={{ uri: msg.content }} style={styles.messageImage} />
                    ) : (
                      <Text style={styles.messageTextLeft}>
                        {renderMessageContent(msg.content)}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.messageTimeLeft}>
                    {formatMessageTimeWithDate(msg.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Image Preview */}
      {imagePreview && (
        <View style={styles.imagePreviewContainer}>
          <View style={styles.imagePreviewWrapper}>
            <Image source={{ uri: imagePreview }} style={styles.imagePreview} />
            <TouchableOpacity
              onPress={handleRemoveImage}
              style={styles.removeImageButton}
            >
              <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          onPress={handleImageSelect}
          disabled={uploadingImage || sending}
          style={styles.imageButton}
        >
          {uploadingImage ? (
            <ActivityIndicator size="small" color="#6B7280" />
          ) : (
            <MaterialCommunityIcons name="image-outline" size={24} color="#6B7280" />
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          value={message}
          onChangeText={setMessage}
          placeholder={sending || uploadingImage ? 'Đang gửi...' : 'Nhập tin nhắn...'}
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          onPress={handleSendMessage}
          disabled={(!message.trim() && !selectedImage) || sending || uploadingImage}
          style={[
            styles.sendButton,
            ((!message.trim() && !selectedImage) || sending || uploadingImage) &&
              styles.sendButtonDisabled,
          ]}
        >
          {sending || uploadingImage ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(32),
  },
  emptyTitle: {
    fontSize: moderateScale(20),
    fontWeight: '600',
    color: '#111827',
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: scale(12),
    padding: scale(4),
  },
  avatarContainer: {
    marginRight: scale(12),
  },
  headerAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
  },
  headerAvatarPlaceholder: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#6B7280',
  },
  headerTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#111827',
  },
  headerStatus: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    marginTop: scale(2),
  },
  infoButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#F97E2C',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scale(8),
  },
  infoButtonText: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: scale(16),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(32),
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
    paddingVertical: scale(32),
  },
  errorText: {
    fontSize: moderateScale(14),
    color: '#EF4444',
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(32),
  },
  emptyMessagesText: {
    fontSize: moderateScale(14),
    color: '#9CA3AF',
    textAlign: 'center',
  },
  messageRowRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: scale(8),
    alignItems: 'flex-end',
  },
  messageRowLeft: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: scale(8),
    alignItems: 'flex-end',
  },
  messageBubbleRight: {
    backgroundColor: '#F97E2C',
    borderRadius: scale(16),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    maxWidth: '75%',
  },
  messageBubbleLeft: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    maxWidth: '75%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageTextRight: {
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
  messageTextLeft: {
    fontSize: moderateScale(14),
    color: '#111827',
  },
  messageTimeRight: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    marginLeft: scale(8),
    marginRight: scale(4),
  },
  messageTimeLeft: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    marginLeft: scale(8),
  },
  messageContentLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageAvatar: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    marginRight: scale(8),
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: '#6B7280',
  },
  messageImage: {
    width: scale(200),
    height: scale(200),
    borderRadius: scale(12),
    resizeMode: 'cover',
  },
  urlText: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  imagePreviewContainer: {
    paddingHorizontal: scale(16),
    paddingTop: scale(8),
    backgroundColor: '#F9FAFB',
  },
  imagePreviewWrapper: {
    position: 'relative',
    width: scale(100),
    height: scale(100),
    borderRadius: scale(8),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#F97E2C',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  imageButton: {
    padding: scale(8),
    marginRight: scale(8),
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    fontSize: moderateScale(14),
    color: '#111827',
    maxHeight: scale(100),
  },
  sendButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#F97E2C',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scale(8),
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});

