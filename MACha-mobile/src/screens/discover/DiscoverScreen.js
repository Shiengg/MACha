import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { campaignService } from '../../services/campaign.service';
import { useSocket } from '../../contexts/SocketContext';
import CampaignCard from '../../components/campaign/CampaignCard';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';

const categoryConfig = {
  'children': { label: 'Trẻ em', icon: 'baby-face' },
  'elderly': { label: 'Người già', icon: 'account' },
  'poverty': { label: 'Xóa nghèo', icon: 'home' },
  'disaster': { label: 'Thiên tai', icon: 'alert-circle' },
  'medical': { label: 'Y tế', icon: 'medical-bag' },
  'hardship': { label: 'Hoàn cảnh khó khăn', icon: 'home-heart' },
  'education': { label: 'Giáo dục', icon: 'school' },
  'disability': { label: 'Người khuyết tật', icon: 'account-group' },
  'animal': { label: 'Động vật', icon: 'paw' },
  'environment': { label: 'Môi trường', icon: 'tree' },
  'community': { label: 'Cộng đồng', icon: 'account-group' },
  'other': { label: 'Khác', icon: 'heart' },
};

// Helper function to check if campaign is still valid (active and not expired)
const isCampaignValid = (campaign) => {
  // Must be active
  if (campaign.status !== 'active') return false;
  
  // If no end_date, consider it as unlimited (still valid)
  if (!campaign.end_date) return true;
  
  // Check if end_date is in the future
  const endDate = new Date(campaign.end_date);
  const now = new Date();
  return endDate > now;
};

