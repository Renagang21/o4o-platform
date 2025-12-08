/**
 * Forum Utility Functions
 */

/**
 * Format a date string as relative time
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (days > 7) return date.toLocaleDateString('ko-KR');
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return '방금 전';
}

/**
 * Format a date string as full date
 */
export function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Generate excerpt from content blocks
 */
export function generateExcerpt(content: any[], maxLength = 200): string {
  if (!Array.isArray(content)) return '';

  const textContent = content
    .filter((block) => block.type === 'paragraph' || block.type === 'text')
    .map((block) => {
      if (typeof block.content === 'string') return block.content;
      if (Array.isArray(block.content)) {
        return block.content
          .map((item: any) => (typeof item === 'string' ? item : item.text || ''))
          .join('');
      }
      return '';
    })
    .join(' ');

  return truncateText(textContent, maxLength);
}
