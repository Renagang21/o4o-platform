import create from 'zustand';

export interface AdminSearchResult {
  type: 'product' | 'order' | 'user';
  id: string;
  label: string;
  subLabel?: string;
  link: string;
}

interface AdminSearchState {
  query: string;
  results: {
    products: AdminSearchResult[];
    orders: AdminSearchResult[];
    users: AdminSearchResult[];
  };
  loading: boolean;
  error: string | null;
  search: (query: string, role: string) => Promise<void>;
}

export const useAdminSearchStore = create<AdminSearchState>((set) => ({
  query: '',
  results: { products: [], orders: [], users: [] },
  loading: false,
  error: null,
  search: async (query, role) => {
    set({ query, loading: true, error: null });
    try {
      const res = await fetch(`/admin/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      // role-based filtering (example: viewer cannot see users)
      let products = data.products || [];
      let orders = data.orders || [];
      let users = data.users || [];
      if (role === 'viewer') users = [];
      set({ results: { products, orders, users }, loading: false });
    } catch (e) {
      set({ error: '검색 실패', loading: false });
    }
  },
})); 