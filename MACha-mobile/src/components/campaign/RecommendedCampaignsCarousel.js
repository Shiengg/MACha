import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { recommendationService } from '../../services/recommendation.service';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function RecommendedCampaignsCarousel({ navigation, limit = 7 }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);
  const limitRef = useRef(limit);
  const hasFetchedRef = useRef(false);

  const fetchRecommendations = React.useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      const response = await recommendationService.getRecommendedCampaigns(limitRef.current);
      setCampaigns(response.campaigns || []);
      hasFetchedRef.current = true;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Only fetch if limit changed or first mount
    if (limitRef.current !== limit) {
      limitRef.current = limit;
      hasFetchedRef.current = false;
    }
    
    if (!hasFetchedRef.current) {
      fetchRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const formatCurrency = (amount) => {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toString();
  };

  const calculateProgress = (current, goal) => {
    return Math.min(Math.round((current / goal) * 100), 100);
  };

  const handleCampaignPress = (campaignId) => {
    if (navigation) {
      navigation.navigate('CampaignDetail', { campaignId });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Dành cho bạn</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#F97E2C" />
        </View>
      </View>
    );
  }

  if (campaigns.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="heart" size={20} color="#EF4444" />
        <Text style={styles.title}>Dành cho bạn</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
      >
        {campaigns.map((campaign) => (
          <TouchableOpacity
            key={campaign._id}
            style={styles.card}
            onPress={() => handleCampaignPress(campaign._id)}
          >
            {/* Campaign Image */}
            <View style={styles.imageContainer}>
              {campaign.banner_image ? (
                <Image
                  source={{ uri: campaign.banner_image }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialCommunityIcons name="image-off" size={32} color="#9CA3AF" />
                </View>
              )}
            </View>

            {/* Campaign Info */}
            <View style={styles.infoContainer}>
              <Text style={styles.campaignTitle} numberOfLines={2}>
                {campaign.title}
              </Text>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${calculateProgress(campaign.current_amount, campaign.goal_amount)}%` },
                  ]}
                />
              </View>

              {/* Stats */}
              <View style={styles.stats}>
                <Text style={styles.currentAmount}>
                  {formatCurrency(campaign.current_amount)} VNĐ
                </Text>
                <Text style={styles.percentage}>
                  {calculateProgress(campaign.current_amount, campaign.goal_amount)}%
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* View All Button */}
      <TouchableOpacity
        style={styles.viewAllButton}
        onPress={() => {
          if (navigation) {
            navigation.navigate('Discover');
          }
        }}
      >
        <Text style={styles.viewAllText}>Xem tất cả chiến dịch</Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#2563EB" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: scale(16),
    marginBottom: scale(12),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginBottom: scale(12),
  },
  title: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: scale(8),
  },
  loadingContainer: {
    paddingVertical: scale(20),
    alignItems: 'center',
  },
  carouselContent: {
    paddingHorizontal: scale(16),
    gap: scale(12),
  },
  card: {
    width: scale(200),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: verticalScale(120),
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  infoContainer: {
    padding: scale(12),
  },
  campaignTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#111827',
    marginBottom: scale(8),
    minHeight: moderateScale(40),
  },
  progressBarContainer: {
    width: '100%',
    height: scale(4),
    backgroundColor: '#E5E7EB',
    borderRadius: scale(2),
    overflow: 'hidden',
    marginBottom: scale(8),
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: scale(2),
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentAmount: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#374151',
  },
  percentage: {
    fontSize: moderateScale(12),
    color: '#6B7280',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    marginTop: scale(8),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  viewAllText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#2563EB',
    marginRight: scale(4),
  },
});

