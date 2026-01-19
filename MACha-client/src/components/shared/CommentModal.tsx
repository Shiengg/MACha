'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { getComments, addComment, deleteComment, Comment } from '@/services/comment.service';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';

interface CommentModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
}

export default function CommentModal({ postId, isOpen, onClose, onCommentAdded, onCommentDeleted }: CommentModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      // Auto-focus vào input khi modal mở
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, postId]);

  useEffect(() => {
    if (!socket || !isConnected || !isOpen) return;

    const handleCommentAdded = (event: any) => {
      if (event.postId !== postId) return;

      const currentUserId = (user as any)?._id || user?.id;

      if (event.userId === currentUserId) {
        console.log('👤 Đó là bạn vừa comment (đã có trong list)');
        return;
      }

      console.log('💬 Real-time: Có comment mới từ người khác');

      const newCommentFromEvent: Comment = {
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

    const handleCommentDeleted = (event: any) => {
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
      const data = await getComments(postId);
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const comment = await addComment(postId, { content_text: newComment.trim() });
      setComments([comment, ...comments]);
      setNewComment('');
      onCommentAdded?.();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments(comments.filter((c) => c._id !== commentId));
      onCommentDeleted?.();
    } catch (error) {
      console.error('Error deleting comment:', error);
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
    
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Bình luận
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
            </div>
          ) : (
            comments.map((comment) => {
              // Guard clause: Skip comments with null user
              if (!comment.user) {
                return (
                  <div key={comment._id} className="flex gap-3">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                      <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-semibold text-sm">
                        U
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                            Unknown User
                          </h4>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                          {comment.content_text}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-3">
                        {formatTimeAgo(comment.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={comment._id} className="flex gap-3">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                    {comment.user.avatar ? (
                      <Image
                        src={comment.user.avatar}
                        alt={comment.user.username || 'User'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-semibold text-sm">
                        {comment.user.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                          {comment.user.fullname || comment.user.username || 'Unknown User'}
                        </h4>
                        {user && (user.id === comment.user._id || user._id === comment.user._id) && (
                          <button
                            onClick={() => handleDeleteComment(comment._id)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                        {comment.content_text}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-3">
                      {formatTimeAgo(comment.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Comment Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmitComment} className="flex gap-3">
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
              {user && 'avatar' in user && user.avatar ? (
                <Image
                  src={user.avatar as string}
                  alt={user.username || 'User'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-semibold text-sm">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Viết bình luận..."
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-full text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-full transition-colors"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

