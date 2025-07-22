import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { SignageContent, SignageSchedule } from '../types/signage';

const api = axios.create({
  baseURL: '/api/v1/signage',
  withCredentials: true,
});

// Content hooks
export const useSignageContent = () => {
  return useQuery({
    queryKey: ['signage', 'content'],
    queryFn: async () => {
      const { data } = await api.get('/content');
      return data;
    },
  });
};

export const useSignageContentById = (id: string) => {
  return useQuery({
    queryKey: ['signage', 'content', id],
    queryFn: async () => {
      const { data } = await api.get(`/content/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateContent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (content: Partial<SignageContent>) => {
      const { data } = await api.post('/content', content);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signage', 'content'] });
    },
  });
};

export const useUpdateContent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...content }: Partial<SignageContent> & { id: string }) => {
      const { data } = await api.put(`/content/${id}`, content);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['signage', 'content'] });
      queryClient.invalidateQueries({ queryKey: ['signage', 'content', variables.id] });
    },
  });
};

// Schedule hooks
export const useSignageSchedules = () => {
  return useQuery({
    queryKey: ['signage', 'schedules'],
    queryFn: async () => {
      const { data } = await api.get('/schedule');
      return data;
    },
  });
};

export const useCreateSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (schedule: Partial<SignageSchedule>) => {
      const { data } = await api.post('/schedule', schedule);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signage', 'schedules'] });
    },
  });
};

// Store display hooks
export const useStoreDisplay = (storeId?: string) => {
  return useQuery({
    queryKey: ['signage', 'display', storeId],
    queryFn: async () => {
      const { data } = await api.get(`/display/${storeId}`);
      return data;
    },
    enabled: !!storeId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};