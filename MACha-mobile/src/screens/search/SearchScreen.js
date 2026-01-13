import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import { campaignService } from '../../services/campaign.service';
import { postService } from '../../services/post.service';
import { userService } from '../../services/user.service';
import { searchService } from '../../services/search.service';
import { useAuth } from '../../contexts/AuthContext';
import CampaignCard from '../../components/campaign/CampaignCard';
import PostCard from '../../components/post/PostCard';
import UserSearchResult from '../../components/shared/UserSearchResult';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

// Format number with K/M/B suffix
const formatNumber = (num) => {
  if (num >= 1000000000) {
    const billions = num / 1000000000;
    return billions % 1 === 0 ? `${billions.toFixed(0)} tỷ` : `${billions.toFixed(1)} tỷ`;
  }
  if (num >= 1000000) {
    const millions = num / 1000000;
    return millions % 1 === 0 ? `${millions.toFixed(0)} triệu` : `${millions.toFixed(1)} triệu`;
  }
  if (num >= 10000) {
    return `${(num / 1000).toFixed(0)} ngàn`;
  }
  if (num >= 1000) {
    const thousands = num / 1000;
    return thousands % 1 === 0 ? `${thousands.toFixed(0)} ngàn` : `${thousands.toFixed(1)} ngàn`;
  }
  return num.toString();
};

