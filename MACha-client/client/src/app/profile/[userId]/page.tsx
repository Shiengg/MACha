'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import { getUserById, User } from '@/services/user.service';

function ProfileContent() {
  const params = useParams();
  const userId = params.userId as string;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        const userData = await getUserById(userId);
        setUser(userData);
      } catch (err) {
        console.error("Error loading user:", err);
        setError("Không thể tải thông tin người dùng. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-800 p-8 text-center max-w-md">
          <div className="text-red-500 dark:text-red-400 text-lg font-medium mb-2">
            ⚠️ Có lỗi xảy ra
          </div>
          <p className="text-gray-600 dark:text-gray-400">{error || "Không tìm thấy người dùng"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex max-w-[1920px] mx-auto">
        {/* Left Sidebar - Pink placeholder */}
        <aside className="hidden lg:block lg:w-[280px] xl:w-[360px] fixed left-0 top-0 h-screen bg-pink-100 dark:bg-pink-900/20 border-r border-gray-200 dark:border-gray-700">
          <div className="p-6 pt-20">
            <div className="text-gray-600 dark:text-gray-400 font-medium">
              Left Sidebar
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              (Làm sau)
            </div>
          </div>
        </aside>

        {/* Main Content - Profile */}
        <main className="flex-1 lg:ml-[280px] xl:ml-[360px] lg:mr-[280px] xl:mr-[360px]">
          <div className="max-w-[680px] mx-auto pt-6 pb-6 px-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                {user.username}
              </h1>
            </div>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="hidden lg:block lg:w-[280px] xl:w-[360px] fixed right-0 top-0 h-screen overflow-y-auto bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
          <div className="p-4 pt-20 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Thông tin thêm
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                (Sẽ làm sau)
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

