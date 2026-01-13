import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { commentService } from '../../services/comment.service';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function CommentModal({ postId, isOpen, onClose, onCommentAdded, onCommentDeleted }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    } else {
      // Reset state when modal closes
      setComments([]);
      setNewComment('');
    }
  }, [isOpen, postId]);

  useEffect(() => {
    if (!socket || !isConnected || !isOpen) return;

    const handleCommentAdded = (event) => {
      if (event.postId !== postId) return;

      const currentUserId = user?._id || user?.id;

      if (event.userId === currentUserId) {
        console.log('👤 Đó là bạn vừa comment (đã có trong list)');
        return;
      }

      console.log('💬 Real-time: Có comment mới từ người khác');

      const newCommentFromEvent = {
        _id: event.commentId,
        post: postId,
        user: {
          _id: event.userId,
          username: event.username || 'Unknown',
          fullname: event.fullname,
          avatar: event.avatar,
        },
        content_text: event.content_text,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Thêm vào đầu danh sách
      setComments((prev) => {
        // Check duplicate
        const exists = prev.some((c) => c._id === newCommentFromEvent._id);
        if (exists) return prev;
        return [newCommentFromEvent, ...prev];
      });
    };

    const handleCommentDeleted = (event) => {
      if (event.postId !== postId) return;

      console.log('🗑️ Real-time: Comment bị xóa:', event.commentId);

      // Xóa comment khỏi danh sách
      setComments((prev) => prev.filter((c) => c._id !== event.commentId));
    };

    socket.on('comment:added', handleCommentAdded);
    socket.on('comment:deleted', handleCommentDeleted);

    return () => {
      socket.off('comment:added', handleCommentAdded);
      socket.off('comment:deleted', handleCommentDeleted);
    };
  }, [socket, isConnected, isOpen, postId, user]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const data = await commentService.getComments(postId);
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const comment = await commentService.addComment(postId, {
        content_text: newComment.trim(),
      });
      setComments([comment, ...comments]);
      setNewComment('');
      onCommentAdded?.();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await commentService.deleteComment(commentId);
      setComments(comments.filter((c) => c._id !== commentId));
      onCommentDeleted?.();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;

    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  const currentUserId = user?._id || user?.id;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Bình luận</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            <ScrollView
              style={styles.commentsList}
              contentContainerStyle={styles.commentsListContent}
              showsVerticalScrollIndicator={false}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                </View>
              ) : comments.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
                  </Text>
                </View>
              ) : (
                comments.map((comment) => (
                  <View key={comment._id} style={styles.commentItem}>
                    <View style={styles.avatarContainer}>
                      {comment.user.avatar ? (
                        <Image
                          source={{ uri: comment.user.avatar }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarText}>
                            {(comment.user.username || 'U').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>
                          {comment.user.fullname || comment.user.username}
                        </Text>
                        {currentUserId &&
                          (currentUserId === comment.user._id) && (
                            <TouchableOpacity
                              onPress={() => handleDeleteComment(comment._id)}
                              style={styles.deleteButton}
                            >
                              <MaterialCommunityIcons
                                name="delete-outline"
                                size={16}
                                color="#EF4444"
                              />
                            </TouchableOpacity>
                          )}
                      </View>
                      <View style={styles.commentBubble}>
                        <Text style={styles.commentText}>{comment.content_text}</Text>
                      </View>
                      <Text style={styles.commentTime}>
                        {formatTimeAgo(comment.createdAt)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Comment Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="Viết bình luận..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  maxLength={500}
                  editable={!isSubmitting}
                />
                <TouchableOpacity
                  onPress={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  style={[
                    styles.sendButton,
                    (!newComment.trim() || isSubmitting) && styles.sendButtonDisabled,
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: scale(4),
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    padding: scale(16),
    gap: scale(16),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(32),
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
  commentItem: {
    flexDirection: 'row',
    gap: scale(12),
  },
  avatarContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
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
    backgroundColor: '#E5E7EB',
  },
  avatarText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#6B7280',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  commentAuthor: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#111827',
  },
  deleteButton: {
    padding: scale(4),
  },
  commentBubble: {
    backgroundColor: '#F3F4F6',
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: scale(4),
  },
  commentText: {
    fontSize: moderateScale(14),
    color: '#111827',
    lineHeight: moderateScale(20),
  },
  commentTime: {
    fontSize: moderateScale(11),
    color: '#6B7280',
    marginLeft: scale(12),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: scale(20),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: scale(12),
    backgroundColor: '#FFFFFF',
  },
  inputAvatarContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  inputAvatar: {
    width: '100%',
    height: '100%',
  },
  inputAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  inputAvatarText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#6B7280',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: scale(8),
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    fontSize: moderateScale(14),
    color: '#111827',
    maxHeight: scale(100),
    minHeight: scale(40),
  },
  sendButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});

