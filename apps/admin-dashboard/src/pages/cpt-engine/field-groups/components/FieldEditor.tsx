/**
 * Field Editor Component
 * Modal for editing individual field configuration
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2 } from 'lucide-react';
import { ConditionalLogicEditor } from '@/features/cpt-acf/components/conditional-logic';
import type { ConditionalLogic, CustomField } from '@/features/cpt-acf/types/acf.types';

interface Field {
  id: string;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
  description?: string;
  options?: any;
  order: number;
  conditionalLogic?: ConditionalLogic;
}

interface FieldEditorProps {
  field: Field | null;
  cptTypes?: any[];
  allFields?: Field[]; // All fields in the group for conditional logic
  onSave: (field: Field) => void;
  onCancel?: () => void;
  onClose?: () => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio Button' },
  { value: 'date', label: 'Date Picker' },
  { value: 'image', label: 'Image' },
  { value: 'file', label: 'File' },
  { value: 'wysiwyg', label: 'WYSIWYG Editor' },
  { value: 'relationship', label: 'Relationship' },
  { value: 'post_object', label: 'Post Object' },
  { value: 'user', label: 'User' },
  { value: 'true_false', label: 'True/False' },
  { value: 'repeater', label: 'Repeater' },
];

export default function FieldEditor({ field, cptTypes = [], allFields = [], onSave, onCancel, onClose }: FieldEditorProps) {
  const initialField: Field = field || {
    id: `field_${Date.now()}`,
    name: '',
    label: '',
    type: 'text',
    required: false,
    order: 0
  };
  const [formData, setFormData] = useState<Field>(initialField);
  const [selectOptions, setSelectOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    if (field && (field.type === 'select' || field.type === 'radio' || field.type === 'checkbox')) {
      setSelectOptions(field.options?.choices || []);
    }
  }, [field]);

  const handleSave = () => {
    // Generate field name from label if not provided
    if (!formData.name && formData.label) {
      formData.name = formData.label
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    }

    // Add options for select/radio/checkbox fields
    if (formData.type === 'select' || formData.type === 'radio' || formData.type === 'checkbox') {
      formData.options = {
        ...formData.options,
        choices: selectOptions
      };
    }

    onSave(formData);
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      setSelectOptions([...selectOptions, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setSelectOptions(selectOptions.filter((_, i) => i !== index));
  };

  const needsOptions = ['select', 'radio', 'checkbox'].includes(formData.type);
  const needsRelationship = ['relationship', 'post_object'].includes(formData.type);

  const handleClose = () => {
    if (onClose) onClose();
    if (onCancel) onCancel();
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {!field || (field.id.startsWith('field_') && !field.name) ? 'Add New Field' : 'Edit Field'}
          </DialogTitle>
          <DialogDescription>
            Configure the field settings and options
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="conditional">Conditional</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div>
              <Label htmlFor="label">Field Label *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Product Title"
              />
            </div>

            <div>
              <Label htmlFor="name">Field Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., product_title (auto-generated from label)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to auto-generate from label
              </p>
            </div>

            <div>
              <Label htmlFor="type">Field Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Instructions</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Instructions for content editors..."
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="options" className="space-y-4">
            {needsOptions && (
              <div>
                <Label>Choices</Label>
                <div className="space-y-2 mt-2">
                  {selectOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input 
                        id={`option-${index}`}
                        name={`option-${index}`}
                        value={option} 
                        readOnly 
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      id="new-option"
                      name="new-option"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Add new option..."
                      onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddOption}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {needsRelationship && (
              <div>
                <Label htmlFor="related-cpt">Related Post Type</Label>
                <Select
                  value={formData.options?.postType || ''}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    options: { ...formData.options, postType: value }
                  })}
                >
                  <SelectTrigger id="related-cpt">
                    <SelectValue placeholder="Select post type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cptTypes.map(cpt => (
                      <SelectItem key={cpt.slug} value={cpt.slug}>
                        {cpt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="placeholder">Placeholder Text</Label>
              <Input
                id="placeholder"
                value={formData.placeholder || ''}
                onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                placeholder="Enter placeholder text..."
              />
            </div>

            <div>
              <Label htmlFor="default">Default Value</Label>
              <Input
                id="default"
                value={formData.defaultValue || ''}
                onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                placeholder="Enter default value..."
              />
            </div>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="required">Required Field</Label>
              <Switch
                id="required"
                checked={formData.required || false}
                onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
              />
            </div>

            {formData.type === 'text' && (
              <>
                <div>
                  <Label htmlFor="min-length">Minimum Length</Label>
                  <Input
                    id="min-length"
                    type="number"
                    value={formData.options?.minLength || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      options: { ...formData.options, minLength: e.target.value }
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="max-length">Maximum Length</Label>
                  <Input
                    id="max-length"
                    type="number"
                    value={formData.options?.maxLength || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      options: { ...formData.options, maxLength: e.target.value }
                    })}
                    placeholder="No limit"
                  />
                </div>
              </>
            )}

            {formData.type === 'number' && (
              <>
                <div>
                  <Label htmlFor="min">Minimum Value</Label>
                  <Input
                    id="min"
                    type="number"
                    value={formData.options?.min || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      options: { ...formData.options, min: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="max">Maximum Value</Label>
                  <Input
                    id="max"
                    type="number"
                    value={formData.options?.max || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      options: { ...formData.options, max: e.target.value }
                    })}
                  />
                </div>
              </>
            )}

            {(formData.type === 'image' || formData.type === 'file') && (
              <div>
                <Label htmlFor="allowed-types">Allowed File Types</Label>
                <Input
                  id="allowed-types"
                  value={formData.options?.allowedTypes || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    options: { ...formData.options, allowedTypes: e.target.value }
                  })}
                  placeholder="e.g., jpg,png,gif"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="conditional" className="space-y-4">
            <ConditionalLogicEditor
              conditionalLogic={formData.conditionalLogic}
              onChange={(conditionalLogic) =>
                setFormData({ ...formData, conditionalLogic })
              }
              availableFields={allFields as unknown as CustomField[]}
              currentFieldName={formData.name}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.label}>
            Save Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}