import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface DeliveryStatus {
  id: string;
  orderId: string;
  trackingNumber: string;
  carrier: string;
  status: 'pending' | 'processing' | 'shipped' | 'in-transit' | 'delivered' | 'failed';
  currentLocation: string;
  estimatedDeliveryDate: string;
  history: {
    status: string;
    location: string;
    timestamp: string;
    description: string;
  }[];
}

export const deliveryService = {
  async getDeliveryStatus(orderId: string): Promise<DeliveryStatus> {
    const response = await axios.get(`${API_URL}/orders/${orderId}/delivery`);
    return response.data;
  },

  async trackDelivery(trackingNumber: string, carrier: string): Promise<DeliveryStatus> {
    const response = await axios.get(`${API_URL}/delivery/track`, {
      params: { trackingNumber, carrier }
    });
    return response.data;
  },

  async updateDeliveryStatus(orderId: string, status: Partial<DeliveryStatus>): Promise<DeliveryStatus> {
    const response = await axios.put(`${API_URL}/orders/${orderId}/delivery`, status);
    return response.data;
  },

  async getDeliveryHistory(orderId: string): Promise<DeliveryStatus['history']> {
    const response = await axios.get(`${API_URL}/orders/${orderId}/delivery/history`);
    return response.data;
  }
}; 