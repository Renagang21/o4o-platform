/**
 * Template List
 *
 * Sprint 2-5: Admin Dashboard - Template management list
 * Phase 2: Digital Signage Production Upgrade
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  templateApi,
  SignageTemplate,
} from '@/lib/api/signageV2';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Layout,
  Monitor,
  RefreshCw,
  Eye,
  Grid,
  List,
} from 'lucide-react';

export default function TemplateList() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<SignageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteTarget, setDeleteTarget] = useState<SignageTemplate | null>(null);

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await templateApi.list(undefined, { limit: 100 });
      if (result.success && result.data) {
        setTemplates(result.data.items || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered templates
  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle duplicate
  const handleDuplicate = async (template: SignageTemplate) => {
    try {
      const result = await templateApi.create({
        name: `${template.name} (Copy)`,
        description: template.description,
        layoutConfig: template.layoutConfig,
        tags: template.tags,
      });
      if (result.success) {
        loadTemplates();
      }
    } catch (error) {
      console.error('Failed to duplicate template:', error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const result = await templateApi.delete(deleteTarget.id);
      if (result.success) {
        setTemplates(templates.filter((t) => t.id !== deleteTarget.id));
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    } finally {
      setDeleteTarget(null);
    }
  };

  // Get orientation icon
  const getOrientationIcon = (orientation: string) => {
    return orientation === 'portrait' ? (
      <div className="w-3 h-4 border border-current rounded-sm" />
    ) : (
      <div className="w-4 h-3 border border-current rounded-sm" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-muted-foreground">
            Manage layout templates with multiple zones
          </p>
        </div>
        <Button onClick={() => navigate('/digital-signage/v2/templates/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="icon" onClick={loadTemplates}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Templates */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layout className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first template to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate('/digital-signage/v2/templates/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="group cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/digital-signage/v2/templates/${template.id}`)}
            >
              <CardContent className="p-0">
                {/* Preview */}
                <div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden">
                  {template.thumbnailUrl ? (
                    <img
                      src={template.thumbnailUrl}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: template.layoutConfig.backgroundColor || '#000' }}
                    >
                      {/* Zone preview placeholder */}
                      {template.zones && template.zones.length > 0 ? (
                        template.zones.map((zone) => (
                          <div
                            key={zone.id}
                            className="absolute border border-white/30 bg-white/10"
                            style={{
                              left: `${zone.position.x}%`,
                              top: `${zone.position.y}%`,
                              width: `${zone.position.width}%`,
                              height: `${zone.position.height}%`,
                            }}
                          />
                        ))
                      ) : (
                        <Monitor className="h-8 w-8 text-white/30" />
                      )}
                    </div>
                  )}
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="secondary" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/digital-signage/v2/templates/${template.id}`);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(template);
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(template);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium truncate">{template.name}</h3>
                    {template.isSystem && (
                      <Badge variant="secondary" className="text-xs ml-2">
                        System
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                    {template.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {getOrientationIcon(template.layoutConfig.orientation)}
                      {template.layoutConfig.width}x{template.layoutConfig.height}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layout className="h-3 w-3" />
                      {template.zones?.length || 0} zones
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => navigate(`/digital-signage/v2/templates/${template.id}`)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                {/* Thumbnail */}
                <div
                  className="w-20 h-12 rounded bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: template.layoutConfig.backgroundColor || '#000' }}
                >
                  {template.thumbnailUrl ? (
                    <img
                      src={template.thumbnailUrl}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Monitor className="h-5 w-5 text-white/30" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{template.name}</h3>
                    {template.isSystem && (
                      <Badge variant="secondary" className="text-xs">
                        System
                      </Badge>
                    )}
                    {!template.isActive && (
                      <Badge variant="outline" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {template.description || 'No description'}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {getOrientationIcon(template.layoutConfig.orientation)}
                    {template.layoutConfig.width}x{template.layoutConfig.height}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layout className="h-3.5 w-3.5" />
                    {template.zones?.length || 0}
                  </span>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/digital-signage/v2/templates/${template.id}`);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(template);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(template);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
