import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface SearchHistoryItem {
  id: string;
  userId: string;
  query: string;
  searchedAt: string;
}

export const searchHistoryService = {
  async getSearchHistory(userId: string): Promise<SearchHistoryItem[]> {
    const response = await axios.get(`${API_URL}/users/${userId}/search-history`);
    return response.data;
  },

  async addToSearchHistory(userId: string, query: string): Promise<SearchHistoryItem> {
    const response = await axios.post(`${API_URL}/users/${userId}/search-history`, { query });
    return response.data;
  },

  async clearSearchHistory(userId: string): Promise<void> {
    await axios.delete(`${API_URL}/users/${userId}/search-history`);
  },

  async removeFromSearchHistory(userId: string, searchId: string): Promise<void> {
    await axios.delete(`${API_URL}/users/${userId}/search-history/${searchId}`);
  },

  async getPopularSearches(): Promise<{ query: string; count: number }[]> {
    const response = await axios.get(`${API_URL}/search-history/popular`);
    return response.data;
  }
}; 