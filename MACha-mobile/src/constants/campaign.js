/**
 * Campaign Status Constants
 * 
 * These constants match the backend Campaign model enum values.
 * Used to avoid hardcoding status strings throughout the mobile app.
 */

export const CAMPAIGN_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  VOTING: 'voting',
  APPROVED: 'approved',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

export const CAMPAIGN_STATUS_VALUES = Object.values(CAMPAIGN_STATUS);

export const CAMPAIGN_STATUS_LABELS = {
  [CAMPAIGN_STATUS.PENDING]: 'Chờ duyệt',
  [CAMPAIGN_STATUS.ACTIVE]: 'Đang kêu gọi',
  [CAMPAIGN_STATUS.VOTING]: 'Đang bình chọn',
  [CAMPAIGN_STATUS.APPROVED]: 'Đã phê duyệt',
  [CAMPAIGN_STATUS.COMPLETED]: 'Hoàn tất',
  [CAMPAIGN_STATUS.REJECTED]: 'Từ chối',
  [CAMPAIGN_STATUS.CANCELLED]: 'Đã hủy',
};

// Special filter value to show all statuses
export const FILTER_STATUS_ALL = 'ALL';

// Default status for Discover page when no filter is selected
export const DEFAULT_DISCOVER_STATUS = CAMPAIGN_STATUS.ACTIVE;

