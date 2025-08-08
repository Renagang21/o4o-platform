/**
 * Save as Reusable Block Modal
 * Modal dialog for saving selected blocks as reusable blocks
 */

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '../ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { Badge } from '../ui/badge';
import { X, Plus } from 'lucide-react';
import { useReusableBlocks } from '../../hooks/useReusableBlocks';

interface SaveAsReusableBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBlocks: any[];
  onSaved?: (savedBlock: any) => void;
}

const SaveAsReusableBlockModal: React.FC<SaveAsReusableBlockModalProps> = ({
  isOpen,
  onClose,
  selectedBlocks,
  onSaved
}) => {
  const { saveAsReusableBlock, convertBlocksToReusable, validateBlockData, loading, error } = useReusableBlocks();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: [] as string[],
    visibility: 'private' as 'private' | 'public' | 'organization',
    isGlobal: false
  });
  
  const [newTag, setNewTag] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && selectedBlocks.length > 0) {
      const defaultData = convertBlocksToReusable(selectedBlocks);
      setFormData({
        title: defaultData.title,
        description: defaultData.description || '',
        category: defaultData.category || '',
        tags: defaultData.tags || [],
        visibility: defaultData.visibility || 'private',
        isGlobal: defaultData.isGlobal || false
      });
    }
  }, [isOpen, selectedBlocks, convertBlocksToReusable]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/reusable-blocks/categories', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
    // Error logging - use proper error handler
      }
    };

    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Handle form submission
  const handleSave = async () => {
    // Validate form data
    const blockData = {
      title: formData.title,
      description: formData.description || undefined,
      content: selectedBlocks,
      category: formData.category || undefined,
      tags: formData.tags,
      visibility: formData.visibility,
      isGlobal: formData.isGlobal,
      metadata: {
        version: '1.0.0',
        compatibility: ['wordpress-6.0+'],
        keywords: formData.tags,
        difficulty: 'beginner' as const
      }
    };

    const validation = validateBlockData(blockData);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors([]);

    try {
      const savedBlock = await saveAsReusableBlock(blockData);
      
      if (savedBlock) {
        onSaved?.(savedBlock);
        onClose();
        // Reset form
        setFormData({
          title: '',
          description: '',
          category: '',
          tags: [],
          visibility: 'private',
          isGlobal: false
        });
      }
    } catch (err) {
    // Error logging - use proper error handler
    }
  };

  // Handle adding new tag
  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setNewTag('');
    }
  };

  // Handle removing tag
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Handle tag input key press
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Reusable Block</DialogTitle>
          <DialogDescription>
            Save the selected blocks as a reusable block that can be used across your site.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter block title..."
              maxLength={255}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this block does..."
              rows={3}
              maxLength={1000}
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.description.length}/1000 characters
            </div>
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Category</Label>
            <div className="flex gap-2">
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select or create category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="layout">Layout</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="widgets">Widgets</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or type new category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="flex-1"
                maxLength={100}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Add tags..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  maxLength={50}
                  disabled={formData.tags.length >= 10}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!newTag.trim() || formData.tags.includes(newTag.trim()) || formData.tags.length >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-gray-500 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                {formData.tags.length}/10 tags
              </div>
            </div>
          </div>

          {/* Visibility */}
          <div>
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              value={formData.visibility}
              onValueChange={(value) => 
                setFormData(prev => ({ ...prev, visibility: value as 'private' | 'public' | 'organization' }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private (Only me)</SelectItem>
                <SelectItem value="organization">Organization (Team members)</SelectItem>
                <SelectItem value="public">Public (Everyone)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Block info */}
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm text-gray-600">
              <strong>Blocks to save:</strong> {selectedBlocks.length} block{selectedBlocks.length !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {selectedBlocks.map(block => block.name || 'unknown').join(', ')}
            </div>
          </div>

          {/* Errors */}
          {(formErrors.length > 0 || error) && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-sm text-red-800">
                {error && <div className="mb-2">{error}</div>}
                {formErrors.map((err, index) => (
                  <div key={index}>• {err}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || !formData.title.trim()}
          >
            {loading ? 'Saving...' : 'Save Block'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveAsReusableBlockModal;