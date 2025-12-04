/**
 * CMS Block - TagCloud
 *
 * Tag Cloud - Displays tags with varying sizes based on usage
 */

export interface TagCloudProps {
  taxonomy?: string;
  minSize?: number;
  maxSize?: number;
  limit?: number;
  orderBy?: 'name' | 'count';
}

export default function TagCloud({
  taxonomy = 'post_tag',
  minSize = 12,
  maxSize = 24,
  limit = 30,
  orderBy = 'count',
}: TagCloudProps) {
  // Sample tags with varying counts for preview
  const tags = [
    { name: 'React', count: 45 },
    { name: 'JavaScript', count: 38 },
    { name: 'TypeScript', count: 30 },
    { name: 'Node.js', count: 25 },
    { name: 'CSS', count: 20 },
    { name: 'Design', count: 15 },
    { name: 'API', count: 12 },
    { name: 'Testing', count: 10 },
    { name: 'Security', count: 8 },
    { name: 'Performance', count: 5 },
  ];

  // Calculate font size based on count
  const maxCount = Math.max(...tags.map(t => t.count));
  const minCount = Math.min(...tags.map(t => t.count));

  const getFontSize = (count: number) => {
    if (maxCount === minCount) return maxSize;
    const ratio = (count - minCount) / (maxCount - minCount);
    return minSize + ratio * (maxSize - minSize);
  };

  return (
    <div className="py-4">
      {/* Header Info */}
      <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
        🏷️ Tag Cloud: {taxonomy} • {limit} tags • Sort by {orderBy}
      </div>

      {/* Tag Cloud */}
      <div className="flex flex-wrap gap-3 items-center">
        {tags.slice(0, Math.min(tags.length, limit)).map((tag, i) => (
          <a
            key={i}
            href="#"
            className="hover:text-blue-600 transition-colors"
            style={{
              fontSize: `${getFontSize(tag.count)}px`,
              opacity: 0.6 + (tag.count / maxCount) * 0.4,
            }}
          >
            {tag.name}
          </a>
        ))}
      </div>
    </div>
  );
}
