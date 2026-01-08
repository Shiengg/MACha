'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaTimes, FaUpload, FaMapMarkerAlt, FaCalendarAlt, FaUsers } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { eventService, Event, UpdateEventPayload } from '@/services/event.service';
import { cloudinaryService } from '@/services/cloudinary.service';
import Swal from 'sweetalert2';

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onEventUpdated?: () => void;
}

export default function EditEventModal({
  isOpen,
  onClose,
  event,
  onEventUpdated,
}: EditEventModalProps) {
  const { user } = useAuth();
  const [locationName, setLocationName] = useState('');
  const [formData, setFormData] = useState<UpdateEventPayload>({
    title: '',
    description: '',
    banner_image: '',
    gallery_images: [],
    start_date: '',
    end_date: '',
    timezone: 'Asia/Ho_Chi_Minh',
    category: 'charity_event',
    capacity: undefined,
  });

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [existingGalleryImages, setExistingGalleryImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: 'volunteering', label: 'Tình nguyện' },
    { value: 'fundraising', label: 'Gây quỹ' },
    { value: 'charity_event', label: 'Sự kiện từ thiện' },
    { value: 'donation_drive', label: 'Tập hợp đóng góp' },
  ];

  useEffect(() => {
    if (isOpen && event) {
      const startDate = event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '';
      const endDate = event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '';
      
      setFormData({
        title: event.title || '',
        description: event.description || '',
        banner_image: event.banner_image || '',
        gallery_images: event.gallery_images || [],
        start_date: startDate,
        end_date: endDate,
        timezone: event.timezone || 'Asia/Ho_Chi_Minh',
        category: event.category || 'charity_event',
        capacity: event.capacity,
      });
      setLocationName(event.location?.location_name || '');
      
      setBannerPreview(event.banner_image || '');
      setExistingGalleryImages(event.gallery_images || []);
      setBannerFile(null);
      setGalleryFiles([]);
      setGalleryPreviews([]);
      setError(null);
    }
  }, [isOpen, event]);

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setGalleryFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGalleryPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveBanner = () => {
    setBannerFile(null);
    setBannerPreview(formData.banner_image || '');
  };

  const handleRemoveGalleryImage = (index: number) => {
    if (index < existingGalleryImages.length) {
      setExistingGalleryImages((prev) => prev.filter((_, i) => i !== index));
      setFormData({
        ...formData,
        gallery_images: formData.gallery_images?.filter((_, i) => i !== index) || [],
      });
    } else {
      const newIndex = index - existingGalleryImages.length;
      setGalleryFiles((prev) => prev.filter((_, i) => i !== newIndex));
      setGalleryPreviews((prev) => prev.filter((_, i) => i !== newIndex));
    }
  };

  const uploadImages = async () => {
    setIsUploading(true);
    try {
      if (bannerFile) {
        const bannerResult = await cloudinaryService.uploadImage(bannerFile, 'events');
        formData.banner_image = bannerResult.secure_url;
      }

      if (galleryFiles.length > 0) {
        const galleryResults = await cloudinaryService.uploadMultipleImages(galleryFiles, 'events');
        const newGalleryUrls = galleryResults.map((r) => r.secure_url);
        formData.gallery_images = [...existingGalleryImages, ...newGalleryUrls];
      } else {
        formData.gallery_images = existingGalleryImages;
      }
    } catch (err: any) {
      console.error('Error uploading images:', err);
      throw new Error('Không thể tải lên hình ảnh. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!event) return;

    if (!formData.title?.trim()) {
      setError('Vui lòng nhập tiêu đề sự kiện');
      return;
    }

    if (!formData.banner_image && !bannerFile) {
      setError('Vui lòng chọn ảnh banner cho sự kiện');
      return;
    }

    if (!formData.start_date) {
      setError('Vui lòng chọn ngày bắt đầu');
      return;
    }

    if (!locationName || !locationName.trim()) {
      setError('Vui lòng nhập vị trí sự kiện (cho bản đồ)');
      return;
    }

    try {
      setIsSubmitting(true);

      if (bannerFile || galleryFiles.length > 0) {
        await uploadImages();
      }

      const updatePayload: UpdateEventPayload & { location_name?: string } = {
        ...formData,
        location_name: locationName.trim(),
      };

      await eventService.updateEvent(event._id, updatePayload);

      Swal.fire({
        icon: 'success',
        title: 'Thành công',
        text: 'Sự kiện đã được cập nhật thành công',
        timer: 2000,
        showConfirmButton: false,
      });

      onEventUpdated?.();
      onClose();
    } catch (err: any) {
      console.error('Error updating event:', err);
      setError(err.response?.data?.message || 'Không thể cập nhật sự kiện. Vui lòng thử lại.');
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: err.response?.data?.message || 'Không thể cập nhật sự kiện. Vui lòng thử lại.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !event) return null;

  const allGalleryImages = [...existingGalleryImages, ...galleryPreviews];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chỉnh sửa sự kiện</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaTimes className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tiêu đề sự kiện <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Ví dụ: Tập hợp đóng góp mì gói cho miền Trung"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Mô tả chi tiết về sự kiện..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Danh mục <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ảnh banner <span className="text-red-500">*</span>
            </label>
            {bannerPreview ? (
              <div className="relative">
                <div className="relative w-full h-48 rounded-lg overflow-hidden">
                  <Image
                    src={bannerPreview}
                    alt="Banner preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveBanner}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                >
                  <FaTimes />
                </button>
                {!bannerFile && (
                  <label className="absolute bottom-2 left-2 bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 cursor-pointer">
                    Thay đổi ảnh
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            ) : (
              <label className="flex items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="text-center">
                  <FaUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Chọn ảnh banner
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ảnh gallery (tùy chọn)
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {allGalleryImages.map((preview, index) => (
                <div key={index} className="relative">
                  <div className="relative aspect-square rounded-lg overflow-hidden">
                    <Image src={preview} alt={`Gallery ${index + 1}`} fill className="object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveGalleryImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  >
                    <FaTimes className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {allGalleryImages.length < 6 && (
                <label className="flex items-center justify-center aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <FaUpload className="w-6 h-6 text-gray-400" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGallerySelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ngày bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ngày kết thúc (tùy chọn)
              </label>
              <input
                type="datetime-local"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FaMapMarkerAlt className="inline mr-2" />
              Vị trí sự kiện (cho bản đồ) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="VD: Hốc Môn, HCM hoặc Quận 1, TP.HCM"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Nhập tên địa điểm nơi sự kiện diễn ra. Hệ thống sẽ tự động xác định tọa độ để hiển thị trên bản đồ.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FaUsers className="inline mr-2" />
              Số lượng người tham gia tối đa (tùy chọn)
            </label>
            <input
              type="number"
              min="1"
              value={formData.capacity || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  capacity: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Để trống nếu không giới hạn"
            />
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isUploading ? 'Đang cập nhật...' : 'Cập nhật sự kiện'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

