'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import PostCard from "@/components/shared/PostCard";
import TrendingHashtags from "@/components/shared/TrendingHashtags";
import { getPosts, Post } from "@/services/post.service";
import { useAuth } from "@/contexts/AuthContext";

function HomeContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      router.push('/admin/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPosts();
        setPosts(data);
      } catch (err) {
        console.error("Error loading posts:", err);
        setError("Không thể tải bài viết. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);


  const handleDonate = (postId: string, campaignId?: string) => {
    console.log('Donate to post:', postId, 'Campaign:', campaignId);
    // TODO: Open donation modal or navigate to campaign page
  };

  const handleHashtagClick = (hashtagName: string) => {
    console.log('View hashtag:', hashtagName);
    // TODO: Filter posts by hashtag or navigate to hashtag page
  };

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

        {/* Main Content - Center Feed */}
        <main className="flex-1 lg:ml-[280px] xl:ml-[360px] lg:mr-[280px] xl:mr-[360px]">
          <div className="max-w-[680px] mx-auto pt-6 pb-6 px-4">
            {/* Create Post Card - Placeholder */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                <button className="flex-1 text-left px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-500 dark:text-gray-400 transition-colors">
                  Bạn đang nghĩ gì?
                </button>
              </div>
            </div>

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
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - Trending & Suggestions */}
        <aside className="hidden lg:block lg:w-[280px] xl:w-[360px] fixed right-0 top-0 h-screen overflow-y-auto bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
          <div className="p-4 pt-20 space-y-4">
            <TrendingHashtags onHashtagClick={handleHashtagClick} />
            
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
