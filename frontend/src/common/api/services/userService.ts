import axios from 'axios';
import { UserProfile } from '../../types/user';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const userService = {
  async getUserProfile(userId: string): Promise<UserProfile> {
    const response = await axios.get(`${API_URL}/users/${userId}/profile`);
    return response.data;
  },

  async updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    const response = await axios.put(`${API_URL}/users/${userId}/profile`, profile);
    return response.data;
  },

  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    await axios.put(`${API_URL}/users/${userId}/password`, {
      currentPassword,
      newPassword,
    });
  },

  async getAddresses(userId: string): Promise<{
    id: string;
    name: string;
    recipient: string;
    phone: string;
    address: string;
    detailAddress: string;
    postalCode: string;
    isDefault: boolean;
  }[]> {
    const response = await axios.get(`${API_URL}/users/${userId}/addresses`);
    return response.data;
  },

  async addAddress(userId: string, address: Omit<Address, 'id'>): Promise<Address> {
    const response = await axios.post(`${API_URL}/users/${userId}/addresses`, address);
    return response.data;
  },

  async updateAddress(userId: string, addressId: string, address: Partial<Address>): Promise<Address> {
    const response = await axios.put(`${API_URL}/users/${userId}/addresses/${addressId}`, address);
    return response.data;
  },

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    await axios.delete(`${API_URL}/users/${userId}/addresses/${addressId}`);
  },
}; 