/**
 * TagCloud Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';
import type { CMSTag } from '@/lib/cms/client';

export const TagCloudBlock = ({ node }: BlockRendererProps) => {
  const { limit = 20, minSize = 12, maxSize = 24, data } = node.props;

  // Get tags from injected data
  const tags: CMSTag[] = data?.tags || [];

  if (tags.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-sm text-gray-600">No tags found</div>
      </div>
    );
  }

  const maxCount = Math.max(...tags.map((t) => t.count));
  const minCount = Math.min(...tags.map((t) => t.count));

  const getFontSize = (count: number) => {
    if (maxCount === minCount) return (minSize + maxSize) / 2;
    const ratio = (count - minCount) / (maxCount - minCount);
    return minSize + ratio * (maxSize - minSize);
  };

  return (
    <div className="flex flex-wrap gap-3">
      {tags.slice(0, limit).map((tag) => (
        <a
          key={tag.id}
          href={`/tag/${tag.slug}`}
          className="hover:text-blue-600 transition-colors"
          style={{ fontSize: `${getFontSize(tag.count)}px` }}
        >
          {tag.name}
        </a>
      ))}
    </div>
  );
};
