/**
 * Content Block Constants
 *
 * WO-O4O-CONTENT-BLOCK-LIBRARY-SPLIT-V1
 * Extracted from ContentBlockLibrary.tsx
 */

import type { ContentBlockType } from '@/lib/api/signageV2';
import {
  Type,
  Image,
  Film,
  Code,
  Clock,
  Cloud,
  Rss,
  QrCode,
  Box,
  ShoppingBag,
} from 'lucide-react';

export const BLOCK_TYPE_CONFIGS: Record<ContentBlockType, { label: string; icon: typeof Type; color: string; description: string }> = {
  text: { label: 'Text', icon: Type, color: 'bg-blue-500', description: 'Static or dynamic text content' },
  image: { label: 'Image', icon: Image, color: 'bg-green-500', description: 'Display images from URL or upload' },
  video: { label: 'Video', icon: Film, color: 'bg-purple-500', description: 'Embed video content' },
  html: { label: 'HTML', icon: Code, color: 'bg-orange-500', description: 'Custom HTML/CSS content' },
  clock: { label: 'Clock', icon: Clock, color: 'bg-cyan-500', description: 'Display current time' },
  weather: { label: 'Weather', icon: Cloud, color: 'bg-yellow-500', description: 'Weather widget' },
  rss: { label: 'RSS Feed', icon: Rss, color: 'bg-red-500', description: 'RSS/Atom feed reader' },
  qr: { label: 'QR Code', icon: QrCode, color: 'bg-indigo-500', description: 'Generate QR codes' },
  'corner-display': { label: '제품 표시', icon: ShoppingBag, color: 'bg-emerald-500', description: '선택한 코너의 제품을 자동으로 표시합니다' },
  custom: { label: 'Custom', icon: Box, color: 'bg-gray-500', description: 'Custom block type' },
};
