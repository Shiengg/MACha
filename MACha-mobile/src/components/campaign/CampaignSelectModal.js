import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { campaignService } from '../../services/campaign.service';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function CampaignSelectModal({ isOpen, onClose, onSelect }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allCampaigns, setAllCampaigns] = useState([]); // Store all campaigns for client-side search
  const searchTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(false);

  // Initial load when modal opens
  useEffect(() => {
    if (!isOpen) {
      setCampaigns([]);
      setAllCampaigns([]);
      setError(null);
      setSearchQuery('');
      isInitialLoadRef.current = false;
      return;
    }

    // Only fetch on initial open, not on every isOpen change
    if (isInitialLoadRef.current) return;
    
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);
        isInitialLoadRef.current = true;
        
        // Load initial campaigns with reasonable limit
        const result = await campaignService.getAllCampaigns(0, 50);
        // Filter to only show active campaigns
        const activeCampaigns = (result.campaigns || []).filter(
          (campaign) => ['active', 'approved', 'voting'].includes(campaign.status)
        );
        setAllCampaigns(activeCampaigns); // Store for client-side search
        setCampaigns(activeCampaigns);
      } catch (err) {
        console.error('Error loading campaigns for selection:', err);
        setError('Không thể tải danh sách chiến dịch. Vui lòng thử lại sau.');
        isInitialLoadRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [isOpen]);

  // Handle search with debounce - only client-side filtering
  useEffect(() => {
    if (!isOpen || !isInitialLoadRef.current) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Client-side search only - no API call
    searchTimeoutRef.current = setTimeout(() => {
      if (!searchQuery.trim()) {
        // Show all campaigns when search is cleared
        setCampaigns(allCampaigns);
        return;
      }

      // Filter campaigns client-side
      const query = searchQuery.toLowerCase();
      const filtered = allCampaigns.filter((campaign) =>
        campaign.title.toLowerCase().includes(query) ||
        campaign.description?.toLowerCase().includes(query) ||
        campaign.category?.toLowerCase().includes(query)
      );
      
      setCampaigns(filtered);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, isOpen, allCampaigns]);

  const handleSelect = useCallback((campaign) => {
    if (onSelect) {
      onSelect(campaign);
    }
  }, [onSelect]);

  const renderCampaignItem = useCallback(({ item: campaign }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => handleSelect(campaign)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name="bullhorn"
          size={20}
          color="#10B981"
        />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {campaign.title}
        </Text>
        {campaign.category && (
          <Text style={styles.itemSubtitle}>
            Danh mục: {campaign.category}
          </Text>
        )}
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color="#9CA3AF"
      />
    </TouchableOpacity>
  ), [handleSelect]);

  const keyExtractor = useCallback((item) => item._id, []);

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Chọn chiến dịch</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm chiến dịch..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}
              >
                <MaterialCommunityIcons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F97E2C" />
              <Text style={styles.loadingText}>Đang tải chiến dịch...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={40} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : campaigns.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="text-box-outline" size={40} color="#9CA3AF" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Không tìm thấy chiến dịch nào' : 'Hiện chưa có chiến dịch nào'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={campaigns}
              renderItem={renderCampaignItem}
              keyExtractor={keyExtractor}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={10}
              windowSize={10}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    height: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: scale(4),
  },
  loadingContainer: {
    paddingVertical: verticalScale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  errorContainer: {
    paddingVertical: verticalScale(30),
    paddingHorizontal: scale(20),
    alignItems: 'center',
  },
  errorText: {
    marginTop: scale(8),
    fontSize: moderateScale(14),
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyContainer: {
    paddingVertical: verticalScale(30),
    paddingHorizontal: scale(20),
    alignItems: 'center',
  },
  emptyText: {
    marginTop: scale(8),
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scale(16),
    marginBottom: scale(8),
    paddingHorizontal: scale(12),
    backgroundColor: '#F9FAFB',
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  clearSearchButton: {
    padding: scale(4),
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    paddingBottom: verticalScale(16),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iconContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#ECFDF3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(10),
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: '#111827',
  },
  itemSubtitle: {
    marginTop: scale(2),
    fontSize: moderateScale(12),
    color: '#6B7280',
  },
});


