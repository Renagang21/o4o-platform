/**
 * useBlockPatterns Hook
 * Manages block patterns state and operations for WordPress block editor integration
 */

import { useState, useCallback } from 'react';

// Generate unique client ID for blocks
const generateClientId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to convert WordPress blocks to pattern blocks
const convertBlocksToPatternBlocks = (blocks: any[]): PatternBlock[] => {
  return blocks.map(block => ({
    name: block.name,
    attributes: block.attributes,
    innerBlocks: block.innerBlocks ? convertBlocksToPatternBlocks(block.innerBlocks) : undefined,
    innerHTML: block.innerHTML
  }));
};

// Transform pattern to WordPress blocks
const transformPatternToBlocks = (pattern: BlockPattern): any[] => {
  // Transform pattern content to WordPress block format
  const transformBlock = (patternBlock: PatternBlock): any => {
    const block: any = {
      name: patternBlock.name,
      attributes: patternBlock.attributes || {},
      innerBlocks: [],
      innerHTML: patternBlock.innerHTML || ''
    };

    if (patternBlock.innerBlocks && patternBlock.innerBlocks.length > 0) {
      block.innerBlocks = patternBlock.innerBlocks.map(transformBlock);
    }

    // Generate client ID for WordPress block editor
    block.clientId = generateClientId();

    return block;
  };

  return pattern.content.map(transformBlock);
};

interface PatternBlock {
  name: string;
  attributes?: Record<string, any>;
  innerBlocks?: PatternBlock[];
  innerHTML?: string;
}

interface BlockPattern {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content: PatternBlock[];
  category: string;
  subcategories?: string[];
  tags: string[];
  preview?: {
    html?: string;
    css?: string;
    screenshot?: string;
    width?: number;
    height?: number;
  };
  source: 'core' | 'theme' | 'plugin' | 'user';
  featured: boolean;
  usageCount: number;
  lastUsedAt?: string;
  visibility: 'public' | 'private' | 'pro';
  isPremium: boolean;
  metadata?: any;
  author: {
    id: string;
    name: string;
  };
  version: string;
  dependencies?: string[];
  colorScheme?: string[];
  typography?: any;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface CreatePatternData {
  title: string;
  description?: string;
  content: PatternBlock[];
  category?: string;
  subcategories?: string[];
  tags?: string[];
  visibility?: 'public' | 'private' | 'pro';
  metadata?: any;
  dependencies?: string[];
  colorScheme?: string[];
  typography?: any;
}

interface UseBlockPatternsReturn {
  // State
  loading: boolean;
  error: string | null;
  
  // Operations
  insertBlockPattern: (patternId: string) => Promise<any[] | null>;
  createBlockPattern: (data: CreatePatternData) => Promise<BlockPattern | null>;
  duplicateBlockPattern: (patternId: string) => Promise<BlockPattern | null>;
  deleteBlockPattern: (patternId: string) => Promise<boolean>;
  updateBlockPattern: (patternId: string, updates: Partial<CreatePatternData>) => Promise<BlockPattern | null>;
  
