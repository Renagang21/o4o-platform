/**
 * SectionCard Component
 * Collapsible section wrapper for organizing settings
 */

import React, { useState, ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface SectionCardProps {
  /**
   * Section title
   */
  title: string;

  /**
   * Optional icon component to display next to title
   */
  icon?: React.ComponentType<{ size?: number; className?: string }>;

  /**
   * Child content to render inside the section
   */
  children: ReactNode;

  /**
   * Whether the section is open by default
   * @default true
   */
  defaultOpen?: boolean;

  /**
   * Optional className for custom styling
   */
  className?: string;

  /**
   * Whether to show the border
   * @default true
   */
  bordered?: boolean;

  /**
   * Whether to add padding
   * @default true
   */
  padded?: boolean;
}

/**
 * SectionCard Component
 *
 * Provides a collapsible card layout pattern commonly used for organizing
 * related settings into sections. Includes optional icon and collapse/expand functionality.
 *
 * @example
 * ```tsx
 * <SectionCard
 *   title="Colors"
 *   icon={Palette}
 *   defaultOpen={true}
 * >
 *   <ColorInput label="Background" value="#fff" onChange={...} />
 *   <ColorInput label="Text" value="#000" onChange={...} />
 * </SectionCard>
 * ```
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  className = '',
  bordered = true,
  padded = true
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div
      className={`space-y-4 ${bordered ? 'p-4 border rounded-lg' : ''} ${className}`}
    >
      {/* Header */}
      <button
        onClick={toggleOpen}
        className="w-full flex items-center justify-between font-medium hover:opacity-70 transition-opacity"
        aria-expanded={isOpen}
        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${title} section`}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={18} />}
          <h4>{title}</h4>
        </div>
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>

      {/* Content */}
      {isOpen && (
        <div className={padded ? 'space-y-4' : ''}>
          {children}
        </div>
      )}
    </div>
  );
};
