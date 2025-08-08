/**
 * useReusableBlocks Hook
 * Manages reusable blocks state and operations for WordPress block editor integration
 */

import { useState, useCallback } from 'react';
import { parse } from '@wordpress/blocks';

interface ReusableBlock {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content: any[];
  status: 'active' | 'archived' | 'draft';
  category?: string;
  tags: string[];
  usageCount: number;
  lastUsedAt?: string;
  isGlobal: boolean;
  isEditable: boolean;
  preview?: {
    html?: string;
    css?: string;
    screenshot?: string;
    width?: number;
    height?: number;
  };
  author: {
    id: string;
    name: string;
    email: string;
  };
  visibility: 'private' | 'public' | 'organization';
  metadata?: {
    version?: string;
    compatibility?: string[];
    requirements?: string[];
    keywords?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  };
  createdAt: string;
  updatedAt: string;
}

interface CreateReusableBlockData {
  title: string;
  description?: string;
  content: any[];
  category?: string;
  tags?: string[];
  visibility?: 'private' | 'public' | 'organization';
  isGlobal?: boolean;
  metadata?: Record<string, any>;
}

interface UseReusableBlocksReturn {
  // State
  loading: boolean;
  error: string | null;
  
  // Operations
  saveAsReusableBlock: (data: CreateReusableBlockData) => Promise<ReusableBlock | null>;
  insertReusableBlock: (blockId: string) => Promise<any[] | null>;
  duplicateReusableBlock: (blockId: string) => Promise<ReusableBlock | null>;
  deleteReusableBlock: (blockId: string) => Promise<boolean>;
  updateReusableBlock: (blockId: string, updates: Partial<CreateReusableBlockData>) => Promise<ReusableBlock | null>;
  
  // Utility functions
  convertBlocksToReusable: (selectedBlocks: any[]) => CreateReusableBlockData;
  validateBlockData: (data: CreateReusableBlockData) => { valid: boolean; errors: string[] };
}

export const useReusableBlocks = (): UseReusableBlocksReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save current selection as reusable block
  const saveAsReusableBlock = useCallback(async (data: CreateReusableBlockData): Promise<ReusableBlock | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reusable-blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save reusable block');
      }

      const savedBlock = await response.json();
      return savedBlock;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    // Error logging - use proper error handler
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Insert reusable block into editor
  const insertReusableBlock = useCallback(async (blockId: string): Promise<any[] | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reusable-blocks/${blockId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch reusable block');
      }

      const blockData = await response.json();
      
      // Parse the block content for insertion
      const parsedBlocks = Array.isArray(blockData.content) 
        ? blockData.content 
        : parse(blockData.content);

      return parsedBlocks;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    // Error logging - use proper error handler
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Duplicate reusable block
  const duplicateReusableBlock = useCallback(async (blockId: string): Promise<ReusableBlock | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reusable-blocks/${blockId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to duplicate reusable block');
      }

      const duplicatedBlock = await response.json();
      return duplicatedBlock;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    // Error logging - use proper error handler
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete reusable block
  const deleteReusableBlock = useCallback(async (blockId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reusable-blocks/${blockId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete reusable block');
      }

      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    // Error logging - use proper error handler
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update reusable block
  const updateReusableBlock = useCallback(async (blockId: string, updates: Partial<CreateReusableBlockData>): Promise<ReusableBlock | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reusable-blocks/${blockId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update reusable block');
      }

      const updatedBlock = await response.json();
      return updatedBlock;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    // Error logging - use proper error handler
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Convert selected blocks to reusable block data
  const convertBlocksToReusable = useCallback((selectedBlocks: any[]): CreateReusableBlockData => {
    // Generate default title based on block types
    const blockTypes = selectedBlocks.map(block => block.name || 'unknown').join(', ');
    const defaultTitle = `Reusable Block (${blockTypes})`;

    // Extract text content for description
    const extractTextContent = (blocks: any[]): string => {
      return blocks
        .map(block => {
          if (block.attributes?.content) {
            // Strip HTML tags for plain text
            return block.attributes.content.replace(/<[^>]*>/g, '');
          }
          if (block.innerBlocks?.length) {
            return extractTextContent(block.innerBlocks);
          }
          return '';
        })
        .filter(Boolean)
        .join(' ')
        .slice(0, 200); // Limit description length
    };

    const description = extractTextContent(selectedBlocks);

    return {
      title: defaultTitle,
      description: description || undefined,
      content: selectedBlocks,
      category: 'general',
      tags: [],
      visibility: 'private',
      isGlobal: false,
      metadata: {
        version: '1.0.0',
        compatibility: ['wordpress-6.0+'],
        keywords: blockTypes.split(', '),
        difficulty: 'beginner'
      }
    };
  }, []);

  // Validate reusable block data
  const validateBlockData = useCallback((data: CreateReusableBlockData): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Required fields
    if (!data.title || data.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (data.title && data.title.length > 255) {
      errors.push('Title must be less than 255 characters');
    }

    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      errors.push('Block content is required');
    }

    // Optional field validation
    if (data.description && data.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }

    if (data.category && data.category.length > 100) {
      errors.push('Category must be less than 100 characters');
    }

    if (data.tags && data.tags.length > 10) {
      errors.push('Maximum 10 tags allowed');
    }

    if (data.tags) {
      const invalidTags = data.tags.filter(tag => tag.length > 50);
      if (invalidTags.length > 0) {
        errors.push('Each tag must be less than 50 characters');
      }
    }

    if (data.visibility && !['private', 'public', 'organization'].includes(data.visibility)) {
      errors.push('Invalid visibility setting');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }, []);

  return {
    loading,
    error,
    saveAsReusableBlock,
    insertReusableBlock,
    duplicateReusableBlock,
    deleteReusableBlock,
    updateReusableBlock,
    convertBlocksToReusable,
    validateBlockData
  };
};

export default useReusableBlocks;