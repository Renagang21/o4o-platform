/**
 * RoleCardBlock Component
 *
 * 팀원, 역할, 담당자 소개 카드
 * - 프로필 이미지 + 이름 + 직책 + 설명
 * - 소셜 링크 (선택)
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { User, Mail, Linkedin, Twitter } from 'lucide-react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface RoleCardBlockProps {
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
    imageUrl?: string;
    name?: string;
    role?: string;
    description?: string;
    email?: string;
    linkedin?: string;
    twitter?: string;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    roleColor?: string;
  };
}

const RoleCardBlock: React.FC<RoleCardBlockProps> = ({
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
  const imageUrl = attributes.imageUrl || '';
  const name = attributes.name || '이름';
  const role = attributes.role || '직책';
  const description = attributes.description || '담당 업무 또는 소개를 입력하세요';
  const email = attributes.email || '';
  const linkedin = attributes.linkedin || '';
  const twitter = attributes.twitter || '';
  const backgroundColor = attributes.backgroundColor || '#ffffff';
  const borderColor = attributes.borderColor || '#e5e7eb';
  const textColor = attributes.textColor || '#111827';
  const roleColor = attributes.roleColor || '#6b7280';

  const handleAttributeChange = (key: string, value: any) => {
    onChange(content, { ...attributes, [key]: value });
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="role-card"
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      isSelected={isSelected}
      onSelect={onSelect}
      label="역할 카드"
    >
      {/* Inspector Controls */}
      <div className="inspector-slot">
        <div className="space-y-4">
          {/* 이미지 URL */}
          <div>
            <Label className="text-sm font-medium mb-2 block">프로필 이미지 URL</Label>
            <Input
              value={imageUrl}
              onChange={(e) => handleAttributeChange('imageUrl', e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {/* 이름 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">이름</Label>
            <Input
              value={name}
              onChange={(e) => handleAttributeChange('name', e.target.value)}
              placeholder="홍길동"
            />
          </div>

          {/* 직책 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">직책/역할</Label>
            <Input
              value={role}
              onChange={(e) => handleAttributeChange('role', e.target.value)}
              placeholder="팀장"
            />
          </div>

          {/* 설명 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">설명</Label>
            <Textarea
              value={description}
              onChange={(e) => handleAttributeChange('description', e.target.value)}
              placeholder="담당 업무 또는 소개를 입력하세요"
              rows={3}
            />
          </div>

          {/* 소셜 링크 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">이메일</Label>
            <Input
              value={email}
              onChange={(e) => handleAttributeChange('email', e.target.value)}
              placeholder="email@example.com"
              type="email"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">LinkedIn URL</Label>
            <Input
              value={linkedin}
              onChange={(e) => handleAttributeChange('linkedin', e.target.value)}
              placeholder="https://linkedin.com/in/username"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Twitter URL</Label>
            <Input
              value={twitter}
              onChange={(e) => handleAttributeChange('twitter', e.target.value)}
              placeholder="https://twitter.com/username"
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
        </div>
      </div>

      {/* Block Content */}
      <div
        className="role-card p-6 border rounded-lg text-center"
        style={{
          backgroundColor,
          borderColor,
        }}
      >
        {/* Profile Image */}
        <div className="mb-4 flex justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-24 h-24 rounded-full object-cover border-2"
              style={{ borderColor }}
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2"
              style={{ borderColor }}
            >
              <User className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Name */}
        <h3
          className="text-xl font-bold mb-1"
          style={{ color: textColor }}
        >
          {name}
        </h3>

        {/* Role */}
        <p
          className="text-sm font-medium mb-3"
          style={{ color: roleColor }}
        >
          {role}
        </p>

        {/* Description */}
        <p
          className="text-sm mb-4 whitespace-pre-wrap"
          style={{ color: textColor }}
        >
          {description}
        </p>

        {/* Social Links */}
        {(email || linkedin || twitter) && (
          <div className="flex justify-center gap-3 pt-3 border-t" style={{ borderColor }}>
            {email && (
              <a
                href={`mailto:${email}`}
                className="text-gray-600 hover:text-blue-600 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Mail className="w-5 h-5" />
              </a>
            )}
            {linkedin && (
              <a
                href={linkedin}
                className="text-gray-600 hover:text-blue-600 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            )}
            {twitter && (
              <a
                href={twitter}
                className="text-gray-600 hover:text-blue-600 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Twitter className="w-5 h-5" />
              </a>
            )}
          </div>
        )}
      </div>
    </EnhancedBlockWrapper>
  );
};

export default RoleCardBlock;
