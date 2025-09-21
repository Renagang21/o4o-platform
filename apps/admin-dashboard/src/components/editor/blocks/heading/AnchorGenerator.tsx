/**
 * AnchorGenerator Component
 * 헤딩 텍스트 기반 앵커 자동 생성 및 편집
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, RefreshCw, Copy, Check, Hash } from 'lucide-react';

interface AnchorGeneratorProps {
  headingText: string;
  currentAnchor?: string;
  onAnchorChange: (anchor: string) => void;
  existingAnchors?: string[];
}

export const AnchorGenerator: React.FC<AnchorGeneratorProps> = ({
  headingText,
  currentAnchor = '',
  onAnchorChange,
  existingAnchors = [],
}) => {
  const [localAnchor, setLocalAnchor] = useState(currentAnchor);
  const [isCopied, setIsCopied] = useState(false);

  // 한글/영문 슬러그 변환 함수
  const generateSlug = (text: string): string => {
    if (!text) return '';

    // 기본 정리
    let slug = text
      .toLowerCase()
      .trim()
      // HTML 태그 제거
      .replace(/<[^>]*>/g, '')
      // 특수 문자를 하이픈으로 변환
      .replace(/[^\w\sㄱ-ㅎ가-힣]/g, '-')
      // 연속된 공백을 하이픈으로
      .replace(/\s+/g, '-')
      // 연속된 하이픈을 하나로
      .replace(/-+/g, '-')
      // 앞뒤 하이픈 제거
      .replace(/^-|-$/g, '');

    // 한글 처리 (간단한 로마자 변환)
    const koreanToRoman: { [key: string]: string } = {
      '가': 'ga', '나': 'na', '다': 'da', '라': 'ra', '마': 'ma',
      '바': 'ba', '사': 'sa', '아': 'a', '자': 'ja', '차': 'cha',
      '카': 'ka', '타': 'ta', '파': 'pa', '하': 'ha',
      '개': 'gae', '내': 'nae', '대': 'dae', '래': 'rae', '매': 'mae',
      '배': 'bae', '새': 'sae', '애': 'ae', '재': 'jae', '채': 'chae',
      '케': 'ke', '테': 'te', '페': 'pe', '헤': 'he',
      // 추가적인 매핑...
    };

    // 한글이 포함된 경우 로마자 변환 시도
    if (/[ㄱ-ㅎ가-힣]/.test(slug)) {
      const romanized = slug.replace(/[가-힣]/g, (char) => {
        return koreanToRoman[char] || char;
      });

      // 여전히 한글이 남아있으면 간단히 처리
      if (/[ㄱ-ㅎ가-힣]/.test(romanized)) {
        slug = slug.replace(/[ㄱ-ㅎ가-힣]/g, '');
      } else {
        slug = romanized;
      }
    }

    // 최종 정리
    slug = slug
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return slug || 'heading';
  };

  // 중복 방지 넘버링
  const ensureUnique = (baseSlug: string): string => {
    if (!existingAnchors.includes(baseSlug)) {
      return baseSlug;
    }

    let counter = 2;
    let uniqueSlug = `${baseSlug}-${counter}`;

    while (existingAnchors.includes(uniqueSlug)) {
      counter++;
      uniqueSlug = `${baseSlug}-${counter}`;
    }

    return uniqueSlug;
  };

  // 헤딩 텍스트가 변경되면 자동으로 앵커 생성
  useEffect(() => {
    if (headingText && !localAnchor) {
      const generatedSlug = generateSlug(headingText);
      const uniqueSlug = ensureUnique(generatedSlug);
      setLocalAnchor(uniqueSlug);
      onAnchorChange(uniqueSlug);
    }
  }, [headingText]);

  // 앵커 재생성
  const handleRegenerate = () => {
    const newSlug = generateSlug(headingText);
    const uniqueSlug = ensureUnique(newSlug);
    setLocalAnchor(uniqueSlug);
    onAnchorChange(uniqueSlug);
  };

  // 앵커 변경
  const handleAnchorChange = (newAnchor: string) => {
    // 유효한 HTML ID 형식으로 정리
    const cleanAnchor = newAnchor
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    setLocalAnchor(cleanAnchor);
    onAnchorChange(cleanAnchor);
  };

  // 앵커 링크 복사
  const copyAnchorLink = async () => {
    if (localAnchor) {
      const fullUrl = `${window.location.origin}${window.location.pathname}#${localAnchor}`;
      try {
        await navigator.clipboard.writeText(fullUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = fullUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    }
  };

  // 앵커 유효성 검증
  const isValidAnchor = (anchor: string): boolean => {
    return /^[a-z][a-z0-9-_]*$/.test(anchor);
  };

  const isDuplicate = existingAnchors.includes(localAnchor);
  const isValid = isValidAnchor(localAnchor);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link className="h-4 w-4" />
        <Label className="text-sm font-medium">Anchor Link</Label>
      </div>

      {/* Anchor Input */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Anchor ID</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
            <Input
              value={localAnchor}
              onChange={(e) => handleAnchorChange(e.target.value)}
              placeholder="heading-anchor"
              className={`
                pl-7 text-xs
                ${!isValid ? 'border-red-300 focus:border-red-500' :
                  isDuplicate ? 'border-yellow-300 focus:border-yellow-500' :
                  'border-green-300 focus:border-green-500'}
              `}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            className="px-2"
            title="Regenerate anchor"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        {/* Validation Messages */}
        {!isValid && localAnchor && (
          <p className="text-xs text-red-500">
            Must start with letter, use only lowercase letters, numbers, hyphens, and underscores
          </p>
        )}
        {isDuplicate && isValid && (
          <p className="text-xs text-yellow-600">
            This anchor already exists. Please choose a different one.
          </p>
        )}
        {isValid && !isDuplicate && localAnchor && (
          <p className="text-xs text-green-600">
            ✓ Valid and unique anchor
          </p>
        )}
      </div>

      {/* Generated URL Preview */}
      {localAnchor && isValid && !isDuplicate && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-700">Preview URL</Label>
          <div className="flex gap-2">
            <div className="flex-1 p-2 bg-white rounded border text-xs text-gray-600 font-mono">
              {window.location.origin}{window.location.pathname}#{localAnchor}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyAnchorLink}
              className="px-2"
              title="Copy link"
            >
              {isCopied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Auto-generation Settings */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Auto-generation</Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLocalAnchor('');
              onAnchorChange('');
            }}
            className="flex-1 text-xs"
          >
            Clear Anchor
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            className="flex-1 text-xs"
          >
            Auto Generate
          </Button>
        </div>
      </div>

      {/* Tips */}
      <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
        <p><strong>Tip:</strong> Anchors enable direct linking to this heading</p>
        <p><strong>Format:</strong> lowercase-with-hyphens</p>
        <p><strong>Korean:</strong> Automatically converted to roman letters</p>
      </div>
    </div>
  );
};

export default AnchorGenerator;