/**
 * TagCloud Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';

export const TagCloudBlock = ({ node }: BlockRendererProps) => {
  const { limit = 20, minSize = 12, maxSize = 24 } = node.props;

  // TODO: Fetch actual tags with post counts from CMS API
  // For now, return mock data
  const mockTags = [
    { name: 'JavaScript', count: 45 },
    { name: 'React', count: 38 },
    { name: 'TypeScript', count: 32 },
    { name: 'Node.js', count: 28 },
    { name: 'CSS', count: 25 },
    { name: 'HTML', count: 20 },
    { name: 'Design', count: 15 },
    { name: 'UI/UX', count: 12 },
  ];

  const maxCount = Math.max(...mockTags.map((t) => t.count));
  const minCount = Math.min(...mockTags.map((t) => t.count));

  const getFontSize = (count: number) => {
    if (maxCount === minCount) return (minSize + maxSize) / 2;
    const ratio = (count - minCount) / (maxCount - minCount);
    return minSize + ratio * (maxSize - minSize);
  };

  return (
    <div className="flex flex-wrap gap-3">
      {mockTags.slice(0, limit).map((tag, i) => (
        <a
          key={i}
          href="#"
          className="hover:text-blue-600 transition-colors"
          style={{ fontSize: `${getFontSize(tag.count)}px` }}
        >
          {tag.name}
        </a>
      ))}
    </div>
  );
};
