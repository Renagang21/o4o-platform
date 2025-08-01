import { useState, useCallback } from 'react';

interface UseQuickEditProps {
  onSave: (id: string, data: any) => Promise<void>;
  onCancel?: () => void;
}

/**
 * Hook for managing WordPress-style Quick Edit functionality
 */
export function useQuickEdit({ onSave, onCancel }: UseQuickEditProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // Start editing a row
  const startEdit = useCallback((id: string, initialData: any) => {
    setEditingId(id);
    setFormData(initialData);
  }, []);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setFormData({});
    onCancel?.();
  }, [onCancel]);

  // Save edit
  const saveEdit = useCallback(async () => {
    if (!editingId) return;

    setIsLoading(true);
    try {
      await onSave(editingId, formData);
      setEditingId(null);
      setFormData({});
    } catch (error) {
      console.error('Quick edit save failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [editingId, formData, onSave]);

  // Update form field
  const updateField = useCallback((field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  // Check if a specific item is being edited
  const isEditing = useCallback((id: string) => {
    return editingId === id;
  }, [editingId]);

  return {
    editingId,
    isEditing,
    isLoading,
    formData,
    startEdit,
    cancelEdit,
    saveEdit,
    updateField
  };
}