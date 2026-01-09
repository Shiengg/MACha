'use client';

import { useState, useEffect } from 'react';
import type { Conversation } from '@/services/conversation.service';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, Mail, MapPin, Calendar, MessageSquare, Users, Heart, Briefcase, CheckCircle2, Building2 } from 'lucide-react';
import { useOnlineStatus } from '@/contexts/OnlineStatusContext';
import { getUserById, followUser, unfollowUser, type User as UserType } from '@/services/user.service';
import { campaignService } from '@/services/campaign.service';
import { createConversationPrivate } from '@/services/conversation.service';

interface ConversationInfoProps {
    conversation: Conversation | null;
    conversationId?: string | null;
    onClose?: () => void;
}

export default function ConversationInfo({ conversation, conversationId, onClose }: ConversationInfoProps) {
    const { user } = useAuth();
    const router = useRouter();
    const { isUserOnline } = useOnlineStatus();
    const currentUserId = user?._id || user?.id;
    const currentConversationId = conversation?._id || conversationId;
    const otherParticipant = conversation?.members.find(member => member._id !== currentUserId);
    const isOnline = otherParticipant?._id && isUserOnline(otherParticipant?._id);

    const [userInfo, setUserInfo] = useState<UserType | null>(null);
    const [campaignsCount, setCampaignsCount] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    // Fetch user info and campaigns count
    useEffect(() => {
        const fetchUserData = async () => {
            if (!otherParticipant?._id) return;

            try {
                setLoading(true);
                const [userData, campaigns] = await Promise.all([
                    getUserById(otherParticipant._id),
                    campaignService.getCampaignsByCreator(otherParticipant._id).catch(() => [])
                ]);
                setUserInfo(userData);
                setCampaignsCount(campaigns.length);
                
                // Check if current user is following this user
                if (currentUserId && Array.isArray((user as any)?.following)) {
                    setIsFollowing((user as any).following.includes(otherParticipant._id));
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [otherParticipant?._id, currentUserId, user]);

    const handleViewProfile = () => {
        if (otherParticipant?._id) {
            router.push(`/profile/${otherParticipant._id}`);
        }
    };

    const handleFollow = async () => {
        if (!otherParticipant?._id || !currentUserId) return;

        try {
            if (isFollowing) {
                await unfollowUser(otherParticipant._id);
                setIsFollowing(false);
            } else {
                await followUser(otherParticipant._id);
                setIsFollowing(true);
            }
        } catch (error) {
            console.error('Error following/unfollowing user:', error);
        }
    };

    const handleMessage = async () => {
        if (!otherParticipant?._id) return;

        try {
            const newConversation = await createConversationPrivate(otherParticipant._id);
            router.push(`/messages?conversation=${newConversation._id}`);
        } catch (error) {
            console.error('Error creating conversation:', error);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatLastMessageTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Hôm qua';
        } else if (days < 7) {
            return `${days} ngày trước`;
        } else {
            return formatDate(dateString);
        }
    };

    if (!otherParticipant) {
        return (
            <div className="flex flex-col h-full items-center justify-center p-4">
                <p className="text-gray-500 text-sm">Không có thông tin</p>
            </div>
        );
    }

    const displayUser = userInfo || otherParticipant;
    const canMessage = isFollowing || (userInfo?.followers?.some(id => String(id) === String(currentUserId)));

    return (
        <div className="flex flex-col h-full">
            {/* Mobile Header Bar with Back Button */}
            {onClose && (
                <div className="lg:hidden sticky top-10 z-10 bg-white border-b border-gray-200 flex items-center px-3 py-3">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation flex items-center justify-center"
                        style={{ touchAction: 'manipulation' }}
                        aria-label="Quay lại"
                    >
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h3 className="flex-1 text-center font-semibold text-gray-800 text-base pr-10">Thông tin cuộc trò chuyện</h3>
                </div>
            )}
            
            {/* Header */}
            <div className="flex flex-col items-center pt-4 sm:pt-6 md:pt-8 pb-4 sm:pb-6 px-4 border-b border-gray-200 relative">
                {/* Close Button - Desktop - Right side */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="hidden lg:block absolute top-3 right-3 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
                {!onClose && (
                    <h3 className="font-semibold text-gray-800 mb-4 sm:mb-6 text-base sm:text-lg text-center">Thông tin cuộc trò chuyện</h3>
                )}
                {onClose && (
                    <h3 className="hidden lg:block font-semibold text-gray-800 mb-4 sm:mb-6 text-base sm:text-lg text-center">Thông tin cuộc trò chuyện</h3>
                )}
                <div className="relative mb-3 sm:mb-4 mt-10">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-semibold overflow-hidden">
                        {otherParticipant?.avatar ? (
                            <Image
                                src={otherParticipant.avatar}
                                alt={otherParticipant.fullname || otherParticipant.username || 'User avatar'}
                                fill
                                sizes="96px"
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                {otherParticipant?.fullname?.charAt(0).toUpperCase() || 
                                 otherParticipant?.username?.charAt(0).toUpperCase() || 
                                 'U'}
                            </div>
                        )}
                    </div>
                    {/* Online status indicator */}
                    {isOnline && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                </div>
                <h4 className="font-semibold text-gray-800 text-base sm:text-lg mb-0.5 sm:mb-1 px-2 text-center">
                    {displayUser?.fullname || displayUser?.username || 'Người dùng'}
                </h4>
                <p className="text-xs sm:text-sm text-gray-500 mb-2">@{displayUser?.username}</p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 px-2">
                    <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-full ${
                        isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                        {isOnline ? 'Đang hoạt động' : 'Offline'}
                    </span>
                    {userInfo?.kyc_status === 'verified' && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] sm:text-xs">
                            <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>Đã xác minh</span>
                        </div>
                    )}
                    {userInfo?.role === 'org' && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] sm:text-xs">
                            <Building2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>Tổ chức</span>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleViewProfile}
                    className="flex flex-col items-center gap-1.5 sm:gap-2 bg-transparent hover:opacity-80 transition-opacity touch-manipulation"
                    style={{ touchAction: 'manipulation' }}
                >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-400 flex items-center justify-center">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-500">Trang cá nhân</span>
                </button>
                
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                
            </div>
        </div>
    );
}

