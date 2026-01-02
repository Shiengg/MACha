'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import { eventService, Event, EventRSVP, EventUpdate } from '@/services/event.service';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, MapPin, Users, Clock, User, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import Image from 'next/image';
import Swal from 'sweetalert2';

function EventDetails() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [rsvp, setRSVP] = useState<EventRSVP | null>(null);
  const [updates, setUpdates] = useState<EventUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [updatesLoading, setUpdatesLoading] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
      if (user) {
        fetchRSVP();
      }
      fetchUpdates();
    }
  }, [eventId, user]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const data = await eventService.getEventById(eventId);
      setEvent(data);
    } catch (err: any) {
      console.error('Error loading event:', err);
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Không thể tải thông tin sự kiện',
      }).then(() => router.push('/events'));
    } finally {
      setLoading(false);
    }
  };

  const fetchRSVP = async () => {
    try {
      setRsvpLoading(true);
      const data = await eventService.getRSVP(eventId);
      setRSVP(data);
    } catch (err) {
      setRSVP(null);
    } finally {
      setRsvpLoading(false);
    }
  };

  const fetchUpdates = async () => {
    try {
      setUpdatesLoading(true);
      const data = await eventService.getEventUpdates(eventId);
      setUpdates(data);
    } catch (err) {
      console.error('Error loading updates:', err);
      setUpdates([]);
    } finally {
      setUpdatesLoading(false);
    }
  };

  const handleRSVP = async (status: 'going' | 'interested' | 'maybe' | 'not_going') => {
    if (!user) {
      Swal.fire({
        icon: 'warning',
        title: 'Cần đăng nhập',
        text: 'Vui lòng đăng nhập để tham gia sự kiện',
      });
      return;
    }

    try {
      await eventService.createRSVP(eventId, {
        status,
        guests_count: 0,
      });
      await fetchRSVP();
      await fetchEvent();
      Swal.fire({
        icon: 'success',
        title: 'Thành công',
        text: `Bạn đã ${status === 'going' ? 'tham gia' : status === 'interested' ? 'quan tâm' : status === 'maybe' ? 'có thể tham gia' : 'không tham gia'} sự kiện`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: err.response?.data?.message || 'Không thể cập nhật RSVP',
      });
    }
  };

  const handleCancelRSVP = async () => {
    try {
      await eventService.deleteRSVP(eventId);
      setRSVP(null);
      await fetchEvent();
      Swal.fire({
        icon: 'success',
        title: 'Đã hủy',
        text: 'Bạn đã hủy tham gia sự kiện',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Không thể hủy RSVP',
      });
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
      'community_meetup': 'Gặp gỡ cộng đồng',
      'workshop': 'Workshop',
      'seminar': 'Hội thảo',
      'charity_event': 'Sự kiện từ thiện',
      'awareness': 'Nâng cao nhận thức',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Đang tải sự kiện...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const isPast = new Date(event.start_date) < new Date();
  const totalAttendees = (event.rsvpStats?.going.count || 0) + (event.rsvpStats?.going.guests || 0);
  const isCreator = user && (user._id === event.creator._id || user.id === event.creator._id);
  const isHost = event.isHost || false;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push('/events')}
          className="mb-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          ← Quay lại
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="relative h-64 md:h-96 w-full">
            {event.banner_image ? (
              <Image
                src={event.banner_image}
                alt={event.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-teal-400 flex items-center justify-center">
                <Calendar className="w-24 h-24 text-white opacity-50" />
              </div>
            )}
            {event.status === 'cancelled' && (
              <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full font-medium">
                Đã hủy
              </div>
            )}
            {event.status === 'completed' && (
              <div className="absolute top-4 right-4 bg-gray-500 text-white px-4 py-2 rounded-full font-medium">
                Đã kết thúc
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {event.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{event.creator.fullname || event.creator.username}</span>
                  </div>
                  <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium">
                    {getCategoryLabel(event.category)}
                  </span>
                </div>
              </div>
            </div>

            {event.description && (
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-orange-500 mt-1" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Ngày bắt đầu</div>
                  <div className="text-gray-600 dark:text-gray-400">{formatDate(event.start_date)}</div>
                  {event.end_date && (
                    <>
                      <div className="font-medium text-gray-900 dark:text-white mt-2">Ngày kết thúc</div>
                      <div className="text-gray-600 dark:text-gray-400">{formatDate(event.end_date)}</div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-orange-500 mt-1" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Địa điểm</div>
                  {event.location.type === 'online' ? (
                    <div className="text-gray-600 dark:text-gray-400">
                      Trực tuyến
                      {event.location.online_link && (
                        <a href={event.location.online_link} target="_blank" rel="noopener noreferrer" className="ml-2 text-orange-500 hover:underline">
                          Tham gia
                        </a>
                      )}
                    </div>
                  ) : event.location.type === 'hybrid' ? (
                    <div className="text-gray-600 dark:text-gray-400">
                      Kết hợp
                      <div className="mt-1">{event.location.venue_name || event.location.address}</div>
                      {event.location.online_link && (
                        <a href={event.location.online_link} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">
                          Link trực tuyến
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-600 dark:text-gray-400">
                      {event.location.venue_name && <div>{event.location.venue_name}</div>}
                      {event.location.address && <div>{event.location.address}</div>}
                      {event.location.district && event.location.city && (
                        <div>{event.location.district}, {event.location.city}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-orange-500 mt-1" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Người tham gia</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {totalAttendees} {event.capacity ? `/ ${event.capacity}` : ''} người
                  </div>
                  {event.rsvpStats && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {event.rsvpStats.going.count} tham gia, {event.rsvpStats.interested.count} quan tâm
                    </div>
                  )}
                </div>
              </div>
            </div>

            {user && !isPast && event.status === 'published' && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="font-medium text-gray-900 dark:text-white mb-3">Bạn có tham gia không?</div>
                {rsvp ? (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-700 dark:text-gray-300">
                      Bạn đã chọn: <strong>
                        {rsvp.status === 'going' ? 'Tham gia' : 
                         rsvp.status === 'interested' ? 'Quan tâm' : 
                         rsvp.status === 'maybe' ? 'Có thể' : 'Không tham gia'}
                      </strong>
                    </span>
                    <button
                      onClick={handleCancelRSVP}
                      className="text-sm text-red-500 hover:text-red-600"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleRSVP('going')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Tham gia
                    </button>
                    <button
                      onClick={() => handleRSVP('interested')}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                      <Users className="w-4 h-4" />
                      Quan tâm
                    </button>
                    <button
                      onClick={() => handleRSVP('maybe')}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Có thể
                    </button>
                    <button
                      onClick={() => handleRSVP('not_going')}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Không tham gia
                    </button>
                  </div>
                )}
              </div>
            )}

            {event.gallery_images && event.gallery_images.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Hình ảnh</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {event.gallery_images.map((img, index) => (
                    <div key={index} className="relative aspect-square">
                      <Image
                        src={img}
                        alt={`Gallery ${index + 1}`}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {updates.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Cập nhật</h3>
                <div className="space-y-4">
                  {updates.map((update) => (
                    <div key={update._id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                          {update.author.avatar ? (
                            <Image
                              src={update.author.avatar}
                              alt={update.author.username}
                              width={32}
                              height={32}
                              className="rounded-full object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs font-semibold">
                              {update.author.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white text-sm">
                            {update.author.fullname || update.author.username}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(update.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                      </div>
                      {update.content && (
                        <p className="text-gray-700 dark:text-gray-300 mb-2">{update.content}</p>
                      )}
                      {update.media_urls && update.media_urls.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {update.media_urls.map((url, index) => (
                            <div key={index} className="relative aspect-square">
                              <Image
                                src={url}
                                alt={`Update ${index + 1}`}
                                fill
                                className="object-cover rounded-lg"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  return (
    <ProtectedRoute>
      <EventDetails />
    </ProtectedRoute>
  );
}

