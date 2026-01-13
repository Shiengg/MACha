'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User } from '@/services/user.service';
import { CheckCircle2 } from 'lucide-react';

interface UserSearchResultProps {
  user: User;
  query?: string;
}

export default function UserSearchResult({ user, query }: UserSearchResultProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/profile/${user._id}`);
  };

  // Highlight matching text (simple implementation)
  const highlightText = (text: string, searchQuery?: string) => {
    if (!searchQuery || !text) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const displayName = user.fullname || user.username;
  const username = user.username;

  return (
    <div
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt={username}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-semibold text-lg">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {query ? highlightText(displayName, query) : displayName}
            </h3>
            {user.is_verified && (
              <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            @{query ? highlightText(username, query) : username}
          </p>
          {user.bio && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">
              {user.bio}
            </p>
          )}
        </div>

        {/* Role Badge */}
        {user.role && user.role !== 'user' && (
          <div className="flex-shrink-0">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              user.role === 'admin' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : user.role === 'organization'
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}>
              {user.role === 'organization' ? 'Tổ chức' : user.role}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

