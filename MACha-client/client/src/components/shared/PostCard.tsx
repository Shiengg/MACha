'use client';

import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, DollarSign, MoreHorizontal } from 'lucide-react';
import Image from 'next/image';

interface PostCardProps {
  post: {
    _id: string;
    user: {
      _id: string;
      username: string;
      avatar?: string; // Backend dùng 'avatar'
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
}

export default function PostCard({ post, onLike, onComment, onShare, onDonate }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [showFullText, setShowFullText] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    onLike?.(post._id);
  };

  const handleComment = () => {
    onComment?.(post._id);
  };

  const handleShare = () => {
    onShare?.(post._id);
  };

  const handleDonate = () => {
    onDonate?.(post._id, post.campaign_id?._id);
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
                {post.user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white hover:underline cursor-pointer">
              {post.user.username}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimeAgo(post.createdAt)}
            </p>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
          <MoreHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
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
      {post.media_url && post.media_url.length > 0 && (
        <div className="relative w-full">
          {post.media_url.length === 1 ? (
            <div className="relative w-full max-h-[600px] bg-gray-100 dark:bg-gray-900">
              <img
                src={post.media_url[0]}
                alt="Post media"
                className="w-full h-auto max-h-[600px] object-contain"
              />
            </div>
          ) : (
            <div className={`grid gap-1 ${
              post.media_url.length === 2 ? 'grid-cols-2' : 
              post.media_url.length === 3 ? 'grid-cols-3' : 
              'grid-cols-2'
            }`}>
              {post.media_url.slice(0, 4).map((url, index) => (
                <div key={index} className="relative w-full aspect-square bg-gray-100 dark:bg-gray-900">
                  <img
                    src={url}
                    alt={`Post media ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {index === 3 && (post.media_url?.length ?? 0) > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-3xl font-semibold">
                        +{(post.media_url?.length ?? 0) - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
          {(post.commentsCount ?? 0) > 0 && (
            <span className="cursor-pointer hover:underline">
              {post.commentsCount} bình luận
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
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
            isLiked ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'
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

        {/* Donate Button - Highlighted */}
        <button
          onClick={handleDonate}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all text-white font-semibold shadow-md hover:shadow-lg"
        >
          <DollarSign className="w-5 h-5 fill-white" />
          <span>Quyên góp</span>
        </button>
      </div>
    </div>
  );
}

