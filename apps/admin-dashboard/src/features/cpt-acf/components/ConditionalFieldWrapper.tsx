/**
 * Conditional Field Wrapper Component
 * Wraps a field and handles conditional show/hide with animation
 */

import React, { useState, useEffect } from 'react';
import type { CustomField } from '../types/acf.types';

interface ConditionalFieldWrapperProps {
  field: CustomField;
  isVisible: boolean;
  children: React.ReactNode;
  animationDuration?: number; // in ms
}

export const ConditionalFieldWrapper: React.FC<ConditionalFieldWrapperProps> = ({
  field,
  isVisible,
  children,
  animationDuration = 200,
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Show immediately
      setShouldRender(true);
      // Trigger animation after render
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      // Start hide animation
      setIsAnimating(false);
      // Remove from DOM after animation
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, animationDuration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, animationDuration]);

  // Don't render at all if not visible and animation complete
  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`
        conditional-field-wrapper
        transition-all duration-${animationDuration}
        ${isAnimating ? 'opacity-100 max-h-screen' : 'opacity-0 max-h-0 overflow-hidden'}
      `}
      style={{
        transitionDuration: `${animationDuration}ms`,
      }}
      data-field-name={field.name}
      data-visible={isVisible}
    >
      {children}
    </div>
  );
};

export default ConditionalFieldWrapper;
