import { useAuthStore } from '@/stores/authStore';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, login, logout, updateUser } = useAuthStore();
  
  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateUser
  };
};