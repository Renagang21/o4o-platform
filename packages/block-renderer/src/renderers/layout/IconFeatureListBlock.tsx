/**
 * IconFeatureList Block Renderer
 * 여러 개의 기능/특징을 아이콘과 함께 그리드/리스트로 표시
 */

import React from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';
import clsx from 'clsx';

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

const DEFAULT_FEATURES: FeatureItem[] = [
  {
    icon: 'check-circle',
    title: '기능 1',
    description: '첫 번째 주요 기능에 대한 설명입니다.',
  },
  {
    icon: 'check-circle',
    title: '기능 2',
    description: '두 번째 주요 기능에 대한 설명입니다.',
  },
  {
    icon: 'check-circle',
    title: '기능 3',
    description: '세 번째 주요 기능에 대한 설명입니다.',
  },
];

const getIconEmoji = (iconName: string): string => {
  const iconMap: Record<string, string> = {
    'check-circle': '✓',
    'star': '★',
    'zap': '⚡',
    'heart': '♥',
    'shield': '🛡',
    'rocket': '🚀',
    'target': '🎯',
    'award': '🏆',
  };
  return iconMap[iconName] || '●';
};

export const IconFeatureListBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const items = (getBlockData(block, 'items', DEFAULT_FEATURES) as FeatureItem[]) || DEFAULT_FEATURES;
  const columns = getBlockData(block, 'columns', 3) as number;
  const layout = getBlockData(block, 'layout', 'grid') as 'grid' | 'list';
  const iconPosition = getBlockData(block, 'iconPosition', 'top') as 'top' | 'left';
  const iconSize = getBlockData(block, 'iconSize', 48) as number;
  const iconColor = getBlockData(block, 'iconColor', '#0073aa') as string;
  const titleColor = getBlockData(block, 'titleColor', '#111827') as string;
  const descriptionColor = getBlockData(block, 'descriptionColor', '#6b7280') as string;
  const backgroundColor = getBlockData(block, 'backgroundColor', '#ffffff') as string;
  const borderColor = getBlockData(block, 'borderColor', '#e5e7eb') as string;
  const gap = getBlockData(block, 'gap', 24) as number;
  const className = getBlockData(block, 'className', '') as string;

  // Container classes
  const containerClasses = clsx(
    'icon-feature-list',
    layout === 'grid' ? 'grid' : 'flex flex-col',
    layout === 'grid' && `grid-cols-1 sm:grid-cols-2`,
    layout === 'grid' && columns === 3 && 'lg:grid-cols-3',
    layout === 'grid' && columns === 4 && 'lg:grid-cols-4',
    className
  );

  return (
    <div className={containerClasses} style={{ gap: `${gap}px` }}>
      {items.map((item, index) => (
        <div
          key={index}
          className={clsx(
            'feature-item rounded-lg p-6 border transition-all hover:shadow-md',
            'flex',
            iconPosition === 'top' ? 'flex-col items-center text-center' : 'flex-row items-start gap-4'
          )}
          style={{
            backgroundColor,
            borderColor,
          }}
        >
          {/* Icon */}
          <div
            className={clsx(
              'feature-icon flex items-center justify-center rounded-full font-bold flex-shrink-0',
              iconPosition === 'top' && 'mb-4'
            )}
            style={{
              width: `${iconSize}px`,
              height: `${iconSize}px`,
              backgroundColor: `${iconColor}20`,
              color: iconColor,
              fontSize: `${iconSize * 0.5}px`,
            }}
          >
            {getIconEmoji(item.icon)}
          </div>

          {/* Content */}
          <div className="feature-content flex-1">
            <h3
              className="feature-title font-semibold mb-2 text-lg"
              style={{ color: titleColor }}
            >
              {item.title}
            </h3>
            <p
              className="feature-description text-sm leading-relaxed"
              style={{ color: descriptionColor }}
            >
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default IconFeatureListBlock;
