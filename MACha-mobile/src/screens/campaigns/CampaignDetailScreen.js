import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { campaignService } from '../../services/campaign.service';
import { donationService } from '../../services/donation.service';
import { escrowService } from '../../services/escrow.service';
import { reportService } from '../../services/report.service';
import { cloudinaryService } from '../../services/cloudinary.service';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

const ITEMS_PER_PAGE = 10;

export default function CampaignDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { campaignId } = route.params || {};
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  // Main state
  const [campaign, setCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('story');

  // Donations pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [displayedDonations, setDisplayedDonations] = useState([]);
  const [hasMoreDonations, setHasMoreDonations] = useState(true);

  // Withdrawal requests
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [activeWithdrawalRequest, setActiveWithdrawalRequest] = useState(null);
  const [userVote, setUserVote] = useState(null);
  const [isEligibleToVote, setIsEligibleToVote] = useState(false);
  const [availableAmount, setAvailableAmount] = useState(0);
  const [withdrawalRequestsLoading, setWithdrawalRequestsLoading] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  // Update form
  const [updateContent, setUpdateContent] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  // Report
  const [showReportModal, setShowReportModal] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [isCheckingReport, setIsCheckingReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [selectedReportReason, setSelectedReportReason] = useState('');

  // Refresh
  const [refreshing, setRefreshing] = useState(false);

  // Load campaign data
  useEffect(() => {
    if (campaignId) {
      fetchCampaign();
      fetchDonations();
      fetchUpdates();
    }
  }, [campaignId]);

  // Load withdrawal data when campaign and user are available
  useEffect(() => {
    if (campaignId && user && campaign) {
      fetchWithdrawalData();
    }
  }, [campaignId, user, campaign, donations]);

  // Update displayed donations when donations or search change
  useEffect(() => {
    filterAndPaginateDonations();
  }, [donations, searchQuery]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket || !isConnected || !campaignId) return;

    const campaignRoom = `campaign:${campaignId}`;
    socket.emit('join-room', campaignRoom);
    console.log(`🏠 Joined campaign room: ${campaignRoom}`);

    const handleDonationCreated = (event) => {
      if (event.campaignId === campaignId && event.donation) {
        const newDonation = event.donation;
        if (newDonation.payment_status === 'completed' && !newDonation.is_anonymous) {
          setDonations(prev => {
            const exists = prev.some(d => d._id === newDonation._id);
            if (exists) return prev;
            return [newDonation, ...prev];
          });
          if (event.campaign && campaign) {
            setCampaign(prev => prev ? {
              ...prev,
              current_amount: event.campaign.current_amount
            } : null);
          }
        }
      }
    };

    const handleDonationStatusChanged = (event) => {
      if (event.campaignId === campaignId && event.donation) {
        const updatedDonation = event.donation;
        setDonations(prev => {
          const index = prev.findIndex(d => d._id === updatedDonation._id);
          if (updatedDonation.payment_status === 'completed' && !updatedDonation.is_anonymous) {
            if (index === -1) {
              return [updatedDonation, ...prev];
            } else {
              return prev.map(d => d._id === updatedDonation._id ? updatedDonation : d);
            }
          } else {
            if (index !== -1) {
              return prev.filter(d => d._id !== updatedDonation._id);
            }
          }
          return prev;
        });
        if (event.campaign && campaign) {
          setCampaign(prev => prev ? {
            ...prev,
            current_amount: event.campaign.current_amount
          } : null);
        }
      }
    };

    const handleCampaignUpdateCreated = (event) => {
      if (String(event.campaignId) === String(campaignId) && event.update) {
        const newUpdate = event.update;
        setUpdates(prev => {
          const exists = prev.some(u => String(u._id) === String(newUpdate._id));
          if (exists) return prev;
          return [newUpdate, ...prev];
        });
      }
    };

    const handleCampaignUpdateDeleted = (event) => {
      if (String(event.campaignId) === String(campaignId) && event.updateId) {
        setUpdates(prev => prev.filter(u => String(u._id) !== String(event.updateId)));
      }
    };

    socket.on('donation:created', handleDonationCreated);
    socket.on('donation:status_changed', handleDonationStatusChanged);
    socket.on('campaign:update:created', handleCampaignUpdateCreated);
    socket.on('campaign:update:deleted', handleCampaignUpdateDeleted);

    return () => {
      socket.off('donation:created', handleDonationCreated);
      socket.off('donation:status_changed', handleDonationStatusChanged);
      socket.off('campaign:update:created', handleCampaignUpdateCreated);
      socket.off('campaign:update:deleted', handleCampaignUpdateDeleted);
      socket.emit('leave-room', campaignRoom);
      console.log(`🚪 Left campaign room: ${campaignRoom}`);
    };
  }, [socket, isConnected, campaignId, campaign]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const data = await campaignService.getCampaignById(campaignId);
      setCampaign(data);
      setError(null);
    } catch (err) {
      console.error('Error loading campaign:', err);
      setError(err.response?.data?.message || 'Không thể tải thông tin chiến dịch');
    } finally {
      setLoading(false);
    }
  };

  const fetchDonations = async () => {
    try {
      const data = await donationService.getDonationsByCampaign(campaignId);
      const completedDonations = data.filter(
        (donation) => donation.payment_status === 'completed' && !donation.is_anonymous
      );
      setDonations(completedDonations);
    } catch (err) {
      console.error('Error loading donations:', err);
      setDonations([]);
    }
  };

  const fetchUpdates = async () => {
    try {
      const data = await campaignService.getCampaignUpdates(campaignId);
      setUpdates(data);
    } catch (err) {
      console.error('Error loading updates:', err);
      setUpdates([]);
    }
  };

  const fetchWithdrawalData = async () => {
    if (!campaignId || !user) return;

    try {
      setWithdrawalRequestsLoading(true);

      const requests = await escrowService.getWithdrawalRequestsByCampaign(campaignId);
      setWithdrawalRequests(requests);

      const activeRequest = requests.find(
        (req) => req.request_status === 'voting_in_progress'
      );
      setActiveWithdrawalRequest(activeRequest || null);

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

      const userDonations = donations.filter(
        (donation) =>
          (typeof donation.donor === 'object' ? donation.donor._id : donation.donor) ===
          (user._id || user.id) && donation.payment_status === 'completed'
      );
      setIsEligibleToVote(userDonations.length > 0);

      try {
        const amount = await campaignService.getAvailableAmount(campaignId);
        setAvailableAmount(amount);
      } catch (err) {
        console.error('Error calculating available amount:', err);
        if (campaign?.available_amount !== undefined) {
          setAvailableAmount(campaign.available_amount);
        } else {
          setAvailableAmount(campaign?.current_amount || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching withdrawal data:', err);
    } finally {
      setWithdrawalRequestsLoading(false);
    }
  };

  const filterAndPaginateDonations = useCallback(() => {
    let filtered = donations;
    if (searchQuery.trim()) {
      filtered = donations.filter((donation) => {
        const donor = typeof donation.donor === 'object' ? donation.donor : null;
        const donorName = donor?.username || '';
        return donorName.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    setCurrentPage(1);
    const initialDonations = filtered.slice(0, ITEMS_PER_PAGE);
    setDisplayedDonations(initialDonations);
    setHasMoreDonations(filtered.length > ITEMS_PER_PAGE);
  }, [donations, searchQuery]);

  const loadMoreDonations = useCallback(() => {
    if (!hasMoreDonations) return;

    let filtered = donations;
    if (searchQuery.trim()) {
      filtered = donations.filter((donation) => {
        const donor = typeof donation.donor === 'object' ? donation.donor : null;
        const donorName = donor?.username || '';
        return donorName.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    const nextPage = currentPage + 1;
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const nextDonations = filtered.slice(startIndex, endIndex);

    if (nextDonations.length > 0) {
      setDisplayedDonations(prev => [...prev, ...nextDonations]);
      setCurrentPage(nextPage);
      setHasMoreDonations(endIndex < filtered.length);
    } else {
      setHasMoreDonations(false);
    }
  }, [currentPage, donations, searchQuery, hasMoreDonations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchCampaign(),
      fetchDonations(),
      fetchUpdates(),
      user && campaign ? fetchWithdrawalData() : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [user, campaign]);

  const handleVote = async (escrowId, value) => {
    if (!user || isVoting) return;

    try {
      setIsVoting(true);
      const vote = await escrowService.submitVote(escrowId, { value });
      setUserVote(vote);

      const updatedRequest = await escrowService.getWithdrawalRequestById(escrowId);
      setActiveWithdrawalRequest(updatedRequest);
      setWithdrawalRequests((prev) =>
        prev.map((req) => (req._id === escrowId ? updatedRequest : req))
      );

      Alert.alert('Thành công!', `Bạn đã vote ${value === 'approve' ? 'Đồng ý' : 'Từ chối'} cho withdrawal request này`);
    } catch (err) {
      console.error('Error submitting vote:', err);
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể gửi vote');
    } finally {
      setIsVoting(false);
    }
  };

  const handleCreateUpdate = async () => {
    if (!updateContent.trim() && !selectedImageUri) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung hoặc chọn ảnh');
      return;
    }

    try {
      setIsSubmittingUpdate(true);
      let imageUrl;

      if (selectedImageUri) {
        const uploadResult = await cloudinaryService.uploadImage(selectedImageUri, 'campaign-updates');
        imageUrl = uploadResult.secure_url;
      }

      const payload = {};
      if (updateContent.trim()) {
        payload.content = updateContent.trim();
      }
      if (imageUrl) {
        payload.image_url = imageUrl;
      }

      const newUpdate = await campaignService.createCampaignUpdate(campaignId, payload);
      setUpdates(prev => {
        const exists = prev.some(u => String(u._id) === String(newUpdate._id));
        if (exists) return prev;
        return [newUpdate, ...prev];
      });

      setUpdateContent('');
      setSelectedImageUri(null);
      setShowUpdateForm(false);
      Alert.alert('Thành công', 'Cập nhật đã được tạo');
    } catch (error) {
      console.error('Failed to create update:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tạo cập nhật');
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleDeleteUpdate = async (updateId) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc muốn xóa cập nhật này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await campaignService.deleteCampaignUpdate(updateId);
              setUpdates(prev => prev.filter(u => String(u._id) !== String(updateId)));
              Alert.alert('Đã xóa!', 'Cập nhật đã được xóa thành công');
            } catch (error) {
              console.error('Failed to delete update:', error);
              Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa cập nhật');
            }
          },
        },
      ]
    );
  };

  const handleImageSelect = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const handleCreateWithdrawalRequest = async (amount, reason) => {
    try {
      await escrowService.createWithdrawalRequest(campaignId, {
        withdrawal_request_amount: amount,
        request_reason: reason,
      });
      await fetchWithdrawalData();
      setShowWithdrawalModal(false);
      Alert.alert('Thành công!', 'Yêu cầu rút tiền đã được tạo thành công');
    } catch (err) {
      console.error('Error creating withdrawal request:', err);
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể tạo yêu cầu rút tiền');
    }
  };

  const handleReportCampaign = async () => {
    if (!user) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để báo cáo chiến dịch');
      navigation.navigate('Login');
      return;
    }
    if (!selectedReportReason) {
      Alert.alert('Lỗi', 'Vui lòng chọn lý do báo cáo');
      return;
    }

    try {
      await reportService.createReport({
        reported_type: 'campaign',
        reported_id: campaignId,
        reported_reason: selectedReportReason,
        description: reportReason,
      });
      setHasReported(true);
      setShowReportModal(false);
      Alert.alert('Thành công', 'Chiến dịch đã được báo cáo. Cảm ơn bạn đã đóng góp!');
    } catch (error) {
      console.error('Error reporting campaign:', error);
      Alert.alert('Lỗi', error.message || 'Không thể báo cáo chiến dịch');
    }
  };

  const checkUserReport = useCallback(async () => {
    if (!user || !campaignId) return;
    setIsCheckingReport(true);
    try {
      const { reports } = await reportService.getReportsByItem('campaign', campaignId);
      const currentUserId = user._id || user.id;
      const userReport = reports.find(
        (report) => report.reporter._id === currentUserId
      );
      if (userReport) {
        setHasReported(true);
      } else {
        setHasReported(false);
      }
    } catch (error) {
      console.error('Error checking user report:', error);
      // If error occurs, don't block user from reporting
      // Just set hasReported to false so they can still report
      setHasReported(false);
    } finally {
      setIsCheckingReport(false);
    }
  }, [user, campaignId]);

  useEffect(() => {
    checkUserReport();
  }, [checkUserReport]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  };

  const calculateDaysLeft = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const formatTimeAgo = (dateString) => {
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

  const getCategoryLabel = (category) => {
    const labels = {
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
      'other': 'Khác',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97E2C" />
        <Text style={styles.loadingText}>Đang tải thông tin chiến dịch...</Text>
      </SafeAreaView>
    );
  }

  if (error || !campaign) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{error || 'Không tìm thấy chiến dịch'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const progress = Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100);
  const daysLeft = campaign.end_date ? calculateDaysLeft(campaign.end_date) : null;
  const isCreator = user && campaign.creator && (user._id === campaign.creator._id || user.id === campaign.creator._id);
  const isPast = campaign.end_date && daysLeft === 0;
  const allowedStatuses = ['active', 'voting', 'approved'];
  const canDonate = allowedStatuses.includes(campaign.status) && !isPast;

  // Render tabs content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'story':
        return renderStoryTab();
      case 'updates':
        return renderUpdatesTab();
      case 'supporters':
        return renderSupportersTab();
      case 'withdrawals':
        return renderWithdrawalsTab();
      default:
        return null;
    }
  };

  const renderStoryTab = () => {
    return (
      <View style={styles.tabContent}>
        {/* Location */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <MaterialCommunityIcons name="map-marker" size={moderateScale(20)} color="#EF4444" />
            <Text style={styles.infoTitle}>Địa điểm</Text>
          </View>
          <Text style={styles.infoText}>
            {campaign.contact_info?.address || 'Chưa cập nhật địa chỉ'}
          </Text>
        </View>

        {/* Organizer */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <MaterialCommunityIcons name="account" size={moderateScale(20)} color="#3B82F6" />
            <Text style={styles.infoTitle}>Người kêu gọi</Text>
          </View>
          <Text style={styles.infoText}>
            {campaign.contact_info?.fullname || campaign.creator?.fullname || 'Chưa cập nhật'}
          </Text>
        </View>

        {/* Time Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <MaterialCommunityIcons name="clock" size={moderateScale(20)} color="#8B5CF6" />
            <Text style={styles.infoTitle}>Thời gian</Text>
          </View>
          <Text style={styles.infoText}>Bắt đầu: {formatDate(campaign.start_date)}</Text>
          <Text style={styles.infoText}>
            Kết thúc: {campaign.end_date ? formatDate(campaign.end_date) : 'Chưa xác định'}
          </Text>
          {daysLeft !== null && daysLeft > 0 && (
            <Text style={[styles.infoText, { color: '#F97E2C', fontWeight: '600' }]}>
              (Còn {daysLeft} ngày)
            </Text>
          )}
        </View>

        {/* Description */}
        {campaign.description && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Hoàn cảnh</Text>
            <Text style={styles.description}>{campaign.description}</Text>
          </View>
        )}

        {/* Hashtag */}
        {campaign.hashtag && (
          <View style={styles.hashtagContainer}>
            <MaterialCommunityIcons name="pound" size={moderateScale(20)} color="#3B82F6" />
            <Text style={styles.hashtagText}>#{campaign.hashtag.name}</Text>
          </View>
        )}

        {/* Gallery Images */}
        {campaign.gallery_images && campaign.gallery_images.length > 0 && (
          <View style={styles.galleryContainer}>
            <Text style={styles.sectionTitle}>Hình ảnh</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {campaign.gallery_images.slice(0, 4).map((img, index) => (
                <Image key={index} source={{ uri: img }} style={styles.galleryImage} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Timeline */}
        {campaign.expected_timeline && campaign.expected_timeline.length > 0 && (
          <View style={styles.timelineContainer}>
            <Text style={styles.sectionTitle}>Tiến độ dự kiến</Text>
            {campaign.expected_timeline.map((item, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={[
                  styles.timelineDot,
                  index === 0 && styles.timelineDotActive,
                  index === campaign.expected_timeline.length - 1 && styles.timelineDotLast,
                ]} />
                <Text style={styles.timelineText}>
                  {item.month}: {item.description}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderUpdatesTab = () => {
    const isCreator = user && campaign.creator && (user._id === campaign.creator._id || user.id === campaign.creator._id);

    return (
      <View style={styles.tabContent}>
        {isCreator && (
          <View style={styles.updateFormContainer}>
            {!showUpdateForm ? (
              <TouchableOpacity
                onPress={() => setShowUpdateForm(true)}
                style={styles.createUpdateButton}
              >
                <MaterialCommunityIcons name="plus-circle" size={moderateScale(20)} color="#FFFFFF" />
                <Text style={styles.createUpdateButtonText}>Tạo cập nhật mới</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.updateForm}>
                <TextInput
                  style={styles.updateTextInput}
                  placeholder="Nhập nội dung cập nhật (tùy chọn)..."
                  multiline
                  numberOfLines={4}
                  value={updateContent}
                  onChangeText={setUpdateContent}
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity onPress={handleImageSelect} style={styles.imageSelectButton}>
                  <MaterialCommunityIcons name="image" size={moderateScale(20)} color="#F97E2C" />
                  <Text style={styles.imageSelectButtonText}>Chọn ảnh</Text>
                </TouchableOpacity>
                {selectedImageUri && (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      onPress={() => setSelectedImageUri(null)}
                      style={styles.removeImageButton}
                    >
                      <MaterialCommunityIcons name="close-circle" size={moderateScale(24)} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.updateFormActions}>
                  <TouchableOpacity
                    onPress={handleCreateUpdate}
                    disabled={isSubmittingUpdate || (!updateContent.trim() && !selectedImageUri)}
                    style={[
                      styles.submitUpdateButton,
                      (isSubmittingUpdate || (!updateContent.trim() && !selectedImageUri)) && styles.submitUpdateButtonDisabled,
                    ]}
                  >
                    {isSubmittingUpdate ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitUpdateButtonText}>Đăng cập nhật</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setShowUpdateForm(false);
                      setUpdateContent('');
                      setSelectedImageUri(null);
                    }}
                    style={styles.cancelUpdateButton}
                  >
                    <Text style={styles.cancelUpdateButtonText}>Hủy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {updates.length === 0 ? (
          <View style={styles.emptyUpdatesContainer}>
            <MaterialCommunityIcons name="clipboard-text" size={scale(64)} color="#9CA3AF" />
            <Text style={styles.emptyUpdatesText}>Chưa có cập nhật nào</Text>
          </View>
        ) : (
          <View style={styles.updatesList}>
            {updates.map((update) => (
              <View key={update._id} style={styles.updateCard}>
                <View style={styles.updateHeader}>
                  <View style={styles.updateAuthorContainer}>
                    {update.creator?.avatar_url ? (
                      <Image
                        source={{ uri: update.creator.avatar_url }}
                        style={styles.updateAuthorAvatar}
                      />
                    ) : (
                      <View style={styles.updateAuthorAvatarPlaceholder}>
                        <Text style={styles.updateAuthorAvatarText}>
                          {(update.creator?.username || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.updateAuthorName}>
                        {update.creator?.fullname || update.creator?.username}
                      </Text>
                      <Text style={styles.updateDate}>{formatTimeAgo(update.createdAt)}</Text>
                    </View>
                  </View>
                  {isCreator && (
                    <TouchableOpacity
                      onPress={() => handleDeleteUpdate(update._id)}
                      style={styles.deleteUpdateButton}
                    >
                      <MaterialCommunityIcons name="delete" size={moderateScale(20)} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
                {update.content && (
                  <Text style={styles.updateContent}>{update.content}</Text>
                )}
                {update.image_url && (
                  <Image source={{ uri: update.image_url }} style={styles.updateImage} />
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderSupportersTab = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={moderateScale(20)} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nhập tên người ủng hộ"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {displayedDonations.length === 0 ? (
          <View style={styles.emptyDonationsContainer}>
            <MaterialCommunityIcons name="account-group" size={scale(64)} color="#9CA3AF" />
            <Text style={styles.emptyDonationsText}>
              {searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có người ủng hộ nào'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayedDonations}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => {
              const donor = typeof item.donor === 'object' ? item.donor : null;
              const donorName = donor?.fullname || donor?.username || 'Người ủng hộ ẩn danh';
              return (
                <View style={styles.donationItem}>
                  <Text style={styles.donationDonorName}>{donorName}</Text>
                  <Text style={styles.donationAmount}>{formatCurrency(item.amount)} VND</Text>
                  <Text style={styles.donationDate}>{formatDateTime(item.createdAt)}</Text>
                </View>
              );
            }}
            onEndReached={loadMoreDonations}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() =>
              hasMoreDonations ? (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color="#F97E2C" />
                </View>
              ) : null
            }
            scrollEnabled={false}
          />
        )}
      </View>
    );
  };

  const renderWithdrawalsTab = () => {
    const activeRequests = withdrawalRequests.filter(
      (req) => req.request_status !== 'cancelled'
    );

    return (
      <View style={styles.tabContent}>
        {isCreator && (
          <TouchableOpacity
            onPress={() => setShowWithdrawalModal(true)}
            style={styles.createWithdrawalButton}
          >
            <MaterialCommunityIcons name="plus-circle" size={moderateScale(20)} color="#FFFFFF" />
            <Text style={styles.createWithdrawalButtonText}>Tạo yêu cầu rút tiền</Text>
          </TouchableOpacity>
        )}

        <View style={styles.availableAmountContainer}>
          <Text style={styles.availableAmountLabel}>Số tiền có sẵn để rút</Text>
          <Text style={styles.availableAmountValue}>{formatCurrency(availableAmount)}</Text>
        </View>

        {withdrawalRequestsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97E2C" />
          </View>
        ) : activeRequests.length === 0 ? (
          <View style={styles.emptyWithdrawalsContainer}>
            <MaterialCommunityIcons name="wallet" size={scale(64)} color="#9CA3AF" />
            <Text style={styles.emptyWithdrawalsText}>Chưa có yêu cầu rút tiền nào</Text>
          </View>
        ) : (
          <View style={styles.withdrawalsList}>
            {activeWithdrawalRequest && (
              <View style={styles.votingSection}>
                <Text style={styles.votingSectionTitle}>Đang trong thời gian vote</Text>
                <View style={styles.votingCard}>
                  {!isEligibleToVote ? (
                    <View style={styles.notEligibleContainer}>
                      <MaterialCommunityIcons name="alert-circle" size={moderateScale(24)} color="#F59E0B" />
                      <Text style={styles.notEligibleText}>
                        Bạn cần đã donate cho campaign này để có quyền vote
                      </Text>
                    </View>
                  ) : userVote ? (
                    <View style={styles.userVoteContainer}>
                      <Text style={styles.userVoteText}>
                        Bạn đã vote: {userVote.value === 'approve' ? 'Đồng ý' : 'Từ chối'}
                      </Text>
                      <Text style={styles.userVoteWeight}>
                        Trọng số: {formatCurrency(userVote.vote_weight)}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.voteButtonsContainer}>
                      <TouchableOpacity
                        onPress={() => handleVote(activeWithdrawalRequest._id, 'approve')}
                        disabled={isVoting}
                        style={[styles.voteButton, styles.approveButton]}
                      >
                        <MaterialCommunityIcons name="check-circle" size={moderateScale(20)} color="#FFFFFF" />
                        <Text style={styles.voteButtonText}>Đồng ý</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleVote(activeWithdrawalRequest._id, 'reject')}
                        disabled={isVoting}
                        style={[styles.voteButton, styles.rejectButton]}
                      >
                        <MaterialCommunityIcons name="close-circle" size={moderateScale(20)} color="#FFFFFF" />
                        <Text style={styles.voteButtonText}>Từ chối</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}

            {activeRequests.map((escrow) => (
              <View key={escrow._id} style={styles.withdrawalCard}>
                <View style={styles.withdrawalHeader}>
                  <MaterialCommunityIcons name="cash" size={moderateScale(24)} color="#3B82F6" />
                  <Text style={styles.withdrawalAmount}>{formatCurrency(escrow.withdrawal_request_amount)}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>
                      {escrow.request_status === 'voting_in_progress' ? 'Đang vote' :
                       escrow.request_status === 'voting_completed' ? 'Đã hoàn thành vote' :
                       escrow.request_status === 'admin_approved' ? 'Admin đã duyệt' :
                       escrow.request_status === 'released' ? 'Đã giải ngân' : 'Chờ xử lý'}
                    </Text>
                  </View>
                </View>
                {escrow.request_reason && (
                  <Text style={styles.withdrawalReason}>{escrow.request_reason}</Text>
                )}
                {escrow.votingResults && escrow.votingResults.totalVotes > 0 && (
                  <View style={styles.votingResultsContainer}>
                    <Text style={styles.votingResultsText}>
                      Đồng ý: {escrow.votingResults.approvePercentage}% | Từ chối: {escrow.votingResults.rejectPercentage}%
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={scale(24)} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết chiến dịch</Text>
          {user && !isCreator && (
            <TouchableOpacity
              onPress={async () => {
                if (hasReported) {
                  Alert.alert(
                    'Đã báo cáo',
                    'Bạn đã báo cáo chiến dịch này rồi. Vui lòng chờ admin xử lý.'
                  );
                  return;
                }

                setIsCheckingReport(true);
                try {
                  const { reports } = await reportService.getReportsByItem('campaign', campaignId);
                  const currentUserId = user._id || user.id;
                  const userReport = reports.find(
                    (report) => report.reporter._id === currentUserId
                  );
                  
                  if (userReport) {
                    setHasReported(true);
                    Alert.alert(
                      'Đã báo cáo',
                      'Bạn đã báo cáo chiến dịch này rồi. Vui lòng chờ admin xử lý.'
                    );
                  } else {
                    setShowReportModal(true);
                  }
                } catch (error) {
                  console.error('Error checking report:', error);
                  // If error occurs, still allow user to report
                  setShowReportModal(true);
                } finally {
                  setIsCheckingReport(false);
                }
              }}
              style={styles.reportButton}
              disabled={isCheckingReport || hasReported}
            >
              <MaterialCommunityIcons name="flag" size={scale(24)} color={hasReported ? '#9CA3AF' : '#EF4444'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Hero Banner */}
        <View style={styles.bannerContainer}>
          {campaign.banner_image ? (
            <Image
              source={{ uri: campaign.banner_image }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.bannerPlaceholder}>
              <MaterialCommunityIcons name="heart" size={scale(80)} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.bannerOverlay}>
            <Text style={styles.campaignTitle}>{campaign.title}</Text>
            <Text style={styles.campaignOrganizer}>
              Tổ chức bởi {campaign.contact_info?.fullname || campaign.creator?.fullname}
            </Text>
            {campaign.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{getCategoryLabel(campaign.category)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Đã đạt được</Text>
            <Text style={styles.progressAmount}>{formatCurrency(campaign.current_amount)}</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressGoal}>
            Mục tiêu: {formatCurrency(campaign.goal_amount)}
          </Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{donations.length}</Text>
              <Text style={styles.statLabel}>Lượt ủng hộ</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{daysLeft !== null ? daysLeft : '∞'}</Text>
              <Text style={styles.statLabel}>Ngày còn lại</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{updates.length}</Text>
              <Text style={styles.statLabel}>Số cập nhật</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              onPress={() => setActiveTab('story')}
              style={[styles.tab, activeTab === 'story' && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === 'story' && styles.tabTextActive]}>
                Câu chuyện
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('updates')}
              style={[styles.tab, activeTab === 'updates' && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === 'updates' && styles.tabTextActive]}>
                Hoạt động ({updates.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('supporters')}
              style={[styles.tab, activeTab === 'supporters' && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === 'supporters' && styles.tabTextActive]}>
                Danh sách ủng hộ ({donations.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('withdrawals')}
              style={[styles.tab, activeTab === 'withdrawals' && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === 'withdrawals' && styles.tabTextActive]}>
                Rút tiền ({withdrawalRequests.filter(req => req.request_status !== 'cancelled').length})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Donate Button */}
        {canDonate && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Donate', { campaignId })}
            style={styles.donateButton}
          >
            <MaterialCommunityIcons name="heart" size={moderateScale(20)} color="#FFFFFF" />
            <Text style={styles.donateButtonText}>Ủng hộ ngay</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Withdrawal Request Modal */}
      <WithdrawalRequestModal
        visible={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        onSubmit={handleCreateWithdrawalRequest}
        availableAmount={availableAmount}
      />

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportCampaign}
        reportReason={reportReason}
        setReportReason={setReportReason}
        selectedReportReason={selectedReportReason}
        setSelectedReportReason={setSelectedReportReason}
      />
    </SafeAreaView>
  );
}

// Withdrawal Request Modal Component
function WithdrawalRequestModal({ visible, onClose, onSubmit, availableAmount }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrencyLocal = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  const handleSubmit = async () => {
    const amountValue = parseFloat(amount.replace(/[^\d.]/g, ''));
    if (!amount || amountValue <= 0) {
      Alert.alert('Lỗi', 'Số tiền phải lớn hơn 0');
      return;
    }
    if (amountValue > availableAmount) {
      Alert.alert('Lỗi', `Số tiền không được vượt quá ${formatCurrencyLocal(availableAmount)}`);
      return;
    }
    if (!reason.trim() || reason.trim().length < 10) {
      Alert.alert('Lỗi', 'Lý do phải có ít nhất 10 ký tự');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(amountValue, reason.trim());
      setAmount('');
      setReason('');
    } catch (_err) {
      // Error handled in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yêu cầu rút tiền</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={scale(24)} color="#1F2937" />
            </TouchableOpacity>
          </View>
          <View style={styles.availableAmountDisplay}>
            <Text style={styles.availableAmountDisplayLabel}>Số tiền có sẵn</Text>
            <Text style={styles.availableAmountDisplayValue}>{formatCurrencyLocal(availableAmount)}</Text>
          </View>
          <TextInput
            style={styles.modalInput}
            placeholder="Số tiền muốn rút"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            style={[styles.modalInput, styles.modalTextArea]}
            placeholder="Lý do yêu cầu rút tiền (tối thiểu 10 ký tự)"
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={5}
            placeholderTextColor="#9CA3AF"
          />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.modalCancelButton}>
              <Text style={styles.modalCancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[styles.modalSubmitButton, isSubmitting && styles.modalSubmitButtonDisabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitButtonText}>Gửi yêu cầu</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Report Modal Component
function ReportModal({ visible, onClose, onSubmit, reportReason, setReportReason, selectedReportReason, setSelectedReportReason }) {
  const reportReasons = [
    { label: 'Spam', value: 'spam' },
    { label: 'Nội dung không phù hợp', value: 'inappropriate_content' },
    { label: 'Lừa đảo', value: 'scam' },
    { label: 'Giả mạo', value: 'fake' },
    { label: 'Quấy rối', value: 'harassment' },
    { label: 'Bạo lực', value: 'violence' },
    { label: 'Vi phạm bản quyền', value: 'copyright' },
    { label: 'Thông tin sai lệch', value: 'misinformation' },
    { label: 'Lạm dụng quyền lực', value: 'abuse_of_power' },
    { label: 'Xử lý không phù hợp', value: 'inappropriate_handling' },
    { label: 'Khác', value: 'other' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.reportModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Báo cáo chiến dịch</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={scale(24)} color="#1F2937" />
            </TouchableOpacity>
          </View>
          <Text style={styles.reportModalSubtitle}>Vui lòng chọn lý do báo cáo:</Text>
          <ScrollView style={styles.reportReasonsList}>
            {reportReasons.map((reason) => (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reportReasonButton,
                  selectedReportReason === reason.value && styles.reportReasonButtonActive,
                ]}
                onPress={() => setSelectedReportReason(reason.value)}
              >
                <Text
                  style={[
                    styles.reportReasonButtonText,
                    selectedReportReason === reason.value && styles.reportReasonButtonTextActive,
                  ]}
                >
                  {reason.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            style={[styles.modalInput, styles.modalTextArea]}
            placeholder="Mô tả chi tiết (tùy chọn)"
            multiline
            numberOfLines={4}
            value={reportReason}
            onChangeText={setReportReason}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            style={[styles.modalSubmitButton, !selectedReportReason && styles.modalSubmitButtonDisabled]}
            onPress={onSubmit}
            disabled={!selectedReportReason}
          >
            <Text style={styles.modalSubmitButtonText}>Gửi báo cáo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: scale(16),
    fontSize: moderateScale(16),
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: scale(20),
  },
  emptyText: {
    fontSize: moderateScale(18),
    color: '#6B7280',
    marginBottom: scale(20),
  },
  backButton: {
    padding: scale(8),
  },
  backButtonText: {
    fontSize: moderateScale(16),
    color: '#F97E2C',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    flex: 1,
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  reportButton: {
    padding: scale(8),
  },
  bannerContainer: {
    height: verticalScale(250),
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F97E2C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: scale(16),
  },
  campaignTitle: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: scale(8),
  },
  campaignOrganizer: {
    fontSize: moderateScale(14),
    color: '#FFFFFF',
    marginBottom: scale(8),
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(20),
  },
  categoryBadgeText: {
    fontSize: moderateScale(12),
    color: '#FFFFFF',
    fontWeight: '600',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    margin: scale(16),
    padding: scale(16),
    borderRadius: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    marginBottom: scale(12),
  },
  progressLabel: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  progressAmount: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    color: '#F97E2C',
  },
  progressBarContainer: {
    height: scale(12),
    backgroundColor: '#E5E7EB',
    borderRadius: scale(6),
    overflow: 'hidden',
    marginBottom: scale(12),
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#F97E2C',
    borderRadius: scale(6),
  },
  progressGoal: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginBottom: scale(16),
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    marginTop: scale(4),
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#F97E2C',
  },
  tabText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#F97E2C',
    fontWeight: '600',
  },
  tabContent: {
    padding: scale(16),
    backgroundColor: '#FFFFFF',
    minHeight: verticalScale(400),
  },
  infoSection: {
    marginBottom: scale(20),
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  infoTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: scale(8),
  },
  infoText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    lineHeight: scale(20),
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: scale(12),
  },
  description: {
    fontSize: moderateScale(14),
    color: '#374151',
    lineHeight: scale(22),
  },
  hashtagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: scale(12),
    borderRadius: scale(8),
    marginBottom: scale(20),
  },
  hashtagText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: scale(8),
  },
  galleryContainer: {
    marginBottom: scale(20),
  },
  galleryImage: {
    width: scale(150),
    height: scale(100),
    borderRadius: scale(8),
    marginRight: scale(12),
  },
  timelineContainer: {
    marginBottom: scale(20),
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  timelineDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: '#3B82F6',
    marginRight: scale(12),
  },
  timelineDotActive: {
    backgroundColor: '#10B981',
  },
  timelineDotLast: {
    backgroundColor: '#93C5FD',
  },
  timelineText: {
    flex: 1,
    fontSize: moderateScale(14),
    color: '#374151',
  },
  updateFormContainer: {
    marginBottom: scale(20),
  },
  createUpdateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97E2C',
    padding: scale(12),
    borderRadius: scale(8),
  },
  createUpdateButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: scale(8),
  },
  updateForm: {
    backgroundColor: '#F9FAFB',
    padding: scale(16),
    borderRadius: scale(8),
  },
  updateTextInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(8),
    padding: scale(12),
    fontSize: moderateScale(14),
    color: '#1F2937',
    marginBottom: scale(12),
    minHeight: scale(100),
    textAlignVertical: 'top',
  },
  imageSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: scale(12),
    borderRadius: scale(8),
    marginBottom: scale(12),
  },
  imageSelectButtonText: {
    fontSize: moderateScale(14),
    color: '#F97E2C',
    marginLeft: scale(8),
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: scale(12),
  },
  imagePreview: {
    width: '100%',
    height: scale(200),
    borderRadius: scale(8),
  },
  removeImageButton: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
  },
  updateFormActions: {
    flexDirection: 'row',
    gap: scale(12),
  },
  submitUpdateButton: {
    flex: 1,
    backgroundColor: '#F97E2C',
    padding: scale(12),
    borderRadius: scale(8),
    alignItems: 'center',
  },
  submitUpdateButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitUpdateButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelUpdateButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: scale(12),
    borderRadius: scale(8),
    alignItems: 'center',
  },
  cancelUpdateButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#374151',
  },
  emptyUpdatesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(40),
  },
  emptyUpdatesText: {
    fontSize: moderateScale(16),
    color: '#9CA3AF',
    marginTop: scale(16),
  },
  updatesList: {
    gap: scale(16),
  },
  updateCard: {
    backgroundColor: '#F9FAFB',
    padding: scale(16),
    borderRadius: scale(8),
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(12),
  },
  updateAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  updateAuthorAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    marginRight: scale(12),
  },
  updateAuthorAvatarPlaceholder: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#F97E2C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  updateAuthorAvatarText: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  updateAuthorName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#1F2937',
  },
  updateDate: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    marginTop: scale(4),
  },
  deleteUpdateButton: {
    padding: scale(8),
  },
  updateContent: {
    fontSize: moderateScale(14),
    color: '#374151',
    lineHeight: scale(20),
    marginBottom: scale(12),
  },
  updateImage: {
    width: '100%',
    height: scale(200),
    borderRadius: scale(8),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: scale(8),
    paddingHorizontal: scale(12),
    marginBottom: scale(16),
  },
  searchIcon: {
    marginRight: scale(8),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(14),
    color: '#1F2937',
    paddingVertical: scale(12),
  },
  emptyDonationsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(40),
  },
  emptyDonationsText: {
    fontSize: moderateScale(16),
    color: '#9CA3AF',
    marginTop: scale(16),
  },
  donationItem: {
    backgroundColor: '#F9FAFB',
    padding: scale(16),
    borderRadius: scale(8),
    marginBottom: scale(12),
  },
  donationDonorName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: scale(4),
  },
  donationAmount: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#F97E2C',
    marginBottom: scale(4),
  },
  donationDate: {
    fontSize: moderateScale(12),
    color: '#6B7280',
  },
  loadingMoreContainer: {
    paddingVertical: scale(16),
    alignItems: 'center',
  },
  createWithdrawalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: scale(12),
    borderRadius: scale(8),
    marginBottom: scale(16),
  },
  createWithdrawalButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: scale(8),
  },
  availableAmountContainer: {
    backgroundColor: '#ECFDF5',
    padding: scale(16),
    borderRadius: scale(8),
    marginBottom: scale(16),
  },
  availableAmountLabel: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginBottom: scale(4),
  },
  availableAmountValue: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#10B981',
  },
  emptyWithdrawalsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(40),
  },
  emptyWithdrawalsText: {
    fontSize: moderateScale(16),
    color: '#9CA3AF',
    marginTop: scale(16),
  },
  withdrawalsList: {
    gap: scale(16),
  },
  votingSection: {
    marginBottom: scale(20),
  },
  votingSectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: scale(12),
  },
  votingCard: {
    backgroundColor: '#EFF6FF',
    padding: scale(16),
    borderRadius: scale(8),
  },
  notEligibleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notEligibleText: {
    fontSize: moderateScale(14),
    color: '#92400E',
    marginLeft: scale(12),
    flex: 1,
  },
  userVoteContainer: {
    alignItems: 'center',
  },
  userVoteText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: scale(8),
  },
  userVoteWeight: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  voteButtonsContainer: {
    flexDirection: 'row',
    gap: scale(12),
  },
  voteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(12),
    borderRadius: scale(8),
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  voteButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: scale(8),
  },
  withdrawalCard: {
    backgroundColor: '#F9FAFB',
    padding: scale(16),
    borderRadius: scale(8),
  },
  withdrawalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  withdrawalAmount: {
    flex: 1,
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#3B82F6',
    marginLeft: scale(12),
  },
  statusBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(16),
  },
  statusBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1E40AF',
  },
  withdrawalReason: {
    fontSize: moderateScale(14),
    color: '#374151',
    marginBottom: scale(12),
  },
  votingResultsContainer: {
    backgroundColor: '#F3F4F6',
    padding: scale(12),
    borderRadius: scale(8),
  },
  votingResultsText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    margin: scale(16),
    padding: scale(16),
    borderRadius: scale(8),
  },
  donateButtonText: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: scale(8),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    padding: scale(20),
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(20),
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  availableAmountDisplay: {
    backgroundColor: '#ECFDF5',
    padding: scale(16),
    borderRadius: scale(8),
    marginBottom: scale(16),
  },
  availableAmountDisplayLabel: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginBottom: scale(4),
  },
  availableAmountDisplayValue: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#10B981',
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: scale(8),
    padding: scale(12),
    fontSize: moderateScale(14),
    color: '#1F2937',
    marginBottom: scale(16),
  },
  modalTextArea: {
    minHeight: scale(100),
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: scale(12),
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: scale(12),
    borderRadius: scale(8),
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#374151',
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    padding: scale(12),
    borderRadius: scale(8),
    alignItems: 'center',
  },
  modalSubmitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  modalSubmitButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reportModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    padding: scale(20),
    width: '100%',
    maxHeight: '80%',
  },
  reportModalSubtitle: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginBottom: scale(16),
  },
  reportReasonsList: {
    maxHeight: scale(300),
    marginBottom: scale(16),
  },
  reportReasonButton: {
    padding: scale(12),
    borderRadius: scale(8),
    backgroundColor: '#F9FAFB',
    marginBottom: scale(8),
  },
  reportReasonButtonActive: {
    backgroundColor: '#FEF3C7',
  },
  reportReasonButtonText: {
    fontSize: moderateScale(14),
    color: '#374151',
  },
  reportReasonButtonTextActive: {
    color: '#92400E',
    fontWeight: '600',
  },
});