export default function DiscoverScreen() {
  const navigation = useNavigation();
  const { socket, isConnected } = useSocket();

  const [campaigns, setCampaigns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const loadData = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      
      if (selectedCategory === 'all') {
        // For "all" category, use paginated API
        const apiPage = page - 1;
        const result = await campaignService.getAllCampaigns(apiPage, limit);
        
        // Only show active campaigns that haven't expired
        const validCampaigns = result.campaigns.filter(c => isCampaignValid(c));
        
        setCampaigns(validCampaigns);
        setTotal(result.total);
        setTotalPages(result.totalPages);
        setCurrentPage(page);
      } else {
        // For specific category, load all campaigns of that category
        const allCategoryCampaigns = await campaignService.getCampaignsByCategory(selectedCategory);
        
        // Filter valid campaigns
        const validCampaigns = allCategoryCampaigns.filter(c => isCampaignValid(c));
        
        // Calculate pagination for client-side
        const totalValid = validCampaigns.length;
        const totalPagesForCategory = Math.ceil(totalValid / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedCampaigns = validCampaigns.slice(startIndex, endIndex);
        
        setCampaigns(paginatedCampaigns);
        setTotal(totalValid);
        setTotalPages(totalPagesForCategory);
        setCurrentPage(page);
      }
      
      // Load categories only on initial load (when page is 1)
      if (page === 1) {
        // Get total count for "all" category
        const allCampaignsResult = await campaignService.getAllCampaigns(0, 1);
        const allCampaignsTotal = allCampaignsResult.total;
        
        // Get count for each category from API (if available)
        let categoriesData = [];
        try {
          categoriesData = await campaignService.getActiveCategories();
        } catch (error) {
          console.warn('Failed to load category counts:', error);
        }
        
        // Create a map of category counts from API
        const categoryCountMap = new Map();
        categoriesData.forEach((cat) => {
          categoryCountMap.set(cat.category, cat.count);
        });
        
        // Build categories from config (all categories), merge with counts from API
        const mappedCategories = [
          { id: 'all', label: 'Tất cả', icon: 'heart', count: allCampaignsTotal },
          ...Object.entries(categoryConfig).map(([categoryId, config]) => {
            return {
              id: categoryId,
              label: config.label,
              icon: config.icon,
              count: categoryCountMap.get(categoryId) || 0, // Use count from API, or 0 if not found
            };
          })
        ];
        
        setCategories(mappedCategories);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, limit]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  useEffect(() => {
    // Reset pagination when category changes
    setCurrentPage(1);
    loadData(1);
  }, [selectedCategory, loadData]);

  // Listen for campaign updates via Socket.IO
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleCampaignCreated = (_event) => {
      // For new campaigns, we'd need full campaign data, so skip for now
      // User can refresh to see new campaigns
    };

    const handleCampaignUpdated = (event) => {
      if (event.campaignId) {
        setCampaigns(prev => {
          const index = prev.findIndex(c => String(c._id) === String(event.campaignId));
          if (index === -1) {
            // Campaign not in list, don't add from update event
            return prev;
          } else {
            // Update existing campaign with new data
            return prev.map(c => {
              if (String(c._id) === String(event.campaignId)) {
                const updatedCampaign = {
                  ...c,
                  current_amount: event.current_amount !== undefined ? event.current_amount : c.current_amount,
                  goal_amount: event.goal_amount !== undefined ? event.goal_amount : c.goal_amount,
                  status: event.status !== undefined ? event.status : c.status,
                  title: event.title !== undefined ? event.title : c.title,
                  category: event.category !== undefined ? event.category : c.category,
                  completed_donations_count: event.completed_donations_count !== undefined ? event.completed_donations_count : c.completed_donations_count,
                  end_date: event.end_date !== undefined ? event.end_date : c.end_date
                };
                return updatedCampaign;
              }
              return c;
            }).filter(c => isCampaignValid(c)); // Remove if no longer active or expired
          }
        });
      }
    };

    // Update campaign current_amount when donation is completed/updated
    const handleDonationStatusChanged = (event) => {
      if (event.campaignId && event.campaign?.current_amount !== undefined) {
        setCampaigns(prev => {
          const index = prev.findIndex(c => String(c._id) === String(event.campaignId));
          if (index === -1) return prev;
          
          return prev.map(c => {
            if (String(c._id) === String(event.campaignId)) {
              return {
                ...c,
                current_amount: event.campaign.current_amount,
                completed_donations_count: event.campaign.completed_donations_count !== undefined ? event.campaign.completed_donations_count : c.completed_donations_count
              };
            }
            return c;
          });
        });
      }
    };

    const handleDonationUpdated = (event) => {
      if (event.campaignId && event.campaign?.current_amount !== undefined) {
        setCampaigns(prev => {
          const index = prev.findIndex(c => String(c._id) === String(event.campaignId));
          if (index === -1) return prev;
          
          return prev.map(c => {
            if (String(c._id) === String(event.campaignId)) {
              return {
                ...c,
                current_amount: event.campaign.current_amount,
                completed_donations_count: event.campaign.completed_donations_count !== undefined ? event.campaign.completed_donations_count : c.completed_donations_count
              };
            }
            return c;
          });
        });
      }
    };

    const handleCampaignCancelled = (event) => {
      if (event.campaignId) {
        setCampaigns(prev => prev.filter(c => String(c._id) !== String(event.campaignId)));
      }
    };

    socket.on('campaign:created', handleCampaignCreated);
    socket.on('campaign:updated', handleCampaignUpdated);
    socket.on('campaign:cancelled', handleCampaignCancelled);
    socket.on('donation:status_changed', handleDonationStatusChanged);
    socket.on('donation:updated', handleDonationUpdated);

    return () => {
      socket.off('campaign:created', handleCampaignCreated);
      socket.off('campaign:updated', handleCampaignUpdated);
      socket.off('campaign:cancelled', handleCampaignCancelled);
      socket.off('donation:status_changed', handleDonationStatusChanged);
      socket.off('donation:updated', handleDonationUpdated);
    };
  }, [socket, isConnected]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(1);
    setRefreshing(false);
  }, [loadData]);

  const handleCampaignPress = (campaign) => {
    navigation.navigate('CampaignDetail', { campaignId: campaign._id });
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const scrollViewRef = useRef(null);

  const handlePageChange = (page) => {
    if (typeof page === 'number' && page >= 1 && page <= totalPages && page !== currentPage) {
      loadData(page);
      // Scroll to top when page changes
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={['#F97316', '#FB923C', '#14B8A6']}
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Chung tay vì cộng đồng</Text>
            <Text style={styles.heroSubtitle}>
              Mỗi đóng góp của bạn đều tạo nên sự khác biệt lớn lao cho những người cần giúp đỡ
            </Text>
          </View>
        </LinearGradient>

        {/* Category Filter Section */}
        <View style={styles.categorySection}>
          <Text style={styles.categorySectionTitle}>Chiến dịch gây quỹ nổi bật</Text>
          {loading && categories.length === 0 ? (
            <View style={styles.categoryLoadingContainer}>
              <ActivityIndicator size="small" color="#F97E2C" />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {categories.map((category) => {
                const IconComponent = MaterialCommunityIcons;
                const iconName = category.icon;
                return (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => setSelectedCategory(category.id)}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category.id && styles.categoryButtonActive,
                    ]}
                  >
                    <IconComponent
                      name={iconName}
                      size={moderateScale(18)}
                      color={selectedCategory === category.id ? '#FFFFFF' : '#374151'}
                    />
                    <Text
                      style={[
                        styles.categoryButtonText,
                        selectedCategory === category.id && styles.categoryButtonTextActive,
                      ]}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Campaigns List */}
        <View style={styles.campaignsSection}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F97E2C" />
              <Text style={styles.loadingText}>Đang tải chiến dịch...</Text>
            </View>
          ) : campaigns.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="magnify" size={scale(64)} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Không tìm thấy chiến dịch</Text>
              <Text style={styles.emptyText}>
                Hiện tại chưa có chiến dịch nào trong danh mục này
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.resultsInfo}>
                <Text style={styles.resultsText}>
                  {selectedCategory === 'all' ? (
                    <>Tìm thấy <Text style={styles.resultsBold}>{campaigns.length}</Text> chiến dịch</>
                  ) : (
                    <>Tìm thấy <Text style={styles.resultsBold}>{campaigns.length}</Text> chiến dịch trong danh mục này</>
                  )}
                </Text>
              </View>
              <FlatList
                data={campaigns}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <CampaignCard campaign={item} onPress={handleCampaignPress} showCreator={true} />
                )}
                scrollEnabled={false}
                contentContainerStyle={styles.campaignsList}
              />
              {totalPages > 1 && (
                <View style={styles.paginationContainer}>
                  {/* Current Page / Total Pages */}
                  <View style={styles.pageInfo}>
                    <Text style={styles.pageInfoText}>{currentPage}/{totalPages}</Text>
                  </View>
                  
                  {/* Previous Button */}
                  <TouchableOpacity
                    onPress={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    style={[
                      styles.pageButton,
                      (currentPage === 1 || loading) && styles.pageButtonDisabled,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="chevron-left"
                      size={moderateScale(20)}
                      color={currentPage === 1 || loading ? '#9CA3AF' : '#374151'}
                    />
                    <Text
                      style={[
                        styles.pageButtonText,
                        (currentPage === 1 || loading) && styles.pageButtonTextDisabled,
                      ]}
                    >
                      Trước
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Page Numbers - Hide on small screens */}
                  <View style={styles.pageNumbersContainer}>
                    {getPageNumbers().map((pageNum, index) => (
                      pageNum === '...' ? (
                        <View key={`ellipsis-${index}`} style={styles.pageEllipsis}>
                          <Text style={styles.pageEllipsisText}>...</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          key={pageNum}
                          onPress={() => handlePageChange(pageNum)}
                          disabled={loading}
                          style={[
                            styles.pageNumberButton,
                            pageNum === currentPage && styles.pageNumberButtonActive,
                            loading && styles.pageNumberButtonDisabled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.pageNumberText,
                              pageNum === currentPage && styles.pageNumberTextActive,
                            ]}
                          >
                            {pageNum}
                          </Text>
                        </TouchableOpacity>
                      )
                    ))}
                  </View>
                  
                  {/* Next Button */}
                  <TouchableOpacity
                    onPress={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    style={[
                      styles.pageButton,
                      (currentPage === totalPages || loading) && styles.pageButtonDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pageButtonText,
                        (currentPage === totalPages || loading) && styles.pageButtonTextDisabled,
                      ]}
                    >
                      Sau
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={moderateScale(20)}
                      color={currentPage === totalPages || loading ? '#9CA3AF' : '#374151'}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    height: verticalScale(250),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: scale(12),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: moderateScale(14),
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    paddingHorizontal: scale(20),
    lineHeight: moderateScale(20),
  },
  categorySection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: scale(16),
    paddingHorizontal: scale(16),
  },
  categorySectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: scale(12),
    textAlign: 'center',
  },
  categoryLoadingContainer: {
    alignItems: 'center',
    paddingVertical: scale(8),
  },
  categoryScrollContent: {
    paddingHorizontal: scale(4),
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: scale(8),
  },
  categoryButtonActive: {
    backgroundColor: '#F97E2C',
    borderColor: '#F97E2C',
  },
  categoryButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#374151',
    marginLeft: scale(6),
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  campaignsSection: {
    padding: scale(16),
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(40),
  },
  emptyTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: scale(20),
  },
  resultsInfo: {
    marginBottom: scale(16),
  },
  resultsText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  resultsBold: {
    fontWeight: 'bold',
    color: '#1F2937',
  },
  campaignsList: {
    paddingBottom: scale(16),
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(24),
    flexWrap: 'wrap',
    gap: scale(8),
  },
  pageInfo: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  pageInfoText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#374151',
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  pageButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  pageButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#374151',
    marginHorizontal: scale(4),
  },
  pageButtonTextDisabled: {
    color: '#9CA3AF',
  },
  pageNumbersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  pageNumberButton: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    minWidth: scale(40),
    alignItems: 'center',
  },
  pageNumberButtonActive: {
    backgroundColor: '#F97E2C',
    borderColor: '#F97E2C',
  },
  pageNumberButtonDisabled: {
    opacity: 0.5,
  },
  pageNumberText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#374151',
  },
  pageNumberTextActive: {
    color: '#FFFFFF',
  },
  pageEllipsis: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(8),
  },
  pageEllipsisText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
});
