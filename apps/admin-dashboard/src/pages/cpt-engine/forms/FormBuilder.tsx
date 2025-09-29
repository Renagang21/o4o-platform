/**
 * Form Builder
 * Create and edit forms with drag-and-drop field management
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  ArrowLeft,
  Plus,
  Settings,
  Eye,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Copy,
  Database,
  FileText,
  Mail,
  UserPlus,
  Code,
  Zap,
  Import
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { authClient } from '@o4o/auth-client';
import { SortableFormField } from './components/SortableFormField';
import FieldEditor from '../field-groups/components/FieldEditor';

interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: any;
  validation?: any;
  order: number;
}

interface FormData {
  name: string;
  description?: string;
  type: 'contact' | 'post' | 'user' | 'search' | 'cpt';
  cptSlug?: string;
  status: 'active' | 'inactive';
  fields: FormField[];
  settings: {
    submitAction?: 'create_post' | 'create_user' | 'send_email' | 'both';
    userRole?: string;
    redirectUrl?: string;
    successMessage?: string;
    errorMessage?: string;
    notification?: {
      enabled: boolean;
      email?: string;
    };
  };
}

interface CPTType {
  id: string;
  slug: string;
  name: string;
  active: boolean;
}

export default function FormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = id && id !== 'new';

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    type: 'cpt',
    cptSlug: '',
    status: 'active',
    fields: [],
    settings: {
      submitAction: 'create_post',
      successMessage: 'Form submitted successfully!',
      errorMessage: 'There was an error submitting the form.'
    }
  });

  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

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
      const response = await authClient.api.get<{ data: CPTType[] }>('/api/public/cpt/types');
      return response.data?.data || [];
    }
  });

  // Fetch field groups for selected CPT
  const { data: fieldGroups = [] } = useQuery({
    queryKey: ['field-groups', formData.cptSlug],
    queryFn: async () => {
      if (!formData.cptSlug) return [];
      const response = await authClient.api.get(`/api/cpt/field-groups?postType=${formData.cptSlug}`);
      return response.data?.data || [];
    },
    enabled: !!formData.cptSlug
  });

  // Fetch existing form if editing
  const { data: existingForm } = useQuery({
    queryKey: ['form', id],
    queryFn: async () => {
      if (!isEdit) return null;
      const response = await authClient.api.get(`/api/cpt/forms/${id}`);
      return response.data?.data;
    },
    enabled: isEdit
  });

  // Update form when existing data is loaded
  useEffect(() => {
    if (existingForm) {
      setFormData(existingForm);
    }
  }, [existingForm]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (isEdit) {
        return authClient.api.put(`/api/cpt/forms/${id}`, data);
      } else {
        return authClient.api.post('/api/cpt/forms', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      navigate('/cpt-engine/forms');
    }
  });

  const handleSave = () => {
    if (!formData.name) {
      alert('Please provide a form name');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setFormData(prev => {
        const oldIndex = prev.fields.findIndex((f) => f.id === active.id);
        const newIndex = prev.fields.findIndex((f) => f.id === over?.id);
        return {
          ...prev,
          fields: arrayMove(prev.fields, oldIndex, newIndex).map((f, idx) => ({
            ...f,
            order: idx
          }))
        };
      });
    }
  };

  const handleAddField = () => {
    setEditingField(null);
    setIsFieldEditorOpen(true);
  };

  const handleEditField = (field: FormField) => {
    setEditingField(field);
    setIsFieldEditorOpen(true);
  };

  const handleSaveField = (field: FormField) => {
    setFormData(prev => {
      if (editingField) {
        // Update existing field
        return {
          ...prev,
          fields: prev.fields.map(f => f.id === field.id ? field : f)
        };
      } else {
        // Add new field
        return {
          ...prev,
          fields: [...prev.fields, { ...field, order: prev.fields.length }]
        };
      }
    });
    setIsFieldEditorOpen(false);
  };

  const handleDeleteField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId)
    }));
  };

  const toggleFieldExpand = (fieldId: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(fieldId)) {
      newExpanded.delete(fieldId);
    } else {
      newExpanded.add(fieldId);
    }
    setExpandedFields(newExpanded);
  };

  // Import fields from field groups
  const handleImportFields = () => {
    if (!formData.cptSlug || fieldGroups.length === 0) {
      alert('Please select a CPT first');
      return;
    }

    // Flatten all fields from all field groups
    const importedFields: FormField[] = [];
    fieldGroups.forEach((group: any) => {
      if (group.fields && Array.isArray(group.fields)) {
        group.fields.forEach((field: any) => {
          importedFields.push({
            id: `field_${Date.now()}_${field.id}`,
            name: field.name,
            label: field.label,
            type: field.type,
            required: field.required || false,
            placeholder: field.placeholder,
            description: field.description,
            options: field.options,
            validation: field.validation,
            order: importedFields.length
          });
        });
      }
    });

    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, ...importedFields]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/cpt-engine/forms')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEdit ? 'Edit Form' : 'Create Form'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEdit ? 'Modify form configuration and fields' : 'Design a new form for data collection'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open(`/preview/form/${id}`, '_blank')}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Form'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">
            <Settings className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="fields">
            <Database className="w-4 h-4 mr-2" />
            Fields ({formData.fields.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Zap className="w-4 h-4 mr-2" />
            Actions
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Information</CardTitle>
              <CardDescription>
                Basic settings for your form
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Form Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Contact Form, Registration Form"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this form is for"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Form Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpt">CPT Form</SelectItem>
                      <SelectItem value="contact">Contact Form</SelectItem>
                      <SelectItem value="user">User Form</SelectItem>
                      <SelectItem value="post">Post Form</SelectItem>
                      <SelectItem value="search">Search Form</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === 'cpt' && (
                  <div className="space-y-2">
                    <Label htmlFor="cptSlug">Target CPT</Label>
                    <Select
                      value={formData.cptSlug}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, cptSlug: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a CPT" />
                      </SelectTrigger>
                      <SelectContent>
                        {cptTypes.filter(cpt => cpt.active).map(cpt => (
                          <SelectItem key={cpt.slug} value={cpt.slug}>
                            {cpt.name} ({cpt.slug})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <p className="text-sm text-gray-500">Enable or disable this form</p>
                </div>
                <Switch
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    status: checked ? 'active' : 'inactive'
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fields Tab */}
        <TabsContent value="fields" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Form Fields</CardTitle>
                  <CardDescription>
                    Drag fields to reorder them
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {formData.cptSlug && (
                    <Button variant="outline" onClick={handleImportFields}>
                      <Import className="w-4 h-4 mr-2" />
                      Import from Field Groups
                    </Button>
                  )}
                  <Button onClick={handleAddField}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Field
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {formData.fields.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No fields added yet</h3>
                  <p className="text-gray-500 mb-4">
                    Add fields to start building your form
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button onClick={handleAddField}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Field
                    </Button>
                    {formData.cptSlug && (
                      <Button variant="outline" onClick={handleImportFields}>
                        <Import className="w-4 h-4 mr-2" />
                        Import Fields
                      </Button>
                    )}
                  </div>
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
                        <SortableFormField
                          key={field.id}
                          field={field}
                          isExpanded={expandedFields.has(field.id)}
                          onToggleExpand={() => toggleFieldExpand(field.id)}
                          onEdit={() => handleEditField(field)}
                          onDelete={() => handleDeleteField(field.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit Actions</CardTitle>
              <CardDescription>
                What happens when the form is submitted
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="submitAction">Submit Action</Label>
                <Select
                  value={formData.settings.submitAction}
                  onValueChange={(value: any) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, submitAction: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create_post">Create Post</SelectItem>
                    <SelectItem value="create_user">Create User</SelectItem>
                    <SelectItem value="send_email">Send Email</SelectItem>
                    <SelectItem value="both">Create Post + Assign User Role</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.settings.submitAction === 'create_user' || formData.settings.submitAction === 'both') && (
                <div className="space-y-2">
                  <Label htmlFor="userRole">User Role</Label>
                  <Select
                    value={formData.settings.userRole}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, userRole: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subscriber">Subscriber</SelectItem>
                      <SelectItem value="contributor">Contributor</SelectItem>
                      <SelectItem value="author">Author</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="redirectUrl">Redirect URL (after submit)</Label>
                <Input
                  id="redirectUrl"
                  value={formData.settings.redirectUrl}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, redirectUrl: e.target.value }
                  }))}
                  placeholder="/thank-you"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="successMessage">Success Message</Label>
                <Textarea
                  id="successMessage"
                  value={formData.settings.successMessage}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, successMessage: e.target.value }
                  }))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="errorMessage">Error Message</Label>
                <Textarea
                  id="errorMessage"
                  value={formData.settings.errorMessage}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, errorMessage: e.target.value }
                  }))}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Email notifications when form is submitted
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-gray-500">Send email when form is submitted</p>
                </div>
                <Switch
                  checked={formData.settings.notification?.enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      notification: {
                        ...prev.settings.notification,
                        enabled: checked
                      }
                    }
                  }))}
                />
              </div>

              {formData.settings.notification?.enabled && (
                <div className="space-y-2">
                  <Label htmlFor="notificationEmail">Notification Email</Label>
                  <Input
                    id="notificationEmail"
                    type="email"
                    value={formData.settings.notification?.email}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        notification: {
                          ...prev.settings.notification!,
                          email: e.target.value
                        }
                      }
                    }))}
                    placeholder="admin@example.com"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Field Editor Modal */}
      {isFieldEditorOpen && (
        <FieldEditor
          field={editingField}
          onSave={handleSaveField}
          onClose={() => setIsFieldEditorOpen(false)}
        />
      )}
    </div>
  );
}