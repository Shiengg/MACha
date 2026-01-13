import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { eventService } from '../../services/event.service';
import EventCard from '../../components/event/EventCard';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

const ITEMS_PER_PAGE = 10; // Số items hiển thị mỗi lần

export default function EventsScreen() {
  const navigation = useNavigation();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [displayedEvents, setDisplayedEvents] = useState([]); // Events đang hiển thị (pagination)
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('ongoing');
  const [selectedCity, setSelectedCity] = useState('all');
  
  // Filter bottom sheet states
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [tempCategory, setTempCategory] = useState('all');
  const [tempStatus, setTempStatus] = useState('ongoing');
  const [tempCity, setTempCity] = useState('all');
  const [expandedSections, setExpandedSections] = useState({
    status: false,
    category: false,
    city: false,
  });

  const categories = [
    { value: 'all', label: 'Tất cả' },
    { value: 'volunteering', label: 'Tình nguyện' },
    { value: 'fundraising', label: 'Gây quỹ' },
    { value: 'charity_event', label: 'Sự kiện từ thiện' },
    { value: 'donation_drive', label: 'Tập hợp đóng góp' },
  ];

  const statuses = [
    { value: 'ongoing', label: 'Đang diễn ra' },
    { value: 'upcoming', label: 'Sắp diễn ra' },
    { value: 'past', label: 'Đã qua' },
  ];

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchQuery, selectedCategory, selectedCity, selectedStatus]);

  // Update displayed events when filtered events change
  useEffect(() => {
    if (filteredEvents.length > 0) {
      setCurrentPage(1);
      const initialEvents = filteredEvents.slice(0, ITEMS_PER_PAGE);
      setDisplayedEvents(initialEvents);
      setHasMore(filteredEvents.length > ITEMS_PER_PAGE);
    } else {
      setDisplayedEvents([]);
      setHasMore(false);
      setCurrentPage(1);
    }
  }, [filteredEvents]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      // Load all events, then filter to only show approved ones (published or completed)
      const allEvents = await eventService.getAllEvents();
      // Filter to only show events that are approved (published or completed status)
      const approvedEvents = allEvents.filter(
        (e) => e.status === 'published' || e.status === 'completed'
      );
      setEvents(approvedEvents);
    } catch (err) {
      console.error('Error loading events:', err);
      Alert.alert('Lỗi', 'Không thể tải danh sách sự kiện', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const loadMoreEvents = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const nextPage = currentPage + 1;
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const nextEvents = filteredEvents.slice(startIndex, endIndex);

    if (nextEvents.length > 0) {
      setDisplayedEvents(prev => [...prev, ...nextEvents]);
      setCurrentPage(nextPage);
      setHasMore(endIndex < filteredEvents.length);
    } else {
      setHasMore(false);
    }

    setLoadingMore(false);
  }, [currentPage, filteredEvents, loadingMore, hasMore]);

  const filterEvents = () => {
    let filtered = [...events];
    const now = new Date();

    // Filter by time status (ongoing, upcoming, past)
    filtered = filtered.filter((e) => {
      // Only show published or completed events (both are approved by admin)
      if (e.status !== 'published' && e.status !== 'completed') return false;

      const startDate = new Date(e.start_date);
      const endDate = e.end_date ? new Date(e.end_date) : null;

      if (selectedStatus === 'ongoing') {
        // Đang diễn ra: start_date <= now <= end_date (hoặc start_date <= now nếu không có end_date)
        if (endDate) {
          return startDate <= now && now <= endDate;
        } else {
          return startDate <= now;
        }
      } else if (selectedStatus === 'upcoming') {
        // Sắp diễn ra: start_date > now
        return startDate > now;
      } else if (selectedStatus === 'past') {
        // Đã qua: end_date < now (hoặc start_date < now nếu không có end_date)
        if (endDate) {
          return endDate < now;
        } else {
          return startDate < now;
        }
      }
      return true;
    });

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((e) => e.category === selectedCategory);
    }

    // Filter by city
    if (selectedCity !== 'all') {
      filtered = filtered.filter((e) =>
        e.location?.location_name?.toLowerCase().includes(selectedCity.toLowerCase())
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query) ||
          e.location?.location_name?.toLowerCase().includes(query)
      );
    }

    setFilteredEvents(filtered);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadEvents();
      return;
    }

    try {
      setLoading(true);
      const data = await eventService.searchEvents(searchQuery, {
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        city: selectedCity !== 'all' ? selectedCity : undefined,
      });
      setEvents(data);
    } catch (err) {
      console.error('Error searching events:', err);
      Alert.alert('Lỗi', 'Không thể tìm kiếm sự kiện', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleEventPress = (event) => {
    navigation.navigate('EventDetail', { eventId: event._id });
  };

  const handleOpenFilter = () => {
    // Initialize temp filters with current values
    setTempCategory(selectedCategory);
    setTempStatus(selectedStatus);
    setTempCity(selectedCity);
    setExpandedSections({
      status: false,
      category: false,
      city: false,
    });
    setShowFilterSheet(true);
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleApplyFilter = () => {
    setSelectedCategory(tempCategory);
    setSelectedStatus(tempStatus);
    setSelectedCity(tempCity);
    setShowFilterSheet(false);
  };

  const handleResetFilter = () => {
    setTempCategory('all');
    setTempStatus('ongoing');
    setTempCity('all');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedStatus !== 'ongoing') count++;
    if (selectedCity !== 'all') count++;
    return count;
  };

  // Get unique cities from events (extract from location_name or address)
  const cities = Array.from(
    new Set(
      events
        .map((e) => {
          // Try to extract city name from location_name or address
          const loc = e.location?.location_name || '';
          // Simple extraction: take the last part after comma or last word
          const parts = loc.split(',').map((s) => s.trim()).filter(Boolean);
          return parts.length > 0 ? parts[parts.length - 1] : null;
        })
        .filter(Boolean)
    )
  );

  // Get selected label for display
  const getSelectedLabel = (type) => {
    if (type === 'status') {
      return statuses.find((s) => s.value === tempStatus)?.label || 'Đang diễn ra';
    }
    if (type === 'category') {
      return categories.find((c) => c.value === tempCategory)?.label || 'Tất cả';
    }
    if (type === 'city') {
      return tempCity === 'all' ? 'Tất cả thành phố' : tempCity;
    }
    return '';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sự kiện từ thiện</Text>
        <Text style={styles.headerSubtitle}>
          Khám phá và tham gia các sự kiện từ thiện trong cộng đồng
        </Text>
      </View>

      {/* Search and Filter */}
      <View style={styles.filtersContainer}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color="#9CA3AF"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm sự kiện..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                loadEvents();
              }}
              style={styles.clearButton}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={handleOpenFilter}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="filter-variant" size={20} color="#F97E2C" />
          <Text style={styles.filterButtonText}>Lọc</Text>
          {getActiveFilterCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Events List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97E2C" />
          <Text style={styles.loadingText}>Đang tải sự kiện...</Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="calendar-remove" size={64} color="#9CA3AF" />
              <Text style={styles.emptyText}>Không tìm thấy sự kiện nào</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.emptyListContent}
        />
      ) : (
        <FlatList
          data={displayedEvents}
          renderItem={({ item }) => (
            <EventCard event={item} onPress={handleEventPress} />
          )}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.eventsListContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          onEndReached={loadMoreEvents}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => {
            if (!loadingMore) return null;
            return (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#F97E2C" />
                <Text style={styles.loadMoreText}>Đang tải thêm...</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="calendar-remove" size={64} color="#9CA3AF" />
              <Text style={styles.emptyText}>Không tìm thấy sự kiện nào</Text>
            </View>
          }
        />
      )}

      {/* Filter Bottom Sheet */}
      <Modal
        visible={showFilterSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterSheet(false)}
        >
          <View style={styles.bottomSheetContainer}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.bottomSheetContent}
            >
              {/* Header */}
              <View style={styles.bottomSheetHeader}>
                <View style={styles.bottomSheetHandle} />
                <View style={styles.bottomSheetHeaderContent}>
                  <Text style={styles.bottomSheetTitle}>Lọc sự kiện</Text>
                  <TouchableOpacity
                    onPress={() => setShowFilterSheet(false)}
                    style={styles.bottomSheetCloseButton}
                  >
                    <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                style={styles.bottomSheetScrollView}
                showsVerticalScrollIndicator={false}
              >
                {/* Status Filter */}
                <View style={styles.filterSection}>
                  <TouchableOpacity
                    style={styles.filterSectionHeader}
                    onPress={() => toggleSection('status')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.filterSectionTitle}>Trạng thái</Text>
                    <View style={styles.filterSectionHeaderRight}>
                      <Text style={styles.filterSectionValue}>{getSelectedLabel('status')}</Text>
                      <MaterialCommunityIcons
                        name={expandedSections.status ? 'chevron-up' : 'chevron-down'}
                        size={24}
                        color="#6B7280"
                      />
                    </View>
                  </TouchableOpacity>
                  {expandedSections.status && (
                    <View style={styles.filterOptions}>
                      {statuses.map((status) => (
                        <TouchableOpacity
                          key={status.value}
                          style={[
                            styles.filterOption,
                            tempStatus === status.value && styles.filterOptionActive,
                          ]}
                          onPress={() => setTempStatus(status.value)}
                        >
                          <Text
                            style={[
                              styles.filterOptionText,
                              tempStatus === status.value && styles.filterOptionTextActive,
                            ]}
                          >
                            {status.label}
                          </Text>
                          {tempStatus === status.value && (
                            <MaterialCommunityIcons name="check" size={20} color="#F97E2C" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Category Filter */}
                <View style={styles.filterSection}>
                  <TouchableOpacity
                    style={styles.filterSectionHeader}
                    onPress={() => toggleSection('category')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.filterSectionTitle}>Danh mục</Text>
                    <View style={styles.filterSectionHeaderRight}>
                      <Text style={styles.filterSectionValue}>{getSelectedLabel('category')}</Text>
                      <MaterialCommunityIcons
                        name={expandedSections.category ? 'chevron-up' : 'chevron-down'}
                        size={24}
                        color="#6B7280"
                      />
                    </View>
                  </TouchableOpacity>
                  {expandedSections.category && (
                    <View style={styles.filterOptions}>
                      {categories.map((cat) => (
                        <TouchableOpacity
                          key={cat.value}
                          style={[
                            styles.filterOption,
                            tempCategory === cat.value && styles.filterOptionActive,
                          ]}
                          onPress={() => setTempCategory(cat.value)}
                        >
                          <Text
                            style={[
                              styles.filterOptionText,
                              tempCategory === cat.value && styles.filterOptionTextActive,
                            ]}
                          >
                            {cat.label}
                          </Text>
                          {tempCategory === cat.value && (
                            <MaterialCommunityIcons name="check" size={20} color="#F97E2C" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* City Filter */}
                {cities.length > 0 && (
                  <View style={styles.filterSection}>
                    <TouchableOpacity
                      style={styles.filterSectionHeader}
                      onPress={() => toggleSection('city')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.filterSectionTitle}>Thành phố</Text>
                      <View style={styles.filterSectionHeaderRight}>
                        <Text style={styles.filterSectionValue}>{getSelectedLabel('city')}</Text>
                        <MaterialCommunityIcons
                          name={expandedSections.city ? 'chevron-up' : 'chevron-down'}
                          size={24}
                          color="#6B7280"
                        />
                      </View>
                    </TouchableOpacity>
                    {expandedSections.city && (
                      <ScrollView
                        style={cities.length >= 5 ? styles.filterOptionsScroll : null}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={cities.length >= 5}
                      >
                        <View style={styles.filterOptions}>
                          <TouchableOpacity
                            style={[
                              styles.filterOption,
                              tempCity === 'all' && styles.filterOptionActive,
                            ]}
                            onPress={() => setTempCity('all')}
                          >
                            <Text
                              style={[
                                styles.filterOptionText,
                                tempCity === 'all' && styles.filterOptionTextActive,
                              ]}
                            >
                              Tất cả thành phố
                            </Text>
                            {tempCity === 'all' && (
                              <MaterialCommunityIcons name="check" size={20} color="#F97E2C" />
                            )}
                          </TouchableOpacity>
                          {cities.map((city) => (
                            <TouchableOpacity
                              key={city}
                              style={[
                                styles.filterOption,
                                tempCity === city && styles.filterOptionActive,
                              ]}
                              onPress={() => setTempCity(city)}
                            >
                              <Text
                                style={[
                                  styles.filterOptionText,
                                  tempCity === city && styles.filterOptionTextActive,
                                ]}
                              >
                                {city}
                              </Text>
                              {tempCity === city && (
                                <MaterialCommunityIcons name="check" size={20} color="#F97E2C" />
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    )}
                  </View>
                )}
      </ScrollView>

              {/* Actions */}
              <View style={styles.bottomSheetActions}>
                <TouchableOpacity
                  style={[styles.bottomSheetButton, styles.resetButton]}
                  onPress={handleResetFilter}
                >
                  <Text style={styles.resetButtonText}>Đặt lại</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bottomSheetButton, styles.applyButton]}
                  onPress={handleApplyFilter}
                >
                  <Text style={styles.applyButtonText}>Áp dụng</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: verticalScale(4),
  },
  headerSubtitle: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: scale(12),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: scale(8),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(14),
    color: '#1F2937',
    paddingVertical: verticalScale(10),
  },
  clearButton: {
    padding: scale(4),
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#F97E2C',
    borderRadius: 8,
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(16),
    position: 'relative',
  },
  filterButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#F97E2C',
    marginLeft: scale(8),
  },
  filterBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(6),
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(11),
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    maxHeight: '90%',
  },
  bottomSheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: verticalScale(20),
  },
  bottomSheetHandle: {
    width: scale(40),
    height: verticalScale(4),
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
  },
  bottomSheetHeader: {
    paddingHorizontal: scale(20),
  },
  bottomSheetHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
  },
  bottomSheetTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  bottomSheetCloseButton: {
    padding: scale(4),
  },
  bottomSheetScrollView: {
    maxHeight: verticalScale(400),
  },
  filterSection: {
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: verticalScale(16),
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(8),
  },
  filterSectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#374151',
  },
  filterSectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  filterSectionValue: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  filterOptions: {
    marginTop: verticalScale(12),
    gap: verticalScale(8),
  },
  filterOptionsScroll: {
    maxHeight: verticalScale(200),
    marginTop: verticalScale(12),
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  filterOptionActive: {
    borderColor: '#F97E2C',
    backgroundColor: '#FFF7ED',
  },
  filterOptionText: {
    fontSize: moderateScale(14),
    color: '#374151',
  },
  filterOptionTextActive: {
    color: '#F97E2C',
    fontWeight: '600',
  },
  bottomSheetActions: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: scale(12),
  },
  bottomSheetButton: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  resetButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#374151',
  },
  applyButton: {
    backgroundColor: '#F97E2C',
  },
  applyButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(40),
  },
  loadingText: {
    marginTop: verticalScale(16),
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(60),
    paddingHorizontal: scale(20),
  },
  emptyText: {
    fontSize: moderateScale(16),
    color: '#6B7280',
    marginTop: verticalScale(16),
    textAlign: 'center',
  },
  eventsList: {
    flex: 1,
  },
  eventsListContent: {
    padding: scale(16),
    paddingBottom: verticalScale(20),
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(60),
    paddingHorizontal: scale(20),
  },
  loadMoreContainer: {
    paddingVertical: verticalScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: scale(8),
  },
  loadMoreText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
});