  // Utility functions
  convertBlocksToPattern: (selectedBlocks: any[]) => CreatePatternData;
  transformPatternToBlocks: (pattern: BlockPattern) => any[];
  validatePatternCompatibility: (pattern: BlockPattern, availableBlocks: string[]) => boolean;
  applyPatternStyles: (pattern: BlockPattern, targetElement: HTMLElement) => void;
}

export const useBlockPatterns = (): UseBlockPatternsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Insert block pattern into editor
  const insertBlockPattern = useCallback(async (patternId: string): Promise<any[] | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/block-patterns/${patternId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch block pattern');
      }

      const pattern = await response.json();
      
      // Transform pattern blocks to WordPress blocks
      const blocks = transformPatternToBlocks(pattern);
      
      return blocks;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error inserting block pattern:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new block pattern
  const createBlockPattern = useCallback(async (data: CreatePatternData): Promise<BlockPattern | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/block-patterns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create block pattern');
      }

      const savedPattern = await response.json();
      return savedPattern;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error creating block pattern:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Duplicate block pattern
  const duplicateBlockPattern = useCallback(async (patternId: string): Promise<BlockPattern | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/block-patterns/${patternId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to duplicate block pattern');
      }

      const duplicatedPattern = await response.json();
      return duplicatedPattern;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error duplicating block pattern:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete block pattern
  const deleteBlockPattern = useCallback(async (patternId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/block-patterns/${patternId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete block pattern');
      }

      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error deleting block pattern:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update block pattern
  const updateBlockPattern = useCallback(async (patternId: string, updates: Partial<CreatePatternData>): Promise<BlockPattern | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/block-patterns/${patternId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update block pattern');
      }

      const updatedPattern = await response.json();
      return updatedPattern;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error updating block pattern:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Convert selected blocks to pattern data
  const convertBlocksToPattern = useCallback((selectedBlocks: any[]): CreatePatternData => {
    // Extract pattern content from WordPress blocks
    const patternBlocks: PatternBlock[] = selectedBlocks.map(block => ({
      name: block.name,
      attributes: block.attributes,
      innerBlocks: block.innerBlocks ? convertBlocksToPatternBlocks(block.innerBlocks) : undefined,
      innerHTML: block.innerHTML
    }));

    // Analyze blocks to determine best category
    const blockTypes = selectedBlocks.map(b => b.name);
    let category = 'general';
    
    if (blockTypes.includes('core/navigation') || blockTypes.includes('core/site-logo')) {
      category = 'header';
    } else if (blockTypes.includes('core/heading') && blockTypes.includes('core/buttons')) {
      category = 'hero';
    } else if (blockTypes.includes('core/columns') && blockTypes.length > 3) {
      category = 'features';
    } else if (blockTypes.includes('core/quote') || blockTypes.includes('core/testimonial')) {
      category = 'testimonials';
    }

    // Generate default title
    const defaultTitle = `Custom ${category.charAt(0).toUpperCase() + category.slice(1)} Pattern`;

    return {
      title: defaultTitle,
      description: `A custom ${category} pattern created from selected blocks`,
      content: patternBlocks,
      category,
      tags: [],
      visibility: 'private',
      metadata: {
        blockTypes,
        createdFrom: 'editor'
      }
    };
  }, []);

  // Validate pattern compatibility
  const validatePatternCompatibility = useCallback((pattern: BlockPattern, availableBlocks: string[]): boolean => {
    if (!pattern.dependencies || pattern.dependencies.length === 0) {
      return true;
    }

    // Check if all required blocks are available
    const requiredBlocks = pattern.metadata?.blockTypes || [];
    return requiredBlocks.every((blockType: string) => availableBlocks.includes(blockType));
  }, []);

  // Apply pattern styles to target element
  const applyPatternStyles = useCallback((pattern: BlockPattern, targetElement: HTMLElement): void => {
    // Apply color scheme
    if (pattern.colorScheme && pattern.colorScheme.length > 0) {
      pattern.colorScheme.forEach((color, index) => {
        targetElement.style.setProperty(`--pattern-color-${index + 1}`, color);
      });
    }

    // Apply typography
    if (pattern.typography) {
      if (pattern.typography.fontFamily) {
        targetElement.style.fontFamily = pattern.typography.fontFamily;
      }
      if (pattern.typography.fontSize) {
        targetElement.style.fontSize = pattern.typography.fontSize;
      }
      if (pattern.typography.lineHeight) {
        targetElement.style.lineHeight = pattern.typography.lineHeight;
      }
      if (pattern.typography.fontWeight) {
        targetElement.style.fontWeight = pattern.typography.fontWeight;
      }
    }

    // Apply custom CSS if provided
    if (pattern.preview?.css) {
      const styleElement = document.createElement('style');
      styleElement.textContent = pattern.preview.css;
      targetElement.appendChild(styleElement);
    }
  }, []);

  return {
    loading,
    error,
    insertBlockPattern,
    createBlockPattern,
    duplicateBlockPattern,
    deleteBlockPattern,
    updateBlockPattern,
    convertBlocksToPattern,
    transformPatternToBlocks,
    validatePatternCompatibility,
    applyPatternStyles
  };
};

export default useBlockPatterns;