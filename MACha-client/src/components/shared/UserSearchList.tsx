'use client';

import { User } from '@/services/user.service';
import UserSearchResult from './UserSearchResult';

interface UserSearchListProps {
  users: User[];
  query?: string;
  loading?: boolean;
  error?: string | null;
}

export default function UserSearchList({ users, query, loading, error }: UserSearchListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (users.length === 0 && query) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">
          Không tìm thấy người dùng nào với từ khóa &quot;{query}&quot;
        </p>
      </div>
    );
  }

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <UserSearchResult key={user._id} user={user} query={query} />
      ))}
    </div>
  );
}

