'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import PostCard from "@/components/shared/PostCard";
import TrendingHashtags from "@/components/shared/TrendingHashtags";
import { getPosts, Post, createPost, CreatePostData } from "@/services/post.service";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import { FaImages, FaMapMarkerAlt, FaBullhorn, FaTimes, FaSync } from "react-icons/fa";
import { cloudinaryService } from "@/services/cloudinary.service";

function HomeContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  
  // Form state
  const [contentText, setContentText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const renderImageItem = (preview: string, index: number, className = "") => (
    <div key={index} className={`relative group ${className}`}>
      <div className="w-full h-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
        <Image
          src={preview}
          alt={`Preview ${index + 1}`}
          width={800}
          height={800}
          className="w-full h-full object-cover"
        />
      </div>
      <button
        onClick={() => handleRemoveImage(index)}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <FaTimes className="text-xs" />
      </button>
    </div>
  );

  const renderImageLayout = () => {
    const count = imagePreviews.length;
    if (count === 0) return null;

    // 1 ảnh: full width, tỷ lệ gần vuông/3:2
    if (count === 1) {
      return (
        <div className="mt-4">
          <div className="aspect-[4/3] w-full">
            {renderImageItem(imagePreviews[0], 0, "h-full")}
          </div>
        </div>
      );
    }

    // 2 ảnh: chia đôi màn hình
    if (count === 2) {
      return (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {imagePreviews.map((preview, index) =>
            renderImageItem(preview, index, "aspect-[4/5]")
          )}
        </div>
      );
    }

    // 3 ảnh: 1 ảnh lớn trên, 2 ảnh nhỏ dưới
    if (count === 3) {
      return (
        <div className="mt-4 grid gap-2">
          <div className="aspect-[4/3] w-full">
            {renderImageItem(imagePreviews[0], 0, "h-full")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {imagePreviews.slice(1).map((preview, i) =>
              renderImageItem(preview, i + 1, "aspect-[4/5]")
            )}
          </div>
        </div>
      );
    }

    // 4 ảnh: lưới 2x2
    if (count === 4) {
      return (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {imagePreviews.map((preview, index) =>
            renderImageItem(preview, index, "aspect-square")
          )}
        </div>
      );
    }

    // 5+ ảnh: 2 ảnh lớn trên, 3 ảnh nhỏ dưới
    if (count >= 5) {
      const firstRow = imagePreviews.slice(0, 2);
      const secondRow = imagePreviews.slice(2, 5);

      return (
        <div className="mt-4 grid gap-2">
          {/* Hàng trên: 2 ảnh lớn */}
          <div className="grid grid-cols-2 gap-2">
            {firstRow.map((preview, i) =>
              renderImageItem(preview, i, "aspect-[4/3]")
            )}
          </div>
          {/* Hàng dưới: 3 ảnh nhỏ */}
          <div className="grid grid-cols-3 gap-2">
            {secondRow.map((preview, i) =>
              renderImageItem(preview, i + 2, "aspect-[4/5]")
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const handleSubmitPost = async () => {
    if (!contentText.trim() && selectedFiles.length === 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      let mediaUrls: string[] | undefined;
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        const uploadResults = await cloudinaryService.uploadMultipleImages(
          selectedFiles,
          'posts'
        );
        mediaUrls = uploadResults.map((res) => res.secure_url);
        setIsUploading(false);
      }
      const finalContentText = contentText.trim() || (mediaUrls?.length ? "Đã chia sẻ ảnh" : "");
      
      const postData: CreatePostData = {
        content_text: finalContentText,
        media_url: mediaUrls,
      };

      await createPost(postData);

      setContentText("");
      setSelectedFiles([]);
      setImagePreviews([]);
      setIsCreatePostOpen(false);

      const data = await getPosts();
      setPosts(data);
    } catch (err: any) {
      console.error("Error creating post:", err);
      setError(err.response?.data?.message || "Không thể tạo bài viết. Vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleCloseModal = () => {
    setIsCreatePostOpen(false);
    setContentText("");
    setSelectedFiles([]);
    setImagePreviews([]);
    setError(null);
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

      {/* Modal tạo bài viết */}
      {isCreatePostOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-2 sm:px-4"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
              <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-900 dark:text-white">
                Tạo bài viết
              </h2>
              <button
                onClick={handleCloseModal}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-800 text-black-500 font-bold"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            {/* User info - Fixed */}
            <div className="px-4 pt-4 pb-3 flex items-center gap-3 flex-shrink-0 dark:border-gray-800">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                {user?.avatar ? (
                  <Image
                    src={user.avatar}
                    alt="User avatar"
                    width={40}
                    height={40}
                    className="rounded-full object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-semibold">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {user?.fullname || user?.username || "Người dùng"}
                </span>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1">
              {/* Nội dung */}
              <div className="px-4 pt-3 pb-4">
                <textarea
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  className="w-full min-h-[140px] bg-transparent resize-none outline-none border-0 text-lg text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  placeholder={`${user?.fullname || user?.username || "Bạn"} ơi, bạn đang nghĩ gì thế?`}
                />

                {/* Image Previews với layout tuỳ số lượng ảnh */}
                {renderImageLayout()}

                {/* Error message */}
                {error && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Fixed at bottom */}
            <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
              <div className="mt-3 rounded-lg border border-gray-400 dark:border-gray-800 px-3 py-4 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  Thêm vào bài viết của bạn
                </span>
                <div className="flex items-center gap-3">
                  <label className="relative group p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isUploading || isSubmitting}
                    />
                    <FaImages className="text-green-500 text-xl" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 delay-300 pointer-events-none z-10">
                      Ảnh/Video
                    </span>
                  </label>
                  <button 
                    className="relative group p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <FaBullhorn className="text-purple-500 text-xl" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 delay-300 pointer-events-none z-10">
                      Chọn chiến dịch
                    </span>
                  </button>
                  <button 
                    className="relative group p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <FaMapMarkerAlt className="text-red-500 text-xl" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 delay-300 pointer-events-none z-10">
                      Vị trí
                    </span>
                  </button>
                </div>
              </div>

              <button
                onClick={handleSubmitPost}
                disabled={(!contentText.trim() && selectedFiles.length === 0) || isSubmitting || isUploading}
                className="mt-4 w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/70 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang tải ảnh...
                  </>
                ) : isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang đăng...
                  </>
                ) : (
                  "Đăng"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
