'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, DollarSign, MoreHorizontal } from 'lucide-react';
import { FaEdit, FaTrash, FaFlag, FaImages, FaTimes } from 'react-icons/fa';
import Image from 'next/image';
import { toggleLikePost, deletePost, updatePost } from '@/services/post.service';
import { getReportsByItem } from '@/services/report.service';
import CommentModal from './CommentModal';
import ReportModal from './ReportModal';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { cloudinaryService } from '@/services/cloudinary.service';

interface PostCardProps {
  post: {
    _id: string;
    user: {
      _id: string;
      username: string;
      fullname?: string;
      avatar?: string;
    };
    content_text: string;
    media_url?: string[];
    hashtags?: Array<{
      _id: string;
      name: string;
    }>;
    campaign_id?: {
      _id: string;
      title: string;
    } | null;
    createdAt: string;
    likesCount?: number;
    commentsCount?: number;
    isLiked?: boolean;
  };
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onDonate?: (postId: string, campaignId?: string) => void;
  onDelete?: (postId: string) => void;
  onUpdate?: (postId: string, updatedPost: any) => void;
}

export default function PostCard({ post, onLike, onComment, onShare, onDonate, onDelete, onUpdate }: PostCardProps) {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [showFullText, setShowFullText] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState(post.content_text);
  const [editMediaUrls, setEditMediaUrls] = useState<string[]>(post.media_url || []);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [isCheckingReport, setIsCheckingReport] = useState(false);

  const justLikedRef = useRef(false);
  const justCommentedRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const currentUserId = (user as any)?._id || user?.id;
  const isOwner = currentUserId === post.user._id;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    const checkUserReported = async () => {
      if (!currentUserId || isOwner) {
        setHasReported(false);
        return;
      }

      try {
        const { reports } = await getReportsByItem('post', post._id);
        const userReport = reports.find(
          (report) => report.reporter._id === currentUserId
        );
        setHasReported(!!userReport);
      } catch (error) {
        console.error('Error checking report status:', error);
        setHasReported(false);
      }
    };

    checkUserReported();
  }, [post._id, currentUserId, isOwner]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handlePostLiked = (event: any) => {
      if (event.postId !== post._id) return;

      const currentUserId = (user as any)?._id || user?.id;

      if (event.userId === currentUserId) {
        justLikedRef.current = false; // Reset flag
        return;
      }

      if (post.user._id === currentUserId) {
        console.log('🎉 Có người like bài viết của bạn:', event.postId);
        console.log('👤 User ID:', event.userId);
      }

      setLikesCount((prev) => prev + 1);
    };

    const handlePostUnliked = (event: any) => {
      if (event.postId !== post._id) return;

      const currentUserId = (user as any)?._id || user?.id;

      if (event.userId === currentUserId) {
        justLikedRef.current = false;
        return;
      }

      if (post.user._id === currentUserId) {
        console.log('💔 Có người unlike bài viết của bạn:', event.postId);
        console.log('👤 User ID:', event.userId);
      }

      setLikesCount((prev) => prev - 1);
    }

    const handleCommentAddedEvent = (event: any) => {
      if (event.postId !== post._id) return;

      const currentUserId = (user as any)?._id || user?.id;

      if (event.userId === currentUserId) {
        console.log('👤 Đó là bạn vừa comment (đã optimistic update)');
        justCommentedRef.current = false;
        return;
      }

      console.log('💬 Có người comment bài viết này:', event.postId);
      console.log('📦 Comment:', event.content_text);

      setCommentsCount((prev) => prev + 1);
    }

    const handleCommentDeletedEvent = (event: any) => {
      if (event.postId !== post._id) return;

      const currentUserId = (user as any)?._id || user?.id;

      if (event.userId === currentUserId) {
        console.log('👤 Đó là bạn vừa xóa comment (đã optimistic update)');
        justCommentedRef.current = false;
        return;
      }

      console.log('🗑️ Có người xóa comment:', event.commentId);

      setCommentsCount((prev) => Math.max(0, prev - 1));
    }

    socket.on('post:liked', handlePostLiked);
    socket.on('post:unliked', handlePostUnliked);
    socket.on('comment:added', handleCommentAddedEvent);
    socket.on('comment:deleted', handleCommentDeletedEvent);

    return () => {
      socket.off('post:liked', handlePostLiked);
      socket.off('post:unliked', handlePostUnliked);
      socket.off('comment:added', handleCommentAddedEvent);
      socket.off('comment:deleted', handleCommentDeletedEvent);
    };
  }, [socket, isConnected, post._id, user]);

  const handleLike = async () => {
    if (isLiking) return;

    const previousState = isLiked;
    const previousCount = likesCount;

    justLikedRef.current = true;

    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    setIsLiking(true);
    try {
      await toggleLikePost(post._id, previousState);
      onLike?.(post._id);
    } catch (error: any) {
      console.error('Error toggling like:', error);
      // Revert on error
      setIsLiked(previousState);
      setLikesCount(previousCount);
      justLikedRef.current = false;

      // Show error message to user
      const errorMessage = error?.message || 'Có lỗi xảy ra khi thực hiện hành động này';
      alert(errorMessage);
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = () => {
    setShowCommentModal(true);
    onComment?.(post._id);
  };

  const handleCommentAdded = () => {
    setCommentsCount(commentsCount + 1);
  };

  const handleCommentDeleted = () => {
    // Set flag để skip socket event
    justCommentedRef.current = true;
    // Giảm count ngay (optimistic update)
    setCommentsCount((prev) => Math.max(0, prev - 1));
  };

  const handleShare = () => {
    onShare?.(post._id);
  };

  const handleHashtagClick = (hashtagName: string) => {
    console.log('Clicked hashtag:', hashtagName);
    // TODO: Navigate to hashtag page or filter posts by hashtag
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;

    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderContentWithHashtags = (text: string) => {
    const parts = text.split(/(#\w+)/g);

    return parts.map((part, index) => {
      // Nếu là hashtag
      if (part.startsWith('#')) {
        const hashtagName = part.substring(1);
        return (
          <span
            key={index}
            onClick={() => handleHashtagClick(hashtagName)}
            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const contentPreview = post.content_text.length > 200
    ? post.content_text.slice(0, 200) + '...'
    : post.content_text;

  const renderImageItem = (url: string, index: number, className = "", showOverlay = false, overlayText = "") => (
    <div key={index} className={`relative group ${className}`}>
      <div className="w-full h-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
        <Image
          src={url}
          alt={`Post media ${index + 1}`}
          width={800}
          height={800}
          className="w-full h-full object-cover"
        />
      </div>
      {showOverlay && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
          <span className="text-white text-3xl font-semibold">
            {overlayText}
          </span>
        </div>
      )}
    </div>
  );

  const renderImageLayout = () => {
    if (!post.media_url || post.media_url.length === 0) return null;

    const images = post.media_url;
    const count = images.length;
    const remainingCount = count > 5 ? count - 5 : 0;

    // 1 ảnh: full width, tỷ lệ 4:3
    if (count === 1) {
      return (
        <div className="relative w-full">
          <div className="aspect-[4/3] w-full">
            {renderImageItem(images[0], 0, "h-full")}
          </div>
        </div>
      );
    }

    // 2 ảnh: chia đôi màn hình
    if (count === 2) {
      return (
        <div className="relative w-full">
          <div className="grid grid-cols-2 gap-2">
            {images.map((url, index) =>
              renderImageItem(url, index, "aspect-[4/5]")
            )}
          </div>
        </div>
      );
    }

    // 3 ảnh: 1 ảnh lớn trên, 2 ảnh nhỏ dưới
    if (count === 3) {
      return (
        <div className="relative w-full">
          <div className="grid gap-2">
            <div className="aspect-[4/3] w-full">
              {renderImageItem(images[0], 0, "h-full")}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {images.slice(1).map((url, i) =>
                renderImageItem(url, i + 1, "aspect-[4/5]")
              )}
            </div>
          </div>
        </div>
      );
    }

    // 4 ảnh: lưới 2x2
    if (count === 4) {
      return (
        <div className="relative w-full">
          <div className="grid grid-cols-2 gap-2">
            {images.map((url, index) =>
              renderImageItem(url, index, "aspect-square")
            )}
          </div>
        </div>
      );
    }

    // 5+ ảnh: 2 ảnh lớn trên, 3 ảnh nhỏ dưới
    if (count >= 5) {
      const firstRow = images.slice(0, 2);
      const secondRow = images.slice(2, 5);

      return (
        <div className="relative w-full">
          <div className="grid gap-2">
            {/* Hàng trên: 2 ảnh lớn */}
            <div className="grid grid-cols-2 gap-2">
              {firstRow.map((url, i) =>
                renderImageItem(url, i, "aspect-[4/3]")
              )}
            </div>
            {/* Hàng dưới: 3 ảnh nhỏ */}
            <div className="grid grid-cols-3 gap-2">
              {secondRow.map((url, i) => {
                const isLastImage = i === secondRow.length - 1;
                const showOverlay = isLastImage && remainingCount > 0;
                const overlayText = `+${remainingCount}`;
                return renderImageItem(url, i + 2, "aspect-[4/5]", showOverlay, overlayText);
              })}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
            {post.user.avatar ? (
              <Image
                src={post.user.avatar}
                alt={post.user.username}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-semibold">
                {(post.user.fullname || post.user.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h3 onClick={() => router.push(`/profile/${post.user._id}`)} className="font-semibold text-gray-900 dark:text-white hover:underline cursor-pointer">
              {post.user.fullname || post.user.username}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimeAgo(post.createdAt)}
            </p>
          </div>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
              {isOwner ? (
                <>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setEditContent(post.content_text);
                      setEditMediaUrls(post.media_url || []);
                      setShowEditModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  >
                    <FaEdit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium">Chỉnh sửa bài viết</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setShowDeleteConfirm(true);
                    }}
                    disabled={isDeleting}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaTrash className="w-4 h-4" />
                    <span className="text-sm font-medium">Xóa bài viết</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={async () => {
                    setIsDropdownOpen(false);
                    
                    if (hasReported) {
                      alert('Bạn đã báo cáo bài viết này rồi. Vui lòng chờ admin xử lý.');
                      return;
                    }

                    setIsCheckingReport(true);
                    try {
                      const { reports } = await getReportsByItem('post', post._id);
                      const userReport = reports.find(
                        (report) => report.reporter._id === currentUserId
                      );
                      
                      if (userReport) {
                        setHasReported(true);
                        alert('Bạn đã báo cáo bài viết này rồi. Vui lòng chờ admin xử lý.');
                      } else {
                        setShowReportModal(true);
                      }
                    } catch (error) {
                      console.error('Error checking report:', error);
                      setShowReportModal(true);
                    } finally {
                      setIsCheckingReport(false);
                    }
                  }}
                  disabled={isCheckingReport || hasReported}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaFlag className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium">
                    {hasReported ? 'Đã báo cáo' : 'Báo cáo bài viết'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <div className="text-gray-900 dark:text-white whitespace-pre-wrap text-[15px] leading-5">
          {showFullText
            ? renderContentWithHashtags(post.content_text)
            : renderContentWithHashtags(contentPreview)
          }
          {post.content_text.length > 200 && (
            <button
              onClick={() => setShowFullText(!showFullText)}
              className="ml-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium text-[15px]"
            >
              {showFullText ? 'Rút gọn' : '... Xem thêm'}
            </button>
          )}
        </div>

        {/* Campaign Badge */}
        {post.campaign_id && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full">
            <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Chiến dịch: {post.campaign_id.title}
            </span>
          </div>
        )}
      </div>

      {/* Media */}
      {renderImageLayout()}

      {/* Stats */}
      <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          {likesCount > 0 && (
            <div className="flex items-center gap-1 cursor-pointer hover:underline">
              <div className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                  <Heart className="w-3 h-3 text-white fill-white" />
                </div>
              </div>
              <span>{likesCount}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {commentsCount > 0 && (
            <span
              onClick={handleComment}
              className="cursor-pointer hover:underline"
            >
              {commentsCount} bình luận
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-gray-200 dark:border-gray-700" />

      {/* Actions */}
      <div className="p-2 flex items-center justify-between gap-2">
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'
            }`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500' : ''}`} />
          <span className="font-medium">Thích</span>
        </button>

        <button
          onClick={handleComment}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium">Bình luận</span>
        </button>

        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
        >
          <Share2 className="w-5 h-5" />
          <span className="font-medium">Chia sẻ</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => !isDeleting && setShowDeleteConfirm(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Xóa bài viết
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    await deletePost(post._id);
                    setShowDeleteConfirm(false);
                    if (onDelete) {
                      onDelete(post._id);
                    }
                  } catch (error: any) {
                    console.error('Error deleting post:', error);
                    alert(error.response?.data?.message || 'Không thể xóa bài viết. Vui lòng thử lại.');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  'Xóa'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => !isUpdating && setShowEditModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900 dark:text-white">
                Chỉnh sửa bài viết
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                disabled={isUpdating}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-4">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[200px] bg-transparent resize-none outline-none border-0 text-lg text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                placeholder="Bạn đang nghĩ gì?"
                disabled={isUpdating}
              />

              {/* Media Preview */}
              {editMediaUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {editMediaUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <Image
                          src={url}
                          alt={`Media ${index + 1}`}
                          width={300}
                          height={300}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setEditMediaUrls(editMediaUrls.filter((_, i) => i !== index));
                        }}
                        disabled={isUpdating}
                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="mt-3 flex items-center justify-between">
                <label className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      try {
                        const uploadResults = await cloudinaryService.uploadMultipleImages(files, 'posts');
                        const newUrls = uploadResults.map((res) => res.secure_url);
                        setEditMediaUrls([...editMediaUrls, ...newUrls]);
                      } catch (error) {
                        console.error('Error uploading images:', error);
                        alert('Không thể tải ảnh. Vui lòng thử lại.');
                      }
                    }}
                    className="hidden"
                    disabled={isUpdating}
                  />
                  <FaImages className="text-green-500 text-xl" />
                </label>
                <button
                  onClick={async () => {
                    if (!editContent.trim() && editMediaUrls.length === 0) {
                      return;
                    }
                    try {
                      setIsUpdating(true);
                      const updatedPost = await updatePost(post._id, {
                        content_text: editContent.trim() || (editMediaUrls.length ? "Đã chia sẻ ảnh" : ""),
                        media_url: editMediaUrls,
                      });
                      setShowEditModal(false);
                      if (onUpdate) {
                        onUpdate(post._id, updatedPost);
                      }
                    } catch (error: any) {
                      console.error('Error updating post:', error);
                      alert(error.response?.data?.message || 'Không thể cập nhật bài viết. Vui lòng thử lại.');
                    } finally {
                      setIsUpdating(false);
                    }
                  }}
                  disabled={isUpdating || (!editContent.trim() && editMediaUrls.length === 0)}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/70 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang cập nhật...
                    </>
                  ) : (
                    'Lưu thay đổi'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      <CommentModal
        postId={post._id}
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        onCommentAdded={handleCommentAdded}
        onCommentDeleted={handleCommentDeleted}
      />

      {/* Report Modal */}
      <ReportModal
        reportedType="post"
        reportedId={post._id}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSuccess={() => {
          setHasReported(true);
        }}
      />
    </div>
  );
}

