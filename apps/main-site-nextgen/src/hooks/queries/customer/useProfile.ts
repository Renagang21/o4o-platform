import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface ProfileData {
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  bio?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences: {
    newsletter: boolean;
    notifications: boolean;
  };
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await axios.get<ProfileData>('/api/customer/profile');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
