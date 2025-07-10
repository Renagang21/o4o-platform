import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from './client';
export const useAuthStore = create()(persist((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    login: async (email, password) => {
        set({ loading: true, error: null });
        try {
            const response = await apiClient.post('/auth/login', { email, password });
            const { user, token } = response.data;
            set({
                user,
                token,
                isAuthenticated: true,
                loading: false
            });
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        catch (error) {
            set({
                error: error.response?.data?.message || 'Login failed',
                loading: false
            });
            throw error;
        }
    },
    logout: () => {
        set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null
        });
        delete apiClient.defaults.headers.common['Authorization'];
    },
    getCurrentUser: async () => {
        const { token } = get();
        if (!token)
            return;
        try {
            const response = await apiClient.get('/auth/me');
            set({ user: response.data, isAuthenticated: true });
        }
        catch (error) {
            get().logout();
        }
    },
    clearError: () => set({ error: null }),
    isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin' || user?.permissions?.includes('admin.access') || false;
    },
    hasPermission: (permission) => {
        const { user } = get();
        if (!user)
            return false;
        if (user.role === 'admin')
            return true;
        return user.permissions?.includes(permission) || false;
    }
}), {
    name: 'admin-auth-storage',
    partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
    }),
    onRehydrateStorage: () => (state) => {
        if (state?.token) {
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
    }
}));
//# sourceMappingURL=authStore.js.map