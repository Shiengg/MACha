import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function EventCard({ event, onPress }) {
  const getCategoryLabel = (category) => {
    const labels = {
      'volunteering': 'Tình nguyện',
      'fundraising': 'Gây quỹ',
      'charity_event': 'Sự kiện từ thiện',
      'donation_drive': 'Tập hợp đóng góp',
    };
    return labels[category] || category;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalAttendees = (event.rsvpStats?.going.count || 0) + (event.rsvpStats?.going.guests || 0);
  const isPast = new Date(event.start_date) < new Date();
  const now = new Date();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(event)}
      activeOpacity={0.7}
    >
      {/* Event Banner Image */}
      <View style={styles.bannerContainer}>
        {event.banner_image ? (
          <Image
            source={{ uri: event.banner_image }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.bannerPlaceholder}>
            <MaterialCommunityIcons name="calendar" size={40} color="#F97E2C" />
          </View>
        )}

        {/* Category Badge */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>
            {getCategoryLabel(event.category)}
          </Text>
        </View>

        {/* Status Badge */}
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
        {event.status === 'published' && !isPast && new Date(event.start_date) > now && (
          <View style={[styles.statusBadge, styles.upcomingBadge]}>
            <Text style={styles.statusBadgeText}>Sắp diễn ra</Text>
          </View>
        )}
      </View>

      {/* Event Info */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        {event.description && (
          <Text style={styles.description} numberOfLines={2}>
            {event.description}
          </Text>
        )}

        {/* Event Details */}
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar" size={16} color="#F97E2C" />
            <Text style={styles.detailText} numberOfLines={1}>
              {formatDate(event.start_date)}
            </Text>
          </View>

          {event.location?.location_name && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#F97E2C" />
              <Text style={styles.detailText} numberOfLines={1}>
                {event.location.location_name}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="account-group" size={16} color="#F97E2C" />
            <Text style={styles.detailText}>
              {totalAttendees} {event.capacity ? `/ ${event.capacity}` : ''} người tham gia
            </Text>
          </View>
        </View>

        {/* Creator Info */}
        {event.creator && (
          <View style={styles.creatorContainer}>
            <View style={styles.creatorAvatar}>
              {event.creator.avatar ? (
                <Image
                  source={{ uri: event.creator.avatar }}
                  style={styles.creatorAvatarImage}
                />
              ) : (
                <View style={styles.creatorAvatarPlaceholder}>
                  <Text style={styles.creatorAvatarText}>
                    {(event.creator.username || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.creatorName} numberOfLines={1}>
              {event.creator.fullname || event.creator.username}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: verticalScale(16),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  bannerContainer: {
    width: '100%',
    height: verticalScale(180),
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
  categoryBadge: {
    position: 'absolute',
    top: scale(12),
    left: scale(12),
    backgroundColor: '#F97E2C',
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: 16,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  statusBadge: {
    position: 'absolute',
    top: scale(12),
    right: scale(12),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: 16,
  },
  cancelledBadge: {
    backgroundColor: '#EF4444',
  },
  completedBadge: {
    backgroundColor: '#6B7280',
  },
  upcomingBadge: {
    backgroundColor: '#10B981',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  content: {
    padding: scale(16),
  },
  title: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: verticalScale(8),
    minHeight: verticalScale(50),
  },
  description: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginBottom: verticalScale(12),
    lineHeight: moderateScale(20),
  },
  details: {
    marginBottom: verticalScale(12),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  detailText: {
    fontSize: moderateScale(13),
    color: '#6B7280',
    marginLeft: scale(8),
    flex: 1,
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  creatorAvatar: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    overflow: 'hidden',
    marginRight: scale(8),
  },
  creatorAvatarImage: {
    width: '100%',
    height: '100%',
  },
  creatorAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorAvatarText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#6B7280',
  },
  creatorName: {
    fontSize: moderateScale(13),
    color: '#6B7280',
    flex: 1,
  },
});

