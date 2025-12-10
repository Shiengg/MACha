'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getPostById, Post } from '@/services/post.service';
import PostCard from './PostCard';

interface PostModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PostModal({ postId, isOpen, onClose }: PostModalProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !postId) return;

    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPostById(postId);
        setPost(data);
      } catch (err) {
        console.error('Error loading post:', err);
        setError('Không thể tải bài viết');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, isOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-gray-50 dark:bg-gray-900 rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header with Close Button */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Bài viết
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full transition-all hover:scale-110"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-60px)]">
          {loading ? (
            <div className="flex items-center justify-center py-20 bg-white dark:bg-gray-800">
              <div className="text-center">
                <div className="inline-block w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Đang tải bài viết...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 bg-white dark:bg-gray-800">
              <div className="text-center px-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">⚠️</span>
                </div>
                <div className="text-red-600 dark:text-red-400 text-lg font-semibold mb-2">
                  Có lỗi xảy ra
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : post ? (
            <div className="bg-gray-50 dark:bg-gray-900 p-4">
              <PostCard
                post={post}
                onDonate={(postId, campaignId) => {
                  console.log('Donate:', postId, campaignId);
                  // TODO: Handle donation
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-20 bg-white dark:bg-gray-800">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📭</span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Không tìm thấy bài viết</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

