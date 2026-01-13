import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function UserSearchResult({ user, onPress, query }) {
  const displayName = user.fullname || user.username;
  const username = user.username;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            {user.is_verified && (
              <MaterialCommunityIcons
                name="check-circle"
                size={16}
                color="#2563EB"
                style={styles.verifiedIcon}
              />
            )}
          </View>
          <Text style={styles.username} numberOfLines={1}>
            @{username}
          </Text>
          {user.bio && (
            <Text style={styles.bio} numberOfLines={1}>
              {user.bio}
            </Text>
          )}
        </View>

        {/* Role Badge */}
        {user.role && user.role !== 'user' && (
          <View style={styles.badgeContainer}>
            <Text
              style={[
                styles.badge,
                user.role === 'admin'
                  ? styles.badgeAdmin
                  : user.role === 'organization'
                  ? styles.badgeOrg
                  : styles.badgeDefault,
              ]}
            >
              {user.role === 'organization' ? 'Tổ chức' : user.role}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: scale(12),
    padding: scale(16),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: scale(12),
  },
  avatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
  },
  avatarPlaceholder: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#6B7280',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  name: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#111827',
  },
  verifiedIcon: {
    marginLeft: scale(4),
  },
  username: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginBottom: scale(2),
  },
  bio: {
    fontSize: moderateScale(12),
    color: '#9CA3AF',
    marginTop: scale(4),
  },
  badgeContainer: {
    marginLeft: scale(8),
  },
  badge: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    overflow: 'hidden',
  },
  badgeAdmin: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
  },
  badgeOrg: {
    backgroundColor: '#F3E8FF',
    color: '#6B21A8',
  },
  badgeDefault: {
    backgroundColor: '#F3F4F6',
    color: '#374151',
  },
});

