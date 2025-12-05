/**
 * Additional Block - BulletList
 *
 * Bullet or numbered list
 */

export interface BulletListProps {
  items?: string[];
  type?: 'bullet' | 'number' | 'check';
  spacing?: 'tight' | 'normal' | 'relaxed';
}

const spacingClasses = {
  tight: 'space-y-1',
  normal: 'space-y-2',
  relaxed: 'space-y-4',
};

export default function BulletList({
  items = ['Item 1', 'Item 2', 'Item 3'],
  type = 'bullet',
  spacing = 'normal',
}: BulletListProps) {
  if (type === 'number') {
    return (
      <ol className={`list-decimal list-inside ${spacingClasses[spacing]} text-gray-700`}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>
    );
  }

  if (type === 'check') {
    return (
      <ul className={`${spacingClasses[spacing]}`}>
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span className="text-gray-700">{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  // Default: bullet
  return (
    <ul className={`list-disc list-inside ${spacingClasses[spacing]} text-gray-700`}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
