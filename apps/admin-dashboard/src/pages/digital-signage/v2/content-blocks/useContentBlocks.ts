/**
 * useContentBlocks — Custom hook for Content Block CRUD operations
 *
 * WO-O4O-CONTENT-BLOCK-LIBRARY-SPLIT-V1
 * Extracted from ContentBlockLibrary.tsx
 *
 * Responsibilities:
 *   - All state management (data, filter, dialog, form)
 *   - API calls via contentBlockApi
 *   - CRUD handlers (create, update, duplicate, delete)
 */

import { useState, useEffect } from 'react';
import {
  contentBlockApi,
  type SignageContentBlock,
  type ContentBlockType,
  type CreateContentBlockDto,
} from '@/lib/api/signageV2';

const INITIAL_FORM: CreateContentBlockDto = {
  name: '',
  blockType: 'text',
  content: {},
  settings: {},
};

export function useContentBlocks() {
  // Data state
  const [blocks, setBlocks] = useState<SignageContentBlock[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ContentBlockType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Dialog state
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [editingBlock, setEditingBlock] = useState<SignageContentBlock | null>(null);
  const [previewBlock, setPreviewBlock] = useState<SignageContentBlock | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SignageContentBlock | null>(null);

  // Form state
  const [blockForm, setBlockForm] = useState<CreateContentBlockDto>(INITIAL_FORM);

  // Load blocks on mount
  useEffect(() => {
    loadBlocks();
  }, []);

  const loadBlocks = async () => {
    setLoading(true);
    try {
      const result = await contentBlockApi.list(undefined, { limit: 100 });
      if (result.success && result.data) {
        setBlocks(result.data.items || []);
      }
    } catch (error) {
      console.error('Failed to load blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered blocks
  const filteredBlocks = blocks.filter((block) => {
    const matchesSearch =
      block.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || block.blockType === filterType;
    return matchesSearch && matchesType;
  });

  // Reset form
  const resetForm = () => {
    setBlockForm(INITIAL_FORM);
    setEditingBlock(null);
  };

  // Open create/edit dialog
  const openBlockDialog = (block?: SignageContentBlock) => {
    if (block) {
      setEditingBlock(block);
      setBlockForm({
        name: block.name,
        blockType: block.blockType,
        content: block.content,
        settings: block.settings || {},
      });
    } else {
      resetForm();
    }
    setShowBlockDialog(true);
  };

  // Handle create/update
  const handleSaveBlock = async () => {
    try {
      if (editingBlock) {
        const result = await contentBlockApi.update(editingBlock.id, blockForm);
        if (result.success && result.data) {
          setBlocks(blocks.map((b) => (b.id === editingBlock.id ? result.data! : b)));
        }
      } else {
        const result = await contentBlockApi.create(blockForm);
        if (result.success && result.data) {
          setBlocks([result.data, ...blocks]);
        }
      }
      setShowBlockDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save block:', error);
    }
  };

  // Handle duplicate
  const handleDuplicate = async (block: SignageContentBlock) => {
    try {
      const result = await contentBlockApi.create({
        name: `${block.name} (Copy)`,
        blockType: block.blockType,
        content: block.content,
        settings: block.settings,
      });
      if (result.success && result.data) {
        setBlocks([result.data, ...blocks]);
      }
    } catch (error) {
      console.error('Failed to duplicate block:', error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const result = await contentBlockApi.delete(deleteTarget.id);
      if (result.success) {
        setBlocks(blocks.filter((b) => b.id !== deleteTarget.id));
      }
    } catch (error) {
      console.error('Failed to delete block:', error);
    } finally {
      setDeleteTarget(null);
    }
  };

  return {
    // Data
    blocks,
    loading,
    filteredBlocks,
    // Filters
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    viewMode,
    setViewMode,
    // Dialog state
    showBlockDialog,
    setShowBlockDialog,
    showPreviewDialog,
    setShowPreviewDialog,
    editingBlock,
    previewBlock,
    setPreviewBlock,
    deleteTarget,
    setDeleteTarget,
    // Form
    blockForm,
    setBlockForm,
    // Actions
    loadBlocks,
    openBlockDialog,
    handleSaveBlock,
    handleDuplicate,
    handleDelete,
  };
}
