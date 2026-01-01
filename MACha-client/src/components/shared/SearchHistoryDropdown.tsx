'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Hash, Clock, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSearchHistory, deleteSearchHistory, SearchHistoryItem } from '@/services/search.service';
import { useAuth } from '@/contexts/AuthContext';

interface SearchHistoryDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}

export default function SearchHistoryDropdown({
  isOpen,
  onClose,
  onSearch,
}: SearchHistoryDropdownProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadHistory();
    }
  }, [isOpen, isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await getSearchHistory();
      
      const uniqueMap = new Map<string, SearchHistoryItem>();
      
      data.forEach((item) => {
        const key = `${item.keyword}_${item.type}`;
        const existing = uniqueMap.get(key);
        
        if (!existing) {
          uniqueMap.set(key, item);
        } else {
          const existingDate = new Date(existing.searchedAt);
          const currentDate = new Date(item.searchedAt);
          if (currentDate > existingDate) {
            uniqueMap.set(key, item);
          }
        }
      });
      
      const uniqueHistory = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime()
      );
      
      setHistory(uniqueHistory);
    } catch (error) {
      console.error('Failed to load search history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item: SearchHistoryItem) => {
    if (isEditMode) return;

    const query = item.type === 'hashtag' ? `#${item.keyword}` : item.keyword;
    onSearch(query);
    onClose();
  };

  const handleItemClickWrapper = (e: React.MouseEvent, item: SearchHistoryItem) => {
    e.stopPropagation();
    handleItemClick(item);
  };

  const handleDelete = async (e: React.MouseEvent, historyId: string) => {
    e.stopPropagation();
    try {
      await deleteSearchHistory([historyId]);
      setHistory(prev => prev.filter(item => item._id !== historyId));
    } catch (error) {
      console.error('Failed to delete search history:', error);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    router.push('/search/history');
    onClose();
  };

  const displayedHistory = history.slice(0, 10);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 mt-2 w-full max-w-lg bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col"
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Mới đây</h3>
          {history.length > 0 && (
            <button
              onClick={handleEditClick}
              type="button"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Chỉnh sửa
            </button>
          )}
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-2"></div>
            <p className="text-sm">Đang tải...</p>
          </div>
        ) : displayedHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Chưa có lịch sử tìm kiếm</p>
          </div>
        ) : (
          <div>
            {displayedHistory.map((item) => (
              <div
                key={item._id}
                onClick={(e) => handleItemClickWrapper(e, item)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <div className="flex-shrink-0">
                  {item.type === 'hashtag' ? (
                    <Hash className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">
                    {item.type === 'hashtag' ? `#${item.keyword}` : item.keyword}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, item._id)}
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

