/**
 * ContentPreview Component
 *
 * 콘텐츠 채널별 미리보기 컴포넌트
 * - 웹/모바일/소셜 미리보기
 * - 공유 링크/임베드 코드 생성
 */

import { useState } from 'react';
import type { Content } from '../types/ContentTypes.js';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_ICONS,
  STATUS_LABELS,
  VISIBILITY_LABELS,
  OWNER_TYPE_LABELS,
} from '../types/ContentTypes.js';

interface ContentPreviewProps {
  content: Content;
  shareLink?: string;
  embedCode?: string;
  onCopyLink?: () => void;
  onCopyEmbed?: () => void;
}

type PreviewChannel = 'web' | 'mobile' | 'social';

export function ContentPreview({
  content,
  shareLink,
  embedCode,
  onCopyLink,
  onCopyEmbed,
}: ContentPreviewProps) {
  const [activeChannel, setActiveChannel] = useState<PreviewChannel>('web');
  const [copied, setCopied] = useState<'link' | 'embed' | null>(null);

  const handleCopyLink = async () => {
    if (shareLink) {
      await navigator.clipboard.writeText(shareLink);
      setCopied('link');
      onCopyLink?.();
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleCopyEmbed = async () => {
    if (embedCode) {
      await navigator.clipboard.writeText(embedCode);
      setCopied('embed');
      onCopyEmbed?.();
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const channels: { id: PreviewChannel; label: string; icon: string }[] = [
    { id: 'web', label: '웹', icon: '🖥️' },
    { id: 'mobile', label: '모바일', icon: '📱' },
    { id: 'social', label: '소셜', icon: '📲' },
  ];

  return (
    <div className="space-y-6">
      {/* 메타 정보 */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <div className="text-xs text-gray-500 mb-1">콘텐츠 유형</div>
          <div className="flex items-center gap-1">
            <span>{CONTENT_TYPE_ICONS[content.type]}</span>
            <span className="font-medium">{CONTENT_TYPE_LABELS[content.type]}</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">상태</div>
          <div className="font-medium">{STATUS_LABELS[content.status]}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">공개 범위</div>
          <div className="font-medium">{VISIBILITY_LABELS[content.visibility]}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">소유 주체</div>
          <div className="font-medium">
            {content.owner.name} ({OWNER_TYPE_LABELS[content.owner.type]})
          </div>
        </div>
      </div>

      {/* 사용처 */}
      {content.usedIn.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">사용처</h4>
          <div className="space-y-2">
            {content.usedIn.map((usage, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm"
              >
                <span className="text-lg">📍</span>
                <div>
                  <span className="font-medium">{usage.service}</span>
                  <span className="text-gray-500"> - {usage.location}</span>
                </div>
                <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  {usage.referenceType}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 채널별 미리보기 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">채널별 미리보기</h4>
          <div className="flex gap-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setActiveChannel(channel.id)}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  activeChannel === channel.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {channel.icon} {channel.label}
              </button>
            ))}
          </div>
        </div>

        {/* 미리보기 프레임 */}
        <div
          className={`border border-gray-200 rounded-lg overflow-hidden bg-white ${
            activeChannel === 'mobile' ? 'max-w-[375px] mx-auto' : ''
          }`}
        >
          {/* 이미지 */}
          {content.imageUrl && (
            <img
              src={content.imageUrl}
              alt={content.title}
              className={`w-full object-cover ${
                activeChannel === 'social' ? 'aspect-square' : 'h-48'
              }`}
            />
          )}

          {/* 본문 */}
          <div className={`p-4 ${activeChannel === 'mobile' ? 'text-sm' : ''}`}>
            <h2
              className={`font-bold text-gray-900 ${
                activeChannel === 'mobile' ? 'text-lg' : 'text-xl'
              }`}
            >
              {content.title}
            </h2>
            {content.summary && (
              <p className="mt-2 text-gray-600">{content.summary}</p>
            )}
            <div
              className="mt-4 prose max-w-none"
              dangerouslySetInnerHTML={{ __html: content.body }}
            />

            {/* 태그 (소셜 채널) */}
            {activeChannel === 'social' && content.tags.length > 0 && (
              <div className="mt-4 text-blue-600">
                {content.tags.map((tag) => `#${tag}`).join(' ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 공유 도구 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">공유</h4>

        {/* 공유 링크 */}
        {shareLink && (
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareLink}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              {copied === 'link' ? '✓ 복사됨' : '🔗 링크 복사'}
            </button>
          </div>
        )}

        {/* 임베드 코드 */}
        {embedCode && (
          <div>
            <div className="text-xs text-gray-500 mb-1">임베드 코드</div>
            <div className="flex gap-2">
              <textarea
                readOnly
                value={embedCode}
                rows={2}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 font-mono resize-none"
              />
              <button
                onClick={handleCopyEmbed}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 self-start"
              >
                {copied === 'embed' ? '✓ 복사됨' : '📋 복사'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ContentPreview;
