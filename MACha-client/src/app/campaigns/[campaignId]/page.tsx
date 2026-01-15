'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import { campaignService, Campaign, CampaignUpdate, CreateCampaignUpdatePayload } from '@/services/campaign.service';
import { donationService, Donation } from '@/services/donation.service';
import { escrowService, Escrow, Vote } from '@/services/escrow.service';
import { formatEscrowError } from '@/utils/escrow.utils';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { cloudinaryService } from '@/services/cloudinary.service';
import { campaignCompanionService } from '@/services/campaignCompanion.service';
import Image from 'next/image';
import Swal from 'sweetalert2';
import WithdrawalRequestCard from '@/components/escrow/WithdrawalRequestCard';
import WithdrawalRequestModal from '@/components/escrow/WithdrawalRequestModal';
import VotingSection from '@/components/escrow/VotingSection';
import CreatePostModal from '@/components/shared/CreatePostModal';
import ReportModal from '@/components/shared/ReportModal';
import { getReportsByItem } from '@/services/report.service';
import { FaFlag } from 'react-icons/fa';
import { ArrowLeft, Share2, Users, Edit } from 'lucide-react';
import Link from 'next/link';

function CampaignDetails() {
    const params = useParams();
    const router = useRouter();
    const campaignId = params.campaignId as string;
    const { socket, isConnected } = useSocket();

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [donations, setDonations] = useState<Donation[]>([]);
    const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
    const [loading, setLoading] = useState(true);
    const [donationsLoading, setDonationsLoading] = useState(false);
    const [updatesLoading, setUpdatesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'story' | 'updates' | 'supporters' | 'withdrawals'>('story');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // <----- Phân trang chỗ này này
    const { user } = useAuth();
    const [showStickyBar, setShowStickyBar] = useState(false);
    const donateCardRef = useRef<HTMLDivElement>(null);
    const tabsRef = useRef<HTMLDivElement>(null);

    // Withdrawal Request States
    const [withdrawalRequests, setWithdrawalRequests] = useState<Escrow[]>([]);
    const [activeWithdrawalRequest, setActiveWithdrawalRequest] = useState<Escrow | null>(null);
    const [userVote, setUserVote] = useState<Vote | null>(null);
    const [isEligibleToVote, setIsEligibleToVote] = useState(false);
    const [availableAmount, setAvailableAmount] = useState(0);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [withdrawalRequestsLoading, setWithdrawalRequestsLoading] = useState(false);
    const [isVoting, setIsVoting] = useState(false);
    const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [hasReported, setHasReported] = useState(false);
    const [isCheckingReport, setIsCheckingReport] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isCompanion, setIsCompanion] = useState(false);
    const [isJoiningCompanion, setIsJoiningCompanion] = useState(false);
    const [companionId, setCompanionId] = useState<string | null>(null);

    const handleDonate = () => {
        const url = companionId 
            ? `/campaigns/${campaignId}/donate?companion_id=${companionId}`
            : `/campaigns/${campaignId}/donate`;
        router.push(url);
    };

    const handleJoinCompanion = async () => {
        if (!user || !campaign) return;

        try {
            setIsJoiningCompanion(true);
            const result = await campaignCompanionService.joinCampaign(campaignId);
            setIsCompanion(true);
            setCompanionId(result._id);
            
            Swal.fire({
                title: 'Thành công!',
                text: 'Bạn đã đồng hành chiến dịch này. Bạn có thể chia sẻ link để mọi người donate qua bạn.',
                icon: 'success',
                confirmButtonText: 'OK'
            });
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || 'Không thể đồng hành chiến dịch. Vui lòng thử lại.';
            Swal.fire({
                title: 'Lỗi',
                text: message,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        } finally {
            setIsJoiningCompanion(false);
        }
    };

    const handleShare = async () => {
        if (!campaign || !navigator.share || isSharing) return;
        
        try {
            setIsSharing(true);
            await navigator.share({
                title: campaign.title,
                url: `/campaigns/${campaign._id}`,
            });
        } catch (error: any) {
            // User cancelled or share failed - ignore silently
            if (error.name !== 'AbortError') {
                console.error('Share failed:', error);
            }
        } finally {
            setIsSharing(false);
        }
    };

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [campaignId]);

    // Scroll event to detect when scroll past donate card
    useEffect(() => {
        if (!donateCardRef.current) return;

        let ticking = false;
        let lastState = false;

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (!donateCardRef.current) return;
                    
                    const donateCardRect = donateCardRef.current.getBoundingClientRect();
                    const headerHeight = 64; // Header height
                    const threshold = headerHeight + 20; // Add 20px buffer
                    
                    // Show sticky bar when donate card top is above threshold
                    const shouldShow = donateCardRect.top < threshold;
                    
                    // Only update if state actually changed to prevent flickering
                    if (lastState !== shouldShow) {
                        setShowStickyBar(shouldShow);
                        lastState = shouldShow;
                    }
                    
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Check initial state
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [campaign]);

    // Scroll to tabs section when clicking tab in sticky bar
    const handleStickyTabClick = (tab: 'story' | 'updates' | 'supporters' | 'withdrawals') => {
        setActiveTab(tab);
        if (tabsRef.current) {
            // Calculate offset for sticky bar (64px header + sticky bar height ~50px)
            const offset = 114;
            const elementPosition = tabsRef.current.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - offset;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        const fetchCampaign = async () => {
            try {
                setLoading(true);
                const data = await campaignService.getCampaignById(campaignId);
                setCampaign(data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Không thể tải thông tin chiến dịch');
            } finally {
                setLoading(false);
            }
        };

        if (campaignId) {
            fetchCampaign();
        }
    }, [campaignId]);

    useEffect(() => {
        const checkCompanionStatus = async () => {
            if (!user || !campaign || user.role !== 'user') {
                setIsCompanion(false);
                setCompanionId(null);
                return;
            }

            try {
                const companions = await campaignCompanionService.getCampaignCompanions(campaignId);
                const userCompanion = companions.companions.find(
                    c => c.user._id === (user._id || user.id)
                );
                if (userCompanion) {
                    setIsCompanion(true);
                    setCompanionId(userCompanion._id);
                } else {
                    setIsCompanion(false);
                    setCompanionId(null);
                }
            } catch (error) {
                console.error('Error checking companion status:', error);
                setIsCompanion(false);
                setCompanionId(null);
            }
        };

        if (campaign && user) {
            checkCompanionStatus();
        }
    }, [campaign, user, campaignId]);

    useEffect(() => {
        const fetchDonations = async () => {
            try {
                setDonationsLoading(true);
                const data = await donationService.getDonationsByCampaign(campaignId);
                // Filter only completed donations and non-anonymous ones for display
                const completedDonations = data.filter(
                    (donation: Donation) => 
                        donation.payment_status === 'completed' && 
                        !donation.is_anonymous
                );
                setDonations(completedDonations);
            } catch (err: any) {
                console.error('Failed to fetch donations:', err);
                setDonations([]);
            } finally {
                setDonationsLoading(false);
            }
        };

        if (campaignId) {
            fetchDonations();
        }
    }, [campaignId]);

    useEffect(() => {
        const fetchUpdates = async () => {
            try {
                setUpdatesLoading(true);
                const data = await campaignService.getCampaignUpdates(campaignId);
                setUpdates(data);
            } catch (err: any) {
                console.error('Failed to fetch updates:', err);
                setUpdates([]);
            } finally {
                setUpdatesLoading(false);
            }
        };

        if (campaignId) {
            fetchUpdates();
        }
    }, [campaignId]);

    // Reset to page 1 when search query changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // Join campaign room and listen for realtime donation events
    useEffect(() => {
        if (!socket || !isConnected || !campaignId) return;

        // Join campaign room
        const campaignRoom = `campaign:${campaignId}`;
        socket.emit('join-room', campaignRoom);
        console.log(`🏠 Joined campaign room: ${campaignRoom}`);

        // Listen for new donations
        const handleDonationCreated = (event: any) => {
            console.log('🎉 New donation received:', event);
            if (event.campaignId === campaignId && event.donation) {
                const newDonation = event.donation;
                // Only add if it's completed and not anonymous
                if (newDonation.payment_status === 'completed' && !newDonation.is_anonymous) {
                    setDonations(prev => {
                        // Check if donation already exists to avoid duplicates
                        const exists = prev.some(d => d._id === newDonation._id);
                        if (exists) return prev;
                        // Add to beginning of list
                        return [newDonation, ...prev];
                    });
                    
                    // Update campaign current amount if available
                    if (event.campaign && campaign) {
                        setCampaign(prev => prev ? {
                            ...prev,
                            current_amount: event.campaign.current_amount
                        } : null);
                    }
                }
            }
        };

        // Listen for donation status changes
        const handleDonationStatusChanged = (event: any) => {
            console.log('🔄 Donation status changed:', event);
            if (event.campaignId === campaignId && event.donation) {
                const updatedDonation = event.donation;
                
                setDonations(prev => {
                    const index = prev.findIndex(d => d._id === updatedDonation._id);
                    
                    // If status changed to completed and not anonymous, add it
                    if (updatedDonation.payment_status === 'completed' && !updatedDonation.is_anonymous) {
                        if (index === -1) {
                            // New completed donation, add to beginning
                            return [updatedDonation, ...prev];
                        } else {
                            // Update existing donation
                            return prev.map(d => d._id === updatedDonation._id ? updatedDonation : d);
                        }
                    } else {
                        // Remove if status is not completed or is anonymous
                        if (index !== -1) {
                            return prev.filter(d => d._id !== updatedDonation._id);
                        }
                    }
                    return prev;
                });
                
                // Update campaign current amount
                if (event.campaign && campaign) {
                    setCampaign(prev => prev ? {
                        ...prev,
                        current_amount: event.campaign.current_amount
                    } : null);
                }
            }
        };

        // Listen for donation updates
        const handleDonationUpdated = (event: any) => {
            console.log('🔄 Donation updated:', event);
            if (event.campaignId === campaignId && event.donation) {
                const updatedDonation = event.donation;
                
                setDonations(prev => {
                    const index = prev.findIndex(d => d._id === updatedDonation._id);
                    
                    // Only show completed and non-anonymous donations
                    if (updatedDonation.payment_status === 'completed' && !updatedDonation.is_anonymous) {
                        if (index === -1) {
                            // New donation, add to beginning
                            return [updatedDonation, ...prev];
                        } else {
                            // Update existing donation
                            return prev.map(d => d._id === updatedDonation._id ? updatedDonation : d);
                        }
                    } else {
                        // Remove if not completed or is anonymous
                        if (index !== -1) {
                            return prev.filter(d => d._id !== updatedDonation._id);
                        }
                    }
                    return prev;
                });
                
                // Update campaign current amount
                if (event.campaign && campaign) {
                    setCampaign(prev => prev ? {
                        ...prev,
                        current_amount: event.campaign.current_amount
                    } : null);
                }
            }
        };

        // Listen for campaign update created
        const handleCampaignUpdateCreated = (event: any) => {
            // Compare as strings to handle ObjectId comparison
            if (String(event.campaignId) === String(campaignId) && event.update) {
                const newUpdate = event.update;
                setUpdates(prev => {
                    // Check if update already exists to avoid duplicates
                    const exists = prev.some(u => String(u._id) === String(newUpdate._id));
                    if (exists) return prev;
                    // Add to beginning of list
                    return [newUpdate, ...prev];
                });
            }
        };

        // Listen for campaign update deleted
        const handleCampaignUpdateDeleted = (event: any) => {
            // Compare as strings to handle ObjectId comparison
            if (String(event.campaignId) === String(campaignId) && event.updateId) {
                setUpdates(prev => prev.filter(u => String(u._id) !== String(event.updateId)));
            }
        };

        socket.on('donation:created', handleDonationCreated);
        socket.on('donation:status_changed', handleDonationStatusChanged);
        socket.on('donation:updated', handleDonationUpdated);
        socket.on('campaign:update:created', handleCampaignUpdateCreated);
        socket.on('campaign:update:deleted', handleCampaignUpdateDeleted);

        // Cleanup
        return () => {
            socket.off('donation:created', handleDonationCreated);
            socket.off('donation:status_changed', handleDonationStatusChanged);
            socket.off('donation:updated', handleDonationUpdated);
            socket.off('campaign:update:created', handleCampaignUpdateCreated);
            socket.off('campaign:update:deleted', handleCampaignUpdateDeleted);
            socket.emit('leave-room', campaignRoom);
            console.log(`🚪 Left campaign room: ${campaignRoom}`);
        };
        }, [socket, isConnected, campaignId]);

    // Fetch withdrawal requests and check eligibility
    useEffect(() => {
        const fetchWithdrawalData = async () => {
            if (!campaignId || !user) return;

            try {
                setWithdrawalRequestsLoading(true);

                // Fetch withdrawal requests
                const requests = await escrowService.getWithdrawalRequestsByCampaign(campaignId);
                setWithdrawalRequests(requests);

                // Find active withdrawal request (voting_in_progress)
                const activeRequest = requests.find(
                    (req) => req.request_status === 'voting_in_progress'
                );
                setActiveWithdrawalRequest(activeRequest || null);

                // If there's an active request, fetch user vote
                if (activeRequest) {
                    try {
                        const votes = await escrowService.getVotesByEscrow(activeRequest._id);
                        const currentUserVote = votes.find(
                            (vote) =>
                                (typeof vote.donor === 'object' ? vote.donor._id : vote.donor) ===
                                (user._id || user.id)
                        );
                        setUserVote(currentUserVote || null);
                    } catch (err) {
                        console.error('Error fetching user vote:', err);
                        setUserVote(null);
                    }
                } else {
                    setUserVote(null);
                }

                // Check eligibility: user chỉ cần đã donate (bất kỳ số tiền nào)
                if (campaign) {
                    try {
                        const userDonations = donations.filter(
                            (donation) =>
                                (typeof donation.donor === 'object'
                                    ? donation.donor._id
                                    : donation.donor) === (user._id || user.id) &&
                                donation.payment_status === 'completed'
                        );
                        // Chỉ cần có ít nhất 1 donation completed là được vote
                        setIsEligibleToVote(userDonations.length > 0);
                    } catch (err) {
                        console.error('Error checking eligibility:', err);
                        setIsEligibleToVote(false);
                    }
                }

                // Recalculate available amount
                if (campaign) {
                    try {
                        const amount = await campaignService.getAvailableAmount(campaignId);
                        setAvailableAmount(amount);
                    } catch (err) {
                        console.error('Error calculating available amount:', err);
                        if (campaign.available_amount !== undefined) {
                            setAvailableAmount(campaign.available_amount);
                        } else {
                            setAvailableAmount(campaign.current_amount);
                        }
                    }
                }
            } catch (err: any) {
                console.error('Error fetching withdrawal data:', err);
            } finally {
                setWithdrawalRequestsLoading(false);
            }
        };

        if (campaignId && user && campaign) {
            fetchWithdrawalData();
        }
    }, [campaignId, user, campaign, donations]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    };

    const formatCurrencyVND = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const calculateDaysLeft = (endDate: string) => {
        const end = new Date(endDate);
        const now = new Date();
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    };

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

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${hours}:${minutes}:${seconds} - ${day}/${month}/${year}`;
    };

    // Withdrawal Request Handlers
    const handleCreateRequest = () => {
        if (!user || !campaign || !campaign.creator) return;
        const isCreator = user._id === campaign.creator._id || user.id === campaign.creator._id;
        if (!isCreator) {
            Swal.fire({
                icon: 'error',
                title: 'Không có quyền',
                text: 'Chỉ creator của campaign mới có thể tạo withdrawal request',
            });
            return;
        }
        setShowCreateModal(true);
    };

    const handleSubmitRequest = async (escrow: Escrow) => {
        try {
            // Refresh withdrawal requests
            const requests = await escrowService.getWithdrawalRequestsByCampaign(campaignId);
            setWithdrawalRequests(requests);

            // Update active request if needed
            const activeRequest = requests.find(
                (req) => req.request_status === 'voting_in_progress'
            );
            setActiveWithdrawalRequest(activeRequest || null);

            // Recalculate available amount
            if (campaign) {
                const amount = await campaignService.getAvailableAmount(campaignId);
                setAvailableAmount(amount);
            }

            // Refresh campaign to get updated current_amount
            const updatedCampaign = await campaignService.getCampaignById(campaignId);
            setCampaign(updatedCampaign);
        } catch (err) {
            console.error('Error refreshing data after creating request:', err);
        }
    };

    const handleVote = async (escrowId: string, value: 'approve' | 'reject') => {
        if (!user || isVoting) return;

        try {
            setIsVoting(true);
            const vote = await escrowService.submitVote(escrowId, { value });

            // Update user vote
            setUserVote(vote);

            // Refresh withdrawal request to get updated voting results
            const updatedRequest = await escrowService.getWithdrawalRequestById(escrowId);
            setActiveWithdrawalRequest(updatedRequest);
            setWithdrawalRequests((prev) =>
                prev.map((req) => (req._id === escrowId ? updatedRequest : req))
            );

            // Show success toast
            Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                text: `Bạn đã vote ${value === 'approve' ? 'Đồng ý' : 'Từ chối'} cho withdrawal request này`,
                timer: 3000,
                timerProgressBar: true,
                showConfirmButton: false,
                toast: true,
                position: 'top-end',
            });
        } catch (err: any) {
            console.error('Error submitting vote:', err);
            const errorMessage = formatEscrowError(err);
            Swal.fire({
                icon: 'error',
                title: 'Lỗi',
                text: errorMessage,
            });
        } finally {
            setIsVoting(false);
        }
    };

    const handleRefresh = async () => {
        if (!campaignId || !user || !campaign) return;

        try {
            setWithdrawalRequestsLoading(true);

            // Refresh withdrawal requests
            const requests = await escrowService.getWithdrawalRequestsByCampaign(campaignId);
            setWithdrawalRequests(requests);

            // Update active request
            const activeRequest = requests.find(
                (req) => req.request_status === 'voting_in_progress'
            );
            setActiveWithdrawalRequest(activeRequest || null);

            // Refresh user vote if active request exists
            if (activeRequest) {
                try {
                    const votes = await escrowService.getVotesByEscrow(activeRequest._id);
                    const currentUserVote = votes.find(
                        (vote) =>
                            (typeof vote.donor === 'object' ? vote.donor._id : vote.donor) ===
                            (user._id || user.id)
                    );
                    setUserVote(currentUserVote || null);
                } catch (err) {
                    console.error('Error refreshing user vote:', err);
                }
            } else {
                setUserVote(null);
            }

            // Recalculate available amount
            const amount = await campaignService.getAvailableAmount(campaignId);
            setAvailableAmount(amount);

            // Refresh campaign
            const updatedCampaign = await campaignService.getCampaignById(campaignId);
            setCampaign(updatedCampaign);
        } catch (err) {
            console.error('Error refreshing data:', err);
        } finally {
            setWithdrawalRequestsLoading(false);
        }
    };

    // UpdatesTab Component
    const UpdatesTab = ({ campaignId, updates, setUpdates, updatesLoading, isCreator }: { campaignId: string, updates: CampaignUpdate[], setUpdates: React.Dispatch<React.SetStateAction<CampaignUpdate[]>>, updatesLoading: boolean, isCreator: boolean }) => {
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
    };

    // Get top donor (highest amount)
    const topDonor = donations.length > 0 
        ? donations.reduce((prev, current) => 
            (prev.amount > current.amount) ? prev : current
          )
        : null;

    // Get recent donations (last 24 hours)
    const recentDonations = donations.filter((donation) => {
        const donationDate = new Date(donation.createdAt);
        const now = new Date();
        const diffInHours = (now.getTime() - donationDate.getTime()) / (1000 * 60 * 60);
        return diffInHours < 24;
    });

    if (loading) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Đang tải thông tin chiến dịch...</p>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    if (error || !campaign) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-4">😔</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            {error || 'Không tìm thấy chiến dịch'}
                        </h2>
                        <button
                            onClick={() => router.back()}
                            className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                        >
                            Quay lại
                        </button>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    const progress = Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100);
    const daysLeft = campaign.end_date ? calculateDaysLeft(campaign.end_date) : null;

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
                {/* Sticky Bar - Shows when scroll past donate card */}
                {showStickyBar && (
                    <div className="hidden md:block fixed top-[64px] left-0 right-0 bg-white border-b border-gray-200 shadow-md z-40">
                        <div className="max-w-6xl mx-auto px-4">
                            <div className="flex items-center justify-between py-3">
                                {/* Tabs */}
                                <div className="flex items-center gap-1 flex-1">
                                    <button
                                        onClick={() => handleStickyTabClick('story')}
                                        className={`px-4 py-2 text-sm font-medium transition rounded-lg ${
                                            activeTab === 'story'
                                                ? 'text-orange-500 bg-orange-50'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                    >
                                        Câu chuyện
                                    </button>
                                    <button
                                        onClick={() => handleStickyTabClick('updates')}
                                        className={`px-4 py-2 text-sm font-medium transition rounded-lg ${
                                            activeTab === 'updates'
                                                ? 'text-orange-500 bg-orange-50'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                    >
                                        Hoạt động ({updates.length})
                                    </button>
                                    <button
                                        onClick={() => handleStickyTabClick('supporters')}
                                        className={`px-4 py-2 text-sm font-medium transition rounded-lg ${
                                            activeTab === 'supporters'
                                                ? 'text-orange-500 bg-orange-50'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                    >
                                        Danh sách ủng hộ ({donations.length})
                                    </button>
                                    <button
                                        onClick={() => handleStickyTabClick('withdrawals')}
                                        className={`px-4 py-2 text-sm font-medium transition rounded-lg ${
                                            activeTab === 'withdrawals'
                                                ? 'text-orange-500 bg-orange-50'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                    >
                                        Rút tiền ({withdrawalRequests.filter(req => req.request_status !== 'cancelled').length})
                                    </button>
                                </div>

                                {/* Donate Button */}
                                {(() => {
                                    // Check if user is the creator - hide donate button for creator
                                    const isCreator = user && campaign && campaign.creator && 
                                        (user._id === campaign.creator._id || user.id === campaign.creator._id);
                                    
                                    if (isCreator) {
                                        return null; // Don't show donate button for creator
                                    }
                                    
                                    // Check if campaign has ended
                                    if (campaign.end_date && daysLeft === 0) {
                                        return (
                                            <div className="px-4 py-2 text-sm text-gray-500">
                                                Chiến dịch đã kết thúc
                                            </div>
                                        );
                                    }
                                    
                                    // Check campaign status
                                    const allowedStatuses = ['active', 'voting', 'approved'];
                                    if (allowedStatuses.includes(campaign.status)) {
                                        return (
                                            <button
                                                onClick={handleDonate}
                                                className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg hover:bg-orange-600 transition flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Ủng hộ ngay
                                            </button>
                                        );
                                    }
                                    
                                    // Show status-specific messages
                                    const statusMessages: Record<string, string> = {
                                        'pending': 'Chiến dịch đang duyệt',
                                        'completed': 'Chiến dịch này đã hoàn tất',
                                        'rejected': 'Chiến dịch này đã bị từ chối',
                                        'cancelled': 'Chiến dịch bị huỷ'
                                    };
                                    
                                    return (
                                        <div className="px-4 py-2 text-sm text-gray-500">
                                            {statusMessages[campaign.status] || 'Không thể ủng hộ chiến dịch này'}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* Hero Section with Background */}
                <div className="relative min-h-[200px] mb-0">
                    {/* Background Image with Blur */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div 
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ 
                                backgroundImage: `url(${campaign.banner_image})`,
                                filter: 'blur(8px)',
                                transform: 'scale(1.1)'
                            }}
                        />
                        <div className="absolute inset-0 bg-black/40" />
                    </div>

                    {/* Hero Content */}
                    <div className="relative max-w-6xl mx-auto px-4 py-12">
                        {user?.role === 'owner' && (
                            <Link
                                href="/owner/financial/campaigns"
                                className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span className="text-sm font-medium">Quay lại Tài chính Campaign</span>
                            </Link>
                        )}
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg break-words flex-1">
                                {campaign.title}
                            </h1>
                            {/* Edit Button - Only show for creator when campaign is PENDING */}
                            {(() => {
                                const isCreator = user && campaign && campaign.creator && 
                                    (user._id === campaign.creator._id || user.id === campaign.creator._id);
                                const canEdit = isCreator && campaign.status === 'pending';
                                
                                if (!canEdit) return null;
                                
                                return (
                                    <Link
                                        href={`/campaigns/${campaignId}/edit`}
                                        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 text-white transition-all group"
                                        title="Chỉnh sửa chiến dịch (chỉ có thể chỉnh sửa khi đang chờ duyệt)"
                                    >
                                        <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        <span className="text-sm font-medium hidden sm:inline">Chỉnh sửa</span>
                                    </Link>
                                );
                            })()}
                        </div>
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <p className="text-white/80 text-sm">
                                Tổ chức bởi <span className="text-orange-300 font-bold">{campaign.contact_info?.fullname || campaign.creator?.fullname}</span>
                            </p>
                            {/* PENDING Badge - Only show for creator when campaign is PENDING */}
                            {(() => {
                                const isCreator = user && campaign && campaign.creator && 
                                    (user._id === campaign.creator._id || user.id === campaign.creator._id);
                                
                                if (isCreator && campaign.status === 'pending') {
                                    return (
                                        <span 
                                            className="inline-flex items-center gap-1.5 bg-yellow-500/20 backdrop-blur-sm px-3 py-1 rounded-full border border-yellow-400/30 text-yellow-200 text-xs font-medium"
                                            title="Chiến dịch đang chờ admin duyệt. Bạn có thể chỉnh sửa chiến dịch."
                                        >
                                            <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                            </svg>
                                            Đang chờ duyệt
                                        </span>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                        {campaign.category && (
                            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                <span className="text-white text-sm font-medium">
                                    {(() => {
                                        const categoryLabels: Record<string, string> = {
                                            'children': 'Trẻ em',
                                            'elderly': 'Người già',
                                            'poverty': 'Người nghèo',
                                            'disaster': 'Thiên tai',
                                            'medical': 'Y tế, bệnh hiểm nghèo',
                                            'education': 'Giáo dục',
                                            'disability': 'Người khuyết tật',
                                            'animal': 'Động vật',
                                            'environment': 'Môi trường',
                                            'hardship': 'Hoàn cảnh khó khăn',
                                            'community': 'Cộng đồng',
                                            'other': 'Khác'
                                        };
                                        return categoryLabels[campaign.category] || campaign.category;
                                    })()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className={`max-w-6xl mx-auto px-4 relative z-10 pb-12 transition-all ${
                    showStickyBar ? 'pt-20' : 'pt-0'
                }`}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Progress Card */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                                <div className="flex justify-between items-end mb-3">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400 text-xl">Đã đạt được </span>
                                        <span className="text-3xl font-bold text-orange-500">
                                            {formatCurrency(campaign.current_amount)}
                                        </span>
                                    </div>
                                    
                                </div>

                                {/* Progress Bar with Milestone Markers */}
                                <div className="relative mb-6">
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-visible relative">
                                        <div 
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ 
                                                width: `${progress}%`,
                                                background: 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)'
                                            }}
                                        />
                                        
                                        {/* Milestone Markers */}
                                        {campaign.milestones && campaign.milestones.length > 0 && campaign.milestones
                                            .filter(m => m.percentage > 0)
                                            .sort((a, b) => a.percentage - b.percentage)
                                            .map((milestone, index) => {
                                                const is100Percent = milestone.percentage === 100;
                                                const milestoneAmount = (campaign.goal_amount * milestone.percentage) / 100;
                                                const isReached = campaign.current_amount >= milestoneAmount;
                                                
                                                return (
                                                    <div
                                                        key={index}
                                                        className="absolute top-0 transform -translate-x-1/2"
                                                        style={{ left: `${milestone.percentage}%` }}
                                                    >
                                                        {/* Marker Line */}
                                                        <div 
                                                            className={`w-0.5 h-6 ${
                                                                isReached
                                                                    ? is100Percent 
                                                                        ? 'bg-green-500 dark:bg-green-400' 
                                                                        : 'bg-green-500 dark:bg-green-400'
                                                                    : is100Percent 
                                                                        ? 'bg-green-300 dark:bg-green-600' 
                                                                        : 'bg-blue-400 dark:bg-blue-500'
                                                            }`}
                                                            style={{ marginTop: '-3px' }}
                                                        />
                                                        
                                                        {/* Marker Dot */}
                                                        <div 
                                                            className={`w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-lg transform -translate-x-1/2 ${
                                                                isReached
                                                                    ? is100Percent 
                                                                        ? 'bg-green-500 dark:bg-green-400' 
                                                                        : 'bg-green-500 dark:bg-green-400'
                                                                    : is100Percent 
                                                                        ? 'bg-green-300 dark:bg-green-600' 
                                                                        : 'bg-blue-400 dark:bg-blue-500'
                                                            }`}
                                                            style={{ marginTop: '-10px' }}
                                                        />
                                                        
                                                        {/* Percentage Label */}
                                                        <div 
                                                            className={`absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap ${
                                                                isReached
                                                                    ? 'text-green-600 dark:text-green-400'
                                                                    : is100Percent
                                                                        ? 'text-green-500 dark:text-green-400'
                                                                        : 'text-blue-600 dark:text-blue-400'
                                                            }`}
                                                        >
                                                            <div className={`text-xs font-bold px-2 py-1 rounded ${
                                                                isReached
                                                                    ? 'bg-green-100 dark:bg-green-900/30'
                                                                    : is100Percent
                                                                        ? 'bg-green-50 dark:bg-green-900/20'
                                                                        : 'bg-blue-100 dark:bg-blue-900/30'
                                                            }`}>
                                                                {milestone.percentage}%
                                                                {isReached && (
                                                                    <span className="ml-1">✓</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                    
                                    {/* Milestone Info Below */}
                                    {campaign.milestones && campaign.milestones.length > 0 && (
                                        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Các mốc giải ngân:
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {campaign.milestones
                                                    .filter(m => m.percentage > 0)
                                                    .sort((a, b) => a.percentage - b.percentage)
                                                    .map((milestone, index) => {
                                                        const is100Percent = milestone.percentage === 100;
                                                        const milestoneAmount = (campaign.goal_amount * milestone.percentage) / 100;
                                                        const isReached = campaign.current_amount >= milestoneAmount;
                                                        
                                                        return (
                                                            <div
                                                                key={index}
                                                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                                                                    isReached
                                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                                                        : is100Percent
                                                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                                                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                                }`}
                                                            >
                                                                {isReached && (
                                                                    <span className="text-green-600 dark:text-green-400">✓</span>
                                                                )}
                                                                <span className="font-bold">{milestone.percentage}%</span>
                                                                <span className="text-gray-500 dark:text-gray-400">
                                                                    ({milestoneAmount.toLocaleString('vi-VN')}đ)
                                                                </span>
                                                                {milestone.commitment_days > 0 && (
                                                                    <span className="text-gray-500 dark:text-gray-400">
                                                                        • {milestone.commitment_days} ngày
                                                                    </span>
                                                                )}
                                                                {isReached && (
                                                                    <span className="text-green-600 dark:text-green-400 font-semibold">Đã đạt</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <div className="text-2xl font-bold text-orange-500">{donations.length}</div>
                                        <div className="text-gray-500 dark:text-gray-400 text-sm">Lượt ủng hộ</div>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <div className="text-2xl font-bold text-green-500">
                                            {daysLeft !== null ? daysLeft : '∞'}
                                        </div>
                                        <div className="text-gray-500 dark:text-gray-400 text-sm">Ngày còn lại</div>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <div className="text-2xl font-bold text-blue-500">{updates.length}</div>
                                        <div className="text-gray-500 dark:text-gray-400 text-sm">Số cập nhật</div>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div ref={tabsRef} className="bg-white rounded-2xl shadow-lg overflow-hidden scroll-mt-20">
                                <div className="flex border-b">
                                    <button
                                        onClick={() => setActiveTab('story')}
                                        className={`flex-1 py-4 px-6 text-center font-medium transition ${
                                            activeTab === 'story'
                                                ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-50/50'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                            Câu chuyện
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('updates')}
                                        className={`flex-1 py-4 px-6 text-center font-medium transition ${
                                            activeTab === 'updates'
                                                ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-50/50'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            Hoạt động ({updates.length})
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('supporters')}
                                        className={`flex-1 py-4 px-6 text-center font-medium transition ${
                                            activeTab === 'supporters'
                                                ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-50/50'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            Danh sách ủng hộ ({donations.length})
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('withdrawals')}
                                        className={`flex-1 py-4 px-6 text-center font-medium transition ${
                                            activeTab === 'withdrawals'
                                                ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-50/50'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Rút tiền ({withdrawalRequests.filter(req => req.request_status !== 'cancelled').length})
                                        </span>
                                    </button>
                                </div>

                                {/* Tab Content */}
                                <div className="p-6">
                                    {activeTab === 'story' && (
                                        <div className="space-y-6">
                                            {/* Info Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Location */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                                        </svg>
                                                        <span className="font-medium">Địa điểm</span>
                                                    </div>
                                                    <p className="text-gray-700 text-sm leading-relaxed">
                                                        {campaign.contact_info?.address || 'Chưa cập nhật địa chỉ'}
                                                    </p>
                                                </div>

                                                {/* Organizer */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                                        </svg>
                                                        <span className="font-medium">Người kêu gọi</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-900 font-semibold">
                                                            {campaign.contact_info?.fullname || 'Chưa cập nhật'}
                                                        </p>
                                                        <p className="text-gray-500 text-xs">Cá nhân từ thiện được xác thực</p>
                                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                            <span className="flex items-center gap-1">
                                                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                                                </svg>
                                                                Đã thực hiện 25 chiến dịch thành công
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                                            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                                                            </svg>
                                                            Có 15,000+ người theo dõi
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Time Info */}
                                            <div className="bg-gray-50 rounded-xl p-4">
                                                <div className="flex items-center gap-2 text-gray-500 mb-2">
                                                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="font-medium">Thời gian</span>
                                                </div>
                                                <div className="text-sm text-gray-700 space-y-1">
                                                    <p>Bắt đầu: {formatDate(campaign.start_date)}</p>
                                                    <p>Kết thúc: {campaign.end_date ? formatDate(campaign.end_date) : 'Chưa xác định'}</p>
                                                    {daysLeft !== null && daysLeft > 0 && (
                                                        <p className="text-orange-500 font-medium">(Còn {daysLeft} ngày)</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Story */}
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 mb-4">Hoàn cảnh</h3>
                                                <div className="prose prose-gray max-w-none">
                                                    <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                                                        {campaign.description ? (() => {
                                                            // Parse description to convert --text-- to bold text
                                                            const parts: (string | React.ReactNode)[] = [];
                                                            const text = campaign.description;
                                                            let lastIndex = 0;
                                                            const regex = /--([^-\n]+)--/g;
                                                            let match;
                                                            let keyCounter = 0;
                                                            
                                                            while ((match = regex.exec(text)) !== null) {
                                                                // Add text before the match
                                                                if (match.index > lastIndex) {
                                                                    parts.push(text.substring(lastIndex, match.index));
                                                                }
                                                                
                                                                // Add bold text (the content inside --...--)
                                                                parts.push(
                                                                    <strong key={`bold-${keyCounter++}`} className="font-bold text-gray-900 dark:text-white">
                                                                        {match[1]}
                                                                    </strong>
                                                                );
                                                                
                                                                lastIndex = match.index + match[0].length;
                                                            }
                                                            
                                                            // Add remaining text
                                                            if (lastIndex < text.length) {
                                                                parts.push(text.substring(lastIndex));
                                                            }
                                                            
                                                            // If no matches found, return original text
                                                            return parts.length > 0 ? parts : text;
                                                        })() : 'Chưa có mô tả chi tiết về chiến dịch này.'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Hashtag */}
                                            {campaign.hashtag && (
                                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                                        </svg>
                                                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Thẻ bắt đầu bằng #</h3>
                                                    </div>
                                                        <span className="text-blue-600 dark:text-blue-400 font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-300">
                                                            #{campaign.hashtag.name}
                                                        </span>
                                                </div>
                                            )}

                                            {/* Gallery Images */}
                                            {campaign.gallery_images && campaign.gallery_images.length > 0 && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    {campaign.gallery_images.slice(0, 4).map((img, index) => (
                                                        <div key={index} className="relative aspect-video rounded-xl overflow-hidden">
                                                            <img 
                                                                src={img} 
                                                                alt={`Ảnh ${index + 1}`}
                                                                className="w-full h-full object-cover hover:scale-105 transition duration-300"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Banner Image */}
                                            {campaign.banner_image && (
                                                <div className="relative aspect-video rounded-xl overflow-hidden">
                                                    <img 
                                                        src={campaign.banner_image} 
                                                        alt="Ảnh bìa chiến dịch"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}

                                            {/* Timeline */}
                                            {campaign.expected_timeline && campaign.expected_timeline.length > 0 && (
                                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <h3 className="font-bold text-gray-900 dark:text-white">Tiến độ dự kiến</h3>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {campaign.expected_timeline.map((item, index) => (
                                                            <div key={index} className="flex items-center gap-3">
                                                                <div className={`w-3 h-3 rounded-full ${
                                                                    index === 0 ? 'bg-green-500' :
                                                                    index === campaign.expected_timeline!.length - 1 ? 'bg-blue-300' :
                                                                    'bg-blue-500'
                                                                }`}></div>
                                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                                    {item.month}: {item.description}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Auto-created Withdrawal Request Banner */}
                                            {(() => {
                                                const campaignProgress = (campaign.current_amount / campaign.goal_amount) * 100;
                                                const milestonePercentages = [50, 75, 100];
                                                const reachedMilestones = milestonePercentages.filter(
                                                    (milestone) => campaignProgress >= milestone
                                                );

                                                // Find auto-created withdrawal requests for reached milestones
                                                const autoCreatedRequests = withdrawalRequests.filter(
                                                    (req) =>
                                                        req.auto_created &&
                                                        req.milestone_percentage &&
                                                        reachedMilestones.includes(req.milestone_percentage) &&
                                                        req.request_status !== 'cancelled' &&
                                                        req.request_status !== 'admin_rejected'
                                                );

                                                if (autoCreatedRequests.length > 0) {
                                                    return (
                                                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
                                                            <div className="flex items-start gap-4">
                                                                <div className="flex-shrink-0">
                                                                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                                                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                                        </svg>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h3 className="text-lg font-bold text-orange-900 dark:text-orange-300 mb-2">
                                                                        Chiến dịch đã đạt mốc quan trọng! 🎉
                                                                    </h3>
                                                                    <p className="text-orange-700 dark:text-orange-400 mb-4">
                                                                        Yêu cầu rút tiền đã được tạo tự động khi chiến dịch đạt các mốc mục tiêu:
                                                                    </p>
                                                                    <div className="space-y-2 mb-4">
                                                                        {autoCreatedRequests.map((request) => (
                                                                            <div
                                                                                key={request._id}
                                                                                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-orange-200 dark:border-orange-700"
                                                                            >
                                                                                <div className="flex items-center justify-between">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-semibold">
                                                                                            {request.milestone_percentage}%
                                                                                        </span>
                                                                                        <div>
                                                                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                                                                {formatCurrency(request.withdrawal_request_amount)}
                                                                                            </p>
                                                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                                                Trạng thái: {
                                                                                                    request.request_status === 'voting_in_progress' ? 'Đang vote' :
                                                                                                    request.request_status === 'voting_completed' ? 'Đã hoàn thành vote' :
                                                                                                    request.request_status === 'admin_approved' ? 'Admin đã duyệt' :
                                                                                                    request.request_status === 'released' ? 'Đã giải ngân' :
                                                                                                    'Chờ xử lý'
                                                                                                }
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setActiveTab('withdrawals');
                                                                                            // Scroll to withdrawals section
                                                                                            setTimeout(() => {
                                                                                                const withdrawalsTab = document.querySelector('[data-tab="withdrawals"]');
                                                                                                if (withdrawalsTab) {
                                                                                                    withdrawalsTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                                                }
                                                                                            }, 100);
                                                                                        }}
                                                                                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-all text-sm"
                                                                                    >
                                                                                        Xem chi tiết
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    )}

                                    {activeTab === 'updates' && <UpdatesTab campaignId={campaignId} updates={updates} setUpdates={setUpdates} updatesLoading={updatesLoading} isCreator={!!(user && campaign && campaign.creator && (user._id === campaign.creator._id || user.id === campaign.creator._id))} />}

                                    {activeTab === 'withdrawals' && (
                                        <div className="space-y-6" data-tab="withdrawals">
                                            {/* Header with Create Button */}
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                                        Yêu cầu rút tiền
                                                    </h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                        Quản lý các yêu cầu rút tiền và vote cho withdrawal requests
                                                    </p>
                                                </div>
                                                {user && campaign && campaign.creator && (user._id === campaign.creator._id || user.id === campaign.creator._id) && (
                                                    <button
                                                        onClick={handleCreateRequest}
                                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                        Tạo yêu cầu rút tiền
                                                    </button>
                                                )}
                                            </div>

                                            {/* Available Amount Display */}
                                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                            Số tiền có sẵn để rút
                                                        </p>
                                                        <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                                                            {formatCurrency(availableAmount)}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={handleRefresh}
                                                        disabled={withdrawalRequestsLoading}
                                                        className="px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all flex items-center gap-2 border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        Làm mới
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Loading State */}
                                            {withdrawalRequestsLoading && (
                                                <div className="flex items-center justify-center py-12">
                                                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                    <span className="ml-3 text-gray-600 dark:text-gray-400">Đang tải...</span>
                                                </div>
                                            )}

                                            {/* Active Withdrawal Request Voting Section */}
                                            {!withdrawalRequestsLoading && activeWithdrawalRequest && (
                                                <div className="mb-6">
                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                                        Đang trong thời gian vote
                                                    </h4>
                                                    <VotingSection
                                                        escrow={activeWithdrawalRequest}
                                                        userVote={userVote}
                                                        onVote={handleVote}
                                                        isEligible={isEligibleToVote}
                                                        isVoting={isVoting}
                                                    />
                                                </div>
                                            )}

                                            {/* Withdrawal Requests List */}
                                            {!withdrawalRequestsLoading && (() => {
                                                // Filter out cancelled requests - chỉ hiển thị các requests chưa bị hủy
                                                const activeRequests = withdrawalRequests.filter(
                                                    (req) => req.request_status !== 'cancelled'
                                                );

                                                return (
                                                    <div className="space-y-4">
                                                        {activeRequests.length === 0 ? (
                                                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-8 text-center">
                                                                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                <p className="text-gray-600 dark:text-gray-400">
                                                                    Chưa có yêu cầu rút tiền nào
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            activeRequests.map((escrow) => {
                                                                const isCreator = user && campaign && campaign.creator && (user._id === campaign.creator._id || user.id === campaign.creator._id);
                                                                const userVoteForRequest =
                                                                    escrow._id === activeWithdrawalRequest?._id ? userVote : null;

                                                                return (
                                                                    <WithdrawalRequestCard
                                                                        key={escrow._id}
                                                                        escrow={escrow}
                                                                        userVote={userVoteForRequest}
                                                                        isCreator={isCreator || false}
                                                                    />
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {activeTab === 'supporters' && (() => {
                                        // Filter donations based on search query
                                        const filteredDonations = donations.filter((donation) => {
                                            if (!searchQuery.trim()) return true;
                                            const donor = typeof donation.donor === 'object' ? donation.donor : null;
                                            const donorName = donor?.username || '';
                                            return donorName.toLowerCase().includes(searchQuery.toLowerCase());
                                        });

                                        // Calculate pagination
                                        const totalPages = Math.ceil(filteredDonations.length / itemsPerPage);
                                        const startIndex = (currentPage - 1) * itemsPerPage;
                                        const endIndex = startIndex + itemsPerPage;
                                        const paginatedDonations = filteredDonations.slice(startIndex, endIndex);

                                        return (
                                            <div className="space-y-4">
                                                {/* Search Bar */}
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                        </svg>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        placeholder="Nhập tên người ủng hộ"
                                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                                    />
                                                </div>

                                                {donationsLoading ? (
                                                    <div className="text-center py-8 text-gray-500">
                                                        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                                        <p>Đang tải danh sách ủng hộ...</p>
                                                    </div>
                                                ) : filteredDonations.length === 0 ? (
                                                    <div className="text-center py-12 text-gray-500">
                                                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                        <p>{searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có người ủng hộ nào'}</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* Table */}
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full">
                                                                <thead>
                                                                    <tr className="bg-orange-100">
                                                                        <th className="px-4 py-3 text-left text-medium font-medium text-gray-700">Người ủng hộ</th>
                                                                        <th className="px-4 py-3 text-center text-medium font-medium text-gray-700">Số tiền ủng hộ</th>
                                                                        <th className="px-4 py-3 text-right text-medium font-medium text-gray-700">Thời gian ủng hộ</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {paginatedDonations.map((donation) => {
                                                                        const donor = typeof donation.donor === 'object' ? donation.donor : null;
                                                                        const donorName = donor?.fullname || donor?.username || 'Người ủng hộ ẩn danh';
                                                                        
                                                                        return (
                                                                            <tr key={donation._id} className="bg-white border-b border-gray-100 hover:bg-gray-50 transition">
                                                                                <td className="px-4 py-3 text-medium text-gray-900">
                                                                                    {donorName}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-medium text-center font-medium text-gray-900">
                                                                                    {formatCurrencyVND(donation.amount)}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-medium text-right text-gray-600">
                                                                                    {formatDateTime(donation.createdAt)}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        {/* Pagination */}
                                                        {totalPages > 1 && (
                                                            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                                                <div className="text-sm text-gray-600">
                                                                    Hiển thị {startIndex + 1} - {Math.min(endIndex, filteredDonations.length)} trong tổng số {filteredDonations.length} kết quả
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                                        disabled={currentPage === 1}
                                                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                                                            currentPage === 1
                                                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                                                        }`}
                                                                    >
                                                                        Trước
                                                                    </button>
                                                                    <div className="flex items-center gap-1">
                                                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                                                            if (
                                                                                page === 1 ||
                                                                                page === totalPages ||
                                                                                (page >= currentPage - 1 && page <= currentPage + 1)
                                                                            ) {
                                                                                return (
                                                                                    <button
                                                                                        key={page}
                                                                                        onClick={() => setCurrentPage(page)}
                                                                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                                                                            currentPage === page
                                                                                                ? 'bg-orange-500 text-white'
                                                                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                                                                        }`}
                                                                                    >
                                                                                        {page}
                                                                                    </button>
                                                                                );
                                                                            } else if (
                                                                                page === currentPage - 2 ||
                                                                                page === currentPage + 2
                                                                            ) {
                                                                                return (
                                                                                    <span key={page} className="px-2 text-gray-500">
                                                                                        ...
                                                                                    </span>
                                                                                );
                                                                            }
                                                                            return null;
                                                                        })}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                                        disabled={currentPage === totalPages}
                                                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                                                            currentPage === totalPages
                                                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                                                        }`}
                                                                    >
                                                                        Sau
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Sidebar */}
                        <div className="space-y-6">
                            {/* Donate Card */}
                            <div ref={donateCardRef} className="bg-white rounded-2xl shadow-lg p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Chung tay ủng hộ</h3>
                                        <p className="text-gray-500 text-sm">Mỗi đồng góp đều có ý nghĩa</p>
                                    </div>
                                </div>

                                {/* Goal and Time Remaining */}
                                <div className="space-y-4 mb-6">
                                    {/* Mục tiêu chiến dịch */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" />
                                                <circle cx="12" cy="12" r="6" />
                                                <circle cx="12" cy="12" r="2" fill="currentColor" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs text-gray-600 font-medium">Mục tiêu chiến dịch</div>
                                            <div className="text-base font-bold text-gray-900">{formatCurrency(campaign.goal_amount)}</div>
                                        </div>
                                    </div>

                                    {/* Thời gian còn lại */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs text-gray-600 font-medium">Thời gian còn lại</div>
                                            <div className="text-base font-bold text-gray-900">{daysLeft !== null ? `${daysLeft} ngày` : '∞'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-3">
                                    {(() => {
                                        // Check if user is the creator - hide donate button for creator
                                        const isCreator = user && campaign && campaign.creator && 
                                            (user._id === campaign.creator._id || user.id === campaign.creator._id);
                                        
                                        // Check if campaign has ended
                                        if (campaign.end_date && daysLeft === 0) {
                                            return (
                                                <div className="w-full py-4 px-4 bg-gray-100 border-2 border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2">
                                                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <p className="text-gray-700 font-semibold text-center">Chiến dịch đã kết thúc</p>
                                                    <p className="text-gray-500 text-sm text-center">Cảm ơn bạn đã quan tâm đến chiến dịch này</p>
                                                </div>
                                            );
                                        }
                                        
                                        // Check campaign status
                                        const allowedStatuses = ['active', 'voting', 'approved'];
                                        const isCreatorOrganization = campaign.creator && typeof campaign.creator === 'object' && campaign.creator.role === 'organization';
                                        const canJoinCompanion = user && user.role === 'user' && isCreatorOrganization && !isCompanion;
                                        
                                        if (allowedStatuses.includes(campaign.status)) {
                                            return (
                                                <>
                                                    {/* Only show donate button if user is not the creator */}
                                                    {!isCreator && (
                                                        <button 
                                                            onClick={handleDonate} 
                                                            className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-green-700 transition shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            {isCompanion ? 'Ủng hộ qua bạn' : 'Ủng hộ ngay'}
                                                        </button>
                                                    )}
                                                    {canJoinCompanion && (
                                                        <button 
                                                            onClick={handleJoinCompanion}
                                                            disabled={isJoiningCompanion}
                                                            className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <Users className="w-5 h-5" />
                                                            {isJoiningCompanion ? 'Đang xử lý...' : 'Đồng hành chiến dịch'}
                                                        </button>
                                                    )}
                                                    {isCompanion && (
                                                        <div className="w-full py-3 px-4 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-center justify-center gap-2">
                                                            <Users className="w-5 h-5 text-blue-600" />
                                                            <span className="text-blue-700 font-medium text-sm">Bạn đang đồng hành chiến dịch này</span>
                                                        </div>
                                                    )}
                                                    <button 
                                                        onClick={() => setIsCreatePostOpen(true)}
                                                        className="w-full py-4 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition flex items-center justify-center gap-2"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                        Tạo bài viết
                                                    </button>
                                                </>
                                            );
                                        }
                                        
                                        // Show status-specific messages
                                        const statusMessages: Record<string, string> = {
                                            'pending': 'Chiến dịch đang duyệt',
                                            'completed': 'Chiến dịch này đã hoàn tất',
                                            'rejected': 'Chiến dịch này đã bị từ chối',
                                            'cancelled': 'Chiến dịch bị huỷ'
                                        };
                                        
                                        return (
                                            <div className="w-full py-4 px-4 bg-gray-100 border-2 border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2">
                                                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <p className="text-gray-700 font-semibold text-center">
                                                    {statusMessages[campaign.status] || 'Không thể ủng hộ chiến dịch này'}
                                                </p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Donors List */}
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                                    </svg>
                                    <h3 className="font-bold text-gray-900">Danh sách ủng hộ</h3>
                                </div>
                                <div className="space-y-4">
                                    {donationsLoading ? (
                                        <div className="text-center py-4 text-gray-500 text-sm">
                                            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                            <p>Đang tải...</p>
                                        </div>
                                    ) : donations.length === 0 ? (
                                        <p className="text-center text-gray-500 text-sm py-4">Chưa có người ủng hộ</p>
                                    ) : (
                                        donations.slice(0, 5).map((donation) => {
                                            const donor = typeof donation.donor === 'object' ? donation.donor : null;
                                            const donorName = donor?.username || 'Người ủng hộ ẩn danh';
                                            const donorInitial = donorName.charAt(0).toUpperCase();
                                            const isTop = topDonor && donation._id === topDonor._id;
                                            const isRecent = recentDonations.some(d => d._id === donation._id);
                                            
                                            return (
                                                <div key={donation._id} className="flex items-center gap-3">
                                                    {donor?.avatar_url ? (
                                                        <img 
                                                            src={donor.avatar_url} 
                                                            alt={donorName}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                            {donorInitial}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium text-gray-900 text-sm truncate">{donorName}</p>
                                                            {isTop && (
                                                                <span className="text-yellow-500 text-xs">👑</span>
                                                            )}
                                                        </div>
                                                        <p className="text-orange-500 text-sm font-medium">{formatCurrency(donation.amount)}</p>
                                                        <p className="text-gray-400 text-xs">{formatTimeAgo(donation.createdAt)}</p>
                                                    </div>
                                                    {isRecent && (
                                                        <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0"></div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                <button onClick={() => setActiveTab('supporters')} className="w-full mt-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center justify-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                    Xem tất cả
                                </button>
                            </div>

                            {/* Share */}
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Share2 className="w-5 h-5 text-blue-500" />
                                    <h3 className="font-bold text-gray-900">Chia sẻ chiến dịch</h3>
                                </div>
                                <button
                                    onClick={handleShare}
                                    disabled={isSharing}
                                    className="w-full py-3 px-4 border border-gray-300 hover:border-gray-400 rounded-lg transition flex items-center justify-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Share2 className="w-5 h-5" />
                                    {isSharing ? 'Đang chia sẻ...' : 'Chia sẻ'}
                                </button>
                            </div>

                            {/* Report */}
                            {user && campaign && campaign.creator && (user._id !== campaign.creator._id && user.id !== campaign.creator._id) && (
                                <div className="bg-white rounded-2xl shadow-lg p-6">
                                    <button
                                        onClick={async () => {
                                            if (hasReported) {
                                                Swal.fire({
                                                    icon: 'info',
                                                    title: 'Đã báo cáo',
                                                    text: 'Bạn đã báo cáo chiến dịch này rồi. Vui lòng chờ admin xử lý.',
                                                });
                                                return;
                                            }

                                            setIsCheckingReport(true);
                                            try {
                                                const { reports } = await getReportsByItem('campaign', campaignId);
                                                const currentUserId = (user as any)?._id || user?.id;
                                                const userReport = reports.find(
                                                    (report) => report.reporter._id === currentUserId
                                                );
                                                
                                                if (userReport) {
                                                    setHasReported(true);
                                                    Swal.fire({
                                                        icon: 'info',
                                                        title: 'Đã báo cáo',
                                                        text: 'Bạn đã báo cáo chiến dịch này rồi. Vui lòng chờ admin xử lý.',
                                                    });
                                                } else {
                                                    setShowReportModal(true);
                                                }
                                            } catch (error) {
                                                console.error('Error checking report:', error);
                                                setShowReportModal(true);
                                            } finally {
                                                setIsCheckingReport(false);
                                            }
                                        }}
                                        disabled={isCheckingReport || hasReported}
                                        className="w-full py-3 px-4 border-2 border-red-300 text-red-600 font-medium rounded-xl hover:bg-red-50 hover:border-red-400 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FaFlag className="w-4 h-4" />
                                        {hasReported ? 'Đã báo cáo' : 'Báo cáo chiến dịch'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Withdrawal Request Modal */}
                {campaign && user && (
                    <WithdrawalRequestModal
                        isOpen={showCreateModal}
                        onClose={() => setShowCreateModal(false)}
                        campaignId={campaignId}
                        availableAmount={availableAmount}
                        onSuccess={handleSubmitRequest}
                        existingPendingRequests={withdrawalRequests.filter(
                            (req) =>
                                req.request_status === 'pending_voting' ||
                                req.request_status === 'voting_in_progress' ||
                                req.request_status === 'voting_completed' ||
                                req.request_status === 'admin_approved'
                        )}
                    />
                )}

                {/* Create Post Modal */}
                <CreatePostModal
                    isOpen={isCreatePostOpen}
                    onClose={() => setIsCreatePostOpen(false)}
                    initialCampaign={campaign}
                    onPostCreated={() => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Thành công!',
                            text: 'Bài viết đã được tạo thành công',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }}
                />

                {/* Report Modal */}
                <ReportModal
                    reportedType="campaign"
                    reportedId={campaignId}
                    isOpen={showReportModal}
                    onClose={() => setShowReportModal(false)}
                    onSuccess={() => {
                        setHasReported(true);
                    }}
                />
            </div>
        </ProtectedRoute>
    );
}

export default CampaignDetails;
