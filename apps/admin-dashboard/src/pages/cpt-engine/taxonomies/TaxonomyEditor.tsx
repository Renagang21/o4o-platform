/**
 * Taxonomy Editor
 * Create and edit taxonomies with full configuration
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  ArrowLeft,
  Info,
  Settings,
  Tag,
  GitBranch,
  Hash,
  Folder,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Menu,
  Code
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { authClient } from '@o4o/auth-client';

interface TaxonomyFormData {
  name: string;
  slug: string;
  description?: string;
  hierarchical: boolean;
  postTypes: string[];
  labels?: {
    singular_name?: string;
    plural_name?: string;
    menu_name?: string;
    all_items?: string;
    edit_item?: string;
    view_item?: string;
    add_new_item?: string;
    search_items?: string;
    parent_item?: string;
    parent_item_colon?: string;
  };
  public?: boolean;
  showInRest?: boolean;
  showInMenu?: boolean;
  showInQuickEdit?: boolean;
  showAdminColumn?: boolean;
  defaultTerm?: string;
  capabilities?: {
    manage_terms?: string;
    edit_terms?: string;
    delete_terms?: string;
    assign_terms?: string;
  };
}

interface CPTType {
  id: string;
  slug: string;
  name: string;
  active: boolean;
}

export default function TaxonomyEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = id && id !== 'new';

  const [formData, setFormData] = useState<TaxonomyFormData>({
    name: '',
    slug: '',
    description: '',
    hierarchical: true,
    postTypes: [],
    labels: {
      singular_name: '',
      plural_name: '',
      menu_name: '',
      all_items: '',
      edit_item: '',
      view_item: '',
      add_new_item: '',
      search_items: '',
      parent_item: '',
      parent_item_colon: ''
    },
    public: true,
    showInRest: true,
    showInMenu: true,
    showInQuickEdit: true,
    showAdminColumn: true,
    defaultTerm: '',
    capabilities: {
      manage_terms: 'manage_categories',
      edit_terms: 'edit_categories',
      delete_terms: 'delete_categories',
      assign_terms: 'assign_categories'
    }
  });

  const [autoGenerateSlug, setAutoGenerateSlug] = useState(true);

  // Fetch CPT types for selection
  const { data: cptTypes = [] } = useQuery({
    queryKey: ['cpt-types'],
    queryFn: async () => {
      const response = await authClient.api.get<{ data: CPTType[] }>('/cpt/types');
      return response.data?.data || [];
    }
  });

  // Fetch existing taxonomy if editing
  const { data: existingTaxonomy } = useQuery({
    queryKey: ['taxonomy', id],
    queryFn: async () => {
      if (!isEdit) return null;
      const response = await authClient.api.get(`/cpt/taxonomies/${id}`);
      return response.data?.data;
    },
    enabled: isEdit
  });

  // Update form when existing taxonomy is loaded
  useEffect(() => {
    if (existingTaxonomy) {
      setFormData(existingTaxonomy);
      setAutoGenerateSlug(false);
    }
  }, [existingTaxonomy]);

  // Auto-generate slug from name
  useEffect(() => {
    if (autoGenerateSlug && formData.name && !isEdit) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.name, autoGenerateSlug, isEdit]);

  // Auto-generate labels from name
  useEffect(() => {
    if (formData.name && !formData.labels?.plural_name) {
      const name = formData.name;
      const singular = name;
      const plural = name.endsWith('y') ? name.slice(0, -1) + 'ies' : name + 's';
      
      setFormData(prev => ({
        ...prev,
        labels: {
          ...prev.labels,
          singular_name: singular,
          plural_name: plural,
          menu_name: plural,
          all_items: `All ${plural}`,
          edit_item: `Edit ${singular}`,
          view_item: `View ${singular}`,
          add_new_item: `Add New ${singular}`,
          search_items: `Search ${plural}`,
          parent_item: prev.hierarchical ? `Parent ${singular}` : '',
          parent_item_colon: prev.hierarchical ? `Parent ${singular}:` : ''
        }
      }));
    }
  }, [formData.name, formData.hierarchical]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: TaxonomyFormData) => {
      if (isEdit) {
        return authClient.api.put(`/cpt/taxonomies/${id}`, data);
      } else {
        return authClient.api.post('/cpt/taxonomies', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomies'] });
      navigate('/cpt-engine/taxonomies');
    }
  });

  const handleSave = () => {
    if (!formData.name || !formData.slug) {
      alert('Please fill in required fields');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handlePostTypeToggle = (postType: string) => {
    setFormData(prev => ({
      ...prev,
      postTypes: prev.postTypes.includes(postType)
        ? prev.postTypes.filter(pt => pt !== postType)
        : [...prev.postTypes, postType]
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
            onClick={() => navigate('/cpt-engine/taxonomies')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEdit ? 'Edit Taxonomy' : 'Create Taxonomy'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEdit ? 'Modify taxonomy configuration' : 'Define a new taxonomy for organizing content'}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save Taxonomy'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">
            <Info className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="labels">
            <Tag className="w-4 h-4 mr-2" />
            Labels
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Code className="w-4 h-4 mr-2" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Set the fundamental properties of your taxonomy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Taxonomy Type */}
              <div className="space-y-4">
                <Label>Taxonomy Type</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.hierarchical ? 'border-primary bg-primary/5' : 'border-gray-200'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, hierarchical: true }))}
                  >
                    <div className="flex items-center gap-3">
                      <GitBranch className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Hierarchical</p>
                        <p className="text-sm text-gray-500">Like categories (parent/child relationships)</p>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      !formData.hierarchical ? 'border-primary bg-primary/5' : 'border-gray-200'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, hierarchical: false }))}
                  >
                    <div className="flex items-center gap-3">
                      <Hash className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Non-hierarchical</p>
                        <p className="text-sm text-gray-500">Like tags (flat structure)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Product Categories"
                />
                <p className="text-sm text-gray-500">The name of the taxonomy shown in the UI</p>
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="slug">Slug *</Label>
                  {!isEdit && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={autoGenerateSlug}
                        onCheckedChange={setAutoGenerateSlug}
                      />
                      <span className="text-sm text-gray-500">Auto-generate</span>
                    </div>
                  )}
                </div>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  disabled={autoGenerateSlug && !isEdit}
                  placeholder="e.g., product_cat"
                />
                <p className="text-sm text-gray-500">The slug is used in URLs and API calls</p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this taxonomy is used for"
                  rows={3}
                />
              </div>

              {/* Post Types */}
              <div className="space-y-2">
                <Label>Assign to Post Types</Label>
                <p className="text-sm text-gray-500">Select which post types can use this taxonomy</p>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {cptTypes.filter(cpt => cpt.active).map(cpt => (
                    <div
                      key={cpt.slug}
                      className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <Checkbox
                        id={cpt.slug}
                        checked={formData.postTypes.includes(cpt.slug)}
                        onCheckedChange={() => handlePostTypeToggle(cpt.slug)}
                      />
                      <label
                        htmlFor={cpt.slug}
                        className="flex-1 cursor-pointer font-medium"
                      >
                        {cpt.name}
                        <span className="text-sm text-gray-500 block">{cpt.slug}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Labels Tab */}
        <TabsContent value="labels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Taxonomy Labels</CardTitle>
              <CardDescription>
                Customize the text labels used throughout the admin interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="singular_name">Singular Name</Label>
                  <Input
                    id="singular_name"
                    value={formData.labels?.singular_name}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      labels: { ...prev.labels, singular_name: e.target.value }
                    }))}
                    placeholder="e.g., Category"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plural_name">Plural Name</Label>
                  <Input
                    id="plural_name"
                    value={formData.labels?.plural_name}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      labels: { ...prev.labels, plural_name: e.target.value }
                    }))}
                    placeholder="e.g., Categories"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="menu_name">Menu Name</Label>
                  <Input
                    id="menu_name"
                    value={formData.labels?.menu_name}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      labels: { ...prev.labels, menu_name: e.target.value }
                    }))}
                    placeholder="e.g., Categories"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="all_items">All Items</Label>
                  <Input
                    id="all_items"
                    value={formData.labels?.all_items}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      labels: { ...prev.labels, all_items: e.target.value }
                    }))}
                    placeholder="e.g., All Categories"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_item">Edit Item</Label>
                  <Input
                    id="edit_item"
                    value={formData.labels?.edit_item}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      labels: { ...prev.labels, edit_item: e.target.value }
                    }))}
                    placeholder="e.g., Edit Category"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="view_item">View Item</Label>
                  <Input
                    id="view_item"
                    value={formData.labels?.view_item}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      labels: { ...prev.labels, view_item: e.target.value }
                    }))}
                    placeholder="e.g., View Category"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add_new_item">Add New Item</Label>
                  <Input
                    id="add_new_item"
                    value={formData.labels?.add_new_item}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      labels: { ...prev.labels, add_new_item: e.target.value }
                    }))}
                    placeholder="e.g., Add New Category"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="search_items">Search Items</Label>
                  <Input
                    id="search_items"
                    value={formData.labels?.search_items}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      labels: { ...prev.labels, search_items: e.target.value }
                    }))}
                    placeholder="e.g., Search Categories"
                  />
                </div>
                {formData.hierarchical && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="parent_item">Parent Item</Label>
                      <Input
                        id="parent_item"
                        value={formData.labels?.parent_item}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          labels: { ...prev.labels, parent_item: e.target.value }
                        }))}
                        placeholder="e.g., Parent Category"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parent_item_colon">Parent Item Colon</Label>
                      <Input
                        id="parent_item_colon"
                        value={formData.labels?.parent_item_colon}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          labels: { ...prev.labels, parent_item_colon: e.target.value }
                        }))}
                        placeholder="e.g., Parent Category:"
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visibility Settings</CardTitle>
              <CardDescription>
                Control where and how this taxonomy appears
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-500" />
                    <Label>Public</Label>
                  </div>
                  <p className="text-sm text-gray-500">Make this taxonomy publicly accessible</p>
                </div>
                <Switch
                  checked={formData.public}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, public: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-gray-500" />
                    <Label>Show in REST API</Label>
                  </div>
                  <p className="text-sm text-gray-500">Enable REST API endpoints for this taxonomy</p>
                </div>
                <Switch
                  checked={formData.showInRest}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showInRest: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Menu className="w-4 h-4 text-gray-500" />
                    <Label>Show in Admin Menu</Label>
                  </div>
                  <p className="text-sm text-gray-500">Display in the admin sidebar menu</p>
                </div>
                <Switch
                  checked={formData.showInMenu}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showInMenu: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <Label>Show in Quick Edit</Label>
                  </div>
                  <p className="text-sm text-gray-500">Allow editing in the quick edit interface</p>
                </div>
                <Switch
                  checked={formData.showInQuickEdit}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showInQuickEdit: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-gray-500" />
                    <Label>Show Admin Column</Label>
                  </div>
                  <p className="text-sm text-gray-500">Display as a column in post lists</p>
                </div>
                <Switch
                  checked={formData.showAdminColumn}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showAdminColumn: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default Settings</CardTitle>
              <CardDescription>
                Configure default behavior for this taxonomy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultTerm">Default Term</Label>
                <Input
                  id="defaultTerm"
                  value={formData.defaultTerm}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultTerm: e.target.value }))}
                  placeholder="e.g., Uncategorized"
                />
                <p className="text-sm text-gray-500">
                  Term assigned to posts when no term is selected
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Capabilities</CardTitle>
              <CardDescription>
                Define user capabilities required for managing this taxonomy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manage_terms">Manage Terms</Label>
                  <Input
                    id="manage_terms"
                    value={formData.capabilities?.manage_terms}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      capabilities: { ...prev.capabilities, manage_terms: e.target.value }
                    }))}
                    placeholder="manage_categories"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_terms">Edit Terms</Label>
                  <Input
                    id="edit_terms"
                    value={formData.capabilities?.edit_terms}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      capabilities: { ...prev.capabilities, edit_terms: e.target.value }
                    }))}
                    placeholder="edit_categories"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delete_terms">Delete Terms</Label>
                  <Input
                    id="delete_terms"
                    value={formData.capabilities?.delete_terms}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      capabilities: { ...prev.capabilities, delete_terms: e.target.value }
                    }))}
                    placeholder="delete_categories"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assign_terms">Assign Terms</Label>
                  <Input
                    id="assign_terms"
                    value={formData.capabilities?.assign_terms}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      capabilities: { ...prev.capabilities, assign_terms: e.target.value }
                    }))}
                    placeholder="assign_categories"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              Advanced settings affect how the taxonomy integrates with the system.
              Default values work for most use cases.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}