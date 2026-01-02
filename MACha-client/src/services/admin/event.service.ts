import apiClient from '@/lib/api-client';
import {
  GET_PENDING_EVENTS_ROUTE,
  APPROVE_EVENT_ROUTE,
  REJECT_EVENT_ROUTE,
  GET_EVENT_BY_ID_ROUTE,
} from '@/constants/api';
import { Event } from '../event.service';

export interface AdminEvent extends Event {
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'cancelled' | 'completed';
}

export interface GetPendingEventsResponse {
  events: AdminEvent[];
  count: number;
}

export const getPendingEvents = async (): Promise<AdminEvent[]> => {
  try {
    const response = await apiClient.get<GetPendingEventsResponse>(GET_PENDING_EVENTS_ROUTE, { withCredentials: true });
    return response.data.events || [];
  } catch (error) {
    console.error('Error fetching pending events:', error);
    throw error;
  }
};

export const getEventById = async (id: string): Promise<AdminEvent> => {
  try {
    const response = await apiClient.get<{ event: AdminEvent }>(GET_EVENT_BY_ID_ROUTE(id), { withCredentials: true });
    return response.data.event;
  } catch (error) {
    console.error('Error fetching event:', error);
    throw error;
  }
};

export const approveEvent = async (id: string): Promise<AdminEvent> => {
  try {
    const response = await apiClient.post<{ event: AdminEvent; message: string }>(
      APPROVE_EVENT_ROUTE(id),
      {},
      { withCredentials: true }
    );
    return response.data.event;
  } catch (error) {
    console.error('Error approving event:', error);
    throw error;
  }
};

export const rejectEvent = async (id: string, reason: string): Promise<AdminEvent> => {
  try {
    const response = await apiClient.post<{ event: AdminEvent; message: string }>(
      REJECT_EVENT_ROUTE(id),
      { reason },
      { withCredentials: true }
    );
    return response.data.event;
  } catch (error) {
    console.error('Error rejecting event:', error);
    throw error;
  }
};

