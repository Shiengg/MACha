import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import apiClient from '../../services/apiClient';
import {
  GET_CAMPAIGNS_FOR_MAP_ROUTE,
  GET_CAMPAIGN_MAP_STATISTICS_ROUTE,
  GET_EVENTS_FOR_MAP_ROUTE,
} from '../../constants/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

// Default center: Vietnam
const DEFAULT_REGION = {
  latitude: 16.0,
  longitude: 108.0,
  latitudeDelta: 8.0,
  longitudeDelta: 8.0,
};

export default function MapScreen() {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const [campaigns, setCampaigns] = useState([]);
  const [events, setEvents] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [statistics, setStatistics] = useState({
    active: 0,
    completed: 0,
    finished: 0,
    total: 0,
  });
  const [eventStatistics, setEventStatistics] = useState({
    upcoming: 0,
    ongoing: 0,
    completed: 0,
    total: 0,
  });

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [campaignsData, eventsData, statisticsData] = await Promise.all([
        apiClient.get(GET_CAMPAIGNS_FOR_MAP_ROUTE),
        apiClient.get(GET_EVENTS_FOR_MAP_ROUTE),
        apiClient.get(GET_CAMPAIGN_MAP_STATISTICS_ROUTE),
      ]);

      const campaignsList = campaignsData.data.campaigns || [];
      const eventsList = eventsData.data.events || [];
      
      setCampaigns(campaignsList);
      setEvents(eventsList);
      setFilteredCampaigns(campaignsList);
      setFilteredEvents(eventsList);
      setStatistics(statisticsData.data || {
        active: 0,
        completed: 0,
        finished: 0,
        total: 0,
      });

      // Calculate event statistics
      const now = new Date();
      const eventStats = {
        upcoming: eventsList.filter(e => {
          if (!e.start_date) return false;
          return new Date(e.start_date) > now;
        }).length,
        ongoing: eventsList.filter(e => {
          if (!e.start_date) return false;
          const startDate = new Date(e.start_date);
          if (startDate > now) return false;
          if (e.end_date) {
            const endDate = new Date(e.end_date);
            return endDate >= now;
          }
          return true;
        }).length,
        completed: eventsList.filter(e => {
          if (e.status === 'completed' || e.status === 'cancelled') return true;
          if (e.end_date) {
            return new Date(e.end_date) < now;
          }
          return false;
        }).length,
        total: eventsList.length,
      };
      setEventStatistics(eventStats);
    } catch (error) {
      console.error('Error loading map data:', error);
      Alert.alert(
        'Lỗi',
        'Không thể tải dữ liệu bản đồ. Vui lòng thử lại sau.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter campaigns and events
  useEffect(() => {
    let filteredC = campaigns;
    let filteredE = events;

    if (selectedCategory !== 'all') {
      filteredC = filteredC.filter(c => c.category === selectedCategory);
      filteredE = filteredE.filter(e => e.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredC = filteredC.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.location?.location_name?.toLowerCase().includes(query)
      );
      filteredE = filteredE.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.location?.location_name?.toLowerCase().includes(query)
      );
    }

    setFilteredCampaigns(filteredC);
    setFilteredEvents(filteredE);
  }, [selectedCategory, searchQuery, campaigns, events]);

  const handleMarkerPress = (item, type) => {
    setSelectedMarker({ ...item, type });
  };

  const handleViewDetails = () => {
    if (!selectedMarker) return;
    
    if (selectedMarker.type === 'event') {
      navigation.navigate('EventDetail', { eventId: selectedMarker._id });
    } else {
      navigation.navigate('CampaignDetail', { campaignId: selectedMarker._id });
    }
    setSelectedMarker(null);
  };

  const sidebarWidth = isSidebarOpen ? 280 : 0;

  if (!MAPBOX_TOKEN) {
    // Note: React Native Maps doesn't require Mapbox token, but we can use it for styling
    // For now, we'll proceed without it
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bản đồ thiện nguyện</Text>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <MaterialCommunityIcons
            name={isSidebarOpen ? 'chevron-left' : 'chevron-right'}
            size={24}
            color="#1F2937"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Sidebar */}
        <View style={[styles.sidebar, { width: sidebarWidth }]}>
          <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
            {/* Search */}
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color="#6B7280"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm chiến dịch, sự kiện, địa điểm..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Campaign Statistics */}
            <View style={styles.statSection}>
              <Text style={styles.statTitle}>Chiến dịch thiện nguyện</Text>
              <View style={styles.statGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{statistics.active}</Text>
                  <Text style={styles.statLabel}>Đang thực hiện</Text>
                </View>
                <View style={[styles.statCard, styles.statCardGreen]}>
                  <Text style={[styles.statNumber, styles.statNumberGreen]}>
                    {statistics.completed}
                  </Text>
                  <Text style={styles.statLabel}>Đạt mục tiêu</Text>
                </View>
                <View style={[styles.statCard, styles.statCardGray]}>
                  <Text style={[styles.statNumber, styles.statNumberGray]}>
                    {statistics.finished}
                  </Text>
                  <Text style={styles.statLabel}>Đã kết thúc</Text>
                </View>
              </View>
            </View>

            {/* Event Statistics */}
            <View style={styles.statSection}>
              <Text style={styles.statTitle}>Sự kiện thiện nguyện</Text>
              <View style={styles.statGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{eventStatistics.upcoming}</Text>
                  <Text style={styles.statLabel}>Sắp diễn ra</Text>
                </View>
                <View style={[styles.statCard, styles.statCardGreen]}>
                  <Text style={[styles.statNumber, styles.statNumberGreen]}>
                    {eventStatistics.ongoing}
                  </Text>
                  <Text style={styles.statLabel}>Đang diễn ra</Text>
                </View>
                <View style={[styles.statCard, styles.statCardGray]}>
                  <Text style={[styles.statNumber, styles.statNumberGray]}>
                    {eventStatistics.completed}
                  </Text>
                  <Text style={styles.statLabel}>Đã kết thúc</Text>
                </View>
              </View>
            </View>

            {/* Search Results */}
            {searchQuery.trim() && (filteredCampaigns.length > 0 || filteredEvents.length > 0) && (
              <View style={styles.resultsSection}>
                <Text style={styles.resultsTitle}>
                  Kết quả ({filteredCampaigns.length + filteredEvents.length})
                </Text>
                <ScrollView style={styles.resultsList}>
                  {filteredCampaigns.map((campaign) => (
                    <TouchableOpacity
                      key={campaign._id}
                      style={styles.resultCard}
                      onPress={() => {
                        if (mapRef.current && campaign.location) {
                          mapRef.current.animateToRegion({
                            latitude: campaign.location.latitude,
                            longitude: campaign.location.longitude,
                            latitudeDelta: 0.5,
                            longitudeDelta: 0.5,
                          });
                          handleMarkerPress(campaign, 'campaign');
                        }
                      }}
                    >
                      {campaign.banner_image && (
                        <Image
                          source={{ uri: campaign.banner_image }}
                          style={styles.resultImage}
                        />
                      )}
                      <View style={styles.resultContent}>
                        <Text style={styles.resultTitle} numberOfLines={2}>
                          {campaign.title}
                        </Text>
                        {campaign.location && (
                          <Text style={styles.resultLocation} numberOfLines={1}>
                            📍 {campaign.location.location_name}
                          </Text>
                        )}
                        <View style={styles.resultFooter}>
                          <View style={[styles.badge, styles.badgeRed]}>
                            <Text style={[styles.badgeText, styles.badgeTextRed]}>
                              {campaign.category}
                            </Text>
                          </View>
                          <Text style={styles.resultProgress}>
                            {((campaign.current_amount / campaign.goal_amount) * 100).toFixed(0)}%
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {filteredEvents.map((event) => (
                    <TouchableOpacity
                      key={event._id}
                      style={styles.resultCard}
                      onPress={() => {
                        if (mapRef.current && event.location) {
                          mapRef.current.animateToRegion({
                            latitude: event.location.latitude,
                            longitude: event.location.longitude,
                            latitudeDelta: 0.5,
                            longitudeDelta: 0.5,
                          });
                          handleMarkerPress(event, 'event');
                        }
                      }}
                    >
                      {event.banner_image && (
                        <Image
                          source={{ uri: event.banner_image }}
                          style={styles.resultImage}
                        />
                      )}
                      <View style={styles.resultContent}>
                        <Text style={styles.resultTitle} numberOfLines={2}>
                          {event.title}
                        </Text>
                        {event.location && (
                          <Text style={styles.resultLocation} numberOfLines={1}>
                            📍 {event.location.location_name}
                          </Text>
                        )}
                        <View style={styles.resultFooter}>
                          <View style={[styles.badge, styles.badgeGreen]}>
                            <Text style={[styles.badgeText, styles.badgeTextGreen]}>
                              {event.category}
                            </Text>
                          </View>
                          <Text style={styles.resultDate}>
                            {new Date(event.start_date).toLocaleDateString('vi-VN')}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {searchQuery.trim() && filteredCampaigns.length === 0 && filteredEvents.length === 0 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>
                  Không tìm thấy kết quả phù hợp
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Map */}
        <View style={[styles.mapContainer, { marginLeft: sidebarWidth }]}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#62AC4A" />
              <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={Platform.OS === 'android' ? 'google' : undefined}
              initialRegion={DEFAULT_REGION}
              showsUserLocation={false}
              showsMyLocationButton={true}
              showsCompass={true}
              mapType="standard"
            >
              {/* Campaign Markers (Red) */}
              {filteredCampaigns
                .filter(c => c.location?.latitude && c.location?.longitude)
                .map((campaign) => (
                  <Marker
                    key={`campaign-${campaign._id}`}
                    coordinate={{
                      latitude: campaign.location.latitude,
                      longitude: campaign.location.longitude,
                    }}
                    onPress={() => handleMarkerPress(campaign, 'campaign')}
                  >
                    <View style={styles.markerContainer}>
                      <View style={[styles.marker, styles.campaignMarker]} />
                    </View>
                  </Marker>
                ))}

              {/* Event Markers (Green) */}
              {filteredEvents
                .filter(e => e.location?.latitude && e.location?.longitude)
                .map((event) => (
                  <Marker
                    key={`event-${event._id}`}
                    coordinate={{
                      latitude: event.location.latitude,
                      longitude: event.location.longitude,
                    }}
                    onPress={() => handleMarkerPress(event, 'event')}
                  >
                    <View style={styles.markerContainer}>
                      <View style={[styles.marker, styles.eventMarker]} />
                    </View>
                  </Marker>
                ))}
            </MapView>
          )}
        </View>
      </View>

      {/* Marker Popup Modal */}
      <Modal
        visible={selectedMarker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMarker(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popupContainer}>
            {selectedMarker && (
              <>
                {selectedMarker.banner_image && (
                  <Image
                    source={{ uri: selectedMarker.banner_image }}
                    style={styles.popupImage}
                  />
                )}
                <View style={styles.popupContent}>
                  <Text style={styles.popupTitle}>{selectedMarker.title}</Text>
                  {selectedMarker.location && (
                    <Text style={styles.popupLocation} numberOfLines={2}>
                      📍 {selectedMarker.location.location_name}
                    </Text>
                  )}
                  {selectedMarker.type === 'event' ? (
                    <Text style={styles.popupInfo}>
                      Ngày: {new Date(selectedMarker.start_date).toLocaleDateString('vi-VN')}
                    </Text>
                  ) : (
                    <Text style={styles.popupInfo}>
                      Tiến độ: {((selectedMarker.current_amount / selectedMarker.goal_amount) * 100).toFixed(1)}%
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.popupButton,
                      selectedMarker.type === 'event' ? styles.popupButtonGreen : styles.popupButtonBlue,
                    ]}
                    onPress={handleViewDetails}
                  >
                    <Text style={styles.popupButtonText}>Xem chi tiết →</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.popupClose}
                  onPress={() => setSelectedMarker(null)}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  toggleButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    overflow: 'hidden',
  },
  sidebarContent: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  statSection: {
    marginBottom: 24,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#DBEAFE',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statCardGreen: {
    backgroundColor: '#D1FAE5',
  },
  statCardGray: {
    backgroundColor: '#F3F4F6',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statNumberGreen: {
    color: '#10B981',
  },
  statNumberGray: {
    color: '#6B7280',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  resultsSection: {
    marginTop: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  resultsList: {
    maxHeight: 400,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#E5E7EB',
  },
  resultContent: {
    padding: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  resultLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeRed: {
    backgroundColor: '#FEE2E2',
  },
  badgeGreen: {
    backgroundColor: '#D1FAE5',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  badgeTextRed: {
    color: '#DC2626',
  },
  badgeTextGreen: {
    color: '#059669',
  },
  resultProgress: {
    fontSize: 12,
    color: '#6B7280',
  },
  resultDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  noResults: {
    padding: 24,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  campaignMarker: {
    backgroundColor: '#EF4444',
  },
  eventMarker: {
    backgroundColor: '#22C55E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  popupContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    position: 'relative',
  },
  popupImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  popupContent: {
    padding: 20,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  popupLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  popupInfo: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 20,
  },
  popupButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  popupButtonBlue: {
    backgroundColor: '#3B82F6',
  },
  popupButtonGreen: {
    backgroundColor: '#22C55E',
  },
  popupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  popupClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
