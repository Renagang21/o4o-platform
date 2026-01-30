/**
 * Media Source List
 *
 * List view for media sources (videos, images)
 * Phase 6: Digital Signage Management UI
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AGTable, type AGTableColumn } from '@/components/ag/AGTable';
import {
  Plus,
  Film,
  Image,
  Youtube,
  Video,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mediaSourceApi, type MediaSource, type MediaType } from '@/lib/api/digitalSignage';
import MediaSourceForm from './MediaSourceForm';

const MEDIA_TYPE_ICONS: Record<MediaType, React.ReactNode> = {
  youtube: <Youtube className="h-4 w-4 text-red-500" />,
  vimeo: <Video className="h-4 w-4 text-blue-500" />,
  internal_video: <Film className="h-4 w-4 text-purple-500" />,
  image: <Image className="h-4 w-4 text-green-500" />,
};

const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  internal_video: 'Internal Video',
  image: 'Image',
};

export default function MediaSourceList() {
  const navigate = useNavigate();
  const [sources, setSources] = useState<MediaSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<MediaSource | null>(null);

  const fetchSources = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await mediaSourceApi.list();
      if (response.success && response.data) {
        setSources(response.data.data || []);
      } else {
        setError(response.error || 'Failed to load media sources');
      }
    } catch (err) {
      setError('Failed to load media sources');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media source?')) return;

    const response = await mediaSourceApi.delete(id);
    if (response.success) {
      fetchSources();
    } else {
      setError(response.error || 'Failed to delete');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingSource(null);
    fetchSources();
  };

  const columns: AGTableColumn<MediaSource>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (source) => (
        <div className="flex items-center gap-2">
          {MEDIA_TYPE_ICONS[source.type]}
          <span className="text-sm">{MEDIA_TYPE_LABELS[source.type]}</span>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (source) => (
        <Link
          to={`/admin/digital-signage/media/sources/${source.id}`}
          className="font-medium text-primary hover:underline"
        >
          {source.name}
        </Link>
      ),
    },
    {
      key: 'url',
      header: 'URL',
      render: (source) => (
        <span className="text-sm text-muted-foreground truncate max-w-xs block">
          {source.url}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (source) => (
        <span className="text-sm">
          {source.duration ? `${source.duration}s` : '-'}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (source) => (
        <Badge variant={source.isActive ? 'default' : 'secondary'}>
          {source.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (source) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingSource(source)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(source.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Film className="h-6 w-6" />
            Media Sources
          </h1>
          <p className="text-muted-foreground">
            Manage video and image sources for digital signage
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Source
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {sources.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No media sources yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                Add your first media source
              </Button>
            </div>
          ) : (
            <AGTable data={sources} columns={columns} rowKey="id" />
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      {(showForm || editingSource) && (
        <MediaSourceForm
          source={editingSource}
          onClose={() => {
            setShowForm(false);
            setEditingSource(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
