/**
 * PanelBody Component
 * Collapsible panel section for Inspector sidebar
 */

import React, { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PanelBodyProps {
  title: string;
  children: ReactNode;
  initialOpen?: boolean;
  className?: string;
}

export const PanelBody: React.FC<PanelBodyProps> = ({
  title,
  children,
  initialOpen = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <div className={`inspector-panel-section ${className}`}>
      <button
        className="inspector-panel-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="inspector-section-title">{title}</span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div className="inspector-controls">
          {children}
        </div>
      )}
    </div>
  );
};

export default PanelBody;
