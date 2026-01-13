import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { postService } from '../../services/post.service';
import { cloudinaryService } from '../../services/cloudinary.service';
import Header from '../../components/shared/Header';
import PostCard from '../../components/post/PostCard';
import RecommendedCampaignsCarousel from '../../components/campaign/RecommendedCampaignsCarousel';
import CampaignSelectModal from '../../components/campaign/CampaignSelectModal';
import CampaignCard from '../../components/campaign/CampaignCard';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

const POSTS_PER_PAGE = 20;

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [createPostContent, setCreatePostContent] = useState('');
  const [createPostImages, setCreatePostImages] = useState([]);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [isCampaignSelectOpen, setIsCampaignSelectOpen] = useState(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      // Navigate to admin dashboard if needed
      console.log('Admin user detected');
    }
  }, [user]);

  const fetchPosts = useCallback(async (page = 0, isRefresh = false) => {
    // Prevent multiple simultaneous requests
    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      if (isRefresh) {
        setRefreshing(true);
      } else if (page === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      
      const data = await postService.getPosts(page, POSTS_PER_PAGE);
      
      if (isRefresh || page === 0) {
        setPosts(data || []);
        setCurrentPage(0);
      } else {
        setPosts((prev) => [...prev, ...(data || [])]);
      }
      
      // Check if there are more posts to load
      setHasMore((data || []).length === POSTS_PER_PAGE);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Không thể tải bài viết. Vui lòng thử lại sau.');
    } finally {
      isFetchingRef.current = false;
      if (isRefresh) {
        setRefreshing(false);
      } else if (page === 0) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchPosts(0);
  }, [fetchPosts]);

  // Listen for new posts via Socket.IO
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handlePostCreated = (event) => {
      if (event.post) {
        setPosts((prev) => [event.post, ...prev]);
      } else {
        // Refresh posts if full post data not available
        fetchPosts(0, true);
      }
    };

    const handlePostUpdated = (event) => {
      if (event.postId && event.post) {
        setPosts((prev) =>
          prev.map((post) => (post._id === event.postId ? event.post : post))
        );
      }
    };

    const handlePostDeleted = (event) => {
      if (event.postId) {
        setPosts((prev) => prev.filter((post) => post._id !== event.postId));
      }
    };

    socket.on('post:created', handlePostCreated);
    socket.on('post:updated', handlePostUpdated);
    socket.on('post:deleted', handlePostDeleted);

    return () => {
      socket.off('post:created', handlePostCreated);
      socket.off('post:updated', handlePostUpdated);
      socket.off('post:deleted', handlePostDeleted);
    };
  }, [socket, isConnected, fetchPosts]);

  const onRefresh = useCallback(async () => {
    await fetchPosts(0, true);
  }, [fetchPosts]);

  const loadMorePosts = useCallback(() => {
    if (!loadingMore && hasMore && !isFetchingRef.current) {
      fetchPosts(currentPage + 1);
    }
  }, [loadingMore, hasMore, currentPage, fetchPosts]);

  const handleDeletePost = async (postId) => {
    try {
      setPosts((prev) => prev.filter((post) => post._id !== postId));
    } catch (error) {
      console.error('Error removing post from list:', error);
      await fetchPosts(0);
    }
  };

  const handleUpdatePost = async (postId, updatedPost) => {
    try {
      setPosts((prev) =>
        prev.map((post) => (post._id === postId ? updatedPost : post))
      );
    } catch (error) {
      console.error('Error updating post in list:', error);
      await fetchPosts(0);
    }
  };

  const requestImagePermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Cần quyền truy cập thư viện ảnh để chọn ảnh',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const handleSelectImages = async () => {
    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets
          .filter(asset => !asset.fileSize || asset.fileSize <= 5 * 1024 * 1024)
          .map(asset => asset.uri);

        if (newUris.length !== result.assets.length) {
          Alert.alert('Lưu ý', 'Một số ảnh quá lớn (tối đa 5MB) đã bị bỏ qua', [{ text: 'OK' }]);
        }

        if (createPostImages.length + newUris.length > 10) {
          Alert.alert('Lỗi', 'Tối đa 10 ảnh mỗi bài viết', [{ text: 'OK' }]);
          return;
        }

        setCreatePostImages([...createPostImages, ...newUris]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.', [{ text: 'OK' }]);
    }
  };

  const handleRemoveImage = (index) => {
    setCreatePostImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Helper function to remove all hashtags from text except the campaign hashtag
  const removeHashtagsExceptCampaign = (text, campaignHashtag) => {
    // Remove all hashtags
    const textWithoutHashtags = text.replace(/#\w+/g, '').trim();
    // Remove extra spaces
    return textWithoutHashtags.replace(/\s+/g, ' ').trim();
  };

  const handleSubmitPost = async () => {
    if (!createPostContent.trim() && createPostImages.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung hoặc chọn ảnh');
      return;
    }

    try {
      setIsSubmittingPost(true);

      // Upload images if any
      let mediaUrls = [];
      if (createPostImages.length > 0) {
        setIsUploadingImages(true);
        try {
          const uploadPromises = createPostImages.map(uri =>
            cloudinaryService.uploadImage(uri, 'posts')
          );
          const uploadResults = await Promise.all(uploadPromises);
          mediaUrls = uploadResults.map(result => result.secure_url);
        } catch (uploadError) {
          console.error('Error uploading images:', uploadError);
          Alert.alert('Lỗi', 'Không thể tải ảnh lên');
          return;
        } finally {
          setIsUploadingImages(false);
        }
      }

      // Process content text with campaign hashtag logic
      let finalContentText = createPostContent.trim() || (mediaUrls.length > 0 ? "Đã chia sẻ ảnh" : "");
      
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

      // Create post
      const postData = {
        content_text: finalContentText,
        media_url: mediaUrls.length > 0 ? mediaUrls : undefined,
        campaign_id: selectedCampaign?._id,
      };

      await postService.createPost(postData);
      
      // Reset form
      setCreatePostContent('');
      setCreatePostImages([]);
      setSelectedCampaign(null);
      setIsCreatePostOpen(false);

      // Refresh posts
      await fetchPosts(0, true);
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Lỗi', 'Không thể tạo bài viết. Vui lòng thử lại sau.');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const renderHeader = () => (
    <>
      {/* Recommended Campaigns Carousel */}
      <RecommendedCampaignsCarousel navigation={navigation} />

      {/* Create Post Card */}
      {isAuthenticated && (
        <View style={styles.createPostCard}>
          <View style={styles.createPostHeader}>
            <View style={styles.createPostAvatar}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {(user?.username || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.createPostButton}
              onPress={() => setIsCreatePostOpen(true)}
            >
              <Text style={styles.createPostButtonText}>Bạn đang nghĩ gì?</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#F97E2C" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97E2C" />
          <Text style={styles.loadingText}>Đang tải bài viết...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Có lỗi xảy ra</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchPosts(0)}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="text-box-outline" size={64} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>Chưa có bài viết nào</Text>
        <Text style={styles.emptyText}>
          Hãy là người đầu tiên chia sẻ điều gì đó!
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header />
      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onDelete={handleDeletePost}
            onUpdate={handleUpdatePost}
            navigation={navigation}
          />
        )}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Post Modal */}
      <Modal
        visible={isCreatePostOpen && !isCampaignSelectOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isSubmittingPost) {
            setIsCreatePostOpen(false);
            setCreatePostContent('');
            setCreatePostImages([]);
            setSelectedCampaign(null);
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo bài viết</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsCreatePostOpen(false);
                  setCreatePostContent('');
                  setCreatePostImages([]);
                  setSelectedCampaign(null);
                }}
                disabled={isSubmittingPost}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                style={styles.postInput}
                placeholder="Bạn đang nghĩ gì?"
                placeholderTextColor="#9CA3AF"
                multiline
                value={createPostContent}
                onChangeText={setCreatePostContent}
                autoFocus
              />

              {/* Image Preview */}
              {createPostImages.length > 0 && (
                <View style={styles.imagePreviewContainer}>
                  {createPostImages.map((image, index) => (
                    <View key={index} style={styles.imagePreview}>
                      <Image source={{ uri: image }} style={styles.previewImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveImage(index)}
                      >
                        <MaterialCommunityIcons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Selected Campaign */}
              {selectedCampaign && (
                <View style={styles.selectedCampaignContainer}>
                  <View style={styles.selectedCampaignHeader}>
                    <Text style={styles.selectedCampaignTitle}>Chiến dịch đã chọn</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedCampaign(null)}
                      style={styles.removeCampaignButton}
                    >
                      <MaterialCommunityIcons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.campaignCardWrapper}>
                    <CampaignCard
                      campaign={selectedCampaign}
                      onPress={() => {}}
                      showCreator={false}
                      skipDonations={true}
                    />
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.modalFooterLeft}>
                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={handleSelectImages}
                  disabled={isSubmittingPost}
                >
                  <MaterialCommunityIcons name="image-outline" size={24} color="#6B7280" />
                  <Text style={styles.addImageText}>Thêm ảnh</Text>
                </TouchableOpacity>

                {!selectedCampaign && (
                  <TouchableOpacity
                    style={styles.selectCampaignButton}
                    onPress={() => {
                      Keyboard.dismiss();
                      setIsCampaignSelectOpen(true);
                    }}
                    disabled={isSubmittingPost}
                  >
                    <MaterialCommunityIcons name="bullhorn" size={24} color="#9333EA" />
                    <Text style={styles.selectCampaignText}>Chọn chiến dịch</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!createPostContent.trim() && createPostImages.length === 0) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmitPost}
                disabled={isSubmittingPost || (!createPostContent.trim() && createPostImages.length === 0)}
              >
                {isSubmittingPost ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Đăng</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Campaign Select Modal */}
      <CampaignSelectModal
        isOpen={isCampaignSelectOpen}
        onClose={() => setIsCampaignSelectOpen(false)}
        onSelect={(campaign) => {
          setSelectedCampaign(campaign);
          setIsCampaignSelectOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    paddingBottom: scale(20),
  },
  createPostCard: {
    backgroundColor: '#FFFFFF',
    padding: scale(16),
    marginBottom: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  createPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createPostAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    overflow: 'hidden',
    marginRight: scale(12),
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#6B7280',
  },
  createPostButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: scale(20),
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
  },
  createPostButtonText: {
    fontSize: moderateScale(15),
    color: '#6B7280',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(40),
  },
  loadingText: {
    marginTop: scale(16),
    fontSize: moderateScale(16),
    color: '#6B7280',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(40),
    paddingHorizontal: scale(20),
  },
  errorTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#111827',
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  errorText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: scale(20),
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: scale(24),
    paddingVertical: scale(12),
    borderRadius: scale(8),
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(15),
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
    paddingHorizontal: scale(20),
  },
  emptyTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#111827',
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
  },
  postsContainer: {
    paddingBottom: scale(20),
  },
  loadingMoreContainer: {
    paddingVertical: scale(20),
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: '90%',
    flexShrink: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseButton: {
    padding: scale(4),
  },
  modalBody: {
    padding: scale(20),
    flexGrow: 0,
  },
  postInput: {
    fontSize: moderateScale(16),
    color: '#111827',
    minHeight: verticalScale(150),
    textAlignVertical: 'top',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginTop: scale(16),
  },
  imagePreview: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(8),
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: scale(4),
    right: scale(4),
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(20),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
  },
  addImageText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginLeft: scale(6),
  },
  selectCampaignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
  },
  selectCampaignText: {
    fontSize: moderateScale(14),
    color: '#9333EA',
    marginLeft: scale(6),
    fontWeight: '500',
  },
  selectedCampaignContainer: {
    marginTop: scale(16),
    padding: scale(12),
    backgroundColor: '#F9FAFB',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedCampaignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(8),
  },
  selectedCampaignTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#111827',
  },
  removeCampaignButton: {
    padding: scale(4),
  },
  campaignCardWrapper: {
    pointerEvents: 'none',
  },
  submitButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: scale(24),
    paddingVertical: scale(10),
    borderRadius: scale(8),
    minWidth: scale(80),
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
});
