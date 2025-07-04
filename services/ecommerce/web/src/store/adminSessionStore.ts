import create from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdminSession {
  email: string;
  token: string;
  role: 'superadmin' | 'manager' | 'editor' | 'viewer';
}

interface AdminSessionState {
  sessions: AdminSession[];
  currentSessionEmail: string | null;
  addSession: (session: AdminSession) => void;
  switchSession: (email: string) => void;
  removeSession: (email: string) => void;
  currentSession: AdminSession | null;
}

export const useAdminSessionStore = create<AdminSessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionEmail: null,
      addSession: (session) => {
        set((state) => {
          const exists = state.sessions.some(s => s.email === session.email);
          const sessions = exists
            ? state.sessions.map(s => s.email === session.email ? session : s)
            : [session, ...state.sessions];
          return { sessions, currentSessionEmail: session.email };
        });
      },
      switchSession: (email) => {
        const session = get().sessions.find(s => s.email === email);
        if (session) set({ currentSessionEmail: email });
      },
      removeSession: (email) => {
        set((state) => {
          const sessions = state.sessions.filter(s => s.email !== email);
          const currentSessionEmail = state.currentSessionEmail === email ? (sessions[0]?.email || null) : state.currentSessionEmail;
          return { sessions, currentSessionEmail };
        });
      },
      get currentSession() {
        return get().sessions.find(s => s.email === get().currentSessionEmail) || null;
      },
    }),
    { name: 'admin-sessions' }
  )
); 