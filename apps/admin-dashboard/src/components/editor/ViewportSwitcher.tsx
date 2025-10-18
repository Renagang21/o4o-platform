/**
 * ViewportSwitcher Component
 * Provides Desktop/Tablet/Mobile viewport toggle buttons
 * Now uses API-based container width from Customize settings
 */

import React from 'react';
// FIXED: Replaced lucide-react with already installed @mui/icons-material
import {
  DesktopWindows,
  TabletAndroid,
  PhoneIphone,
} from '@mui/icons-material';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ViewportMode } from '@/hooks/useCustomizerSettings';

interface ViewportSwitcherProps {
  currentMode: ViewportMode;
  onModeChange: (mode: ViewportMode) => void;
  containerWidth?: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
}

// FIXED: Swapped icon components to Material-UI icons
const VIEWPORT_ICONS = {
  desktop: DesktopWindows,
  tablet: TabletAndroid,
  mobile: PhoneIphone,
};

const VIEWPORT_LABELS = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
};

export const ViewportSwitcher: React.FC<ViewportSwitcherProps> = ({
  currentMode,
  onModeChange,
  containerWidth,
}) => {
  const modes: ViewportMode[] = ['desktop', 'tablet', 'mobile'];

  return (
    <div className="flex items-center border rounded-md">
      {modes.map((mode) => {
        const Icon = VIEWPORT_ICONS[mode];
        const label = VIEWPORT_LABELS[mode];
        const width = containerWidth?.[mode];
        const isActive = currentMode === mode;

        return (
          <Button
            key={mode}
            variant="ghost"
            size="icon"
            onClick={() => onModeChange(mode)}
            className={cn(
              'h-8 w-8 text-gray-700 hover:bg-gray-100',
              mode !== 'desktop' && 'border-l',
              mode === 'desktop' && 'rounded-r-none',
              mode === 'tablet' && 'rounded-none',
              mode === 'mobile' && 'rounded-l-none',
              isActive && 'bg-blue-100 text-blue-600 hover:bg-blue-100'
            )}
            title={width ? `${label} (${width}px)` : label}
          >
            {/* Icon size is now controlled by sx prop for better consistency */}
            <Icon sx={{ fontSize: 18 }} />
          </Button>
        );
      })}
    </div>
  );
};
