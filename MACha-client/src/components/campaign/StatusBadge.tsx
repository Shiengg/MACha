'use client';

import React from 'react';

interface StatusBadgeProps {
  status: 'pending' | 'active' | 'voting' | 'approved' | 'completed' | 'rejected' | 'cancelled';
  className?: string;
}

/**
 * Status Badge Component
 * Maps campaign status to Vietnamese text and color
 * 
 * Status mapping:
 * - pending: "Đang chờ duyệt" (yellow/gray)
 * - active: "Đang kêu gọi" (green)
 * - voting: "Đang bình chọn" (blue)
 * - approved: "Đã phê duyệt" (green)
 * - completed: "Đã kết thúc" (gray)
 * - rejected: "Bị từ chối" (red)
 * - cancelled: "Đã hủy" (gray)
 */
export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const statusConfig: Record<
    typeof status,
    { text: string; bgColor: string; textColor: string }
  > = {
    pending: {
      text: 'Chờ duyệt',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
    },
    active: {
      text: 'Đang kêu gọi',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
    },
    voting: {
      text: 'Đang bình chọn',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
    },
    approved: {
      text: 'Đã phê duyệt',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
    },
    completed: {
      text: 'Hoàn tất',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
    },
    rejected: {
      text: 'Không được duyệt',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
    },
    cancelled: {
      text: 'Đã hủy',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      {config.text}
    </span>
  );
}

