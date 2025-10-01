/**
 * Field Group Editor
 * Create and edit field groups with full field management
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Save,
  Trash2,
  Edit2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Copy,
  Type,
  Hash,
  Calendar,
  Link,
  Image,
  FileText,
  ToggleLeft,
  List,
  Database,
  Users,
  Package,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { authClient } from '@o4o/auth-client';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import FieldEditor from './components/FieldEditor';
import { SortableField } from './components/SortableField';

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
}

interface FieldGroup {
  id?: string;
  title: string;
  description?: string;
  postTypes: string[];
  fields: Field[];
  position: 'normal' | 'side' | 'advanced';
  style: 'default' | 'seamless';
  isActive: boolean;
  conditionalLogic?: any;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'textarea', label: 'Text Area', icon: FileText },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'email', label: 'Email', icon: Type },
  { value: 'url', label: 'URL', icon: Link },
  { value: 'select', label: 'Select', icon: List },
  { value: 'checkbox', label: 'Checkbox', icon: ToggleLeft },
  { value: 'radio', label: 'Radio Button', icon: ToggleLeft },
  { value: 'date', label: 'Date Picker', icon: Calendar },
  { value: 'image', label: 'Image', icon: Image },
  { value: 'file', label: 'File', icon: FileText },
  { value: 'wysiwyg', label: 'WYSIWYG Editor', icon: FileText },
  { value: 'relationship', label: 'Relationship', icon: Database },
  { value: 'post_object', label: 'Post Object', icon: Package },
  { value: 'user', label: 'User', icon: Users },
  { value: 'true_false', label: 'True/False', icon: ToggleLeft },
  { value: 'repeater', label: 'Repeater', icon: Copy },
];

export default function FieldGroupEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotice } = useAdminNotices();
  
  const [activeTab, setActiveTab] = useState('fields');
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  
  const [formData, setFormData] = useState<FieldGroup>({
    title: '',
    description: '',
    postTypes: [],
    fields: [],
    position: 'normal',
    style: 'default',
    isActive: true
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch CPT types
  const { data: cptTypes = [] } = useQuery({
    queryKey: ['cpt-types'],
    queryFn: async () => {
      const response = await authClient.api.get('/cpt/types');
      return response.data?.data || [];
    }
  });

  // Fetch existing field group if editing
  const { data: existingGroup } = useQuery({
    queryKey: ['field-group', id],
    queryFn: async () => {
      if (!id || id === 'new') return null;
      const response = await authClient.api.get(`/cpt/field-groups/${id}`);
      return response.data?.data;
    },
    enabled: !!id && id !== 'new'
  });

  useEffect(() => {
    if (existingGroup) {
      setFormData(existingGroup);
    }
  }, [existingGroup]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: FieldGroup) => {
      if (id && id !== 'new') {
        return await authClient.api.put(`/cpt/field-groups/${id}`, data);
      } else {
        return await authClient.api.post('/cpt/field-groups', data);
      }
    },
    onSuccess: () => {
      addNotice({
        type: 'success',
        message: id && id !== 'new' ? 'Field group updated successfully' : 'Field group created successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['field-groups'] });
      navigate('/cpt-engine/field-groups');
    },
    onError: (error: any) => {
      addNotice({
        type: 'error',
        message: `Failed to save field group: ${error.message}`
      });
    }
  });

  const handleSave = () => {
    if (!formData.title) {
      addNotice({
        type: 'error',
        message: 'Field group title is required'
      });
      return;
    }
    if (formData.postTypes.length === 0) {
      addNotice({
        type: 'error',
        message: 'Please select at least one post type'
      });
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleAddField = () => {
    const newField: Field = {
      id: `field_${Date.now()}`,
      name: '',
      label: '',
      type: 'text',
      order: formData.fields.length
    };
    setEditingField(newField);
    setShowFieldEditor(true);
  };

  const handleEditField = (field: Field) => {
    setEditingField(field);
    setShowFieldEditor(true);
  };

  const handleSaveField = (field: Field) => {
    const existingIndex = formData.fields.findIndex(f => f.id === field.id);
    
    if (existingIndex >= 0) {
      // Update existing field
      const updatedFields = [...formData.fields];
      updatedFields[existingIndex] = field;
      setFormData({ ...formData, fields: updatedFields });
    } else {
      // Add new field
      setFormData({
        ...formData,
        fields: [...formData.fields, field]
      });
    }
    
    setShowFieldEditor(false);
    setEditingField(null);
  };

  const handleDeleteField = (fieldId: string) => {
    setFormData({
      ...formData,
      fields: formData.fields.filter(f => f.id !== fieldId)
    });
  };

  const handleDuplicateField = (field: Field) => {
    const newField = {
      ...field,
      id: `field_${Date.now()}`,
      name: `${field.name}_copy`,
      label: `${field.label} (Copy)`,
      order: formData.fields.length
    };
    setFormData({
      ...formData,
      fields: [...formData.fields, newField]
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = formData.fields.findIndex(f => f.id === active.id);
      const newIndex = formData.fields.findIndex(f => f.id === over.id);
      
      const newFields = arrayMove(formData.fields, oldIndex, newIndex).map((field, index) => ({
        ...field,
        order: index
      }));
      
      setFormData({ ...formData, fields: newFields });
    }
  };

  const handlePostTypeToggle = (postType: string) => {
    if (formData.postTypes.includes(postType)) {
      setFormData({
        ...formData,
        postTypes: formData.postTypes.filter(pt => pt !== postType)
      });
    } else {
      setFormData({
        ...formData,
        postTypes: [...formData.postTypes, postType]
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/cpt-engine/field-groups')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {id && id !== 'new' ? 'Edit Field Group' : 'New Field Group'}
            </h1>
            <p className="text-gray-600 mt-1">
              Create custom fields for your post types
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/cpt-engine/field-groups')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Field Group'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Field Group Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Product Details"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this field group is for..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Fields Management */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Fields</CardTitle>
                <Button size="sm" onClick={handleAddField}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.fields.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No fields added yet</p>
                  <Button variant="outline" onClick={handleAddField}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Field
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={formData.fields.map(f => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {formData.fields.map((field) => (
                        <SortableField
                          key={field.id}
                          field={field}
                          onEdit={handleEditField}
                          onDelete={handleDeleteField}
                          onDuplicate={handleDuplicateField}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Post Types */}
          <Card>
            <CardHeader>
              <CardTitle>Post Types *</CardTitle>
              <CardDescription>
                Select which post types this field group applies to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cptTypes.map((cpt: any) => (
                  <div key={cpt.slug} className="flex items-center justify-between">
                    <Label htmlFor={`cpt-${cpt.slug}`} className="font-normal cursor-pointer">
                      {cpt.name}
                    </Label>
                    <Switch
                      id={`cpt-${cpt.slug}`}
                      checked={formData.postTypes.includes(cpt.slug)}
                      onCheckedChange={() => handlePostTypeToggle(cpt.slug)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Display Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="position">Position</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value: any) => setFormData({ ...formData, position: value })}
                >
                  <SelectTrigger id="position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal (after content)</SelectItem>
                    <SelectItem value="side">Side</SelectItem>
                    <SelectItem value="advanced">Advanced (after normal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="style">Style</Label>
                <Select
                  value={formData.style}
                  onValueChange={(value: any) => setFormData({ ...formData, style: value })}
                >
                  <SelectTrigger id="style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (with metabox)</SelectItem>
                    <SelectItem value="seamless">Seamless (no metabox)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Field Editor Modal */}
      {showFieldEditor && editingField && (
        <FieldEditor
          field={editingField}
          cptTypes={cptTypes}
          onSave={handleSaveField}
          onCancel={() => {
            setShowFieldEditor(false);
            setEditingField(null);
          }}
        />
      )}
    </div>
  );
}