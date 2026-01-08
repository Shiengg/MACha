'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { campaignService, Campaign } from '@/services/campaign.service';
import { eventService, Event } from '@/services/event.service';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [statistics, setStatistics] = useState({
    active: 0,
    completed: 0,
    finished: 0,
    total: 0,
  });
  const [eventStatistics, setEventStatistics] = useState({
    upcoming: 0,
    ongoing: 0,
    completed: 0,
    total: 0,
  });
  const router = useRouter();

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token is not set. Please set NEXT_PUBLIC_MAPBOX_TOKEN in your .env.local file');
      setLoading(false);
      return;
    }

    setLoading(true);

    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    if (mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [108.0, 16.0],
        zoom: 5.1,
        accessToken: MAPBOX_TOKEN,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      if (!document.getElementById('mapbox-popup-style')) {
        const style = document.createElement('style');
        style.id = 'mapbox-popup-style';
        style.textContent = `
          .mapboxgl-popup-close-button {
            width: 24px !important;
            height: 24px !important;
            font-size: 20px !important;
            line-height: 24px !important;
            padding: 0 !important;
            margin: 8px !important;
            color: #666 !important;
            opacity: 0.8 !important;
          }
          .mapboxgl-popup-close-button:hover {
            opacity: 1 !important;
            background-color: rgba(0, 0, 0, 0.05) !important;
            border-radius: 4px !important;
          }
        `;
        document.head.appendChild(style);
      }

      const loadData = async () => {
        try {
          const [campaignsData, eventsData, statisticsData] = await Promise.all([
            campaignService.getCampaignsForMap(),
            eventService.getEventsForMap(),
            campaignService.getCampaignMapStatistics(),
          ]);
          
          setCampaigns(campaignsData);
          setEvents(eventsData);
          setFilteredCampaigns(campaignsData);
          setFilteredEvents(eventsData);
          setStatistics(statisticsData);
          
          // Calculate event statistics
          const now = new Date();
          const eventStats = {
            upcoming: eventsData.filter(e => {
              if (!e.start_date) return false;
              return new Date(e.start_date) > now;
            }).length,
            ongoing: eventsData.filter(e => {
              if (!e.start_date) return false;
              const startDate = new Date(e.start_date);
              if (startDate > now) return false; // Chưa bắt đầu
              if (e.end_date) {
                const endDate = new Date(e.end_date);
                return endDate >= now; // Đang diễn ra nếu end_date >= now
              }
              return true; // Không có end_date thì coi như đang diễn ra nếu đã bắt đầu
            }).length,
            completed: eventsData.filter(e => {
              if (e.status === 'completed' || e.status === 'cancelled') return true;
              if (e.end_date) {
                return new Date(e.end_date) < now;
              }
              return false;
            }).length,
            total: eventsData.length,
          };
          setEventStatistics(eventStats);
          
          if (map.current && (campaignsData.length > 0 || eventsData.length > 0)) {
            addMarkersToMap(campaignsData, eventsData);
          }
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setLoading(false);
        }
      };

      if (map.current.loaded()) {
        loadData();
      } else {
        map.current.once('load', () => {
          loadData();
        });
      }
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let filteredC = campaigns;
    let filteredE = events;

    if (selectedCategory !== 'all') {
      filteredC = filteredC.filter(c => c.category === selectedCategory);
      filteredE = filteredE.filter(e => e.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredC = filteredC.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.location?.location_name.toLowerCase().includes(query)
      );
      filteredE = filteredE.filter(e => 
        e.title.toLowerCase().includes(query) ||
        e.location?.location_name.toLowerCase().includes(query)
      );
    }

    setFilteredCampaigns(filteredC);
    setFilteredEvents(filteredE);
    
    if (map.current && map.current.loaded() && !loading) {
      clearMarkers();
      if (filteredC.length > 0 || filteredE.length > 0) {
        addMarkersToMap(filteredC, filteredE);
      }
    }
  }, [selectedCategory, searchQuery, campaigns, events, loading]);

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
  };

  const addMarkersToMap = (campaignsToShow: Campaign[], eventsToShow: Event[] = []) => {
    if (!map.current || !map.current.loaded()) {
      if (map.current) {
        map.current.once('load', () => {
          addMarkersToMap(campaignsToShow, eventsToShow);
        });
      }
      return;
    }

    const campaignFeatures = campaignsToShow
      .filter(c => c.location?.latitude && c.location?.longitude)
      .map(campaign => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [campaign.location!.longitude, campaign.location!.latitude],
        },
        properties: {
          type: 'campaign',
          id: campaign._id,
          title: campaign.title,
          locationName: campaign.location!.location_name,
          progress: ((campaign.current_amount / campaign.goal_amount) * 100).toFixed(1),
          bannerImage: campaign.banner_image,
          category: campaign.category,
        },
      }));

    const eventFeatures = eventsToShow
      .filter(e => e.location?.latitude && e.location?.longitude)
      .map(event => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [event.location!.longitude, event.location!.latitude],
        },
        properties: {
          type: 'event',
          id: event._id,
          title: event.title,
          locationName: event.location!.location_name,
          bannerImage: event.banner_image,
          category: event.category,
          startDate: event.start_date,
        },
      }));

    const geojson = {
      type: 'FeatureCollection' as const,
      features: [...campaignFeatures, ...eventFeatures],
    };

    try {
      if (map.current.getSource('mapPoints')) {
        if (map.current.getLayer('clusters')) {
          map.current.removeLayer('clusters');
        }
        if (map.current.getLayer('cluster-count')) {
          map.current.removeLayer('cluster-count');
        }
        if (map.current.getLayer('campaign-point')) {
          map.current.removeLayer('campaign-point');
        }
        if (map.current.getLayer('event-point')) {
          map.current.removeLayer('event-point');
        }
        map.current.removeSource('mapPoints');
      }
    } catch (error) {
      console.log('Error removing existing source/layers:', error);
    }

    map.current.addSource('mapPoints', {
      type: 'geojson',
      data: geojson as any,
      cluster: true,
      clusterMaxZoom: 16, // Increase max zoom so events don't cluster as much
      clusterRadius: 50, // Smaller radius to reduce clustering
    });

    map.current.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'mapPoints',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#f97316',
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          25,
          10,
          35,
          50,
          45,
          100,
          55,
        ],
        'circle-stroke-width': 4,
        'circle-stroke-color': '#fff',
      },
    });

    map.current.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'mapPoints',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count}',
        'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
        'text-size': [
          'step',
          ['get', 'point_count'],
          16,
          10,
          18,
          50,
          20,
          100,
          22,
        ],
      },
      paint: {
        'text-color': '#fff',
      },
    });

    // Campaign points (red) - Add first so events appear on top
    map.current.addLayer({
      id: 'campaign-point',
      type: 'circle',
      source: 'mapPoints',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'campaign']],
      paint: {
        'circle-color': '#ef4444',
        'circle-radius': 8,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#fff',
      },
    });

    // Event points (blue/green) - Add after campaigns to appear on top
    // Make events more visible with larger size and different color
    map.current.addLayer({
      id: 'event-point',
      type: 'circle',
      source: 'mapPoints',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'event']],
      paint: {
        'circle-color': '#22c55e',
        'circle-radius': 10, // Larger than campaigns (10 vs 8)
        'circle-stroke-width': 4,
        'circle-stroke-color': '#fff',
        'circle-opacity': 1,
      },
    });

    const handlePointClick = (e: any) => {
      const coordinates = (e.features![0].geometry as any).coordinates.slice();
      const props = e.features![0].properties!;
      const isEvent = props.type === 'event';
      
      new mapboxgl.Popup({ maxWidth: '300px' })
        .setLngLat(coordinates)
        .setHTML(`
          <div style="min-width: 250px; max-width: 300px; overflow: hidden;">
            ${props.bannerImage ? `
              <div style="width: 100%; height: 120px; overflow: hidden; border-radius: 8px 8px 0 0; margin: -12px -12px 8px -12px;">
                <img src="${props.bannerImage}" alt="${props.title}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
              </div>
            ` : ''}
            <h3 style="font-weight: bold; margin-bottom: 8px; font-size: 16px; line-height: 1.3;">${props.title}</h3>
            <p style="font-size: 12px; color: #666; margin-bottom: 8px; display: flex; align-items: center;">
              <svg style="width: 12px; height: 12px; margin-right: 4px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span style="word-break: break-word;">${props.locationName}</span>
            </p>
            ${isEvent ? `
              <p style="font-size: 12px; margin-bottom: 12px;">
                <strong>Ngày:</strong> ${new Date(props.startDate).toLocaleDateString('vi-VN')}
              </p>
            ` : `
              <p style="font-size: 12px; margin-bottom: 12px;">
                <strong>Tiến độ:</strong> ${props.progress}%
              </p>
            `}
            <a href="${isEvent ? '/events' : '/campaigns'}/${props.id}" style="display: inline-block; padding: 8px 16px; background-color: ${isEvent ? '#22c55e' : '#3b82f6'}; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; text-align: center; width: 100%; box-sizing: border-box;">Xem chi tiết →</a>
          </div>
        `)
        .addTo(map.current!);
    };

    map.current.on('click', 'campaign-point', handlePointClick);
    map.current.on('click', 'event-point', handlePointClick);

    map.current.on('mouseenter', 'clusters', () => {
      map.current!.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'clusters', () => {
      map.current!.getCanvas().style.cursor = '';
    });

    map.current.on('mouseenter', 'campaign-point', () => {
      map.current!.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'campaign-point', () => {
      map.current!.getCanvas().style.cursor = '';
    });
    map.current.on('mouseenter', 'event-point', () => {
      map.current!.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'event-point', () => {
      map.current!.getCanvas().style.cursor = '';
    });
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-50">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Mapbox Token Chưa Được Cấu Hình
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Vui lòng thêm NEXT_PUBLIC_MAPBOX_TOKEN vào file .env.local
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Về Trang Chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900" style={{ marginTop: '73px' }}>
      <aside 
        className={`fixed left-0 top-[73px] h-[calc(100vh-73px)] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto z-10 transition-all duration-300 ${
          isSidebarOpen ? 'w-80' : 'w-0'
        }`}
      >
        <div className={`p-4 space-y-6 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tìm kiếm theo tên chiến dịch, sự kiện, địa điểm
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập tên chiến dịch, sự kiện hoặc địa điểm..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Chiến dịch thiện nguyện
            </h3>
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{statistics.active}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Đang thực hiện</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.completed}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Đạt mục tiêu</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{statistics.finished}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Đã kết thúc</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Sự kiện thiện nguyện
            </h3>
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{eventStatistics.upcoming}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Sắp diễn ra</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{eventStatistics.ongoing}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Đang diễn ra</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{eventStatistics.completed}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Đã kết thúc</div>
              </div>
            </div>
          </div>

          {searchQuery.trim() && (filteredCampaigns.length > 0 || filteredEvents.length > 0) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Kết quả tìm kiếm ({filteredCampaigns.length + filteredEvents.length})
              </h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {filteredCampaigns.map((campaign) => (
                  <Link
                    key={campaign._id}
                    href={`/campaigns/${campaign._id}`}
                    className="block bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {campaign.banner_image && (
                      <img
                        src={campaign.banner_image}
                        alt={campaign.title}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <div className="p-3">
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1 line-clamp-2">
                        {campaign.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {campaign.creator.fullname || campaign.creator.username}
                      </p>
                      {campaign.location && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          📍 {campaign.location.location_name}
                        </p>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                          {campaign.category}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Đạt {((campaign.current_amount / campaign.goal_amount) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
                {filteredEvents.map((event) => (
                  <Link
                    key={event._id}
                    href={`/events/${event._id}`}
                    className="block bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {event.banner_image && (
                      <img
                        src={event.banner_image}
                        alt={event.title}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <div className="p-3">
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1 line-clamp-2">
                        {event.title}
                      </h4>
                      {event.creator && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          {event.creator.fullname || event.creator.username}
                        </p>
                      )}
                      {event.location && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          📍 {event.location.location_name}
                        </p>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
                          {event.category}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(event.start_date).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {searchQuery.trim() && filteredCampaigns.length === 0 && filteredEvents.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                Không tìm thấy chiến dịch hoặc sự kiện nào phù hợp
              </p>
            </div>
          )}
        </div>
      </aside>

      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`fixed top-[calc(73px+50%)] z-20 bg-white dark:bg-gray-800 rounded-r-full shadow-lg border-r border-y border-gray-200 dark:border-gray-700 p-3 transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700 ${
          isSidebarOpen ? 'left-80' : 'left-0'
        }`}
        style={{ transform: 'translateY(-50%)' }}
        aria-label={isSidebarOpen ? 'Thu gọn sidebar' : 'Mở rộng sidebar'}
      >
        {isSidebarOpen ? (
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        )}
      </button>

      <div className={`h-full relative transition-all duration-300 ${isSidebarOpen ? 'ml-80' : 'ml-0'}`}>
        <div
          ref={mapContainer}
          className="w-full h-full"
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 bg-opacity-75 z-30">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Đang tải bản đồ...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