export default function SearchScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { isAuthenticated } = useAuth();
  
  const initialQuery = route.params?.query || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [decodedQuery, setDecodedQuery] = useState(initialQuery);
  const [campaigns, setCampaigns] = useState([]);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState(null);
  const [postsError, setPostsError] = useState(null);
  const [usersError, setUsersError] = useState(null);
  
  // Debounce and cancel token for user search
  const userSearchTimeoutRef = useRef(null);
  const userSearchCancelTokenRef = useRef(null);
  
  // Search history dropdown
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (initialQuery) {
      setDecodedQuery(initialQuery);
      performSearch(initialQuery);
      setShowHistoryDropdown(false);
    } else {
      // Show history dropdown when screen opens without query
      if (isAuthenticated) {
        setShowHistoryDropdown(true);
      }
    }
  }, [initialQuery]);

  useEffect(() => {
    // Load history when dropdown should be shown
    if (isAuthenticated && showHistoryDropdown && !decodedQuery) {
      loadHistory();
    }
  }, [isAuthenticated, showHistoryDropdown, decodedQuery]);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const data = await searchService.getSearchHistory();
      
      const uniqueMap = new Map();
      data.forEach((item) => {
        const key = `${item.keyword}_${item.type}`;
        const existing = uniqueMap.get(key);
        
        if (!existing) {
          uniqueMap.set(key, item);
        } else {
          const existingDate = new Date(existing.searchedAt);
          const currentDate = new Date(item.searchedAt);
          if (currentDate > existingDate) {
            uniqueMap.set(key, item);
          }
        }
      });
      
      const uniqueHistory = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime()
      );
      
      setHistory(uniqueHistory.slice(0, 10));
    } catch (error) {
      console.error('Failed to load search history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const performSearch = async (query) => {
    if (!query || !query.trim()) {
      setCampaigns([]);
      setPosts([]);
      setDecodedQuery('');
      return;
    }

    const normalizedQuery = query.trim();
    setDecodedQuery(normalizedQuery);
    
    // Save search history if authenticated
    // Note: This saves with type "keyword" (default), not USER_SEARCH
    // USER_SEARCH history is only saved when explicitly searching users via /api/users/search
    if (isAuthenticated) {
      try {
        await searchService.saveSearchHistory(normalizedQuery);
      } catch (error) {
        console.error('Failed to save search history:', error);
      }
    }

    // Check if query is a hashtag (starts with #)
    if (normalizedQuery.startsWith('#')) {
      const hashtagName = normalizedQuery.substring(1).trim().toLowerCase();
      if (hashtagName) {
        // Search campaigns by hashtag
        fetchCampaignsByHashtag(hashtagName);
        // Search posts by hashtag
        fetchPostsByHashtag(hashtagName);
        return;
      }
    }

    // Search campaigns by title
    fetchCampaignsByTitle(normalizedQuery);
    
    // Search posts by title
    fetchPostsByTitle(normalizedQuery);
    
    // Search users (only if not hashtag)
    // Note: This does NOT save USER_SEARCH history - it's just for displaying results
    // USER_SEARCH history is only saved when calling /api/users/search endpoint directly
    if (!normalizedQuery.startsWith('#')) {
      fetchUsers(normalizedQuery);
    }
  };

  const fetchCampaignsByTitle = async (searchTerm) => {
    try {
      setLoading(true);
      setError(null);
      const normalizedSearch = searchTerm.toLowerCase().trim();
      const results = await campaignService.searchCampaignsByTitle(normalizedSearch);
      setCampaigns(results || []);
    } catch (err) {
      console.error('Error fetching campaigns by title:', err);
      setError('Không thể tải kết quả tìm kiếm chiến dịch. Vui lòng thử lại sau.');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignsByHashtag = async (hashtagName) => {
    try {
      setLoading(true);
      setError(null);
      const results = await campaignService.searchCampaignsByHashtag(hashtagName);
      setCampaigns(results || []);
    } catch (err) {
      console.error('Error fetching campaigns by hashtag:', err);
      setError('Không thể tải kết quả tìm kiếm chiến dịch theo hashtag. Vui lòng thử lại sau.');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPostsByTitle = async (searchTerm) => {
    try {
      setPostsLoading(true);
      setPostsError(null);
      const normalizedSearch = searchTerm.toLowerCase().trim();
      const result = await postService.searchPostsByTitle(normalizedSearch, 50);
      // postService.searchPostsByTitle returns array
      setPosts(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error('Error fetching posts by title:', err);
      setPostsError('Không thể tải kết quả tìm kiếm bài viết. Vui lòng thử lại sau.');
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchPostsByHashtag = async (hashtagName) => {
    try {
      setPostsLoading(true);
      setPostsError(null);
      const normalizedHashtag = hashtagName.toLowerCase().trim();
      const result = await postService.getPostsByHashtag(normalizedHashtag, 1, 50);
      // getPostsByHashtag returns { posts, count, pagination }
      setPosts(result.posts || []);
    } catch (err) {
      console.error('Error fetching posts by hashtag:', err);
      setPostsError('Không thể tải kết quả tìm kiếm bài viết theo hashtag. Vui lòng thử lại sau.');
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchUsers = async (searchTerm) => {
    // Clear previous timeout
    if (userSearchTimeoutRef.current) {
      clearTimeout(userSearchTimeoutRef.current);
      userSearchTimeoutRef.current = null;
    }

    // Cancel previous request if exists
    if (userSearchCancelTokenRef.current) {
      userSearchCancelTokenRef.current.cancel('New search initiated');
      userSearchCancelTokenRef.current = null;
    }

    // Debounce user search (400ms)
    userSearchTimeoutRef.current = setTimeout(async () => {
      try {
        setUsersLoading(true);
        setUsersError(null);
        
        // Create cancel token for this request
        const CancelToken = axios.CancelToken;
        const source = CancelToken.source();
        userSearchCancelTokenRef.current = source;

        const normalizedSearch = searchTerm.toLowerCase().trim();
        const result = await userService.searchUsers(normalizedSearch, 50);
        
        // Check if request was cancelled
        if (source.token.reason) {
          return;
        }

        setUsers(result.users || []);
      } catch (err) {
        // Check if request was cancelled
        if (axios.isCancel && axios.isCancel(err)) {
          return;
        }
        console.error('Error fetching users:', err);
        setUsersError('Không thể tải kết quả tìm kiếm người dùng. Vui lòng thử lại sau.');
        setUsers([]);
      } finally {
        // Only update loading state if this is still the current request
        if (userSearchCancelTokenRef.current) {
          setUsersLoading(false);
          userSearchCancelTokenRef.current = null;
        }
      }
    }, 400);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (userSearchTimeoutRef.current) {
        clearTimeout(userSearchTimeoutRef.current);
      }
      if (userSearchCancelTokenRef.current) {
        userSearchCancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setShowHistoryDropdown(false);
      performSearch(searchQuery.trim());
    } else {
      // If search is empty, show history dropdown again
      if (isAuthenticated) {
        setShowHistoryDropdown(true);
        loadHistory();
      }
    }
  };

  const handleHistoryItemClick = (item) => {
    const query = item.type === 'hashtag' ? `#${item.keyword}` : item.keyword;
    setSearchQuery(query);
    setShowHistoryDropdown(false);
    performSearch(query);
    // Focus back to input
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  const handleDeleteHistory = async (historyId) => {
    try {
      await searchService.deleteSearchHistory([historyId]);
      setHistory(prev => prev.filter(item => item._id !== historyId));
    } catch (error) {
      console.error('Failed to delete search history:', error);
    }
  };

  const campaignsCount = campaigns.length;
  const postsCount = posts.length;
  const usersCount = users.length;
  const totalCount = campaignsCount + postsCount + usersCount;

  const displayedHistory = history.slice(0, 10);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Tìm kiếm chiến dịch, bài viết, người dùng..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              // Show history dropdown when typing if authenticated and no query yet
              if (isAuthenticated && text.length === 0 && !decodedQuery) {
                setShowHistoryDropdown(true);
              } else if (text.length > 0) {
                setShowHistoryDropdown(false);
              }
            }}
            onSubmitEditing={handleSearch}
            autoFocus={!initialQuery}
            onFocus={() => {
              if (isAuthenticated && searchQuery.length === 0 && !decodedQuery) {
                setShowHistoryDropdown(true);
                loadHistory();
              }
            }}
            onBlur={() => {
              // Keep dropdown open when blurring if no search has been performed
              if (!decodedQuery && searchQuery.length === 0) {
                // Don't close dropdown on blur
              }
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setDecodedQuery('');
                setCampaigns([]);
                setPosts([]);
                setUsers([]);
                // Clear user search timeout and cancel token
                if (userSearchTimeoutRef.current) {
                  clearTimeout(userSearchTimeoutRef.current);
                  userSearchTimeoutRef.current = null;
                }
                if (userSearchCancelTokenRef.current) {
                  userSearchCancelTokenRef.current.cancel('Search cleared');
                  userSearchCancelTokenRef.current = null;
                }
                // Show history dropdown again when clearing search
                if (isAuthenticated) {
                  setShowHistoryDropdown(true);
                  loadHistory();
                } else {
                  setShowHistoryDropdown(false);
                }
              }}
              style={styles.clearButton}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search History Dropdown */}
      {showHistoryDropdown && isAuthenticated && !decodedQuery && (
        <View style={styles.historyDropdown}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Mới đây</Text>
            {history.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  // Navigate to full history page
                  setShowHistoryDropdown(false);
                  if (navigation) {
                    navigation.navigate('SearchHistory');
                  }
                }}
                style={styles.editButton}
              >
                <Text style={styles.editButtonText}>Chỉnh sửa</Text>
              </TouchableOpacity>
            )}
          </View>

          {historyLoading ? (
            <View style={styles.historyLoading}>
              <ActivityIndicator size="small" color="#6B7280" />
            </View>
          ) : displayedHistory.length === 0 ? (
            <View style={styles.historyEmpty}>
              <MaterialCommunityIcons name="magnify" size={32} color="#9CA3AF" />
              <Text style={styles.historyEmptyText}>Chưa có lịch sử tìm kiếm</Text>
            </View>
          ) : (
            <FlatList
              data={displayedHistory}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.historyItem}
                  onPress={() => handleHistoryItemClick(item)}
                >
                  <MaterialCommunityIcons
                    name={item.type === 'hashtag' ? 'pound' : 'clock-outline'}
                    size={20}
                    color="#9CA3AF"
                    style={styles.historyIcon}
                  />
                  <Text style={styles.historyText} numberOfLines={1}>
                    {item.type === 'hashtag' ? `#${item.keyword}` : item.keyword}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteHistory(item._id)}
                    style={styles.deleteHistoryButton}
                  >
                    <MaterialCommunityIcons name="close" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search Header Info */}
        {decodedQuery && (
          <View style={styles.searchInfo}>
            <Text style={styles.searchInfoText}>
              {loading || postsLoading || usersLoading ? (
                'Đang tải...'
              ) : (
                `Tìm thấy ${formatNumber(totalCount)} kết quả cho: "${decodedQuery}"`
              )}
            </Text>
          </View>
        )}

        {/* Unified Results - Mixed Users, Campaigns, and Posts */}
        {decodedQuery && (
          <View style={styles.section}>
            {/* Loading State */}
            {(loading || postsLoading || usersLoading) && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#F97E2C" />
                <Text style={styles.loadingText}>Đang tải kết quả...</Text>
              </View>
            )}

            {/* Error States */}
            {error && !loading && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {postsError && !postsLoading && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{postsError}</Text>
              </View>
            )}
            {usersError && !usersLoading && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{usersError}</Text>
              </View>
            )}

            {/* Users Results */}
            {!decodedQuery.startsWith('#') && users.length > 0 && (
              <View style={styles.resultsGroup}>
                <FlatList
                  data={users}
                  keyExtractor={(item) => `user-${item._id}`}
                  renderItem={({ item }) => (
                    <UserSearchResult
                      user={item}
                      query={decodedQuery}
                      onPress={() => {
                        navigation.navigate('Profile', { userId: item._id });
                      }}
                    />
                  )}
                  scrollEnabled={false}
                  contentContainerStyle={styles.usersList}
                />
              </View>
            )}

            {/* Campaigns Results */}
            {campaigns.length > 0 && (
              <View style={styles.resultsGroup}>
                <FlatList
                  data={campaigns}
                  keyExtractor={(item) => `campaign-${item._id}`}
                  renderItem={({ item }) => (
                    <CampaignCard
                      campaign={item}
                      onPress={() => {
                        navigation.navigate('CampaignDetail', { campaignId: item._id });
                      }}
                      showCreator={true}
                    />
                  )}
                  scrollEnabled={false}
                  contentContainerStyle={styles.campaignsList}
                />
              </View>
            )}

            {/* Posts Results */}
            {posts.length > 0 && (
              <View style={styles.resultsGroup}>
                <FlatList
                  data={posts}
                  keyExtractor={(item) => `post-${item._id}`}
                  renderItem={({ item }) => (
                    <PostCard
                      post={item}
                      navigation={navigation}
                      onDelete={() => {
                        setPosts(prev => prev.filter(p => p._id !== item._id));
                      }}
                      onUpdate={(postId, updatedPost) => {
                        setPosts(prev =>
                          prev.map(p => (p._id === postId ? updatedPost : p))
                        );
                      }}
                    />
                  )}
                  scrollEnabled={false}
                  contentContainerStyle={styles.postsList}
                />
              </View>
            )}

            {/* No Results Message */}
            {!loading && !postsLoading && !usersLoading && 
             !error && !postsError && !usersError &&
             campaigns.length === 0 && posts.length === 0 && 
             (decodedQuery.startsWith('#') || users.length === 0) && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="magnify" size={64} color="#9CA3AF" />
                <Text style={styles.emptyStateTitle}>
                  Không tìm thấy nội dung nào
                </Text>
                <Text style={styles.emptyStateText}>
                  Không tìm thấy nội dung nào với từ khóa "{decodedQuery}"
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Initial empty state - only show when no history dropdown */}
        {!decodedQuery && !showHistoryDropdown && (
          <View style={styles.initialEmptyState}>
            <MaterialCommunityIcons name="magnify" size={64} color="#9CA3AF" />
            <Text style={styles.initialEmptyStateText}>
              Nhập từ khóa để tìm kiếm
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    gap: scale(12),
  },
  backButton: {
    padding: scale(4),
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: scale(12),
  },
  searchIcon: {
    marginRight: scale(8),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(14),
    color: '#111827',
    paddingVertical: scale(10),
  },
  clearButton: {
    padding: scale(4),
  },
  historyDropdown: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    maxHeight: verticalScale(400),
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  historyTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#111827',
  },
  editButton: {
    paddingVertical: scale(4),
    paddingHorizontal: scale(8),
  },
  editButtonText: {
    fontSize: moderateScale(14),
    color: '#2563EB',
    fontWeight: '500',
  },
  historyLoading: {
    padding: scale(20),
    alignItems: 'center',
  },
  historyEmpty: {
    padding: scale(40),
    alignItems: 'center',
  },
  historyEmptyText: {
    fontSize: moderateScale(14),
    color: '#9CA3AF',
    marginTop: scale(8),
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyIcon: {
    marginRight: scale(12),
  },
  historyText: {
    flex: 1,
    fontSize: moderateScale(14),
    color: '#111827',
  },
  deleteHistoryButton: {
    padding: scale(4),
  },
  content: {
    flex: 1,
  },
  searchInfo: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInfoText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  section: {
    padding: scale(16),
  },
  resultsGroup: {
    marginBottom: scale(16),
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: scale(16),
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(40),
  },
  loadingText: {
    marginTop: scale(16),
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  errorContainer: {
    padding: scale(20),
    alignItems: 'center',
  },
  errorText: {
    fontSize: moderateScale(14),
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: scale(20),
    alignItems: 'center',
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
  },
  campaignsList: {
    gap: scale(12),
  },
  postsList: {
    gap: scale(12),
  },
  usersList: {
    gap: scale(12),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
    paddingHorizontal: scale(20),
  },
  emptyStateTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#111827',
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  emptyStateText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
  },
  initialEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(100),
    paddingHorizontal: scale(20),
  },
  initialEmptyStateText: {
    fontSize: moderateScale(16),
    color: '#9CA3AF',
    marginTop: scale(16),
  },
});

