import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface Notification {
  id: string;
  userId: string;
  type: 'order' | 'payment' | 'delivery' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export const notificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    const response = await axios.get(`${API_URL}/users/${userId}/notifications`);
    return response.data;
  },

  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const response = await axios.put(`${API_URL}/users/${userId}/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllAsRead(userId: string): Promise<void> {
    await axios.put(`${API_URL}/users/${userId}/notifications/read-all`);
  },

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    await axios.delete(`${API_URL}/users/${userId}/notifications/${notificationId}`);
  },

  async getUnreadCount(userId: string): Promise<number> {
    const response = await axios.get(`${API_URL}/users/${userId}/notifications/unread-count`);
    return response.data.count;
  }
}; 