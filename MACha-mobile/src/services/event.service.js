import apiClient from './apiClient';
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
  GET_EVENTS_FOR_MAP_ROUTE,
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
  CREATE_EVENT_UPDATE_ROUTE,
  GET_EVENT_UPDATES_ROUTE,
  UPDATE_EVENT_UPDATE_ROUTE,
  DELETE_EVENT_UPDATE_ROUTE,
} from '../constants/api';

export const eventService = {
  async getAllEvents(filters = {}) {
    const response = await apiClient.get(GET_ALL_EVENTS_ROUTE, {
      params: filters,
    });
    return response.data.events || [];
  },

  async getEventById(id) {
    const response = await apiClient.get(GET_EVENT_BY_ID_ROUTE(id));
    return response.data.event;
  },

  async getEventsByCategory(category) {
    const response = await apiClient.get(GET_EVENTS_BY_CATEGORY_ROUTE, {
      params: { category },
    });
    return response.data.events || [];
  },

  async getUpcomingEvents(days) {
    const params = days ? { days } : {};
    const response = await apiClient.get(GET_UPCOMING_EVENTS_ROUTE, {
      params,
    });
    return response.data.events || [];
  },

  async getPastEvents() {
    const response = await apiClient.get(GET_PAST_EVENTS_ROUTE);
    return response.data.events || [];
  },

  async getEventsForMap() {
    const response = await apiClient.get(GET_EVENTS_FOR_MAP_ROUTE);
    return response.data.events || [];
  },

  async searchEvents(query, filters = {}) {
    const response = await apiClient.get(SEARCH_EVENTS_ROUTE, {
      params: { q: query, ...filters },
    });
    return response.data.events || [];
  },

  async createEvent(payload) {
    const response = await apiClient.post(CREATE_EVENT_ROUTE, payload);
    return response.data.event;
  },

  async updateEvent(id, payload) {
    const response = await apiClient.patch(UPDATE_EVENT_ROUTE(id), payload);
    return response.data.event;
  },

  async deleteEvent(id) {
    await apiClient.delete(DELETE_EVENT_ROUTE(id));
  },

  async cancelEvent(id, reason) {
    const response = await apiClient.post(CANCEL_EVENT_ROUTE(id), { reason });
    return response.data.event;
  },

  async getEventsByCreator(creatorId) {
    const params = creatorId ? { creatorId } : {};
    const response = await apiClient.get(GET_EVENTS_BY_CREATOR_ROUTE, {
      params,
    });
    return response.data.events || [];
  },

  async getMyEvents(filters = {}) {
    const response = await apiClient.get(GET_MY_EVENTS_ROUTE, {
      params: filters,
    });
    return response.data.events || [];
  },

  async getMyRSVPs(filters = {}) {
    const response = await apiClient.get(GET_MY_RSVPS_ROUTE, {
      params: filters,
    });
    return response.data.events || [];
  },

  async getUpcomingRSVPs() {
    const response = await apiClient.get(GET_UPCOMING_RSVPS_ROUTE);
    return response.data.events || [];
  },

  async createRSVP(eventId, payload) {
    const response = await apiClient.post(CREATE_EVENT_RSVP_ROUTE(eventId), payload);
    return response.data.rsvp;
  },

  async getRSVP(eventId) {
    try {
      const response = await apiClient.get(GET_EVENT_RSVP_ROUTE(eventId));
      return response.data.rsvp;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async deleteRSVP(eventId) {
    await apiClient.delete(DELETE_EVENT_RSVP_ROUTE(eventId));
  },

  async getRSVPStats(eventId) {
    const response = await apiClient.get(GET_EVENT_RSVP_STATS_ROUTE(eventId));
    return response.data.stats;
  },

  async getRSVPList(eventId, filters = {}) {
    const response = await apiClient.get(GET_EVENT_RSVP_LIST_ROUTE(eventId), {
      params: filters,
    });
    return response.data.rsvps || [];
  },

  async createEventUpdate(eventId, payload) {
    const response = await apiClient.post(CREATE_EVENT_UPDATE_ROUTE(eventId), payload);
    return response.data.update;
  },

  async getEventUpdates(eventId, filters = {}) {
    const response = await apiClient.get(GET_EVENT_UPDATES_ROUTE(eventId), {
      params: filters,
    });
    return response.data.updates || [];
  },

  async updateEventUpdate(eventId, updateId, payload) {
    const response = await apiClient.patch(UPDATE_EVENT_UPDATE_ROUTE(eventId, updateId), payload);
    return response.data.update;
  },

  async deleteEventUpdate(eventId, updateId) {
    await apiClient.delete(DELETE_EVENT_UPDATE_ROUTE(eventId, updateId));
  },
};

