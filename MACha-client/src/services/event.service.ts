import apiClient from '@/lib/api-client';
import {
  GET_ALL_EVENTS_ROUTE,
  GET_EVENT_BY_ID_ROUTE,
  CREATE_EVENT_ROUTE,
  UPDATE_EVENT_ROUTE,
  DELETE_EVENT_ROUTE,
  CANCEL_EVENT_ROUTE,
  GET_EVENTS_BY_CATEGORY_ROUTE,
  GET_UPCOMING_EVENTS_ROUTE,
  GET_PAST_EVENTS_ROUTE,
  SEARCH_EVENTS_ROUTE,
  GET_EVENTS_BY_CREATOR_ROUTE,
  GET_MY_EVENTS_ROUTE,
  GET_MY_RSVPS_ROUTE,
  GET_UPCOMING_RSVPS_ROUTE,
  CREATE_EVENT_RSVP_ROUTE,
  GET_EVENT_RSVP_ROUTE,
  DELETE_EVENT_RSVP_ROUTE,
  GET_EVENT_RSVP_STATS_ROUTE,
  GET_EVENT_RSVP_LIST_ROUTE,
  ADD_EVENT_HOST_ROUTE,
  REMOVE_EVENT_HOST_ROUTE,
  GET_EVENT_HOSTS_ROUTE,
  GET_EVENTS_BY_HOST_ROUTE,
  CREATE_EVENT_UPDATE_ROUTE,
  GET_EVENT_UPDATES_ROUTE,
  UPDATE_EVENT_UPDATE_ROUTE,
  DELETE_EVENT_UPDATE_ROUTE,
} from '@/constants/api';

