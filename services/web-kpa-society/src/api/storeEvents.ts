/**
 * Store Events API Client
 *
 * WO-O4O-STORE-EVENT-MINIMAL-V1
 */

import { apiClient } from './client';

export interface StoreEvent {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventParams {
  title: string;
  description?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  sortOrder?: number;
}

export interface UpdateEventParams {
  title?: string;
  description?: string | null;
  imageUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export async function getStoreEvents(): Promise<{ success: boolean; data: StoreEvent[] }> {
  return apiClient.get('/pharmacy/events');
}

export async function createStoreEvent(params: CreateEventParams): Promise<{ success: boolean; data: StoreEvent }> {
  return apiClient.post('/pharmacy/events', params);
}

export async function updateStoreEvent(id: string, params: UpdateEventParams): Promise<{ success: boolean; data: StoreEvent }> {
  return apiClient.put(`/pharmacy/events/${id}`, params);
}

export async function deleteStoreEvent(id: string): Promise<{ success: boolean; message: string }> {
  return apiClient.delete(`/pharmacy/events/${id}`);
}
