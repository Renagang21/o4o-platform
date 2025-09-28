import React from 'react';

interface BlockPatternsBrowserProps {
  onInsertPattern: (pattern: any) => void;
  compact?: boolean;
}

const BlockPatternsBrowser: React.FC<BlockPatternsBrowserProps> = ({ 
  onInsertPattern, 
  compact = false 
}) => {
  // Placeholder patterns
  const patterns = [
    {
      id: 'hero-with-cta',
      name: 'Hero with CTA',
      description: 'Hero section with call-to-action button',
      category: 'headers'
    },
    {
      id: 'three-column-features',
      name: 'Three Column Features',
      description: 'Feature showcase in three columns',
      category: 'features'
    },
    {
      id: 'testimonial-cards',
      name: 'Testimonial Cards',
      description: 'Customer testimonials in card layout',
      category: 'testimonials'
    },
    {
      id: 'simple-cta',
      name: 'Simple CTA',
      description: 'Simple call-to-action section',
      category: 'cta'
    }
  ];

  return (
    <div className={`block-patterns-browser ${compact ? 'compact' : ''}`}>
      <div className="patterns-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {patterns.map((pattern) => (
          <div
            key={pattern.id}
            className="pattern-card p-4 border rounded-lg cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
            onClick={() => onInsertPattern(pattern)}
          >
            <div className="pattern-preview bg-gray-100 rounded mb-3 h-24 flex items-center justify-center">
              <span className="text-sm text-gray-500">Pattern Preview</span>
            </div>
            <h3 className="font-medium text-sm mb-1">{pattern.name}</h3>
            <p className="text-xs text-gray-600">{pattern.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlockPatternsBrowser;