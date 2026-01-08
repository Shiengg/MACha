'use client';

import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Event } from '@/services/event.service';
import Image from 'next/image';

interface EventCardProps {
  event: Event;
  onClick?: (event: Event) => void;
  disableNavigation?: boolean;
}

export default function EventCard({ event, onClick, disableNavigation = false }: EventCardProps) {
  const router = useRouter();

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      'volunteering': 'Tình nguyện',
      'fundraising': 'Gây quỹ',
      'charity_event': 'Sự kiện từ thiện',
      'donation_drive': 'Tập hợp đóng góp',
    };
    return labels[category] || category;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(event);
    } else if (!disableNavigation) {
      router.push(`/events/${event._id}`);
    }
  };

  const totalAttendees = (event.rsvpStats?.going.count || 0) + (event.rsvpStats?.going.guests || 0);
  const isPast = new Date(event.start_date) < new Date();

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
      onClick={handleCardClick}
    >
      {/* Event Banner Image */}
      <div className="relative h-48 bg-gradient-to-br from-orange-100 to-orange-50 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
        {event.banner_image ? (
          <Image
            src={event.banner_image}
            alt={event.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="w-16 h-16 text-orange-300 dark:text-gray-600" />
          </div>
        )}
        
        {/* Status Badge */}
        {event.status === 'cancelled' && (
          <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium">
            Đã hủy
          </div>
        )}
        {event.status === 'completed' && (
          <div className="absolute top-3 right-3 bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-medium">
            Đã kết thúc
          </div>
        )}
        {event.status === 'published' && !isPast && (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
            Sắp diễn ra
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute top-3 left-3 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium">
          {getCategoryLabel(event.category)}
        </div>
      </div>

      {/* Event Info */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 line-clamp-2 min-h-[3rem]">
          {event.title}
        </h3>
        
        {event.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Event Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span>{formatDate(event.start_date)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4 text-orange-500" />
            <span className="line-clamp-1">
              {event.location.location_name}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Users className="w-4 h-4 text-orange-500" />
            <span>
              {totalAttendees} {event.capacity ? `/ ${event.capacity}` : ''} người tham gia
            </span>
          </div>
        </div>

        {/* Creator Info */}
        {event.creator && (
          <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
              {event.creator.avatar ? (
                <Image
                  src={event.creator.avatar}
                  alt={event.creator.username}
                  width={32}
                  height={32}
                  className="rounded-full object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs font-semibold">
                  {event.creator.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {event.creator.fullname || event.creator.username}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

