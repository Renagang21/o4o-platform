import create from 'zustand';

export interface AdminNotificationSettings {
  order: boolean;
  signup: boolean;
  error: boolean;
}

interface AdminSettingsState {
  notificationSettings: AdminNotificationSettings;
  setNotificationSettings: (settings: AdminNotificationSettings) => void;
}

const defaultSettings: AdminNotificationSettings = {
  order: true,
  signup: true,
  error: true,
};

function loadSettings(): AdminNotificationSettings {
  try {
    const raw = localStorage.getItem('adminNotificationSettings');
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultSettings;
}

export const useAdminSettingsStore = create<AdminSettingsState>((set) => ({
  notificationSettings: loadSettings(),
  setNotificationSettings: (settings) => {
    set({ notificationSettings: settings });
    localStorage.setItem('adminNotificationSettings', JSON.stringify(settings));
  },
})); 