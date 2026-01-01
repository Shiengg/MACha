'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPostById, Post } from '@/services/post.service';
import PostCard from '@/components/shared/PostCard';
import { Loader2, ArrowLeft } from 'lucide-react';
import ProtectedRoute from '@/components/guards/ProtectedRoute';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPostById(postId);
        setPost(data);
      } catch (err: any) {
        console.error('Error loading post:', err);
        if (err.response?.status === 404) {
          setError('Không tìm thấy bài viết');
        } else {
          setError('Không thể tải bài viết. Vui lòng thử lại.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Back Button - Facebook Style */}
          <div className="mb-3">
            
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">Đang tải bài viết...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="text-center px-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">⚠️</span>
                </div>
                <div className="text-red-600 dark:text-red-400 text-lg font-semibold mb-2">
                  Có lỗi xảy ra
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                  Về trang chủ
                </button>
              </div>
            </div>
          ) : post ? (
            <PostCard
              post={post}
              onDonate={(postId, campaignId) => {
                if (campaignId) {
                  router.push(`/campaigns/${campaignId}/donate`);
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
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
    </ProtectedRoute>
  );
}

