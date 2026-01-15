/**
 * Campaign Status Constants
 * 
 * These constants match the enum values defined in the Campaign model:
 * - pending: Campaign created, waiting for admin approval
 * - active: Campaign approved and currently accepting donations
 * - voting: Campaign in voting period (if applicable)
 * - approved: Campaign approved (usually transitions to active)
 * - completed: Campaign successfully completed
 * - rejected: Campaign rejected by admin
 * - cancelled: Campaign cancelled by creator
 */

export const CAMPAIGN_STATUS = {
    PENDING: 'pending',
    ACTIVE: 'active',
    VOTING: 'voting',
    APPROVED: 'approved',
    COMPLETED: 'completed',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled'
};

export const CAMPAIGN_STATUS_VALUES = Object.values(CAMPAIGN_STATUS);

export const CAMPAIGN_STATUS_LABELS = {
    [CAMPAIGN_STATUS.PENDING]: 'Đang chờ duyệt',
    [CAMPAIGN_STATUS.ACTIVE]: 'Đang kêu gọi',
    [CAMPAIGN_STATUS.VOTING]: 'Đang bình chọn',
    [CAMPAIGN_STATUS.APPROVED]: 'Đã phê duyệt',
    [CAMPAIGN_STATUS.COMPLETED]: 'Đã hoàn tất',
    [CAMPAIGN_STATUS.REJECTED]: 'Từ chối',
    [CAMPAIGN_STATUS.CANCELLED]: 'Đã hủy'
};

// Statuses that should be visible in public Discover page
export const PUBLIC_VISIBLE_STATUSES = [
    CAMPAIGN_STATUS.ACTIVE,
    CAMPAIGN_STATUS.COMPLETED,
    CAMPAIGN_STATUS.APPROVED,
    CAMPAIGN_STATUS.VOTING
];

// Special filter value to show all statuses
export const FILTER_STATUS_ALL = 'ALL';

// Default status for Discover page when no filter is selected
export const DEFAULT_DISCOVER_STATUS = CAMPAIGN_STATUS.ACTIVE;

