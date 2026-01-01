'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Hash, Clock, Lock, MoreVertical, Trash2 } from 'lucide-react';
import { getAllSearchHistory, deleteSearchHistory, deleteAllSearchHistory, SearchHistoryItem } from '@/services/search.service';
import { useAuth } from '@/contexts/AuthContext';

interface GroupedHistory {
  date: string;
  items: SearchHistoryItem[];
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return 'Hôm nay';
  }
  if (isYesterday) {
    return 'Hôm qua';
  }

  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export default function SearchHistoryPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [groupedHistory, setGroupedHistory] = useState<GroupedHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      loadHistory();
    }
  }, [isAuthenticated, authLoading, router]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await getAllSearchHistory();
      setHistory(data);

      const grouped = data.reduce((acc: GroupedHistory[], item) => {
        const dateKey = new Date(item.searchedAt).toDateString();
        const existingGroup = acc.find(g => g.date === dateKey);

        if (existingGroup) {
          existingGroup.items.push(item);
        } else {
          acc.push({
            date: dateKey,
            items: [item]
          });
        }

        return acc;
      }, []);

      grouped.forEach(group => {
        group.items.sort((a, b) => 
          new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime()
        );
      });

      grouped.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setGroupedHistory(grouped);
    } catch (error) {
      console.error('Failed to load search history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (historyId: string) => {
    try {
      setDeletingId(historyId);
      await deleteSearchHistory([historyId]);
      setHistory(prev => prev.filter(item => item._id !== historyId));
      
      const updatedGrouped = groupedHistory.map(group => ({
        ...group,
        items: group.items.filter(item => item._id !== historyId)
      })).filter(group => group.items.length > 0);

      setGroupedHistory(updatedGrouped);
    } catch (error) {
      console.error('Failed to delete search history:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllSearchHistory();
      setHistory([]);
      setGroupedHistory([]);
      setShowDeleteAll(false);
    } catch (error) {
      console.error('Failed to delete all search history:', error);
    }
  };

  const handleItemClick = (item: SearchHistoryItem) => {
    const query = item.type === 'hashtag' ? `#${item.keyword}` : item.keyword;
    if (item.type === 'hashtag') {
      router.push(`/hashtag/${encodeURIComponent(item.keyword)}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(item.keyword)}`);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                  Lịch sử tìm kiếm của bạn
                </h1>
              </div>
              {history.length > 0 && (
                <button
                  onClick={() => setShowDeleteAll(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Xóa các tìm kiếm
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {groupedHistory.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">Chưa có lịch sử tìm kiếm</p>
              </div>
            ) : (
              <div className="space-y-8">
                {groupedHistory.map((group) => (
                  <div key={group.date}>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      {formatDate(group.date)}
                    </h2>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <div
                          key={item._id}
                          className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                        >
                          <div className="flex-shrink-0">
                            {item.type === 'hashtag' ? (
                              <Hash className="w-5 h-5 text-gray-400" />
                            ) : (
                              <Clock className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handleItemClick(item)}
                          >
                            <p className="text-sm text-gray-900">
                              Bạn đã tìm kiếm{' '}
                              <span className="font-semibold">
                                "{item.type === 'hashtag' ? `#${item.keyword}` : item.keyword}"
                              </span>
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Lock className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">Chỉ mình tôi</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">
                              {formatTime(item.searchedAt)}
                            </span>
                            <div className="relative">
                              <button
                                onClick={() => handleDelete(item._id)}
                                disabled={deletingId === item._id}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                              >
                                {deletingId === item._id ? (
                                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <Trash2 className="w-4 h-4 text-gray-600" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeleteAll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Xóa tất cả lịch sử tìm kiếm?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa tất cả lịch sử tìm kiếm? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteAll(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

