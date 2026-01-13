import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { donationService } from '../../services/donation.service';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

function CampaignCard({ campaign, onPress, showCreator = false, skipDonations = false }) {
  const [donations, setDonations] = useState([]);

  useEffect(() => {
    if (skipDonations) {
      setDonations([]);
      return;
    }

    if (!campaign?._id) {
      setDonations([]);
      return;
    }

    // Cache service now handles duplicate request prevention
    // So we can safely call the service without checking isFetchingRef
    const fetchDonations = async () => {
      try {
        const data = await donationService.getDonationsByCampaign(campaign._id);
        const completedDonations = data.filter(
          (donation) =>
            donation.payment_status === 'completed' && !donation.is_anonymous
        );
        setDonations(completedDonations);
      } catch (err) {
        console.error('Failed to fetch donations:', err);
        setDonations([]);
      }
    };

    fetchDonations();
  }, [campaign?._id, skipDonations]);

  const getCategoryIcon = (category) => {
    const icons = {
      'children': '👶',
      'elderly': '👴',
      'poverty': '🏚️',
      'disaster': '🆘',
      'medical': '🏥',
      'education': '📚',
      'disability': '♿',
      'animal': '🐾',
      'environment': '🌱',
      'community': '🤝',
      'other': '❤️',
    };
    return icons[category] || '❤️';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'children': 'Trẻ em',
      'elderly': 'Người già',
      'poverty': 'Người nghèo',
      'disaster': 'Thiên tai',
      'medical': 'Y tế',
      'hardship': 'Hoàn cảnh khó khăn',
      'education': 'Giáo dục',
      'disability': 'Người khuyết tật',
      'animal': 'Động vật',
      'environment': 'Môi trường',
      'community': 'Cộng đồng',
      'other': 'Khác',
    };
    return labels[category] || category;
  };

  const progressPercentage = Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100);
  const daysLeft = campaign.end_date
    ? Math.ceil((new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const formatAmount = (amount) => {
    if (amount >= 1000000 && amount < 1000000000) {
      if (amount % 1000000 === 0) {
        return `${(amount / 1000000).toFixed(0)} triệu`;
      } else {
        return `${(amount / 1000000).toFixed(2)} triệu`;
      }
    }
    if (amount >= 1000000000 && amount < 1000000000000) {
      if (amount % 1000000000 === 0) {
        return `${(amount / 1000000000).toFixed(0)} tỷ`;
      } else {
        return `${(amount / 1000000000).toFixed(2)} tỷ`;
      }
    }
    if (amount >= 1000000000000) {
      if (amount % 1000000000000 === 0) {
        return `${(amount / 1000000000000).toFixed(0)} nghìn tỷ`;
      } else {
        return `${(amount / 1000000000000).toFixed(2)} nghìn tỷ`;
      }
    }
    return `${amount.toLocaleString('vi-VN')}`;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(campaign)}
      activeOpacity={0.7}
    >
      {/* Campaign Banner Image */}
      <View style={styles.bannerContainer}>
        {campaign.banner_image ? (
          <Image
            source={{ uri: campaign.banner_image }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.bannerPlaceholder}>
            <MaterialCommunityIcons name="heart" size={scale(60)} color="#F97E2C" />
          </View>
        )}

        {/* Category Badge */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeIcon}>{getCategoryIcon(campaign.category)}</Text>
          <Text style={styles.categoryBadgeText}>{getCategoryLabel(campaign.category)}</Text>
        </View>

        {/* Days Left Badge */}
        <View style={styles.daysBadge}>
          <MaterialCommunityIcons name="heart" size={moderateScale(14)} color="#FFFFFF" />
          <Text style={styles.daysBadgeText}>Còn {daysLeft > 0 ? daysLeft : 0} ngày</Text>
        </View>
      </View>

      {/* Campaign Info */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {campaign.title}
        </Text>
        {campaign.description && (
          <Text style={styles.description} numberOfLines={2}>
            {campaign.description}
          </Text>
        )}

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatAmount(campaign.current_amount)}</Text>
            <Text style={styles.statLabel}>Đạt được</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatAmount(campaign.goal_amount)}</Text>
            <Text style={styles.statLabel}>Mục tiêu</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{donations.length}</Text>
            <Text style={styles.statLabel}>Lượt ủng hộ</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.donateButton}
          onPress={() => onPress && onPress(campaign)}
        >
          <Text style={styles.donateButtonText}>Ủng hộ ngay</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
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
    backgroundColor: '#FEF3E2',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(16),
  },
  categoryBadgeIcon: {
    fontSize: moderateScale(14),
    marginRight: scale(4),
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  daysBadge: {
    position: 'absolute',
    top: scale(12),
    right: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(16),
  },
  daysBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(11),
    fontWeight: '600',
    marginLeft: scale(4),
  },
  content: {
    padding: scale(16),
  },
  title: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: scale(8),
    minHeight: verticalScale(44),
  },
  description: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginBottom: scale(12),
    lineHeight: moderateScale(20),
  },
  progressContainer: {
    marginBottom: scale(12),
  },
  progressBar: {
    height: scale(6),
    backgroundColor: '#E5E7EB',
    borderRadius: scale(3),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F97E2C',
    borderRadius: scale(3),
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scale(12),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#F97E2C',
    marginBottom: scale(4),
  },
  statLabel: {
    fontSize: moderateScale(11),
    color: '#6B7280',
  },
  donateButton: {
    backgroundColor: '#F97E2C',
    paddingVertical: scale(12),
    borderRadius: scale(8),
    alignItems: 'center',
  },
  donateButtonText: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

// Memoize component to prevent unnecessary re-renders
export default React.memo(CampaignCard, (prevProps, nextProps) => {
  // Only re-render if campaign ID or skipDonations changes
  return (
    prevProps.campaign?._id === nextProps.campaign?._id &&
    prevProps.skipDonations === nextProps.skipDonations &&
    prevProps.showCreator === nextProps.showCreator
  );
});

