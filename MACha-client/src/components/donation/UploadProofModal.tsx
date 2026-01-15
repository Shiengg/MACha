'use client';

import { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cloudinaryService } from '@/services/cloudinary.service';
import apiClient from '@/lib/api-client';
import { UPLOAD_DONATION_PROOF_ROUTE } from '@/constants/api';

interface UploadProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  donationId: string;
  onSuccess?: () => void;
}

export default function UploadProofModal({
  isOpen,
  onClose,
  donationId,
  onSuccess,
}: UploadProofModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILES = 5;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setError(null);

    // Validate file count
    if (selectedFiles.length + files.length > MAX_FILES) {
      setError(`Tối đa ${MAX_FILES} ảnh được phép tải lên`);
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    files.forEach((file) => {
      // Check file type
      if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
        invalidFiles.push(`${file.name}: Chỉ chấp nhận file JPG/PNG`);
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(`${file.name}: Kích thước file vượt quá 5MB`);
        return;
      }

      validFiles.push(file);
    });

    if (invalidFiles.length > 0) {
      setError(invalidFiles.join('\n'));
    }

    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(newFiles);

      // Create preview URLs
      const newPreviewUrls = validFiles.map((file) => URL.createObjectURL(file));
      setPreviewUrls([...previewUrls, ...newPreviewUrls]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    const newPreviews = [...previewUrls];
    
    // Revoke object URL to free memory
    URL.revokeObjectURL(newPreviews[index]);
    
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newPreviews);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Vui lòng chọn ít nhất một ảnh');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Upload images to Cloudinary
      const uploadResults = await cloudinaryService.uploadMultipleImages(
        selectedFiles,
        'donations/proofs'
      );

      const imageUrls = uploadResults.map((result) => result.secure_url);

      // Upload proof to backend
      await apiClient.post(UPLOAD_DONATION_PROOF_ROUTE(donationId), {
        proof_images: imageUrls,
      });

      // Clean up preview URLs
      previewUrls.forEach((url) => URL.revokeObjectURL(url));

      // Reset state
      setSelectedFiles([]);
      setPreviewUrls([]);

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Error uploading proof:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Có lỗi xảy ra khi upload minh chứng. Vui lòng thử lại.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      // Clean up preview URLs
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setSelectedFiles([]);
      setPreviewUrls([]);
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Cập nhật minh chứng giao dịch
          </h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <p className="text-sm text-gray-600 mb-4">
            Ảnh minh chứng sẽ được sử dụng để xác minh giao dịch trong trường hợp phát sinh tranh chấp.
          </p>

          {/* File Input */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              multiple
              onChange={handleFileSelect}
              disabled={uploading || selectedFiles.length >= MAX_FILES}
              className="hidden"
              id="proof-file-input"
            />
            <label
              htmlFor="proof-file-input"
              className={`flex flex-col items-center justify-center w-full h-32 sm:h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                uploading || selectedFiles.length >= MAX_FILES
                  ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                  : 'border-gray-300 hover:border-orange-500 hover:bg-orange-50'
              }`}
            >
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 text-center px-4">
                {selectedFiles.length >= MAX_FILES
                  ? `Đã đạt tối đa ${MAX_FILES} ảnh`
                  : `Chọn ảnh (JPG/PNG, tối đa 5MB/ảnh, tối đa ${MAX_FILES} ảnh)`}
              </p>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
            </div>
          )}

          {/* Preview Images */}
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Xem trước ${index + 1}`}
                    className="w-full h-32 sm:h-40 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Đang tải lên...
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4" />
                Tải lên ngay
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

