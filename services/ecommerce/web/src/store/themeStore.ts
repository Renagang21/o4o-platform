import create from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

function loadTheme(): Theme {
  try {
    const t = localStorage.getItem('theme');
    if (t === 'dark' || t === 'light') return t;
  } catch {}
  return 'light';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: loadTheme(),
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: next });
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  },
  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },
})); 