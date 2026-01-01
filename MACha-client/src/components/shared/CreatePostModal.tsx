'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { FaImages, FaMapMarkerAlt, FaBullhorn, FaTimes, FaSync } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { createPost, CreatePostData } from '@/services/post.service';
import { cloudinaryService } from '@/services/cloudinary.service';
import { Campaign } from '@/services/campaign.service';
import CampaignCard from '@/components/campaign/CampaignCard';
import CampaignSelectModal from './CampaignSelectModal';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
  initialCampaign?: Campaign | null;
}

export default function CreatePostModal({ 
  isOpen, 
  onClose, 
  onPostCreated,
  initialCampaign = null 
}: CreatePostModalProps) {
  const { user } = useAuth();
  const [contentText, setContentText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(initialCampaign);
  const [isCampaignSelectOpen, setIsCampaignSelectOpen] = useState(false);

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

    if (count === 1) {
      return (
        <div className="mt-4">
          <div className="aspect-[4/3] w-full">
            {renderImageItem(imagePreviews[0], 0, "h-full")}
          </div>
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {imagePreviews.map((preview, index) =>
            renderImageItem(preview, index, "aspect-[4/5]")
          )}
        </div>
      );
    }

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

    if (count === 4) {
      return (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {imagePreviews.map((preview, index) =>
            renderImageItem(preview, index, "aspect-square")
          )}
        </div>
      );
    }

    if (count >= 5) {
      const firstRow = imagePreviews.slice(0, 2);
      const secondRow = imagePreviews.slice(2, 5);

      return (
        <div className="mt-4 grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            {firstRow.map((preview, i) =>
              renderImageItem(preview, i, "aspect-[4/3]")
            )}
          </div>
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

  // Helper function to extract hashtags from text
  const extractHashtags = (text: string): string[] => {
    const hashtagsInText = text.match(/#\w+/g) || [];
    return hashtagsInText.map((tag) => tag.substring(1).toLowerCase());
  };

  // Helper function to remove all hashtags from text except the campaign hashtag
  const removeHashtagsExceptCampaign = (text: string, campaignHashtag: string): string => {
    const campaignHashtagLower = campaignHashtag.toLowerCase();
    // Remove all hashtags
    const textWithoutHashtags = text.replace(/#\w+/g, '').trim();
    // Remove extra spaces
    return textWithoutHashtags.replace(/\s+/g, ' ').trim();
  };

  // Helper function to check if campaign hashtag exists in content text
  const hasCampaignHashtag = (text: string, campaignHashtag: string): boolean => {
    const extractedHashtags = extractHashtags(text);
    return extractedHashtags.includes(campaignHashtag.toLowerCase());
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
      
      let finalContentText = contentText.trim() || (mediaUrls?.length ? "Đã chia sẻ ảnh" : "");
      
      // If campaign is selected and has hashtag, remove all other hashtags and ensure campaign hashtag exists
      if (selectedCampaign?.hashtag?.name) {
        const campaignHashtagName = selectedCampaign.hashtag.name;
        // Remove all hashtags from content (including wrong ones)
        finalContentText = removeHashtagsExceptCampaign(finalContentText, campaignHashtagName);
        // Add campaign hashtag to the end if content is not empty, otherwise just the hashtag
        const hashtagToAdd = `#${campaignHashtagName}`;
        if (finalContentText.trim()) {
          finalContentText = `${finalContentText} ${hashtagToAdd}`;
        } else {
          finalContentText = hashtagToAdd;
        }
      }
      
      const postData: CreatePostData = {
        content_text: finalContentText,
        media_url: mediaUrls,
        campaign_id: selectedCampaign?._id,
      };

      await createPost(postData);

      setContentText("");
      setSelectedFiles([]);
      setImagePreviews([]);
      setSelectedCampaign(initialCampaign);
      setError(null);
      onClose();
      
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (err: any) {
      console.error("Error creating post:", err);
      setError(err.response?.data?.message || "Không thể tạo bài viết. Vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleCloseModal = () => {
    setContentText("");
    setSelectedFiles([]);
    setImagePreviews([]);
    setSelectedCampaign(initialCampaign);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-2 sm:px-4"
        onClick={handleCloseModal}
      >
        <div
          className={`w-full max-w-xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden flex flex-col 
            ${selectedCampaign ? 'max-h-[80vh]' : 'max-h-[90vh]'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
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

          <div className="overflow-y-auto flex-1">
            <div className="px-4 pt-3 pb-4">
              <textarea
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                className="w-full min-h-[140px] bg-transparent resize-none outline-none border-0 text-lg text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                placeholder={`${user?.fullname || user?.username || "Bạn"} ơi, bạn đang nghĩ gì thế?`}
              />

              {renderImageLayout()}

              {selectedCampaign && (
                <div className="mt-4 relative">
                  <button
                    onClick={() => setSelectedCampaign(null)}
                    className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-all"
                    aria-label="Xóa chiến dịch"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                  <div onClick={(e) => e.stopPropagation()}>
                    <CampaignCard campaign={selectedCampaign} disableNavigation={true} />
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
          </div>

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
                {!selectedCampaign && (
                  <button 
                    onClick={() => setIsCampaignSelectOpen(true)}
                    className="relative group p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <FaBullhorn className="text-purple-500 text-xl" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 delay-300 pointer-events-none z-10">
                      Chọn chiến dịch
                    </span>
                  </button>
                )}
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

      <CampaignSelectModal
        isOpen={isCampaignSelectOpen}
        onClose={() => setIsCampaignSelectOpen(false)}
        onSelect={(campaign) => {
          setSelectedCampaign(campaign);
          setIsCampaignSelectOpen(false);
        }}
      />
    </>
  );
}

