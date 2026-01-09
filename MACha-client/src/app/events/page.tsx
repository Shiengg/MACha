'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import EventCard from '@/components/event/EventCard';
import CreateEventModal from '@/components/event/CreateEventModal';
import { eventService, Event } from '@/services/event.service';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Filter, Plus, Calendar, MapPin } from 'lucide-react';
import Swal from 'sweetalert2';

function EventsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('ongoing');
  const [selectedCity, setSelectedCity] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const categories = [
    { value: 'all', label: 'Tất cả' },
    { value: 'volunteering', label: 'Tình nguyện' },
    { value: 'fundraising', label: 'Gây quỹ' },
    { value: 'charity_event', label: 'Sự kiện từ thiện' },
    { value: 'donation_drive', label: 'Tập hợp đóng góp' },
  ];

  const statuses = [
    { value: 'ongoing', label: 'Đang diễn ra' },
    { value: 'upcoming', label: 'Sắp diễn ra' },
    { value: 'past', label: 'Đã qua' },
  ];

  useEffect(() => {
    loadEvents();
  }, [selectedStatus]);

  useEffect(() => {
    filterEvents();
  }, [events, searchQuery, selectedCategory, selectedCity, selectedStatus]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      // Load all events, then filter to only show approved ones (published or completed)
      // Events must be approved by admin (have approved_by) to be visible
      const allEvents = await eventService.getAllEvents();
      // Filter to only show events that are approved (published or completed status)
      const approvedEvents = allEvents.filter(e => 
        e.status === 'published' || e.status === 'completed'
      );
      setEvents(approvedEvents);
    } catch (err: any) {
      console.error('Error loading events:', err);
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Không thể tải danh sách sự kiện',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];
    const now = new Date();

    // Filter by time status (ongoing, upcoming, past)
    filtered = filtered.filter(e => {
      // Only show published or completed events (both are approved by admin)
      if (e.status !== 'published' && e.status !== 'completed') return false;

      const startDate = new Date(e.start_date);
      const endDate = e.end_date ? new Date(e.end_date) : null;

      if (selectedStatus === 'ongoing') {
        // Đang diễn ra: start_date <= now <= end_date (hoặc start_date <= now nếu không có end_date)
        if (endDate) {
          return startDate <= now && now <= endDate;
        } else {
          return startDate <= now;
        }
      } else if (selectedStatus === 'upcoming') {
        // Sắp diễn ra: start_date > now
        return startDate > now;
      } else if (selectedStatus === 'past') {
        // Đã qua: end_date < now (hoặc start_date < now nếu không có end_date)
        if (endDate) {
          return endDate < now;
        } else {
          return startDate < now;
        }
      }
      return true;
    });

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(e => e.category === selectedCategory);
    }

    // Filter by city
    if (selectedCity !== 'all') {
      filtered = filtered.filter(e => 
        e.location.location_name?.toLowerCase().includes(selectedCity.toLowerCase())
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.location.location_name?.toLowerCase().includes(query)
      );
    }

    setFilteredEvents(filtered);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadEvents();
      return;
    }

    try {
      setLoading(true);
      const data = await eventService.searchEvents(searchQuery, {
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        city: selectedCity !== 'all' ? selectedCity : undefined,
      });
      setEvents(data);
    } catch (err: any) {
      console.error('Error searching events:', err);
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Không thể tìm kiếm sự kiện',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = () => {
    if (!user) {
      Swal.fire({
        icon: 'warning',
        title: 'Cần đăng nhập',
        text: 'Vui lòng đăng nhập để tạo sự kiện',
      });
      router.push('/login');
      return;
    }
    setIsCreateModalOpen(true);
  };

  const handleEventCreated = () => {
    setIsCreateModalOpen(false);
    loadEvents();
  };

  // Get unique cities from events (extract from location_name or address)
  const cities = Array.from(new Set(
    events
      .map(e => {
        // Try to extract city name from location_name or address
        const loc = e.location.location_name || '';
        // Simple extraction: take the last part after comma or last word
        const parts = loc.split(',').map(s => s.trim()).filter(Boolean);
        return parts.length > 0 ? parts[parts.length - 1] : null;
      })
      .filter(Boolean)
  ));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
            Sự kiện từ thiện
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Khám phá và tham gia các sự kiện từ thiện trong cộng đồng
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Tìm kiếm sự kiện..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              {/* City Filter */}
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Tất cả thành phố</option>
                {cities.filter(city => city).map(city => (
                  <option key={city!} value={city!}>{city}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {statuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>

              {/* Create Button */}
              <button
                onClick={handleCreateEvent}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Tạo sự kiện</span>
                <span className="sm:hidden">Tạo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <div className="text-center">
              <div className="inline-block w-10 h-10 sm:w-12 sm:h-12 border-4 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400">Đang tải sự kiện...</p>
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">
              Không tìm thấy sự kiện nào
            </p>
            {user && (
              <button
                onClick={handleCreateEvent}
                className="mt-3 sm:mt-4 px-4 sm:px-6 py-2 text-sm sm:text-base bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Tạo sự kiện đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onEventCreated={handleEventCreated}
      />
    </div>
  );
}

export default function EventsPage() {
  return (
    <ProtectedRoute>
      <EventsContent />
    </ProtectedRoute>
  );
}

