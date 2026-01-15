import { WithdrawalRequestStatus } from '@/services/escrow.service';

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

/**
 * Format withdrawal status sang tiếng Việt
 */
export const formatWithdrawalStatus = (status: WithdrawalRequestStatus): string => {
  const statusMap: Record<WithdrawalRequestStatus, string> = {
    pending_voting: 'Chờ vote',
    voting_in_progress: 'Đang vote',
    voting_extended: 'Đã gia hạn vote',
    voting_completed: 'Đã hoàn thành vote',
    rejected_by_community: 'Cộng đồng từ chối',
    admin_approved: 'Admin đã duyệt',
    admin_rejected: 'Admin từ chối',
    released: 'Đã giải ngân',
    cancelled: 'Đã hủy',
  };

  return statusMap[status] || status;
};

/**
 * Trả về màu cho status badge (Tailwind classes)
 */
export const getStatusColor = (status: WithdrawalRequestStatus): {
  text: string;
  bg: string;
  border?: string;
} => {
  const colorMap: Record<WithdrawalRequestStatus, { text: string; bg: string; border?: string }> = {
    pending_voting: {
      text: 'text-yellow-700 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      border: 'border-yellow-200 dark:border-yellow-800',
    },
    voting_in_progress: {
      text: 'text-blue-700 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      border: 'border-blue-200 dark:border-blue-800',
    },
    voting_completed: {
      text: 'text-purple-700 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      border: 'border-purple-200 dark:border-purple-800',
    },
    voting_extended: {
      text: 'text-yellow-700 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      border: 'border-yellow-200 dark:border-yellow-800',
    },
    rejected_by_community: {
      text: 'text-red-700 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
      border: 'border-red-200 dark:border-red-800',
    },
    admin_approved: {
      text: 'text-green-700 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30',
      border: 'border-green-200 dark:border-green-800',
    },
    admin_rejected: {
      text: 'text-red-700 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
      border: 'border-red-200 dark:border-red-800',
    },
    released: {
      text: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    cancelled: {
      text: 'text-gray-700 dark:text-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-900/30',
      border: 'border-gray-200 dark:border-gray-800',
    },
  };

  return colorMap[status] || colorMap.cancelled;
};

/**
 * Tính thời gian còn lại cho voting period
 */
export const calculateTimeRemaining = (endDate: string | null): TimeRemaining | null => {
  if (!endDate) return null;

  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const difference = end - now;

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
    };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
  };
};

/**
 * Format time remaining thành string dễ đọc
 */
export const formatTimeRemaining = (timeRemaining: TimeRemaining | null): string => {
  if (!timeRemaining) return 'N/A';

  if (timeRemaining.isExpired) {
    return 'Đã kết thúc';
  }

  const parts: string[] = [];
  if (timeRemaining.days > 0) {
    parts.push(`${timeRemaining.days} ngày`);
  }
  if (timeRemaining.hours > 0) {
    parts.push(`${timeRemaining.hours} giờ`);
  }
  if (timeRemaining.minutes > 0 || timeRemaining.days === 0) {
    parts.push(`${timeRemaining.minutes} phút`);
  }
  if (timeRemaining.days === 0 && timeRemaining.hours === 0) {
    parts.push(`${timeRemaining.seconds} giây`);
  }

  return `Còn ${parts.join(' ')}`;
};

/**
 * Format voting percentage với %
 */
export const formatVotingPercentage = (percentage: number | string): string => {
  const numPercentage = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
  
  if (isNaN(numPercentage)) {
    return '0%';
  }

  return `${numPercentage.toFixed(2)}%`;
};

/**
 * Check user có đủ điều kiện vote không
 * @param donations - Array của donations từ user
 * @returns true nếu user đã donate (bất kỳ số tiền nào), false nếu không
 */
export const checkEligibilityToVote = (
  donations: Array<{ amount: number; payment_status?: string }>
): boolean => {
  if (!donations || donations.length === 0) {
    return false;
  }

  // Chỉ cần có ít nhất 1 donation đã completed là được vote
  return donations.some((donation) => donation.payment_status === 'completed');
};

/**
 * Format error message từ API error
 */
export const formatEscrowError = (error: any): string => {
  if (!error) {
    return 'Đã xảy ra lỗi không xác định';
  }

  // Nếu có message từ response
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // Nếu có message trực tiếp
  if (error?.message) {
    return error.message;
  }

  // Map error codes sang messages
  const errorCode = error?.response?.data?.error;
  if (errorCode) {
    const errorMessages: Record<string, string> = {
      INVALID_AMOUNT: 'Số tiền không hợp lệ',
      MISSING_REASON: 'Vui lòng nhập lý do yêu cầu rút tiền',
      CAMPAIGN_NOT_FOUND: 'Không tìm thấy campaign',
      UNAUTHORIZED: 'Bạn không có quyền thực hiện hành động này',
      CAMPAIGN_NOT_ACTIVE: 'Campaign không đang hoạt động',
      INSUFFICIENT_FUNDS: 'Số tiền không đủ để rút',
      PENDING_REQUEST_EXISTS: 'Đã có yêu cầu rút tiền đang chờ xử lý',
      INVALID_VOTE_VALUE: 'Giá trị vote không hợp lệ',
      ESCROW_NOT_FOUND: 'Không tìm thấy yêu cầu rút tiền',
      VOTING_NOT_IN_PROGRESS: 'Yêu cầu rút tiền không đang trong thời gian vote',
      VOTING_PERIOD_EXPIRED: 'Thời gian vote đã kết thúc',
      NOT_ELIGIBLE_TO_VOTE: 'Bạn cần đã donate cho campaign này để có quyền vote',
    };

    return errorMessages[errorCode] || 'Đã xảy ra lỗi';
  }

  // Network error
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
    return 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet của bạn.';
  }

  // Timeout error
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return 'Yêu cầu hết thời gian chờ. Vui lòng thử lại.';
  }

  return 'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.';
};

/**
 * Format currency VND
 */
export const formatCurrencyVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

/**
 * Format date time
 */
export const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format date only
 */
export const formatDateOnly = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

