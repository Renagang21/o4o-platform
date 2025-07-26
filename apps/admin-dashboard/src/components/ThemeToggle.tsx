import { FC } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

const ThemeToggle: FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={cn(
          "relative p-2 rounded-md transition-all duration-200",
          theme === 'light' 
            ? "bg-white dark:bg-neutral-700 shadow-sm" 
            : "hover:bg-neutral-200 dark:hover:bg-neutral-700"
        )}
        aria-label="Light mode"
        title="Light mode"
      >
        <Sun className={cn(
          "w-4 h-4 transition-colors",
          theme === 'light' 
            ? "text-warning-500" 
            : "text-neutral-400 dark:text-neutral-500"
        )} />
      </button>
      
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          "relative p-2 rounded-md transition-all duration-200",
          theme === 'dark' 
            ? "bg-white dark:bg-neutral-700 shadow-sm" 
            : "hover:bg-neutral-200 dark:hover:bg-neutral-700"
        )}
        aria-label="Dark mode"
        title="Dark mode"
      >
        <Moon className={cn(
          "w-4 h-4 transition-colors",
          theme === 'dark' 
            ? "text-primary-500" 
            : "text-neutral-400 dark:text-neutral-500"
        )} />
      </button>
      
      <button
        onClick={() => setTheme('system')}
        className={cn(
          "relative p-2 rounded-md transition-all duration-200",
          theme === 'system' 
            ? "bg-white dark:bg-neutral-700 shadow-sm" 
            : "hover:bg-neutral-200 dark:hover:bg-neutral-700"
        )}
        aria-label="System theme"
        title="Use system theme"
      >
        <Monitor className={cn(
          "w-4 h-4 transition-colors",
          theme === 'system' 
            ? "text-neutral-700 dark:text-neutral-300" 
            : "text-neutral-400 dark:text-neutral-500"
        )} />
      </button>
    </div>
  );
};

export default ThemeToggle;