'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hash } from 'lucide-react';
import { getTrendingHashtags } from '@/services/hashtag.service';
import { saveSearchHistory } from '@/services/search.service';
import { useAuth } from '@/contexts/AuthContext';

interface HashtagData {
  _id: string;
  name: string;
  count?: number;
}

interface TrendingHashtagsProps {
  onHashtagClick?: (hashtagName: string) => void;
}

export default function TrendingHashtags({ onHashtagClick }: TrendingHashtagsProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [hashtags, setHashtags] = useState<HashtagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrendingHashtags = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTrendingHashtags({ limit: 10 });
        setHashtags(data);
      } catch (err) {
        console.error('Error loading trending hashtags:', err);
        setError('Không thể tải hashtags');
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingHashtags();
  }, []);

  const handleClick = async (hashtagName: string) => {
    const query = `#${hashtagName}`;
    
    if (isAuthenticated) {
      try {
        await saveSearchHistory(query);
      } catch (error) {
        console.error('Failed to save search history:', error);
      }
    }

    router.push(`/hashtag/${encodeURIComponent(hashtagName.toLowerCase())}`);
    
    onHashtagClick?.(hashtagName);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Hashtags thịnh hành
        </h3>
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error || hashtags.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Hash className="w-5 h-5 text-blue-500" />
          Hashtags thịnh hành
        </h3>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {hashtags.map((hashtag, index) => (
          <button
            key={hashtag._id}
            onClick={() => handleClick(hashtag.name)}
            className="w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left flex items-center justify-between group"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 dark:text-white font-semibold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  #{hashtag.name}
                </div>
                {hashtag.count && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {hashtag.count.toLocaleString('vi-VN')} bài viết
                  </div>
                )}
              </div>
            </div>
            <Hash className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>

      <button className="w-full px-4 py-3 text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 font-medium text-sm transition-colors">
        Xem thêm
      </button>
    </div>
  );
}

