import { useState, useCallback } from 'react';
import { adminApi } from '../api/admin/adminApi';
import {
  AdminStats,
  AdminUserListParams,
  AdminUserListResponse,
  SalesStats,
  ProductStats,
  UserStats,
  AdminUser,
} from '../api/admin/types';

export const useAdmin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const stats = await adminApi.getStats();
      return stats;
    } catch (err: any) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUsers = useCallback(async (params: AdminUserListParams) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminApi.getUsers(params);
      return response;
    } catch (err: any) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approveUser = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminApi.approveUser(id);
      return response;
    } catch (err: any) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rejectUser = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminApi.rejectUser(id);
      return response;
    } catch (err: any) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSalesStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const stats = await adminApi.getSalesStats();
      return stats;
    } catch (err: any) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getProductStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const stats = await adminApi.getProductStats();
      return stats;
    } catch (err: any) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUserStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const stats = await adminApi.getUserStats();
      return stats;
    } catch (err: any) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUserRole = useCallback(async (userId: string, role: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const user = await adminApi.updateUserRole(userId, role);
      return user;
    } catch (err: any) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deactivateUser = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const user = await adminApi.deactivateUser(userId);
      return user;
    } catch (err: any) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    getStats,
    getUsers,
    approveUser,
    rejectUser,
    getSalesStats,
    getProductStats,
    getUserStats,
    updateUserRole,
    deactivateUser,
  };
}; 