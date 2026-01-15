'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit, Image as ImageIcon, FileText, Calendar, AlertCircle, Upload } from 'lucide-react';
import { campaignUpdateRequestService, CreateUpdateRequestPayload } from '@/services/campaignUpdateRequest.service';
import { cloudinaryService } from '@/services/cloudinary.service';
import { Campaign } from '@/services/campaign.service';
import Swal from 'sweetalert2';

interface CampaignUpdateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
  onSuccess?: () => void;
  existingPendingRequest?: any;
}

export default function CampaignUpdateRequestModal({
  isOpen,
  onClose,
  campaign,
  onSuccess,
  existingPendingRequest,
}: CampaignUpdateRequestModalProps) {
  const [bannerImage, setBannerImage] = useState<string>(campaign.banner_image || '');
  const [galleryImages, setGalleryImages] = useState<string[]>(campaign.gallery_images || []);
  const [description, setDescription] = useState<string>(campaign.description || '');
  const [endDate, setEndDate] = useState<string>(
    campaign.end_date ? new Date(campaign.end_date).toISOString().split('T')[0] : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<{
    banner_image?: string;
    gallery_images?: string;
    description?: string;
    end_date?: string;
    general?: string;
  }>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setBannerImage(campaign.banner_image || '');
      setGalleryImages(campaign.gallery_images || []);
      setDescription(campaign.description || '');
      setEndDate(campaign.end_date ? new Date(campaign.end_date).toISOString().split('T')[0] : '');
      setErrors({});
    }
  }, [isOpen, campaign]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, isSubmitting, onClose]);

  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, banner_image: 'Kích thước file không được vượt quá 5MB' });
      return;
    }

    try {
      setIsUploading(true);
      setErrors({ ...errors, banner_image: undefined });
      const response = await cloudinaryService.uploadImage(file);
      setBannerImage(response.secure_url);
    } catch (error: any) {
      setErrors({ ...errors, banner_image: error?.message || 'Không thể upload ảnh. Vui lòng thử lại.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const oversizedFiles = files.filter(f => f.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setErrors({ ...errors, gallery_images: 'Một số file có kích thước vượt quá 5MB' });
      return;
    }

    if (galleryImages.length + files.length > 10) {
      setErrors({ ...errors, gallery_images: 'Tối đa 10 ảnh trong gallery' });
      return;
    }

    try {
      setIsUploading(true);
      setErrors({ ...errors, gallery_images: undefined });
      const uploadPromises = files.map(file => cloudinaryService.uploadImage(file));
      const responses = await Promise.all(uploadPromises);
      const urls = responses.map(response => response.secure_url);
      setGalleryImages([...galleryImages, ...urls]);
    } catch (error: any) {
      setErrors({ ...errors, gallery_images: error?.message || 'Không thể upload ảnh. Vui lòng thử lại.' });
    } finally {
      setIsUploading(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Check if at least one field has changed
    const hasBannerChange = bannerImage !== (campaign.banner_image || '');
    const hasGalleryChange = JSON.stringify(galleryImages) !== JSON.stringify(campaign.gallery_images || []);
    const hasDescriptionChange = description !== (campaign.description || '');
    const hasEndDateChange = endDate !== (campaign.end_date ? new Date(campaign.end_date).toISOString().split('T')[0] : '');

    if (!hasBannerChange && !hasGalleryChange && !hasDescriptionChange && !hasEndDateChange) {
      newErrors.general = 'Vui lòng thay đổi ít nhất một thông tin';
    }

    // Validate end_date if provided
    if (endDate) {
      const newEndDate = new Date(endDate);
      const currentEndDate = campaign.end_date ? new Date(campaign.end_date) : null;
      if (currentEndDate && newEndDate <= currentEndDate) {
        newErrors.end_date = 'Ngày kết thúc mới phải sau ngày kết thúc hiện tại';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (existingPendingRequest) {
      Swal.fire({
        icon: 'warning',
        title: 'Đã có request đang chờ duyệt',
        text: 'Bạn đã có một yêu cầu chỉnh sửa đang chờ admin duyệt. Vui lòng đợi admin xử lý request hiện tại.',
        confirmButtonText: 'OK'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      const requestedChanges: CreateUpdateRequestPayload['requested_changes'] = {};
      
      if (bannerImage !== (campaign.banner_image || '')) {
        requestedChanges.banner_image = bannerImage;
      }
      if (JSON.stringify(galleryImages) !== JSON.stringify(campaign.gallery_images || [])) {
        requestedChanges.gallery_images = galleryImages;
      }
      if (description !== (campaign.description || '')) {
        requestedChanges.description = description;
      }
      if (endDate !== (campaign.end_date ? new Date(campaign.end_date).toISOString().split('T')[0] : '')) {
        requestedChanges.end_date = endDate;
      }

      await campaignUpdateRequestService.createUpdateRequest(campaign._id, {
        requested_changes: requestedChanges
      });

      Swal.fire({
        icon: 'success',
        title: 'Thành công!',
        text: 'Yêu cầu chỉnh sửa đã được gửi. Admin sẽ xem xét và duyệt trong thời gian sớm nhất.',
        confirmButtonText: 'OK'
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.';
      setErrors({ general: errorMessage });
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Yêu cầu chỉnh sửa campaign
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Yêu cầu của bạn cần được admin duyệt trước khi áp dụng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errors.general && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">{errors.general}</p>
            </div>
          )}

          {existingPendingRequest && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Đã có yêu cầu đang chờ duyệt
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Vui lòng đợi admin xử lý yêu cầu hiện tại trước khi gửi yêu cầu mới.
                </p>
              </div>
            </div>
          )}

          {/* Banner Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <ImageIcon className="w-4 h-4 inline mr-1" />
              Ảnh bìa
            </label>
            <div className="space-y-2">
              {bannerImage && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img
                    src={bannerImage}
                    alt="Ảnh bìa"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setBannerImage('')}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click để upload</span> hoặc kéo thả
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG (MAX. 5MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleBannerImageUpload}
                  disabled={isUploading || isSubmitting}
                />
              </label>
            </div>
            {errors.banner_image && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.banner_image}</p>
            )}
          </div>

          {/* Gallery Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <ImageIcon className="w-4 h-4 inline mr-1" />
              Thư viện ảnh (Tối đa 10 ảnh)
            </label>
            <div className="space-y-2">
              {galleryImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {galleryImages.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <img
                        src={url}
                        alt={`Ảnh ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(index)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {galleryImages.length < 10 && (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-3 pb-4">
                    <Upload className="w-6 h-6 mb-1 text-gray-400" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Thêm ảnh vào thư viện ({galleryImages.length}/10)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryImageUpload}
                    disabled={isUploading || isSubmitting}
                  />
                </label>
              )}
            </div>
            {errors.gallery_images && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.gallery_images}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Mô tả
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              placeholder="Nhập mô tả chi tiết về campaign..."
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Ngày kết thúc
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={campaign.end_date ? new Date(campaign.end_date).toISOString().split('T')[0] : undefined}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={isSubmitting}
            />
            {errors.end_date && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.end_date}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Ngày kết thúc mới phải sau ngày kết thúc hiện tại
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading || !!existingPendingRequest}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                Gửi yêu cầu
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

