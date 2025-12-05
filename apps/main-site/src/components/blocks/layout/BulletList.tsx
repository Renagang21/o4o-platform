/**
 * BulletList Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const BulletListBlock = ({ node }: BlockRendererProps) => {
  const {
    items = [],
    listStyle = 'bullet',
    gap = 'md',
  } = node.props;

  const gapClasses = {
    sm: 'space-y-1',
    md: 'space-y-2',
    lg: 'space-y-4',
  };

  const ListTag = listStyle === 'numbered' ? 'ol' : 'ul';
  const listStyleClass =
    listStyle === 'bullet'
      ? 'list-disc list-inside'
      : listStyle === 'numbered'
      ? 'list-decimal list-inside'
      : 'list-none';

  return (
    <ListTag className={`${listStyleClass} ${gapClasses[gap as keyof typeof gapClasses] || 'space-y-2'}`}>
      {items.map((item: string, index: number) => (
        <li key={index} className="text-gray-700">
          {listStyle === 'checkmark' && <span className="mr-2">✓</span>}
          {item}
        </li>
      ))}
    </ListTag>
  );
};
