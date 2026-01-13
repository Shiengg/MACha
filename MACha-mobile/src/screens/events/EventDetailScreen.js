import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { eventService } from '../../services/event.service';
import { reportService } from '../../services/report.service';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function EventDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { eventId } = route.params || {};
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [event, setEvent] = useState(null);
  const [rsvp, setRSVP] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [isCheckingReport, setIsCheckingReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [selectedReportReason, setSelectedReportReason] = useState('');

  useEffect(() => {
    if (eventId) {
      fetchEvent();
      if (user) {
        fetchRSVP();
      }
      fetchUpdates();
    }
  }, [eventId, user]);

  // Join event room and listen for realtime RSVP updates
  useEffect(() => {
    if (!socket || !isConnected || !eventId) return;

    // Join event room
    const eventRoom = `event:${eventId}`;
    socket.emit('join-room', eventRoom);
    console.log(`🏠 Joined event room: ${eventRoom}`);

    // Listen for RSVP updates
    const handleRSVPUpdated = (eventData) => {
      const receivedEventId = String(eventData.eventId || '');
      const currentEventId = String(eventId || '');
      
      if (receivedEventId !== currentEventId) {
        console.log('⚠️ Event ID mismatch:', receivedEventId, 'vs', currentEventId);
        return;
      }
      
      console.log('🔄 Real-time RSVP update received:', eventData);
      
      // Update event RSVP stats - always update
      if (eventData.rsvpStats) {
        setEvent(prev => {
          if (!prev) {
            // If event not loaded yet, fetch it in background but don't block
            fetchEvent(true).catch(err => console.error('Error fetching event:', err));
            return null;
          }
          console.log('✅ Updating RSVP stats:', eventData.rsvpStats);
          return {
            ...prev,
            rsvpStats: eventData.rsvpStats
          };
        });
      }
      
      // If current user updated their RSVP, update local state
      if (eventData.rsvp && user) {
        const currentUserId = String(user._id || user.id || '');
        const rsvpUserId = String(eventData.rsvp.user?._id || eventData.rsvp.user?.id || '');
        if (rsvpUserId === currentUserId) {
          setRSVP(eventData.rsvp);
        }
      }
    };

    const handleRSVPDeleted = (eventData) => {
      const receivedEventId = String(eventData.eventId || '');
      const currentEventId = String(eventId || '');
      
      if (receivedEventId !== currentEventId) {
        console.log('⚠️ Event ID mismatch:', receivedEventId, 'vs', currentEventId);
        return;
      }
      
      console.log('🗑️ Real-time RSVP deleted:', eventData);
      
      // Update event RSVP stats
      if (eventData.rsvpStats) {
        setEvent(prev => {
          if (!prev) return null;
          return {
            ...prev,
            rsvpStats: eventData.rsvpStats
          };
        });
      }
      
      // If current user deleted their RSVP, update local state
      if (user) {
        const currentUserId = String(user._id || user.id || '');
        const deletedUserId = String(eventData.userId || '');
        if (deletedUserId === currentUserId) {
          setRSVP(null);
        }
      }
    };

    const handleEventUpdateCreated = (eventData) => {
      const receivedEventId = String(eventData.eventId || '');
      const currentEventId = String(eventId || '');
      
      if (receivedEventId !== currentEventId) {
        console.log('⚠️ Event ID mismatch for update:', receivedEventId, 'vs', currentEventId);
        return;
      }
      
      console.log('📢 Real-time event update received:', eventData);
      
      // Add new update to the list
      if (eventData.update) {
        setUpdates(prev => {
          // Check if update already exists to avoid duplicates
          const exists = prev.some(u => String(u._id) === String(eventData.update._id));
          if (exists) return prev;
          // Add to beginning of list
          return [eventData.update, ...prev];
        });
      }
    };

    socket.on('event:rsvp:updated', handleRSVPUpdated);
    socket.on('event:rsvp:deleted', handleRSVPDeleted);
    socket.on('event:update:created', handleEventUpdateCreated);

    return () => {
      socket.off('event:rsvp:updated', handleRSVPUpdated);
      socket.off('event:rsvp:deleted', handleRSVPDeleted);
      socket.off('event:update:created', handleEventUpdateCreated);
      socket.emit('leave-room', eventRoom);
      console.log(`🚪 Left event room: ${eventRoom}`);
    };
  }, [socket, isConnected, eventId, user]);

  const fetchEvent = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        setLoading(true);
      }
      const data = await eventService.getEventById(eventId);
      if (data) {
        // Ensure rsvpStats exists
        if (!data.rsvpStats) {
          // If no stats, fetch them separately
          try {
            const stats = await eventService.getRSVPStats(eventId);
            data.rsvpStats = stats;
          } catch (err) {
            console.error('Error fetching RSVP stats:', err);
            // Set default stats if fetch fails
            data.rsvpStats = {
              going: { count: 0, guests: 0 },
              interested: { count: 0, guests: 0 },
              not_going: { count: 0, guests: 0 }
            };
          }
        }
        setEvent(data);
      }
    } catch (err) {
      console.error('Error loading event:', err);
      if (!forceRefresh) {
        Alert.alert(
          'Lỗi',
          'Không thể tải thông tin sự kiện',
          [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]
        );
      }
    } finally {
      if (!forceRefresh) {
        setLoading(false);
      }
    }
  };

  const fetchRSVP = async () => {
    try {
      setRsvpLoading(true);
      const data = await eventService.getRSVP(eventId);
      setRSVP(data);
    } catch (err) {
      setRSVP(null);
    } finally {
      setRsvpLoading(false);
    }
  };

  const fetchUpdates = async () => {
    try {
      setUpdatesLoading(true);
      const data = await eventService.getEventUpdates(eventId);
      setUpdates(data);
    } catch (err) {
      console.error('Error loading updates:', err);
      setUpdates([]);
    } finally {
      setUpdatesLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchEvent(true),
      user ? fetchRSVP() : Promise.resolve(),
      fetchUpdates()
    ]);
    setRefreshing(false);
  };

  const handleRSVP = async (status) => {
    if (!user) {
      Alert.alert(
        'Cần đăng nhập',
        'Vui lòng đăng nhập để tham gia sự kiện',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await eventService.createRSVP(eventId, {
        status,
        guests_count: 0,
      });
      
      // Refresh RSVP và event để có stats mới nhất
      await Promise.all([
        fetchRSVP(),
        fetchEvent(true)
      ]);
      
      Alert.alert(
        'Thành công',
        `Bạn đã ${status === 'going' ? 'tham gia' : status === 'interested' ? 'quan tâm' : 'không tham gia'} sự kiện`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Error creating RSVP:', err);
      Alert.alert(
        'Lỗi',
        err.response?.data?.message || 'Không thể cập nhật RSVP',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCancelRSVP = async () => {
    try {
      await eventService.deleteRSVP(eventId);
      setRSVP(null);
      await fetchEvent(true);
      Alert.alert(
        'Đã hủy',
        'Bạn đã hủy tham gia sự kiện',
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert(
        'Lỗi',
        'Không thể hủy RSVP',
        [{ text: 'OK' }]
      );
    }
  };

  const handleReport = async () => {
    if (!selectedReportReason) {
      Alert.alert('Lỗi', 'Vui lòng chọn lý do báo cáo', [{ text: 'OK' }]);
      return;
    }

    try {
      await reportService.createReport({
        reported_type: 'event',
        reported_id: eventId,
        reported_reason: selectedReportReason,
        description: reportReason.trim() || undefined,
      });
      
      setHasReported(true);
      setShowReportModal(false);
      setReportReason('');
      setSelectedReportReason('');
      
      Alert.alert(
        'Thành công',
        'Báo cáo của bạn đã được gửi. Cảm ơn bạn đã giúp cải thiện cộng đồng!',
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Error creating report:', err);
      Alert.alert(
        'Lỗi',
        err.response?.data?.message || 'Không thể gửi báo cáo',
        [{ text: 'OK' }]
      );
    }
  };

  const checkReport = async () => {
    if (hasReported) {
      Alert.alert(
        'Đã báo cáo',
        'Bạn đã báo cáo sự kiện này rồi. Vui lòng chờ admin xử lý.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsCheckingReport(true);
    try {
      const { reports } = await reportService.getReportsByItem('event', eventId);
      const currentUserId = user?._id || user?.id;
      const userReport = reports.find(
        (report) => report.reporter._id === currentUserId
      );
      
      if (userReport) {
        setHasReported(true);
        Alert.alert(
          'Đã báo cáo',
          'Bạn đã báo cáo sự kiện này rồi. Vui lòng chờ admin xử lý.',
          [{ text: 'OK' }]
        );
      } else {
        setShowReportModal(true);
      }
    } catch (error) {
      console.error('Error checking report:', error);
      setShowReportModal(true);
    } finally {
      setIsCheckingReport(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'volunteering': 'Tình nguyện',
      'fundraising': 'Gây quỹ',
      'charity_event': 'Sự kiện từ thiện',
      'donation_drive': 'Tập hợp đóng góp',
    };
    return labels[category] || category;
  };

  const reportReasons = [
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate_content', label: 'Nội dung không phù hợp' },
    { value: 'scam', label: 'Lừa đảo' },
    { value: 'fake', label: 'Giả mạo' },
    { value: 'harassment', label: 'Quấy rối' },
    { value: 'violence', label: 'Bạo lực' },
    { value: 'misinformation', label: 'Thông tin sai lệch' },
    { value: 'other', label: 'Khác' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97E2C" />
          <Text style={styles.loadingText}>Đang tải sự kiện...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return null;
  }

  const isPast = new Date(event.start_date) < new Date();
  const totalAttendees = (event.rsvpStats?.going.count || 0) + (event.rsvpStats?.going.guests || 0);
  const isCreator = user && event.creator && (user._id === event.creator._id || user.id === event.creator._id);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết sự kiện</Text>
        {user && !isCreator && (
          <TouchableOpacity
            onPress={checkReport}
            style={styles.reportButton}
            disabled={isCheckingReport || hasReported}
          >
            <MaterialCommunityIcons
              name="flag-outline"
              size={24}
              color={hasReported ? "#9CA3AF" : "#EF4444"}
            />
          </TouchableOpacity>
        )}
        {!user && <View style={styles.placeholder} />}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Image */}
        <View style={styles.bannerContainer}>
          {event.banner_image ? (
            <Image
              source={{ uri: event.banner_image }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.bannerPlaceholder}>
              <MaterialCommunityIcons name="calendar" size={64} color="#F97E2C" />
            </View>
          )}
          {event.status === 'cancelled' && (
            <View style={[styles.statusBadge, styles.cancelledBadge]}>
              <Text style={styles.statusBadgeText}>Đã hủy</Text>
            </View>
          )}
          {event.status === 'completed' && (
            <View style={[styles.statusBadge, styles.completedBadge]}>
              <Text style={styles.statusBadgeText}>Đã kết thúc</Text>
            </View>
          )}
        </View>

        {/* Event Info */}
        <View style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>{event.title}</Text>
            <View style={styles.metaRow}>
              {event.creator && (
                <View style={styles.creatorInfo}>
                  <MaterialCommunityIcons name="account" size={16} color="#6B7280" />
                  <Text style={styles.creatorText}>
                    {event.creator.fullname || event.creator.username}
                  </Text>
                </View>
              )}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {getCategoryLabel(event.category)}
                </Text>
              </View>
            </View>
          </View>

          {event.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          )}

          {/* Event Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="calendar" size={20} color="#F97E2C" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Ngày bắt đầu</Text>
                <Text style={styles.detailValue}>{formatDate(event.start_date)}</Text>
                {event.end_date && (
                  <>
                    <Text style={[styles.detailLabel, styles.detailLabelMargin]}>Ngày kết thúc</Text>
                    <Text style={styles.detailValue}>{formatDate(event.end_date)}</Text>
                  </>
                )}
              </View>
            </View>

            {event.location?.location_name && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="map-marker" size={20} color="#F97E2C" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Địa điểm</Text>
                  <Text style={styles.detailValue}>{event.location.location_name}</Text>
                </View>
              </View>
            )}

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="account-group" size={20} color="#F97E2C" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Người tham gia</Text>
                <Text style={styles.detailValue}>
                  {totalAttendees} {event.capacity ? `/ ${event.capacity}` : ''} người
                </Text>
                <Text style={styles.detailSubtext}>
                  {event.rsvpStats?.going.count || 0} tham gia, {event.rsvpStats?.interested.count || 0} quan tâm
                </Text>
              </View>
            </View>
          </View>

          {/* RSVP Section */}
          {user && !isPast && event.status === 'published' && (
            <View style={styles.rsvpSection}>
              <Text style={styles.rsvpTitle}>Bạn có tham gia không?</Text>
              {rsvp ? (
                <View style={styles.rsvpStatus}>
                  <Text style={styles.rsvpStatusText}>
                    Bạn đã chọn: <Text style={styles.rsvpStatusBold}>
                      {rsvp.status === 'going' ? 'Tham gia' : 
                       rsvp.status === 'interested' ? 'Quan tâm' : 'Không tham gia'}
                    </Text>
                  </Text>
                  <TouchableOpacity
                    onPress={handleCancelRSVP}
                    style={styles.cancelButton}
                  >
                    <Text style={styles.cancelButtonText}>Hủy</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.rsvpButtons}>
                  <TouchableOpacity
                    style={[styles.rsvpButton, styles.goingButton]}
                    onPress={() => handleRSVP('going')}
                    disabled={rsvpLoading}
                  >
                    <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.rsvpButtonText}>Tham gia</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rsvpButton, styles.interestedButton]}
                    onPress={() => handleRSVP('interested')}
                    disabled={rsvpLoading}
                  >
                    <MaterialCommunityIcons name="account-group" size={20} color="#FFFFFF" />
                    <Text style={styles.rsvpButtonText}>Quan tâm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rsvpButton, styles.notGoingButton]}
                    onPress={() => handleRSVP('not_going')}
                    disabled={rsvpLoading}
                  >
                    <MaterialCommunityIcons name="close-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.rsvpButtonText}>Không tham gia</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Gallery Images */}
          {event.gallery_images && event.gallery_images.length > 0 && (
            <View style={styles.gallerySection}>
              <Text style={styles.sectionTitle}>Hình ảnh</Text>
              <View style={styles.galleryGrid}>
                {event.gallery_images.map((img, index) => (
                  <View key={index} style={styles.galleryItem}>
                    <Image
                      source={{ uri: img }}
                      style={styles.galleryImage}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Updates */}
          {updates.length > 0 && (
            <View style={styles.updatesSection}>
              <Text style={styles.sectionTitle}>Cập nhật</Text>
              {updates.map((update) => (
                <View key={update._id} style={styles.updateCard}>
                  <View style={styles.updateHeader}>
                    <View style={styles.updateAvatar}>
                      {update.author.avatar ? (
                        <Image
                          source={{ uri: update.author.avatar }}
                          style={styles.updateAvatarImage}
                        />
                      ) : (
                        <View style={styles.updateAvatarPlaceholder}>
                          <Text style={styles.updateAvatarText}>
                            {(update.author.username || 'U').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.updateAuthorInfo}>
                      <Text style={styles.updateAuthorName}>
                        {update.author.fullname || update.author.username}
                      </Text>
                      <Text style={styles.updateDate}>
                        {new Date(update.createdAt).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                  </View>
                  {update.content && (
                    <Text style={styles.updateContent}>{update.content}</Text>
                  )}
                  {update.media_urls && update.media_urls.length > 0 && (
                    <View style={styles.updateMediaGrid}>
                      {update.media_urls.map((url, index) => (
                        <View key={index} style={styles.updateMediaItem}>
                          <Image
                            source={{ uri: url }}
                            style={styles.updateMediaImage}
                            resizeMode="cover"
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Báo cáo sự kiện</Text>
              <TouchableOpacity
                onPress={() => setShowReportModal(false)}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.modalLabel}>Lý do báo cáo</Text>
              {reportReasons.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.reasonOption,
                    selectedReportReason === reason.value && styles.reasonOptionActive
                  ]}
                  onPress={() => setSelectedReportReason(reason.value)}
                >
                  <Text
                    style={[
                      styles.reasonOptionText,
                      selectedReportReason === reason.value && styles.reasonOptionTextActive
                    ]}
                  >
                    {reason.label}
                  </Text>
                  {selectedReportReason === reason.value && (
                    <MaterialCommunityIcons name="check" size={20} color="#F97E2C" />
                  )}
                </TouchableOpacity>
              ))}

              <Text style={[styles.modalLabel, styles.modalLabelMargin]}>Mô tả thêm (tùy chọn)</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Nhập mô tả chi tiết..."
                value={reportReason}
                onChangeText={setReportReason}
                multiline
                numberOfLines={4}
                placeholderTextColor="#9CA3AF"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowReportModal(false);
                  setReportReason('');
                  setSelectedReportReason('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={handleReport}
              >
                <Text style={styles.modalButtonSubmitText}>Gửi báo cáo</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: scale(4),
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  reportButton: {
    padding: scale(4),
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: verticalScale(16),
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: verticalScale(20),
  },
  bannerContainer: {
    width: '100%',
    height: verticalScale(250),
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF3E2',
  },
  statusBadge: {
    position: 'absolute',
    top: scale(12),
    right: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: 16,
  },
  cancelledBadge: {
    backgroundColor: '#EF4444',
  },
  completedBadge: {
    backgroundColor: '#6B7280',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  content: {
    backgroundColor: '#FFFFFF',
    padding: scale(16),
  },
  titleSection: {
    marginBottom: verticalScale(16),
  },
  title: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: verticalScale(8),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  creatorText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  categoryBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#F97E2C',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: 16,
  },
  categoryBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#F97E2C',
  },
  descriptionSection: {
    marginBottom: verticalScale(16),
  },
  description: {
    fontSize: moderateScale(14),
    color: '#374151',
    lineHeight: moderateScale(20),
  },
  detailsSection: {
    marginBottom: verticalScale(16),
    gap: verticalScale(16),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(12),
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: verticalScale(4),
  },
  detailLabelMargin: {
    marginTop: verticalScale(8),
  },
  detailValue: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  detailSubtext: {
    fontSize: moderateScale(12),
    color: '#9CA3AF',
    marginTop: verticalScale(4),
  },
  rsvpSection: {
    backgroundColor: '#F9FAFB',
    padding: scale(16),
    borderRadius: 12,
    marginBottom: verticalScale(16),
  },
  rsvpTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: verticalScale(12),
  },
  rsvpStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rsvpStatusText: {
    fontSize: moderateScale(14),
    color: '#374151',
  },
  rsvpStatusBold: {
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
  },
  cancelButtonText: {
    fontSize: moderateScale(14),
    color: '#EF4444',
    fontWeight: '600',
  },
  rsvpButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  rsvpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(16),
    borderRadius: 8,
    gap: scale(6),
    flex: 1,
    minWidth: '30%',
  },
  goingButton: {
    backgroundColor: '#10B981',
  },
  interestedButton: {
    backgroundColor: '#3B82F6',
  },
  notGoingButton: {
    backgroundColor: '#6B7280',
  },
  rsvpButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gallerySection: {
    marginBottom: verticalScale(16),
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: verticalScale(12),
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  galleryItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  updatesSection: {
    marginBottom: verticalScale(16),
  },
  updateCard: {
    backgroundColor: '#F9FAFB',
    padding: scale(16),
    borderRadius: 12,
    marginBottom: verticalScale(12),
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
    gap: scale(12),
  },
  updateAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    overflow: 'hidden',
  },
  updateAvatarImage: {
    width: '100%',
    height: '100%',
  },
  updateAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateAvatarText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#6B7280',
  },
  updateAuthorInfo: {
    flex: 1,
  },
  updateAuthorName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#1F2937',
  },
  updateDate: {
    fontSize: moderateScale(12),
    color: '#9CA3AF',
    marginTop: verticalScale(2),
  },
  updateContent: {
    fontSize: moderateScale(14),
    color: '#374151',
    marginBottom: verticalScale(12),
  },
  updateMediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  updateMediaItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  updateMediaImage: {
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: verticalScale(20),
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
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: scale(4),
  },
  modalScrollView: {
    maxHeight: verticalScale(400),
    padding: scale(20),
  },
  modalLabel: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: verticalScale(12),
  },
  modalLabelMargin: {
    marginTop: verticalScale(20),
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: verticalScale(8),
  },
  reasonOptionActive: {
    borderColor: '#F97E2C',
    backgroundColor: '#FFF7ED',
  },
  reasonOptionText: {
    fontSize: moderateScale(14),
    color: '#374151',
  },
  reasonOptionTextActive: {
    color: '#F97E2C',
    fontWeight: '600',
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: scale(12),
    fontSize: moderateScale(14),
    color: '#1F2937',
    textAlignVertical: 'top',
    minHeight: verticalScale(100),
  },
  modalActions: {
    flexDirection: 'row',
    padding: scale(20),
    gap: scale(12),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalButton: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalButtonCancelText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#374151',
  },
  modalButtonSubmit: {
    backgroundColor: '#F97E2C',
  },
  modalButtonSubmitText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

