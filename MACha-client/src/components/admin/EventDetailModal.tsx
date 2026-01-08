'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Calendar, MapPin, Users, X, User, CheckCircle, XCircle } from 'lucide-react';
import { getEventById, AdminEvent } from '@/services/admin/event.service';
import Swal from 'sweetalert2';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onEventUpdated?: () => void;
}

export default function EventDetailModal({
  isOpen,
  onClose,
  eventId,
  onEventUpdated,
}: EventDetailModalProps) {
  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchEvent();
    }
  }, [isOpen, eventId]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const data = await getEventById(eventId);
      setEvent(data);
    } catch (error: any) {
      console.error('Error loading event:', error);
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Không thể tải thông tin sự kiện',
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
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

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      'volunteering': 'Tình nguyện',
      'fundraising': 'Gây quỹ',
      'charity_event': 'Sự kiện từ thiện',
      'donation_drive': 'Tập hợp đóng góp',
    };
    return labels[category] || category;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return { label: 'Đã xuất bản', bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-300' };
      case 'pending':
        return { label: 'Chờ duyệt', bgColor: 'bg-amber-100', textColor: 'text-amber-800', borderColor: 'border-amber-300' };
      case 'rejected':
        return { label: 'Từ chối', bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-300' };
      case 'cancelled':
        return { label: 'Đã hủy', bgColor: 'bg-gray-100', textColor: 'text-gray-800', borderColor: 'border-gray-300' };
      case 'completed':
        return { label: 'Hoàn thành', bgColor: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-blue-300' };
      default:
        return { label: status, bgColor: 'bg-gray-100', textColor: 'text-gray-800', borderColor: 'border-gray-300' };
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
            <p className="mt-4 text-gray-600">Đang tải thông tin sự kiện...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const statusBadge = getStatusBadge(event.status);
  const totalAttendees = (event.rsvpStats?.going.count || 0) + (event.rsvpStats?.going.guests || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">Chi tiết sự kiện</h2>
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full border ${statusBadge.bgColor} ${statusBadge.textColor} ${statusBadge.borderColor}`}
            >
              {statusBadge.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Banner Image */}
          <div className="relative h-64 w-full mb-6 rounded-lg overflow-hidden">
            {event.banner_image ? (
              <Image
                src={event.banner_image}
                alt={event.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                <Calendar className="w-24 h-24 text-orange-300" />
              </div>
            )}
          </div>

          {/* Title and Category */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                {getCategoryLabel(event.category)}
              </span>
              {event.rejected_reason && (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                  Lý do từ chối: {event.rejected_reason}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Mô tả</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Event Details Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Date and Time */}
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-900 mb-1">Ngày bắt đầu</div>
                <div className="text-gray-600">{formatDate(event.start_date)}</div>
                {event.end_date && (
                  <>
                    <div className="font-medium text-gray-900 mt-3 mb-1">Ngày kết thúc</div>
                    <div className="text-gray-600">{formatDate(event.end_date)}</div>
                  </>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-900 mb-1">Địa điểm</div>
                <div className="text-gray-600">
                  {event.location.location_name && (
                    <div>{event.location.location_name}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Attendees */}
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-900 mb-1">Người tham gia</div>
                <div className="text-gray-600">
                  {totalAttendees} {event.capacity ? `/ ${event.capacity}` : ''} người
                </div>
                {event.rsvpStats && (
                  <div className="text-sm text-gray-500 mt-1">
                    {event.rsvpStats.going.count} tham gia, {event.rsvpStats.interested.count} quan tâm
                  </div>
                )}
              </div>
            </div>

            {/* Creator */}
            {event.creator && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900 mb-1">Người tạo</div>
                  <div className="flex items-center gap-2">
                    {event.creator.avatar && (
                      <Image
                        src={event.creator.avatar}
                        alt={event.creator.username}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-gray-600">
                      {event.creator.fullname || event.creator.username}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Approval Info */}
          {(event.approved_by || event.rejected_by) && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Thông tin duyệt</h3>
              {event.approved_at && (
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Đã duyệt vào: {formatDate(event.approved_at)}</span>
                </div>
              )}
              {event.rejected_at && (
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-5 h-5" />
                  <span>Đã từ chối vào: {formatDate(event.rejected_at)}</span>
                </div>
              )}
            </div>
          )}

          {/* Gallery Images */}
          {event.gallery_images && event.gallery_images.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Hình ảnh</h3>
              <div className="grid grid-cols-3 gap-2">
                {event.gallery_images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                    <Image
                      src={img}
                      alt={`Gallery ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
            <div>ID: {event._id}</div>
            <div>Tạo lúc: {formatDate(event.createdAt)}</div>
            {event.updatedAt && <div>Cập nhật lúc: {formatDate(event.updatedAt)}</div>}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

