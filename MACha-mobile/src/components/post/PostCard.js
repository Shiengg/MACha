import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { postService } from '../../services/post.service';
import { campaignService } from '../../services/campaign.service';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import CampaignCard from '../campaign/CampaignCard';
import CommentModal from '../shared/CommentModal';
import ShareModal from '../shared/ShareModal';

export default function PostCard({ post, onDelete, onUpdate, navigation }) {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [showFullText, setShowFullText] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [fullCampaign, setFullCampaign] = useState(null);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const currentUserId = user?._id || user?.id;
  const isOwner = currentUserId === post.user?._id;

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handlePostLiked = (event) => {
      if (event.postId !== post._id) return;
      if (event.userId === currentUserId) return;
      setLikesCount((prev) => prev + 1);
    };

    const handlePostUnliked = (event) => {
      if (event.postId !== post._id) return;
      if (event.userId === currentUserId) return;
      setLikesCount((prev) => Math.max(0, prev - 1));
    };

    const handleCommentAdded = (event) => {
      if (event.postId !== post._id) return;
      
      const eventUserId = event.userId;
      // Skip if it's the current user's comment (already updated optimistically)
      if (eventUserId === currentUserId) {
        console.log('👤 Đó là bạn vừa comment (đã có trong list)');
        return;
      }

      console.log('💬 Real-time: Có comment mới từ người khác');
      setCommentsCount((prev) => prev + 1);
    };

    const handleCommentDeleted = (event) => {
      if (event.postId !== post._id) return;
      
      const eventUserId = event.userId;
      // Skip if it's the current user's comment (already updated optimistically)
      if (eventUserId === currentUserId) {
        console.log('👤 Đó là bạn vừa xóa comment (đã optimistic update)');
        return;
      }

      console.log('🗑️ Real-time: Comment bị xóa:', event.commentId);
      setCommentsCount((prev) => Math.max(0, prev - 1));
    };

    socket.on('post:liked', handlePostLiked);
    socket.on('post:unliked', handlePostUnliked);
    socket.on('comment:added', handleCommentAdded);
    socket.on('comment:deleted', handleCommentDeleted);

    return () => {
      socket.off('post:liked', handlePostLiked);
      socket.off('post:unliked', handlePostUnliked);
      socket.off('comment:added', handleCommentAdded);
      socket.off('comment:deleted', handleCommentDeleted);
    };
  }, [socket, isConnected, post._id, currentUserId]);

  const campaignIdRef = useRef(null);

  useEffect(() => {
    const campaignId = post.campaign_id?._id;
    
    // If campaign ID hasn't changed, don't fetch again
    if (campaignIdRef.current === campaignId) {
      return;
    }

    if (!campaignId) {
      setFullCampaign(null);
      campaignIdRef.current = null;
      return;
    }

    campaignIdRef.current = campaignId;

    const fetchCampaign = async () => {
      try {
        setIsLoadingCampaign(true);
        const campaign = await campaignService.getCampaignById(campaignId);
        // Only update if this is still the current campaign ID
        if (campaignIdRef.current === campaignId) {
          setFullCampaign(campaign);
        }
      } catch (error) {
        console.error('Error fetching campaign:', error);
        if (campaignIdRef.current === campaignId) {
          setFullCampaign(null);
        }
      } finally {
        if (campaignIdRef.current === campaignId) {
          setIsLoadingCampaign(false);
        }
      }
    };

    fetchCampaign();
  }, [post.campaign_id?._id]);

  const handleLike = async () => {
    if (isLiking) return;

    const previousState = isLiked;
    const previousCount = likesCount;

    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    setIsLiking(true);

    try {
      await postService.toggleLikePost(post._id, previousState);
    } catch (error) {
      console.error('Error toggling like:', error);
      setIsLiked(previousState);
      setLikesCount(previousCount);
      Alert.alert('Lỗi', 'Không thể thực hiện hành động này');
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await postService.deletePost(post._id);
      setShowDeleteConfirm(false);
      if (onDelete) {
        onDelete(post._id);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Lỗi', 'Không thể xóa bài viết');
    } finally {
      setIsDeleting(false);
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

    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderContentWithHashtags = (text) => {
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <Text
            key={index}
            style={styles.hashtag}
            onPress={() => {
              // Navigate to hashtag page if needed
              console.log('Hashtag clicked:', part);
            }}
          >
            {part}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  const renderMedia = () => {
    if (!post.media_url || post.media_url.length === 0) return null;

    const images = post.media_url;
    const count = images.length;

    if (count === 1) {
      return (
        <TouchableOpacity
          onPress={() => {
            setImageViewerIndex(0);
            setShowImageViewer(true);
          }}
          style={styles.singleImageContainer}
        >
          <Image source={{ uri: images[0] }} style={styles.singleImage} resizeMode="cover" />
        </TouchableOpacity>
      );
    }

    if (count === 2) {
      return (
        <View style={styles.twoImageContainer}>
          {images.map((url, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                setImageViewerIndex(index);
                setShowImageViewer(true);
              }}
              style={styles.twoImageItem}
            >
              <Image source={{ uri: url }} style={styles.twoImage} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (count >= 3) {
      return (
        <View style={styles.multiImageContainer}>
          {images.slice(0, 4).map((url, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                setImageViewerIndex(index);
                setShowImageViewer(true);
              }}
              style={[
                styles.multiImageItem,
                index === 3 && images.length > 4 && styles.multiImageOverlay,
              ]}
            >
              <Image source={{ uri: url }} style={styles.multiImage} resizeMode="cover" />
              {index === 3 && images.length > 4 && (
                <View style={styles.overlay}>
                  <Text style={styles.overlayText}>+{images.length - 4}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    return null;
  };

  const contentPreview = post.content_text.length > 200
    ? post.content_text.slice(0, 200) + '...'
    : post.content_text;

  if (!post.user) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => {
            if (navigation && post.user?._id) {
              navigation.navigate('Profile', { userId: post.user._id });
            }
          }}
        >
          <View style={styles.avatarContainer}>
            {post.user.avatar ? (
              <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(post.user.fullname || post.user.username || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View>
            <Text style={styles.username}>
              {post.user.fullname || post.user.username}
            </Text>
            <Text style={styles.timeAgo}>{formatTimeAgo(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        {isOwner && (
          <TouchableOpacity
            onPress={() => setShowDeleteConfirm(true)}
            style={styles.moreButton}
          >
            <MaterialCommunityIcons name="dots-vertical" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.contentText}>
          {showFullText
            ? renderContentWithHashtags(post.content_text)
            : renderContentWithHashtags(contentPreview)}
        </Text>
        {post.content_text.length > 200 && (
          <TouchableOpacity onPress={() => setShowFullText(!showFullText)}>
            <Text style={styles.showMoreText}>
              {showFullText ? 'Rút gọn' : 'Xem thêm'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Media */}
      {renderMedia()}

      {/* Campaign Card */}
      {post.campaign_id && (
        <View style={styles.campaignContainer}>
          {isLoadingCampaign ? (
            <ActivityIndicator size="small" color="#F97E2C" />
          ) : fullCampaign ? (
            <CampaignCard campaign={fullCampaign} onPress={() => {
              if (navigation) {
                navigation.navigate('CampaignDetail', { campaignId: fullCampaign._id });
              }
            }} />
          ) : (
            <View style={styles.campaignBadge}>
              <MaterialCommunityIcons name="cash" size={16} color="#10B981" />
              <Text style={styles.campaignBadgeText}>
                Chiến dịch: {post.campaign_id.title}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Stats */}
      {(likesCount > 0 || commentsCount > 0) && (
        <View style={styles.stats}>
          {likesCount > 0 && (
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="heart" size={16} color="#EF4444" />
              <Text style={styles.statText}>{likesCount}</Text>
            </View>
          )}
          {commentsCount > 0 && (
            <Text style={styles.commentCount}>{commentsCount} bình luận</Text>
          )}
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLike}
          disabled={isLiking}
        >
          <MaterialCommunityIcons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={24}
            color={isLiked ? '#EF4444' : '#6B7280'}
          />
          <Text style={[styles.actionText, isLiked && styles.actionTextLiked]}>
            Thích
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setShowCommentModal(true);
          }}
        >
          <MaterialCommunityIcons name="comment-outline" size={24} color="#6B7280" />
          <Text style={styles.actionText}>Bình luận</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setShowShareModal(true);
          }}
        >
          <MaterialCommunityIcons name="share-outline" size={24} color="#6B7280" />
          <Text style={styles.actionText}>Chia sẻ</Text>
        </TouchableOpacity>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xóa bài viết</Text>
            <Text style={styles.modalMessage}>
              Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                <Text style={styles.modalButtonCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonDeleteText}>Xóa</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setShowImageViewer(false)}
          >
            <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: imageViewerIndex * scale(375), y: 0 }}
          >
            {post.media_url?.map((url, index) => (
              <Image
                key={index}
                source={{ uri: url }}
                style={styles.imageViewerImage}
                resizeMode="contain"
              />
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Comment Modal */}
      <CommentModal
        postId={post._id}
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        onCommentAdded={() => {
          setCommentsCount((prev) => prev + 1);
          if (onUpdate) {
            // Trigger update to refresh post data
            onUpdate(post._id, { ...post, commentsCount: commentsCount + 1 });
          }
        }}
        onCommentDeleted={() => {
          setCommentsCount((prev) => Math.max(0, prev - 1));
          if (onUpdate) {
            // Trigger update to refresh post data
            onUpdate(post._id, { ...post, commentsCount: Math.max(0, commentsCount - 1) });
          }
        }}
      />

      {/* Share Modal */}
      <ShareModal
        postId={post._id}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginBottom: scale(12),
    borderRadius: scale(12),
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(12),
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    overflow: 'hidden',
    marginRight: scale(12),
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#6B7280',
  },
  username: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: '#111827',
  },
  timeAgo: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    marginTop: scale(2),
  },
  moreButton: {
    padding: scale(4),
  },
  content: {
    marginBottom: scale(12),
  },
  contentText: {
    fontSize: moderateScale(15),
    color: '#111827',
    lineHeight: moderateScale(22),
  },
  hashtag: {
    color: '#2563EB',
    fontWeight: '500',
  },
  showMoreText: {
    fontSize: moderateScale(15),
    color: '#6B7280',
    fontWeight: '600',
    marginTop: scale(4),
  },
  singleImageContainer: {
    width: '100%',
    height: verticalScale(300),
    borderRadius: scale(12),
    overflow: 'hidden',
    marginBottom: scale(12),
  },
  singleImage: {
    width: '100%',
    height: '100%',
  },
  twoImageContainer: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: scale(12),
  },
  twoImageItem: {
    flex: 1,
    height: verticalScale(200),
    borderRadius: scale(12),
    overflow: 'hidden',
  },
  twoImage: {
    width: '100%',
    height: '100%',
  },
  multiImageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: scale(12),
  },
  multiImageItem: {
    width: '48%',
    height: verticalScale(150),
    borderRadius: scale(12),
    overflow: 'hidden',
  },
  multiImage: {
    width: '100%',
    height: '100%',
  },
  multiImageOverlay: {
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#FFFFFF',
    fontSize: moderateScale(24),
    fontWeight: 'bold',
  },
  campaignContainer: {
    marginBottom: scale(12),
  },
  campaignBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    alignSelf: 'flex-start',
  },
  campaignBadgeText: {
    fontSize: moderateScale(14),
    color: '#10B981',
    fontWeight: '500',
    marginLeft: scale(6),
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: scale(16),
  },
  statText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginLeft: scale(4),
  },
  commentCount: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: scale(8),
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: scale(4),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(8),
    paddingHorizontal: scale(16),
    borderRadius: scale(8),
  },
  actionText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginLeft: scale(6),
    fontWeight: '500',
  },
  actionTextLiked: {
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(24),
    width: '100%',
    maxWidth: scale(400),
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: scale(12),
  },
  modalMessage: {
    fontSize: moderateScale(15),
    color: '#6B7280',
    marginBottom: scale(24),
    lineHeight: moderateScale(22),
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: scale(12),
  },
  modalButton: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(8),
    minWidth: scale(80),
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonCancelText: {
    fontSize: moderateScale(15),
    color: '#374151',
    fontWeight: '500',
  },
  modalButtonDelete: {
    backgroundColor: '#EF4444',
  },
  modalButtonDeleteText: {
    fontSize: moderateScale(15),
    color: '#FFFFFF',
    fontWeight: '500',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: scale(50),
    right: scale(20),
    zIndex: 1,
    padding: scale(8),
  },
  imageViewerImage: {
    width: scale(375),
    height: verticalScale(600),
  },
});

