/**
 * Template Builder Constants
 *
 * WO-O4O-TEMPLATE-BUILDER-SPLIT-V1
 * Extracted from TemplateBuilder.tsx
 */

import type { ZoneType } from '@/lib/api/signageV2';
import {
  Monitor,
  Layout,
  Type,
  Square,
} from 'lucide-react';

// Zone type configurations
export const ZONE_TYPE_CONFIGS: Record<ZoneType, { label: string; color: string; icon: typeof Square }> = {
  main: { label: 'Main', color: 'bg-blue-500', icon: Monitor },
  header: { label: 'Header', color: 'bg-green-500', icon: Layout },
  footer: { label: 'Footer', color: 'bg-purple-500', icon: Layout },
  sidebar: { label: 'Sidebar', color: 'bg-orange-500', icon: Layout },
  ticker: { label: 'Ticker', color: 'bg-yellow-500', icon: Type },
  overlay: { label: 'Overlay', color: 'bg-red-500', icon: Square },
  custom: { label: 'Custom', color: 'bg-gray-500', icon: Square },
};

// Default preset zones for quick start
export const DEFAULT_PRESETS = [
  {
    name: 'Full Screen',
    description: 'Single zone covering entire screen',
    zones: [
      { name: 'Main', zoneType: 'main' as ZoneType, position: { x: 0, y: 0, width: 100, height: 100, unit: 'percent' as const }, zIndex: 1 },
    ],
  },
  {
    name: 'Header + Main',
    description: 'Top header with main content below',
    zones: [
      { name: 'Header', zoneType: 'header' as ZoneType, position: { x: 0, y: 0, width: 100, height: 15, unit: 'percent' as const }, zIndex: 2 },
      { name: 'Main', zoneType: 'main' as ZoneType, position: { x: 0, y: 15, width: 100, height: 85, unit: 'percent' as const }, zIndex: 1 },
    ],
  },
  {
    name: 'Main + Sidebar',
    description: 'Main content with right sidebar',
    zones: [
      { name: 'Main', zoneType: 'main' as ZoneType, position: { x: 0, y: 0, width: 75, height: 100, unit: 'percent' as const }, zIndex: 1 },
      { name: 'Sidebar', zoneType: 'sidebar' as ZoneType, position: { x: 75, y: 0, width: 25, height: 100, unit: 'percent' as const }, zIndex: 2 },
    ],
  },
  {
    name: 'L-Shape',
    description: 'Header + Main + Sidebar layout',
    zones: [
      { name: 'Header', zoneType: 'header' as ZoneType, position: { x: 0, y: 0, width: 100, height: 15, unit: 'percent' as const }, zIndex: 3 },
      { name: 'Main', zoneType: 'main' as ZoneType, position: { x: 0, y: 15, width: 75, height: 85, unit: 'percent' as const }, zIndex: 1 },
      { name: 'Sidebar', zoneType: 'sidebar' as ZoneType, position: { x: 75, y: 15, width: 25, height: 85, unit: 'percent' as const }, zIndex: 2 },
    ],
  },
  {
    name: 'Full + Ticker',
    description: 'Main content with bottom ticker',
    zones: [
      { name: 'Main', zoneType: 'main' as ZoneType, position: { x: 0, y: 0, width: 100, height: 90, unit: 'percent' as const }, zIndex: 1 },
      { name: 'Ticker', zoneType: 'ticker' as ZoneType, position: { x: 0, y: 90, width: 100, height: 10, unit: 'percent' as const }, zIndex: 2 },
    ],
  },
];
