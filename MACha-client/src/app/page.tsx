'use client';

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import PostCard from "@/components/shared/PostCard";
import TrendingHashtags from "@/components/shared/TrendingHashtags";
import CreatePostModal from "@/components/shared/CreatePostModal";
import { getPosts, Post } from "@/services/post.service";
import { useAuth } from "@/contexts/AuthContext";
import { FaSync, FaUser, FaComments, FaShieldAlt, FaFileContract, FaUndo } from "react-icons/fa";
import Image from "next/image";

function HomeContent() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      router.push('/admin/dashboard');
    }
  }, [user, router]);

  const fetchPosts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await getPosts();
      setPosts(data);
    } catch (err) {
      console.error("Error loading posts:", err);
      setError("Không thể tải bài viết. Vui lòng thử lại sau.");
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowRefreshButton(true);
    await fetchPosts(true);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    const handleRefreshEvent = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setShowRefreshButton(true);
      fetchPosts(true);
    };

    window.addEventListener('refreshPosts', handleRefreshEvent);
    return () => {
      window.removeEventListener('refreshPosts', handleRefreshEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Only show refresh button when actively refreshing
    // Hide it when refresh completes
    if (!isRefreshing) {
      const timer = setTimeout(() => {
        setShowRefreshButton(false);
      }, 500); // Hide after 500ms when refresh completes
      return () => clearTimeout(timer);
    }
  }, [isRefreshing]);


  const handleDonate = (postId: string, campaignId?: string) => {
    console.log('Donate to post:', postId, 'Campaign:', campaignId);
    // TODO: Open donation modal or navigate to campaign page
  };

  const handleDeletePost = async (postId: string) => {
    try {
      // Remove post from local state
      setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
    } catch (error) {
      console.error('Error removing post from list:', error);
      // If error, refresh the entire list
      await fetchPosts();
    }
  };

  const handleUpdatePost = async (postId: string, updatedPost: Post) => {
    try {
      // Update post in local state
      setPosts((prevPosts) =>
        prevPosts.map((post) => (post._id === postId ? updatedPost : post))
      );
    } catch (error) {
      console.error('Error updating post in list:', error);
      // If error, refresh the entire list
      await fetchPosts();
    }
  };

  const handleHashtagClick = (hashtagName: string) => {
    console.log('View hashtag:', hashtagName);
    // TODO: Filter posts by hashtag or navigate to hashtag page
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex max-w-[1920px] mx-auto">
        {/* Left Sidebar - Navigation Menu */}
        <aside className="hidden lg:block lg:w-[280px] xl:w-[360px] fixed left-0 top-0 h-screen overflow-y-auto bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
          <div className="p-4 pt-20 space-y-1">
            {/* Profile Button */}
            {user && (() => {
              const userId = (user as any)?._id || (user as any)?.id;
              const isActive = pathname === `/profile/${userId}`;
              return (
                <button
                  onClick={() => {
                    if (userId) {
                      router.push(`/profile/${userId}`);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                    isActive
                      ? 'bg-gray-100 dark:bg-gray-800 font-semibold'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 font-medium'
                  }`}
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 flex-shrink-0">
                    {user.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.username || 'User avatar'}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                        {user.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <span className={`text-lg font-semibold truncate ${
                    isActive
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {user.fullname || user.username || 'Trang cá nhân'}
                  </span>
                </button>
              );
            })()}

            {/* Messages Button */}
            <button
              onClick={() => router.push('/messages')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                pathname === '/messages'
                  ? 'bg-gray-100 dark:bg-gray-800 font-semibold'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 font-medium'
              }`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative" style={{
                background: 'linear-gradient(to bottom right, #10b981, #f97316)',
              }}>
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center p-2">
                  <FaComments 
                    className="w-5 h-5"
                    style={{
                      color: 'transparent',
                      background: 'linear-gradient(to bottom right, #10b981, #f97316)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  />
                </div>
              </div>
              <span className={`text-lg font-semibold truncate ${
                pathname === '/messages'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                Nhắn tin
              </span>
            </button>

            {/* Admin Team Button */}
            <button
              onClick={() => router.push('/admins')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                pathname === '/admins'
                  ? 'bg-gray-100 dark:bg-gray-800 font-semibold'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 font-medium'
              }`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative" style={{
                background: 'linear-gradient(to bottom right, #10b981, #f97316)',
              }}>
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center p-2">
                  <FaShieldAlt 
                    className="w-5 h-5"
                    style={{
                      color: 'transparent',
                      background: 'linear-gradient(to bottom right, #10b981, #f97316)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  />
                </div>
              </div>
              <span className={`text-lg font-semibold truncate ${
                pathname === '/admins'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                Đội ngũ Admin
              </span>
            </button>

            {/* Terms Button */}
            <button
              onClick={() => router.push('/terms')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                pathname === '/terms'
                  ? 'bg-gray-100 dark:bg-gray-800 font-semibold'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 font-medium'
              }`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative" style={{
                background: 'linear-gradient(to bottom right, #667eea, #764ba2)',
              }}>
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center p-2">
                  <FaFileContract 
                    className="w-5 h-5"
                    style={{
                      color: 'transparent',
                      background: 'linear-gradient(to bottom right, #667eea, #764ba2)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  />
                </div>
              </div>
              <span className={`text-lg font-semibold truncate ${
                pathname === '/terms'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                Điều khoản
              </span>
            </button>

            {/* Recovery Cases Button */}
            <button
              onClick={() => router.push('/creator/recovery-cases')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                pathname === '/creator/recovery-cases'
                  ? 'bg-gray-100 dark:bg-gray-800 font-semibold'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 font-medium'
              }`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative" style={{
                background: 'linear-gradient(to bottom right, #f97316, #ea580c)',
              }}>
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center p-2">
                  <FaUndo 
                    className="w-5 h-5"
                    style={{
                      color: 'transparent',
                      background: 'linear-gradient(to bottom right, #f97316, #ea580c)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  />
                </div>
              </div>
              <span className={`text-lg font-semibold truncate ${
                pathname === '/creator/recovery-cases'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                Hoàn tiền
              </span>
            </button>

            {/* Divider */}
            <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>

            {/* Trending Hashtags */}
            <TrendingHashtags onHashtagClick={handleHashtagClick} />
          </div>
        </aside>

        {/* Main Content - Center Feed */}
        <main className="flex-1 lg:ml-[280px] xl:ml-[360px] lg:mr-[280px] xl:mr-[360px]">
          <div className="max-w-[680px] mx-auto pt-6 pb-6 px-4">
            {/* Create Post Card - Placeholder */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden" >
                  {user?.avatar ? (
                    <Image src={user?.avatar} alt="User avatar" width={40} height={40} className="rounded-full object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-semibold">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsCreatePostOpen(true)}
                  className="flex-1 text-left px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
                >
                  Bạn đang nghĩ gì?
                </button>
              </div>
            </div>

            {/* Refresh Button - Floating circular button - Only show when refreshing */}
            {isRefreshing && (
              <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${showRefreshButton || isRefreshing ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing || loading}
                  className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  aria-label="Refresh posts"
                >
                  <FaSync className={`w-5 h-5 text-orange-500 dark:text-orange-400 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}

            {/* Posts Feed */}
            {loading ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <div className="inline-block w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                <p className="mt-4 text-lg">Đang tải bài viết...</p>
              </div>
            ) : error ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-800 p-8 text-center">
                <div className="text-red-500 dark:text-red-400 text-lg font-medium mb-2">
                  ⚠️ Có lỗi xảy ra
                </div>
                <p className="text-gray-600 dark:text-gray-400">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Thử lại
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Chưa có bài viết nào
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Hãy là người đầu tiên chia sẻ điều gì đó!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    onDonate={handleDonate}
                    onDelete={handleDeletePost}
                    onUpdate={handleUpdatePost}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - Trending & Suggestions */}
        <aside className="hidden lg:block lg:w-[280px] xl:w-[360px] fixed right-0 top-0 h-screen overflow-y-auto bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
          <div className="p-4 pt-20 space-y-4">
            
            
            {/* Placeholder cho các widget khác */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Gợi ý theo dõi
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                (Sẽ làm sau)
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal tạo bài viết */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={async () => {
          await fetchPosts(true);
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}