export interface Event {
  _id: string;
  creator: {
    _id: string;
    username: string;
    fullname?: string;
    avatar?: string;
  };
  title: string;
  description?: string;
  banner_image: string;
  gallery_images?: string[];
  start_date: string;
  end_date?: string;
  timezone?: string;
  location: {
    type: 'physical' | 'online' | 'hybrid';
    venue_name?: string;
    address?: string;
    city?: string;
    district?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    online_link?: string;
    online_platform?: string;
  };
  privacy: 'public' | 'friends' | 'private';
  category: 'volunteering' | 'fundraising' | 'community_meetup' | 'workshop' | 'seminar' | 'charity_event' | 'awareness';
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  capacity?: number;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejected_reason?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  hosts?: Array<{
    _id: string;
    username: string;
    fullname?: string;
    avatar?: string;
  }>;
  rsvpStats?: {
    going: { count: number; guests: number };
    interested: { count: number; guests: number };
    maybe: { count: number; guests: number };
    not_going: { count: number; guests: number };
  };
  userRSVP?: EventRSVP;
  isHost?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventRSVP {
  _id: string;
  event: string | Event;
  user: {
    _id: string;
    username: string;
    fullname?: string;
    avatar?: string;
  };
  status: 'going' | 'interested' | 'maybe' | 'not_going';
  guests_count: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventHost {
  _id: string;
  event: string;
  user: {
    _id: string;
    username: string;
    fullname?: string;
    avatar?: string;
  };
  role: 'creator' | 'co_host';
  added_by: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventUpdate {
  _id: string;
  event: string;
  author: {
    _id: string;
    username: string;
    fullname?: string;
    avatar?: string;
  };
  content: string;
  media_urls?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  banner_image: string;
  gallery_images?: string[];
  start_date: string;
  end_date?: string;
  timezone?: string;
  location: {
    type: 'physical' | 'online' | 'hybrid';
    venue_name?: string;
    address?: string;
    city?: string;
    district?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    online_link?: string;
    online_platform?: string;
  };
  privacy?: 'public' | 'friends' | 'private';
  category: 'volunteering' | 'fundraising' | 'community_meetup' | 'workshop' | 'seminar' | 'charity_event' | 'awareness';
  capacity?: number;
}

export interface UpdateEventPayload {
  title?: string;
  description?: string;
  banner_image?: string;
  gallery_images?: string[];
  start_date?: string;
  end_date?: string;
  timezone?: string;
  location?: {
    type?: 'physical' | 'online' | 'hybrid';
    venue_name?: string;
    address?: string;
    city?: string;
    district?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    online_link?: string;
    online_platform?: string;
  };
  privacy?: 'public' | 'friends' | 'private';
  category?: 'volunteering' | 'fundraising' | 'community_meetup' | 'workshop' | 'seminar' | 'charity_event' | 'awareness';
  capacity?: number;
}

export interface CreateRSVPPayload {
  status: 'going' | 'interested' | 'maybe' | 'not_going';
  guests_count?: number;
  notes?: string;
}

export interface CreateEventUpdatePayload {
  content: string;
  media_urls?: string[];
}

export interface EventFilters {
  status?: string;
  category?: string;
  privacy?: string;
  city?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export const eventService = {
  async getAllEvents(filters?: EventFilters): Promise<Event[]> {
    const response = await apiClient.get(GET_ALL_EVENTS_ROUTE, {
      params: filters,
    });
    return response.data.events;
  },

  async getEventById(id: string): Promise<Event> {
    const response = await apiClient.get(GET_EVENT_BY_ID_ROUTE(id));
    return response.data.event;
  },

  async getEventsByCategory(category: string): Promise<Event[]> {
    const response = await apiClient.get(GET_EVENTS_BY_CATEGORY_ROUTE, {
      params: { category },
    });
    return response.data.events;
  },

  async getUpcomingEvents(days?: number): Promise<Event[]> {
    const response = await apiClient.get(GET_UPCOMING_EVENTS_ROUTE, {
      params: days ? { days } : {},
    });
    return response.data.events;
  },

  async getPastEvents(): Promise<Event[]> {
    const response = await apiClient.get(GET_PAST_EVENTS_ROUTE);
    return response.data.events;
  },

  async searchEvents(query: string, filters?: { city?: string; category?: string; start_date?: string; end_date?: string }): Promise<Event[]> {
    const response = await apiClient.get(SEARCH_EVENTS_ROUTE, {
      params: { q: query, ...filters },
    });
    return response.data.events;
  },

  async createEvent(payload: CreateEventPayload): Promise<Event> {
    const response = await apiClient.post(CREATE_EVENT_ROUTE, payload);
    return response.data.event;
  },

  async updateEvent(id: string, payload: UpdateEventPayload): Promise<Event> {
    const response = await apiClient.patch(UPDATE_EVENT_ROUTE(id), payload);
    return response.data.event;
  },

  async deleteEvent(id: string): Promise<void> {
    await apiClient.delete(DELETE_EVENT_ROUTE(id));
  },

  async cancelEvent(id: string, reason: string): Promise<Event> {
    const response = await apiClient.post(CANCEL_EVENT_ROUTE(id), { reason });
    return response.data.event;
  },

  async getEventsByCreator(creatorId?: string): Promise<Event[]> {
    const response = await apiClient.get(GET_EVENTS_BY_CREATOR_ROUTE, {
      params: creatorId ? { creatorId } : {},
    });
    return response.data.events;
  },

  async getMyEvents(filters?: { status?: string; page?: number; limit?: number }): Promise<Event[]> {
    const response = await apiClient.get(GET_MY_EVENTS_ROUTE, {
      params: filters,
    });
    return response.data.events;
  },

  async getMyRSVPs(filters?: { status?: string; page?: number; limit?: number }): Promise<Event[]> {
    const response = await apiClient.get(GET_MY_RSVPS_ROUTE, {
      params: filters,
    });
    return response.data.events;
  },

  async getUpcomingRSVPs(): Promise<Event[]> {
    const response = await apiClient.get(GET_UPCOMING_RSVPS_ROUTE);
    return response.data.events;
  },

  async createRSVP(eventId: string, payload: CreateRSVPPayload): Promise<EventRSVP> {
    const response = await apiClient.post(CREATE_EVENT_RSVP_ROUTE(eventId), payload);
    return response.data.rsvp;
  },

  async getRSVP(eventId: string): Promise<EventRSVP | null> {
    try {
      const response = await apiClient.get(GET_EVENT_RSVP_ROUTE(eventId));
      return response.data.rsvp;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async deleteRSVP(eventId: string): Promise<void> {
    await apiClient.delete(DELETE_EVENT_RSVP_ROUTE(eventId));
  },

  async getRSVPStats(eventId: string): Promise<{
    going: { count: number; guests: number };
    interested: { count: number; guests: number };
    maybe: { count: number; guests: number };
    not_going: { count: number; guests: number };
  }> {
    const response = await apiClient.get(GET_EVENT_RSVP_STATS_ROUTE(eventId));
    return response.data.stats;
  },

  async getRSVPList(eventId: string, filters?: { status?: string; page?: number; limit?: number }): Promise<EventRSVP[]> {
    const response = await apiClient.get(GET_EVENT_RSVP_LIST_ROUTE(eventId), {
      params: filters,
    });
    return response.data.rsvps;
  },

  async addHost(eventId: string, userId: string): Promise<EventHost> {
    const response = await apiClient.post(ADD_EVENT_HOST_ROUTE(eventId), { user_id: userId });
    return response.data.host;
  },

  async removeHost(eventId: string, userId: string): Promise<void> {
    await apiClient.delete(REMOVE_EVENT_HOST_ROUTE(eventId, userId));
  },

  async getHosts(eventId: string): Promise<EventHost[]> {
    const response = await apiClient.get(GET_EVENT_HOSTS_ROUTE(eventId));
    return response.data.hosts;
  },

  async getEventsByHost(): Promise<Event[]> {
    const response = await apiClient.get(GET_EVENTS_BY_HOST_ROUTE);
    return response.data.events;
  },

  async createEventUpdate(eventId: string, payload: CreateEventUpdatePayload): Promise<EventUpdate> {
    const response = await apiClient.post(CREATE_EVENT_UPDATE_ROUTE(eventId), payload);
    return response.data.update;
  },

  async getEventUpdates(eventId: string, filters?: { page?: number; limit?: number }): Promise<EventUpdate[]> {
    const response = await apiClient.get(GET_EVENT_UPDATES_ROUTE(eventId), {
      params: filters,
    });
    return response.data.updates;
  },

  async updateEventUpdate(eventId: string, updateId: string, payload: CreateEventUpdatePayload): Promise<EventUpdate> {
    const response = await apiClient.patch(UPDATE_EVENT_UPDATE_ROUTE(eventId, updateId), payload);
    return response.data.update;
  },

  async deleteEventUpdate(eventId: string, updateId: string): Promise<void> {
    await apiClient.delete(DELETE_EVENT_UPDATE_ROUTE(eventId, updateId));
  },
};

