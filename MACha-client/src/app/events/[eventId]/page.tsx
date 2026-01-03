'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import { eventService, Event, EventRSVP, EventUpdate } from '@/services/event.service';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { Calendar, MapPin, Users, Clock, User, CheckCircle, XCircle, MoreHorizontal } from 'lucide-react';
import { FaFlag } from 'react-icons/fa';
import Image from 'next/image';
import Swal from 'sweetalert2';
import ReportModal from '@/components/shared/ReportModal';
import { getReportsByItem } from '@/services/report.service';

function EventDetails() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [event, setEvent] = useState<Event | null>(null);
  const [rsvp, setRSVP] = useState<EventRSVP | null>(null);
  const [updates, setUpdates] = useState<EventUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [isCheckingReport, setIsCheckingReport] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
      if (user) {
        fetchRSVP();
      }
      fetchUpdates();
    }
  }, [eventId, user]);

  // Join event room and listen for realtime RSVP updates
  useEffect(() => {
    if (!socket || !isConnected || !eventId) return;

    // Join event room
    const eventRoom = `event:${eventId}`;
    socket.emit('join-room', eventRoom);
    console.log(`🏠 Joined event room: ${eventRoom}`);

    // Listen for RSVP updates
    const handleRSVPUpdated = (eventData: any) => {
      const receivedEventId = String(eventData.eventId || '');
      const currentEventId = String(eventId || '');
      
      if (receivedEventId !== currentEventId) {
        console.log('⚠️ Event ID mismatch:', receivedEventId, 'vs', currentEventId);
        return;
      }
      
      console.log('🔄 Real-time RSVP update received:', eventData);
      
      // Update event RSVP stats - always update
      if (eventData.rsvpStats) {
        setEvent(prev => {
          if (!prev) {
            // If event not loaded yet, fetch it in background but don't block
            fetchEvent(true).catch(err => console.error('Error fetching event:', err));
            return null;
          }
          console.log('✅ Updating RSVP stats:', eventData.rsvpStats);
          return {
            ...prev,
            rsvpStats: eventData.rsvpStats
          };
        });
      }
      
      // If current user updated their RSVP, update local state
      if (eventData.rsvp && user) {
        const currentUserId = String(user._id || user.id || '');
        const rsvpUserId = String(eventData.rsvp.user?._id || eventData.rsvp.user?.id || '');
        if (rsvpUserId === currentUserId) {
          setRSVP(eventData.rsvp);
        }
      }
    };

    const handleRSVPDeleted = (eventData: any) => {
      const receivedEventId = String(eventData.eventId || '');
      const currentEventId = String(eventId || '');
      
      if (receivedEventId !== currentEventId) {
        console.log('⚠️ Event ID mismatch:', receivedEventId, 'vs', currentEventId);
        return;
      }
      
      console.log('🗑️ Real-time RSVP deleted:', eventData);
      
      // Update event RSVP stats
      if (eventData.rsvpStats) {
        setEvent(prev => {
          if (!prev) return null;
          return {
            ...prev,
            rsvpStats: eventData.rsvpStats
          };
        });
      }
      
      // If current user deleted their RSVP, update local state
      if (user) {
        const currentUserId = String(user._id || user.id || '');
        const deletedUserId = String(eventData.userId || '');
        if (deletedUserId === currentUserId) {
          setRSVP(null);
        }
      }
    };

    const handleEventUpdateCreated = (eventData: any) => {
      const receivedEventId = String(eventData.eventId || '');
      const currentEventId = String(eventId || '');
      
      if (receivedEventId !== currentEventId) {
        console.log('⚠️ Event ID mismatch for update:', receivedEventId, 'vs', currentEventId);
        return;
      }
      
      console.log('📢 Real-time event update received:', eventData);
      
      // Add new update to the list
      if (eventData.update) {
        setUpdates(prev => {
          // Check if update already exists to avoid duplicates
          const exists = prev.some(u => String(u._id) === String(eventData.update._id));
          if (exists) return prev;
          // Add to beginning of list
          return [eventData.update, ...prev];
        });
      }
    };

    socket.on('event:rsvp:updated', handleRSVPUpdated);
    socket.on('event:rsvp:deleted', handleRSVPDeleted);
    socket.on('event:update:created', handleEventUpdateCreated);

    return () => {
      socket.off('event:rsvp:updated', handleRSVPUpdated);
      socket.off('event:rsvp:deleted', handleRSVPDeleted);
      socket.off('event:update:created', handleEventUpdateCreated);
      socket.emit('leave-room', eventRoom);
      console.log(`🚪 Left event room: ${eventRoom}`);
    };
  }, [socket, isConnected, eventId, user]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isDropdownOpen && !(target as Element).closest('.dropdown-container')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const fetchEvent = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        setLoading(true);
      }
      const data = await eventService.getEventById(eventId);
      if (data) {
        // Ensure rsvpStats exists
        if (!data.rsvpStats) {
          // If no stats, fetch them separately
          try {
            const stats = await eventService.getRSVPStats(eventId);
            data.rsvpStats = stats;
          } catch (err) {
            console.error('Error fetching RSVP stats:', err);
            // Set default stats if fetch fails
            data.rsvpStats = {
              going: { count: 0, guests: 0 },
              interested: { count: 0, guests: 0 },
              not_going: { count: 0, guests: 0 }
            };
          }
        }
        setEvent(data);
      }
    } catch (err: any) {
      console.error('Error loading event:', err);
      if (!forceRefresh) {
        Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: 'Không thể tải thông tin sự kiện',
        }).then(() => router.push('/events'));
      }
    } finally {
      if (!forceRefresh) {
        setLoading(false);
      }
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

  const handleRSVP = async (status: 'going' | 'interested' | 'not_going') => {
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
      
      // Refresh RSVP và event để có stats mới nhất (force refresh để bypass cache)
      await Promise.all([
        fetchRSVP(),
        fetchEvent(true) // Force refresh để có stats mới nhất
      ]);
      
      Swal.fire({
        icon: 'success',
        title: 'Thành công',
        text: `Bạn đã ${status === 'going' ? 'tham gia' : status === 'interested' ? 'quan tâm' : 'không tham gia'} sự kiện`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error('Error creating RSVP:', err);
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
      'charity_event': 'Sự kiện từ thiện',
      'donation_drive': 'Tập hợp đóng góp',
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
              {user && !isCreator && (
                <div className="relative ml-4 dropdown-container">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-10 h-10 flex items-center justify-center bg-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full transition-colors"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                      <button
                        onClick={async () => {
                          setIsDropdownOpen(false);
                          
                          if (hasReported) {
                            Swal.fire({
                              icon: 'info',
                              title: 'Đã báo cáo',
                              text: 'Bạn đã báo cáo sự kiện này rồi. Vui lòng chờ admin xử lý.',
                            });
                            return;
                          }

                          setIsCheckingReport(true);
                          try {
                            const { reports } = await getReportsByItem('event', eventId);
                            const currentUserId = (user as any)?._id || user?.id;
                            const userReport = reports.find(
                              (report) => report.reporter._id === currentUserId
                            );
                            
                            if (userReport) {
                              setHasReported(true);
                              Swal.fire({
                                icon: 'info',
                                title: 'Đã báo cáo',
                                text: 'Bạn đã báo cáo sự kiện này rồi. Vui lòng chờ admin xử lý.',
                              });
                            } else {
                              setShowReportModal(true);
                            }
                          } catch (error) {
                            console.error('Error checking report:', error);
                            setShowReportModal(true);
                          } finally {
                            setIsCheckingReport(false);
                          }
                        }}
                        disabled={isCheckingReport || hasReported}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaFlag className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium">
                          {hasReported ? 'Đã báo cáo' : 'Báo cáo sự kiện'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
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
                  <div className="text-gray-600 dark:text-gray-400">
                    {event.location.venue_name && <div className="font-medium">{event.location.venue_name}</div>}
                    {event.location.address && <div>{event.location.address}</div>}
                    {event.location.district && <div>{event.location.district}</div>}
                    {event.location.city && <div>{event.location.city}</div>}
                    {event.location.country && <div>{event.location.country}</div>}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-orange-500 mt-1" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Người tham gia</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {totalAttendees} {event.capacity ? `/ ${event.capacity}` : ''} người
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {event.rsvpStats?.going.count || 0} tham gia, {event.rsvpStats?.interested.count || 0} quan tâm
                  </div>
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
                         rsvp.status === 'interested' ? 'Quan tâm' : 'Không tham gia'}
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

      {/* Report Modal */}
      <ReportModal
        reportedType="event"
        reportedId={eventId}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSuccess={() => {
          setHasReported(true);
        }}
      />
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

