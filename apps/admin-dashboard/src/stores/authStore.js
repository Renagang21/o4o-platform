import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useAuthStore = create()(persist((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    login: (user, token) => {
        set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
        });
    },
    logout: () => {
        set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
        });
    },
    updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
            set({
                user: { ...currentUser, ...userData }
            });
        }
    },
    setLoading: (loading) => {
        set({ isLoading: loading });
    }
}), {
    name: 'auth-storage',
    partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
    })
}));
//# sourceMappingURL=authStore.js.map