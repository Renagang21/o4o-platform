/**
 * Terms Manager
 * Manage terms for a specific taxonomy
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Folder,
  FolderOpen,
  Hash,
  Tag,
  GitBranch,
  MoreVertical,
  Move,
  Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authClient } from '@o4o/auth-client';

interface Term {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  children?: Term[];
  postCount?: number;
  meta?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface Taxonomy {
  id: string;
  name: string;
  slug: string;
  description?: string;
  hierarchical: boolean;
  labels?: {
    singular_name?: string;
    plural_name?: string;
  };
}

interface TermFormData {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  meta?: Record<string, any>;
}

export default function TermsManager() {
  const { taxonomyId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<TermFormData>({
    name: '',
    slug: '',
    description: '',
    parentId: undefined
  });

  // Fetch taxonomy info
  const { data: taxonomy } = useQuery({
    queryKey: ['taxonomy', taxonomyId],
    queryFn: async () => {
      const response = await authClient.api.get<{ data: Taxonomy }>(`/cpt/taxonomies/${taxonomyId}`);
      return response.data?.data;
    }
  });

  // Fetch terms
  const { data: terms = [], isLoading, refetch } = useQuery({
    queryKey: ['terms', taxonomyId],
    queryFn: async () => {
      const response = await authClient.api.get<{ data: Term[] }>(`/cpt/taxonomies/${taxonomyId}/terms`);
      return response.data?.data || [];
    }
  });

  // Build hierarchical tree
  const termsTree = useMemo(() => {
    if (!taxonomy?.hierarchical) {
      return terms;
    }

    const termsMap = new Map<string, Term>();
    const rootTerms: Term[] = [];

    // First pass: create map of all terms
    terms.forEach(term => {
      termsMap.set(term.id, { ...term, children: [] });
    });

    // Second pass: build tree structure
    terms.forEach(term => {
      const termNode = termsMap.get(term.id);
      if (!termNode) return;

      if (term.parentId) {
        const parent = termsMap.get(term.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(termNode);
        }
      } else {
        rootTerms.push(termNode);
      }
    });

    return rootTerms;
  }, [terms, taxonomy]);

  // Filter terms based on search
  const filteredTerms = useMemo(() => {
    if (!searchTerm) return termsTree;

    const filterRecursive = (termsList: Term[]): Term[] => {
      return termsList.filter(term => {
        const matchesSearch = 
          term.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          term.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
          term.description?.toLowerCase().includes(searchTerm.toLowerCase());

        if (matchesSearch) return true;

        if (term.children && term.children.length > 0) {
          const filteredChildren = filterRecursive(term.children);
          if (filteredChildren.length > 0) {
            term.children = filteredChildren;
            return true;
          }
        }

        return false;
      });
    };

    return filterRecursive(termsTree);
  }, [termsTree, searchTerm]);

  // Create term mutation
  const createMutation = useMutation({
    mutationFn: async (data: TermFormData) => {
      return authClient.api.post(`/cpt/taxonomies/${taxonomyId}/terms`, data);
    },
    onSuccess: () => {
      refetch();
      setIsCreateOpen(false);
      resetForm();
    }
  });

  // Update term mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TermFormData }) => {
      return authClient.api.put(`/cpt/taxonomies/${taxonomyId}/terms/${id}`, data);
    },
    onSuccess: () => {
      refetch();
      setIsEditOpen(false);
      resetForm();
    }
  });

  // Delete term mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return authClient.api.delete(`/cpt/taxonomies/${taxonomyId}/terms/${id}`);
    },
    onSuccess: () => {
      refetch();
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      parentId: undefined
    });
    setSelectedTerm(null);
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedTerm) return;
    updateMutation.mutate({ id: selectedTerm.id, data: formData });
  };

  const handleDelete = (term: Term) => {
    if (window.confirm(`Are you sure you want to delete "${term.name}"? ${term.children?.length ? 'This will also delete all child terms.' : ''}`)) {
      deleteMutation.mutate(term.id);
    }
  };

  const handleEdit = (term: Term) => {
    setSelectedTerm(term);
    setFormData({
      name: term.name,
      slug: term.slug,
      description: term.description || '',
      parentId: term.parentId,
      meta: term.meta
    });
    setIsEditOpen(true);
  };

  const toggleExpand = (termId: string) => {
    const newExpanded = new Set(expandedTerms);
    if (newExpanded.has(termId)) {
      newExpanded.delete(termId);
    } else {
      newExpanded.add(termId);
    }
    setExpandedTerms(newExpanded);
  };

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const renderTermTree = (termsList: Term[], depth = 0) => {
    return termsList.map(term => {
      const hasChildren = term.children && term.children.length > 0;
      const isExpanded = expandedTerms.has(term.id);

      return (
        <div key={term.id}>
          <div
            className={`flex items-center justify-between p-3 hover:bg-gray-50 border-b ${
              depth > 0 ? 'border-l-2 border-gray-200' : ''
            }`}
            style={{ paddingLeft: `${depth * 24 + 12}px` }}
          >
            <div className="flex items-center gap-2 flex-1">
              {taxonomy?.hierarchical && hasChildren && (
                <button
                  onClick={() => toggleExpand(term.id)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
              {!hasChildren && taxonomy?.hierarchical && (
                <div className="w-6" />
              )}
              
              {taxonomy?.hierarchical ? (
                hasChildren ? (
                  isExpanded ? (
                    <FolderOpen className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Folder className="w-4 h-4 text-gray-500" />
                  )
                ) : (
                  <Hash className="w-4 h-4 text-gray-400" />
                )
              ) : (
                <Tag className="w-4 h-4 text-gray-500" />
              )}

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{term.name}</span>
                  <span className="text-sm text-gray-500">({term.slug})</span>
                  {term.postCount !== undefined && term.postCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {term.postCount} posts
                    </Badge>
                  )}
                </div>
                {term.description && (
                  <p className="text-sm text-gray-600 mt-1">{term.description}</p>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(term)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {taxonomy?.hierarchical && (
                  <DropdownMenuItem
                    onClick={() => {
                      setFormData({
                        name: '',
                        slug: '',
                        description: '',
                        parentId: term.id
                      });
                      setIsCreateOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Child
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(term)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {hasChildren && isExpanded && (
            <div>{renderTermTree(term.children!, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  const renderTermList = () => {
    if (taxonomy?.hierarchical) {
      return renderTermTree(filteredTerms as Term[]);
    }

    // For non-hierarchical taxonomies, render as tags
    return (
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          {(filteredTerms as Term[]).map(term => (
            <div
              key={term.id}
              className="group relative inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Tag className="w-3 h-3" />
              <span className="font-medium">{term.name}</span>
              {term.postCount !== undefined && term.postCount > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">
                  {term.postCount}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(term)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(term)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </div>
    );
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
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {taxonomy?.hierarchical ? (
                <GitBranch className="w-6 h-6" />
              ) : (
                <Hash className="w-6 h-6" />
              )}
              {taxonomy?.name} Terms
            </h1>
            <p className="text-gray-600 mt-1">
              Manage {taxonomy?.hierarchical ? 'hierarchical categories' : 'tags'} for {taxonomy?.name}
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add {taxonomy?.labels?.singular_name || 'Term'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{terms.length}</div>
          </CardContent>
        </Card>
        {taxonomy?.hierarchical && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Root Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {terms.filter(t => !t.parentId).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Child Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {terms.filter(t => t.parentId).length}
                </div>
              </CardContent>
            </Card>
          </>
        )}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {terms.reduce((sum, t) => sum + (t.postCount || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={`Search ${taxonomy?.labels?.plural_name || 'terms'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Terms List/Tree */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : terms.length === 0 ? (
            <div className="text-center py-8">
              {taxonomy?.hierarchical ? (
                <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              ) : (
                <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              )}
              <p className="text-gray-600">No {taxonomy?.labels?.plural_name || 'terms'} found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First {taxonomy?.labels?.singular_name || 'Term'}
              </Button>
            </div>
          ) : (
            renderTermList()
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New {taxonomy?.labels?.singular_name || 'Term'}</DialogTitle>
            <DialogDescription>
              Add a new {taxonomy?.hierarchical ? 'category' : 'tag'} to {taxonomy?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    name: e.target.value,
                    slug: generateSlug(e.target.value)
                  }));
                }}
                placeholder={`Enter ${taxonomy?.labels?.singular_name?.toLowerCase() || 'term'} name`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="term-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            {taxonomy?.hierarchical && (
              <div className="space-y-2">
                <Label htmlFor="parent">Parent {taxonomy?.labels?.singular_name || 'Term'}</Label>
                <Select
                  value={formData.parentId || 'none'}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    parentId: value === 'none' ? undefined : value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Parent</SelectItem>
                    {terms.filter(t => t.id !== selectedTerm?.id).map(term => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {taxonomy?.labels?.singular_name || 'Term'}</DialogTitle>
            <DialogDescription>
              Update {selectedTerm?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            {taxonomy?.hierarchical && (
              <div className="space-y-2">
                <Label htmlFor="edit-parent">Parent {taxonomy?.labels?.singular_name || 'Term'}</Label>
                <Select
                  value={formData.parentId || 'none'}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    parentId: value === 'none' ? undefined : value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Parent</SelectItem>
                    {terms.filter(t => t.id !== selectedTerm?.id).map(term => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}