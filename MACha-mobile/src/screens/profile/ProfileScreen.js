import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import apiClient from '../../services/apiClient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { campaignCompanionService } from '../../services/campaignCompanion.service';

const USER_ROUTE = 'api/users';
const CAMPAIGN_ROUTE = 'api/campaigns';
const CONVERSATION_ROUTE = 'api/conversations';

const GET_USER_BY_ID_ROUTE = (userId) => `${USER_ROUTE}/${userId}`;
const FOLLOW_USER_ROUTE = (userId) => `${USER_ROUTE}/${userId}/follow`;
const UNFOLLOW_USER_ROUTE = (userId) => `${USER_ROUTE}/${userId}/unfollow`;
const GET_CAMPAIGNS_BY_CREATOR_ROUTE = `${CAMPAIGN_ROUTE}/creator`;
const CREATE_CONVERSATION_PRIVATE_ROUTE = (userId2) => `${CONVERSATION_ROUTE}/private/${userId2}`;

export default function ProfileScreen({ route }) {
  const navigation = useNavigation();
  const { user: currentUser, loading: authLoading, setUser: setCurrentUser } = useAuth();
  const { socket, isConnected } = useSocket();
  
  // Get userId from route params or use current user
  const userId = route?.params?.userId || currentUser?._id || currentUser?.id || null;
  
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [companionCampaigns, setCompanionCampaigns] = useState([]);
  const [companionCampaignsLoading, setCompanionCampaignsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [showDropdown, setShowDropdown] = useState(false);

  // So sánh ID: API trả về _id, nhưng AuthContext có thể có id hoặc _id
  const currentUserId = currentUser?._id || currentUser?.id;
  const isOwnProfile = !!(currentUserId && (currentUserId === userId || (user && currentUserId === user._id)));

  // Fetch user data function
  const fetchUserData = useCallback(async () => {
    if (authLoading || !userId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch user data
      const userResponse = await apiClient.get(GET_USER_BY_ID_ROUTE(userId));
      const userData = userResponse.data.user;
      setUser(userData);

      // Fetch campaigns
      const campaignsResponse = await apiClient.get(GET_CAMPAIGNS_BY_CREATOR_ROUTE, {
        params: { creatorId: userId },
      });
      setCampaigns(campaignsResponse.data.campaigns || []);

      // Fetch companion campaigns if own profile
      const currentId = currentUser?._id || currentUser?.id;
      const isOwn = !!(currentId && (currentId === userId || currentId === userData._id));
      
      if (isOwn) {
        try {
          setCompanionCampaignsLoading(true);
          const companionData = await campaignCompanionService.getUserCompanionCampaigns(userId);
          setCompanionCampaigns(companionData.campaigns || []);
        } catch (err) {
          console.error('Error loading companion campaigns:', err);
        } finally {
          setCompanionCampaignsLoading(false);
        }
      }
    } catch (err) {
      console.error('Error loading user:', err);
      setError('Không thể tải thông tin người dùng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [userId, authLoading, currentUser]);

  // Fetch data on mount and when userId changes
  useEffect(() => {
    if (userId) {
      fetchUserData();
    }

    return () => {
      setUser(null);
      setCampaigns([]);
      setError(null);
      setActiveTab('campaigns');
    };
  }, [userId, currentUser?.id, authLoading, fetchUserData]);

  // Refresh data when screen is focused (e.g., returning from EditProfile)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if it's own profile (to update after editing)
      if (isOwnProfile && userId) {
        fetchUserData();
      }
    }, [isOwnProfile, userId, fetchUserData])
  );

  const isFollowing =
    !!currentUser &&
    Array.isArray(currentUser.following) &&
    currentUser.following.includes(userId);

  const isFollowedBy =
    !!currentUserId &&
    !!user &&
    Array.isArray(user.followers) &&
    user.followers.length > 0 &&
    user.followers.some((followerId) => {
      const followerIdStr = String(followerId);
      const currentIdStr = String(currentUserId);
      return followerIdStr === currentIdStr;
    });

  const canMessage = isFollowing || isFollowedBy;

  // Realtime cập nhật followers_count qua Socket.IO
  useEffect(() => {
    if (!socket || !isConnected || !userId) return;

    const handleUserFollowed = (event) => {
      if (event.targetUserId !== userId) return;

      const currentId = currentUserId;
      if (event.followerId === currentId) {
        return;
      }

      setUser((prev) =>
        prev
          ? {
              ...prev,
              followers_count: (prev.followers_count || 0) + 1,
            }
          : prev
      );

      if (isOwnProfile && currentId && event.targetUserId === currentId && currentUser) {
        setCurrentUser({
          ...currentUser,
          followers_count: ((currentUser.followers_count || 0) + 1),
        });
      }
    };

    const handleUserUnfollowed = (event) => {
      if (event.targetUserId !== userId) return;

      const currentId = currentUserId;
      if (event.followerId === currentId) {
        return;
      }

      setUser((prev) =>
        prev
          ? {
              ...prev,
              followers_count: Math.max((prev.followers_count || 1) - 1, 0),
            }
          : prev
      );

      if (isOwnProfile && currentId && event.targetUserId === currentId && currentUser) {
        setCurrentUser({
          ...currentUser,
          followers_count: Math.max(
            ((currentUser.followers_count || 1) - 1),
            0
          ),
        });
      }
    };

    socket.on('user:followed', handleUserFollowed);
    socket.on('user:unfollowed', handleUserUnfollowed);

    return () => {
      socket.off('user:followed', handleUserFollowed);
      socket.off('user:unfollowed', handleUserUnfollowed);
    };
  }, [socket, isConnected, userId, currentUserId, isOwnProfile, setCurrentUser, currentUser]);

  const handleFollow = async () => {
    if (!currentUser) {
      Alert.alert('Thông báo', 'Vui lòng đăng nhập để theo dõi người dùng');
      return;
    }

    try {
      if (isFollowing) {
        await apiClient.post(UNFOLLOW_USER_ROUTE(userId));

        const currentFollowing = Array.isArray(currentUser.following)
          ? [...currentUser.following]
          : [];
        const updatedFollowing = currentFollowing.filter((id) => id !== userId);

        setCurrentUser({
          ...currentUser,
          following: updatedFollowing,
          following_count: Math.max(
            ((currentUser.following_count || 1) - 1),
            0
          ),
        });

        setUser((prev) =>
          prev
            ? {
                ...prev,
                followers_count: Math.max((prev.followers_count || 1) - 1, 0),
              }
            : prev
        );
      } else {
        await apiClient.post(FOLLOW_USER_ROUTE(userId));

        const currentFollowing = Array.isArray(currentUser.following)
          ? [...currentUser.following]
          : [];
        const updatedFollowing = currentFollowing.includes(userId)
          ? currentFollowing
          : [...currentFollowing, userId];

        setCurrentUser({
          ...currentUser,
          following: updatedFollowing,
          following_count: ((currentUser.following_count || 0) + 1),
        });

        setUser((prev) =>
          prev
            ? {
                ...prev,
                followers_count: (prev.followers_count || 0) + 1,
              }
            : prev
        );
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        'Không thể thực hiện thao tác. Vui lòng thử lại sau.';

      Alert.alert('Lỗi', message);
    }
  };

  const handleMessage = async () => {
    if (!currentUser || !userId) return;

    try {
      const conversationResponse = await apiClient.post(CREATE_CONVERSATION_PRIVATE_ROUTE(userId));
      const conversation = conversationResponse.data.conversation;
      
      // Navigate to messages screen with conversation
      navigation.navigate('Messages', { conversationId: conversation._id });
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert(
        'Lỗi',
        error?.response?.data?.message || 'Không thể tạo cuộc trò chuyện. Vui lòng thử lại sau.'
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#62AC4A" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Có lỗi xảy ra</Text>
          <Text style={styles.errorText}>{error || 'Không tìm thấy người dùng'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getKYCBadge = () => {
    if (user.kyc_status === 'verified') {
      return (
        <View style={styles.kycBadge}>
          <MaterialCommunityIcons name="check-circle" size={16} color="#3B82F6" />
          <Text style={styles.kycBadgeText}>Đã xác minh</Text>
        </View>
      );
    }
    return null;
  };

  const getRoleBadge = () => {
    if (user.role === 'org') {
      return (
        <View style={styles.orgBadge}>
          <MaterialCommunityIcons name="office-building" size={16} color="#A855F7" />
          <Text style={styles.orgBadgeText}>Tổ chức</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Settings Icon */}
      {isOwnProfile && (
        <View style={styles.headerContainer}>
          <View style={styles.headerPlaceholder} />
          <Text style={styles.headerTitle}>Hồ sơ</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <MaterialCommunityIcons name="cog-outline" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>
      )}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Cover Photo Area */}
        <View style={styles.coverPhotoContainer}>
          <View style={styles.coverPhoto}>
            {user.cover_photo ? (
              <Image source={{ uri: user.cover_photo }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder} />
            )}
          </View>
        </View>

        {/* Profile Picture */}
        <View style={styles.profilePictureContainer}>
          <View style={styles.profilePictureWrapper}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.profilePicture} />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Text style={styles.profilePictureInitial}>
                  {(user.fullname || user.username || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {user.kyc_status === 'verified' && (
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-circle" size={24} color="#10B981" />
              </View>
            )}
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfoContainer}>
          {/* Name and Badges */}
          <View style={styles.nameContainer}>
            <Text style={styles.userName}>{user.fullname || user.username}</Text>
            <View style={styles.badgesContainer}>
              {getKYCBadge()}
              {getRoleBadge()}
            </View>
          </View>

          {/* Username */}
          <Text style={styles.username}>@{user.username}</Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{campaigns.length}</Text>
              <Text style={styles.statLabel}>Chiến dịch</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.followers_count || 0}</Text>
              <Text style={styles.statLabel}>Người theo dõi</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.following_count || 0}</Text>
              <Text style={styles.statLabel}>Đang theo dõi</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Đóng góp</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {isOwnProfile ? (
              <>
                {user.kyc_status === 'unverified' && (
                  <TouchableOpacity
                    style={styles.kycButton}
                    onPress={() => navigation.navigate('KYC')}
                  >
                    <MaterialCommunityIcons name="shield-check" size={20} color="#10B981" />
                    <Text style={styles.kycButtonText}>Xác thực KYC</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => navigation.navigate('EditProfile')}
                >
                  <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
                  <Text style={styles.editButtonText}>Chỉnh sửa hồ sơ</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.followButton, isFollowing && styles.followingButton]}
                  onPress={handleFollow}
                >
                  <MaterialCommunityIcons
                    name={isFollowing ? 'check' : 'plus'}
                    size={20}
                    color={isFollowing ? '#374151' : '#fff'}
                  />
                  <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                    {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                  </Text>
                </TouchableOpacity>
                {canMessage && (
                  <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                    <MaterialCommunityIcons name="message-text" size={20} color="#374151" />
                    <Text style={styles.messageButtonText}>Nhắn tin</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.moreButton}
                  onPress={() => setShowDropdown(!showDropdown)}
                >
                  <MaterialCommunityIcons name="dots-horizontal" size={20} color="#374151" />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScrollView}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'campaigns' && styles.activeTab]}
                onPress={() => setActiveTab('campaigns')}
              >
                <Text style={[styles.tabText, activeTab === 'campaigns' && styles.activeTabText]}>
                  Chiến dịch
                </Text>
                {activeTab === 'campaigns' && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'activity' && styles.activeTab]}
                onPress={() => setActiveTab('activity')}
              >
                <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>
                  Hoạt động
                </Text>
                {activeTab === 'activity' && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'achievements' && styles.activeTab]}
                onPress={() => setActiveTab('achievements')}
              >
                <Text style={[styles.tabText, activeTab === 'achievements' && styles.activeTabText]}>
                  Thành tựu
                </Text>
                {activeTab === 'achievements' && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'about' && styles.activeTab]}
                onPress={() => setActiveTab('about')}
              >
                <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>
                  Giới thiệu
                </Text>
                {activeTab === 'about' && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
              {isOwnProfile && (
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'companions' && styles.activeTab]}
                  onPress={() => setActiveTab('companions')}
                >
                  <Text style={[styles.tabText, activeTab === 'companions' && styles.activeTabText]}>
                    Đồng hành
                  </Text>
                  {activeTab === 'companions' && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'campaigns' && (
              <View style={styles.campaignsContent}>
                {campaigns.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="briefcase-outline" size={64} color="#9CA3AF" />
                    <Text style={styles.emptyStateTitle}>
                      {isOwnProfile ? 'Bạn chưa tạo chiến dịch nào' : 'Chưa có chiến dịch'}
                    </Text>
                    <Text style={styles.emptyStateText}>
                      {isOwnProfile
                        ? 'Hãy bắt đầu tạo chiến dịch đầu tiên để kêu gọi sự hỗ trợ từ cộng đồng'
                        : 'Người dùng này chưa tạo chiến dịch nào'}
                    </Text>
                    {isOwnProfile && (
                      <TouchableOpacity
                        style={styles.createButton}
                        onPress={() => navigation.navigate('CreateCampaign')}
                      >
                        <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                        <Text style={styles.createButtonText}>Tạo chiến dịch mới</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.campaignsList}>
                    {campaigns.map((campaign) => (
                      <TouchableOpacity
                        key={campaign._id}
                        style={styles.campaignCard}
                        onPress={() => navigation.navigate('CampaignDetail', { campaignId: campaign._id })}
                      >
                        {campaign.banner_image && (
                          <Image
                            source={{ uri: campaign.banner_image }}
                            style={styles.campaignImage}
                          />
                        )}
                        <View style={styles.campaignInfo}>
                          <Text style={styles.campaignTitle} numberOfLines={2}>
                            {campaign.title}
                          </Text>
                          <Text style={styles.campaignDescription} numberOfLines={2}>
                            {campaign.description}
                          </Text>
                          <View style={styles.campaignStats}>
                            <Text style={styles.campaignAmount}>
                              {new Intl.NumberFormat('vi-VN').format(campaign.current_amount || 0)} /{' '}
                              {new Intl.NumberFormat('vi-VN').format(campaign.goal_amount || 0)} VNĐ
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {activeTab === 'activity' && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="lightning-bolt-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyStateTitle}>Chưa có hoạt động</Text>
                <Text style={styles.emptyStateText}>Các hoạt động gần đây sẽ hiển thị ở đây</Text>
              </View>
            )}

            {activeTab === 'achievements' && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="trophy-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyStateTitle}>Chưa có thành tựu</Text>
                <Text style={styles.emptyStateText}>Các huy hiệu và thành tựu sẽ hiển thị ở đây</Text>
              </View>
            )}

            {activeTab === 'about' && (
              <View style={styles.aboutContent}>
                {user.bio && (
                  <View style={styles.aboutItem}>
                    <MaterialCommunityIcons name="information-outline" size={20} color="#6B7280" />
                    <View style={styles.aboutItemContent}>
                      <Text style={styles.aboutItemLabel}>Giới thiệu</Text>
                      <Text style={styles.aboutItemValue}>{user.bio}</Text>
                    </View>
                  </View>
                )}

                {user.email && (
                  <View style={styles.aboutItem}>
                    <MaterialCommunityIcons name="email-outline" size={20} color="#6B7280" />
                    <View style={styles.aboutItemContent}>
                      <Text style={styles.aboutItemLabel}>Email</Text>
                      <Text style={styles.aboutItemValue}>{user.email}</Text>
                    </View>
                  </View>
                )}

                {user.address && (user.address.city || user.address.district) && (
                  <View style={styles.aboutItem}>
                    <MaterialCommunityIcons name="map-marker-outline" size={20} color="#6B7280" />
                    <View style={styles.aboutItemContent}>
                      <Text style={styles.aboutItemLabel}>Địa chỉ</Text>
                      <Text style={styles.aboutItemValue}>
                        {[user.address.district, user.address.city].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.aboutItem}>
                  <MaterialCommunityIcons name="calendar-outline" size={20} color="#6B7280" />
                  <View style={styles.aboutItemContent}>
                    <Text style={styles.aboutItemLabel}>Tham gia</Text>
                    <Text style={styles.aboutItemValue}>
                      {new Date(user.createdAt).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>

                {user.kyc_status === 'verified' && (
                  <View style={styles.aboutItem}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
                    <View style={styles.aboutItemContent}>
                      <Text style={styles.aboutItemLabel}>Trạng thái xác minh</Text>
                      <Text style={[styles.aboutItemValue, styles.verifiedText]}>
                        Đã xác minh danh tính
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'companions' && (
              <View style={styles.campaignsContent}>
                {companionCampaignsLoading ? (
                  <View style={styles.emptyState}>
                    <ActivityIndicator size="large" color="#62AC4A" />
                    <Text style={styles.emptyStateText}>Đang tải...</Text>
                  </View>
                ) : companionCampaigns.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="account-group-outline" size={64} color="#9CA3AF" />
                    <Text style={styles.emptyStateTitle}>Chưa có chiến dịch đồng hành</Text>
                    <Text style={styles.emptyStateText}>
                      Bạn chưa đồng hành với chiến dịch nào
                    </Text>
                  </View>
                ) : (
                  <View style={styles.campaignsList}>
                    {companionCampaigns.map((companionCampaign) => (
                      <TouchableOpacity
                        key={companionCampaign._id}
                        style={styles.campaignCard}
                        onPress={() => navigation.navigate('CampaignDetail', { 
                          campaignId: companionCampaign._id,
                          companion: true 
                        })}
                      >
                        {companionCampaign.banner_image && (
                          <Image
                            source={{ uri: companionCampaign.banner_image }}
                            style={styles.campaignImage}
                          />
                        )}
                        <View style={styles.campaignInfo}>
                          <Text style={styles.campaignTitle} numberOfLines={2}>
                            {companionCampaign.title}
                          </Text>
                          <View style={styles.campaignStats}>
                            <Text style={styles.campaignAmount}>
                              {new Intl.NumberFormat('vi-VN').format(companionCampaign.current_amount || 0)} /{' '}
                              {new Intl.NumberFormat('vi-VN').format(companionCampaign.goal_amount || 0)} VNĐ
                            </Text>
                          </View>
                          <Text style={styles.companionDate}>
                            Đồng hành từ: {new Date(companionCampaign.joined_at).toLocaleDateString('vi-VN')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Dropdown Menu */}
      {showDropdown && !isOwnProfile && (
        <Modal
          transparent
          visible={showDropdown}
          animationType="fade"
          onRequestClose={() => setShowDropdown(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDropdown(false)}
          >
            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  Alert.alert(
                    'Báo cáo',
                    'Tính năng báo cáo sẽ được triển khai sớm',
                    [{ text: 'OK', onPress: () => setShowDropdown(false) }]
                  );
                }}
              >
                <MaterialCommunityIcons name="flag-outline" size={20} color="#EF4444" />
                <Text style={styles.dropdownItemText}>
                  {user?.role === 'admin' ? 'Báo cáo admin' : 'Báo cáo người dùng'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  // Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Cover Photo
  coverPhotoContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#E5E7EB',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#D1D5DB',
  },
  coverEditButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  // Profile Picture
  profilePictureContainer: {
    alignItems: 'center',
    marginTop: -60,
    marginBottom: 16,
  },
  profilePictureWrapper: {
    position: 'relative',
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#E5E7EB',
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#62AC4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureInitial: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  // Profile Info
  profileInfoContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  kycBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3B82F6',
  },
  orgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  orgBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A855F7',
  },
  username: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#62AC4A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    flex: 1,
    minWidth: 120,
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: '#F3F4F6',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  followingButtonText: {
    color: '#374151',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    flex: 1,
    minWidth: 120,
    justifyContent: 'center',
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#62AC4A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    flex: 1,
    minWidth: 120,
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  kycButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    flex: 1,
    minWidth: 120,
    justifyContent: 'center',
  },
  kycButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
  },
  // Tabs
  tabsContainer: {
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  tabsScrollView: {
    flexGrow: 0,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#62AC4A',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#62AC4A',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#62AC4A',
  },
  // Tab Content
  tabContent: {
    minHeight: 200,
  },
  // Campaigns
  campaignsContent: {
    flex: 1,
  },
  campaignsList: {
    gap: 16,
  },
  campaignCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  campaignImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#E5E7EB',
  },
  campaignInfo: {
    padding: 16,
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  campaignDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  campaignStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  campaignAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#62AC4A',
  },
  companionDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#62AC4A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  // About
  aboutContent: {
    gap: 16,
  },
  aboutItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  aboutItemContent: {
    flex: 1,
  },
  aboutItemLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  aboutItemValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  verifiedText: {
    color: '#10B981',
    fontWeight: '500',
  },
  // Dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: '20%',
    padding: 16,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
});
