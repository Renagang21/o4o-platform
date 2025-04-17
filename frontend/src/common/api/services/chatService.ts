import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderType: 'user' | 'admin';
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface Chat {
  id: string;
  userId: string;
  adminId?: string;
  status: 'open' | 'closed';
  subject: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export const chatService = {
  async getChats(userId: string): Promise<Chat[]> {
    const response = await axios.get(`${API_URL}/users/${userId}/chats`);
    return response.data;
  },

  async getChat(chatId: string): Promise<Chat> {
    const response = await axios.get(`${API_URL}/chats/${chatId}`);
    return response.data;
  },

  async createChat(userId: string, subject: string): Promise<Chat> {
    const response = await axios.post(`${API_URL}/users/${userId}/chats`, { subject });
    return response.data;
  },

  async sendMessage(chatId: string, message: { content: string; senderId: string; senderType: 'user' | 'admin' }): Promise<ChatMessage> {
    const response = await axios.post(`${API_URL}/chats/${chatId}/messages`, message);
    return response.data;
  },

  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    await axios.put(`${API_URL}/chats/${chatId}/messages/read`, { userId });
  },

  async closeChat(chatId: string): Promise<Chat> {
    const response = await axios.put(`${API_URL}/chats/${chatId}/close`);
    return response.data;
  },

  async getUnreadCount(userId: string): Promise<number> {
    const response = await axios.get(`${API_URL}/users/${userId}/chats/unread-count`);
    return response.data.count;
  }
}; 