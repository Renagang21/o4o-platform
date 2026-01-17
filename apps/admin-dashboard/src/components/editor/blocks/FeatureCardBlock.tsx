/**
 * FeatureCardBlock Component
 *
 * 기능/서비스 특징을 카드 형태로 표시
 * - 아이콘 + 제목 + 설명
 * - 링크 연결 가능
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Star, Zap, Shield, Heart, TrendingUp, Award } from 'lucide-react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ICON_OPTIONS = {
  star: Star,
  zap: Zap,
  shield: Shield,
  heart: Heart,
  trending: TrendingUp,
  award: Award,
};

interface FeatureCardBlockProps {
  id: string;
  content?: Record<string, unknown>;
  onChange: (content: Record<string, unknown>, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    icon?: keyof typeof ICON_OPTIONS;
    title?: string;
    description?: string;
    link?: string;
    backgroundColor?: string;
    borderColor?: string;
    iconColor?: string;
    titleColor?: string;
    descriptionColor?: string;
    iconSize?: number;
  };
}

const FeatureCardBlock: React.FC<FeatureCardBlockProps> = ({
  id,
  content = {},
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {},
}) => {
  const icon = attributes.icon || 'star';
  const title = attributes.title || '기능 제목';
  const description = attributes.description || '기능 설명을 입력하세요';
  const link = attributes.link || '';
  const backgroundColor = attributes.backgroundColor || '#ffffff';
  const borderColor = attributes.borderColor || '#e5e7eb';
  const iconColor = attributes.iconColor || '#0073aa';
  const titleColor = attributes.titleColor || '#111827';
  const descriptionColor = attributes.descriptionColor || '#6b7280';
  const iconSize = attributes.iconSize || 48;

  const handleAttributeChange = (key: string, value: any) => {
    onChange(content, { ...attributes, [key]: value });
  };

  const IconComponent = ICON_OPTIONS[icon];

  const cardContent = (
    <div
      className="feature-card p-6 border rounded-lg hover:shadow-lg transition-shadow"
      style={{
        backgroundColor,
        borderColor,
      }}
    >
      {/* Icon */}
      <div className="mb-4">
        <IconComponent
          style={{
            color: iconColor,
            width: iconSize,
            height: iconSize,
          }}
        />
      </div>

      {/* Title */}
      <h3
        className="text-xl font-bold mb-2"
        style={{ color: titleColor }}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className="text-sm whitespace-pre-wrap"
        style={{ color: descriptionColor }}
      >
        {description}
      </p>
    </div>
  );

  return (
    <EnhancedBlockWrapper
      id={id}
      type="feature-card"
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      isSelected={isSelected}
      onSelect={onSelect}
      label="기능 카드"
    >
      {/* Inspector Controls */}
      <div className="inspector-slot">
        <div className="space-y-4">
          {/* 아이콘 선택 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">아이콘</Label>
            <Select value={icon} onValueChange={(value) => handleAttributeChange('icon', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="star">⭐ 별</SelectItem>
                <SelectItem value="zap">⚡ 번개</SelectItem>
                <SelectItem value="shield">🛡️ 방패</SelectItem>
                <SelectItem value="heart">❤️ 하트</SelectItem>
                <SelectItem value="trending">📈 트렌드</SelectItem>
                <SelectItem value="award">🏆 상</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 제목 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">제목</Label>
            <Input
              value={title}
              onChange={(e) => handleAttributeChange('title', e.target.value)}
              placeholder="기능 제목"
            />
          </div>

          {/* 설명 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">설명</Label>
            <Textarea
              value={description}
              onChange={(e) => handleAttributeChange('description', e.target.value)}
              placeholder="기능 설명을 입력하세요"
              rows={3}
            />
          </div>

          {/* 링크 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">링크 (선택)</Label>
            <Input
              value={link}
              onChange={(e) => handleAttributeChange('link', e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* 아이콘 크기 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">아이콘 크기 (px)</Label>
            <Input
              type="number"
              value={iconSize}
              onChange={(e) => handleAttributeChange('iconSize', parseInt(e.target.value) || 48)}
              min={24}
              max={128}
            />
          </div>

          {/* 색상 설정 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">배경 색상</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={backgroundColor}
                onChange={(e) => handleAttributeChange('backgroundColor', e.target.value)}
                className="w-16 h-10"
              />
              <Input
                type="text"
                value={backgroundColor}
                onChange={(e) => handleAttributeChange('backgroundColor', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">아이콘 색상</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={iconColor}
                onChange={(e) => handleAttributeChange('iconColor', e.target.value)}
                className="w-16 h-10"
              />
              <Input
                type="text"
                value={iconColor}
                onChange={(e) => handleAttributeChange('iconColor', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Block Content */}
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="block">
          {cardContent}
        </a>
      ) : (
        cardContent
      )}
    </EnhancedBlockWrapper>
  );
};

export default FeatureCardBlock;
