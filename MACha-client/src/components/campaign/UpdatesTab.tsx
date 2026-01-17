'use client';

import { useState, useEffect, memo } from 'react';
import { campaignService, CampaignUpdate, CreateCampaignUpdatePayload } from '@/services/campaign.service';
import { cloudinaryService } from '@/services/cloudinary.service';
import Swal from 'sweetalert2';

interface UpdatesTabProps {
    campaignId: string;
    updates: CampaignUpdate[];
    setUpdates: React.Dispatch<React.SetStateAction<CampaignUpdate[]>>;
    updatesLoading: boolean;
    isCreator: boolean;
}

const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} tuần trước`;
    return `${Math.floor(diffInSeconds / 2592000)} tháng trước`;
};

function UpdatesTab({ campaignId, updates, setUpdates, updatesLoading, isCreator }: UpdatesTabProps) {
    const [updateContent, setUpdateContent] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Cleanup blob URL when component unmounts or imagePreview changes
    useEffect(() => {
        return () => {
            if (imagePreview && imagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Cleanup previous preview URL if exists
            if (imagePreview && imagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreview);
            }
            setSelectedImage(file);
            // Use URL.createObjectURL instead of FileReader for better performance and reliability
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
        }
    };

    const handleSubmitUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!updateContent.trim() && !selectedImage) return;

        try {
            setIsSubmitting(true);
            let imageUrl: string | undefined;

            if (selectedImage) {
                const uploadResult = await cloudinaryService.uploadImage(selectedImage, 'campaign-updates');
                imageUrl = uploadResult.secure_url;
            }

            const payload: CreateCampaignUpdatePayload = {};
            if (updateContent.trim()) {
                payload.content = updateContent.trim();
            }
            if (imageUrl) {
                payload.image_url = imageUrl;
            }

            const newUpdate = await campaignService.createCampaignUpdate(campaignId, payload);
            
            // Optimistically update state (socket event will also update for consistency)
            setUpdates(prev => {
                const exists = prev.some(u => String(u._id) === String(newUpdate._id));
                if (exists) return prev;
                return [newUpdate, ...prev];
            });
            
            // Cleanup blob URL before resetting state
            if (imagePreview && imagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreview);
            }
            setUpdateContent('');
            setSelectedImage(null);
            setImagePreview(null);
            setShowForm(false);
        } catch (error: any) {
            console.error('Failed to create update:', error);
            alert(error.response?.data?.message || 'Không thể tạo cập nhật');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUpdate = async (updateId: string) => {
        const result = await Swal.fire({
            title: 'Xác nhận xóa',
            text: 'Bạn có chắc muốn xóa cập nhật này?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy',
        });

        if (!result.isConfirmed) return;

        try {
            await campaignService.deleteCampaignUpdate(updateId);
            setUpdates(prev => prev.filter(u => String(u._id) !== String(updateId)));
            Swal.fire('Đã xóa!', 'Cập nhật đã được xóa thành công', 'success');
        } catch (error: any) {
            console.error('Failed to delete update:', error);
            Swal.fire('Lỗi', error.response?.data?.message || 'Không thể xóa cập nhật', 'error');
            // Refresh updates on error to ensure consistency
            try {
                const data = await campaignService.getCampaignUpdates(campaignId);
                setUpdates(data);
            } catch (fetchError) {
                console.error('Failed to refresh updates:', fetchError);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Create Update Form - Only for creator */}
            {isCreator && (
                <div className="bg-white rounded-xl p-6">
                    {!showForm ? (
                        <button
                            onClick={() => setShowForm(true)}
                            className="w-full py-3 px-4 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Tạo cập nhật mới
                        </button>
                    ) : (
                        <form onSubmit={handleSubmitUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nội dung cập nhật (có thể là text, ảnh hoặc cả hai)
                                </label>
                                <textarea
                                    value={updateContent}
                                    onChange={(e) => setUpdateContent(e.target.value)}
                                    placeholder="Nhập nội dung cập nhật (tùy chọn)..."
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Chọn ảnh (tùy chọn)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                />
                            </div>

                            {imagePreview && (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Xem trước"
                                        className="max-w-full h-auto rounded-lg max-h-64 object-contain"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            // Cleanup blob URL before clearing preview
                                            if (imagePreview && imagePreview.startsWith('blob:')) {
                                                URL.revokeObjectURL(imagePreview);
                                            }
                                            setSelectedImage(null);
                                            setImagePreview(null);
                                        }}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || (!updateContent.trim() && !selectedImage)}
                                    className="flex-1 py-2 px-4 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Đang tạo...' : 'Đăng cập nhật'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        // Cleanup blob URL before resetting form
                                        if (imagePreview && imagePreview.startsWith('blob:')) {
                                            URL.revokeObjectURL(imagePreview);
                                        }
                                        setShowForm(false);
                                        setUpdateContent('');
                                        setSelectedImage(null);
                                        setImagePreview(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                                >
                                    Hủy
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* Updates List */}
            {updatesLoading ? (
                <div className="text-center py-12 text-gray-500">
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p>Đang tải cập nhật...</p>
                </div>
            ) : updates.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p>Chưa có cập nhật nào</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {updates.map((update) => (
                        <div key={update._id} className="bg-white border border-gray-200 rounded-xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {update.creator.avatar_url ? (
                                        <img
                                            src={update.creator.avatar_url}
                                            alt={update.creator.username}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {update.creator.username.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold text-gray-900">
                                            {update.creator.fullname || update.creator.username}
                                        </p>
                                        <p className="text-sm text-gray-500">{formatTimeAgo(update.createdAt)}</p>
                                    </div>
                                </div>
                                {isCreator && (
                                    <button
                                        onClick={() => handleDeleteUpdate(update._id)}
                                        className="text-red-500 hover:text-red-700 transition"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {update.content && (
                                <div className="mb-4">
                                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">{update.content}</p>
                                </div>
                            )}

                            {update.image_url && (
                                <div className="mb-4">
                                    <img
                                        src={update.image_url}
                                        alt="Update"
                                        className="max-w-full h-auto rounded-lg"
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Memoize component to prevent unnecessary re-renders when parent scrolls
export default memo(UpdatesTab);

