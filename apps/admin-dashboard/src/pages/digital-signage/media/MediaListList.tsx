/**
 * Media List List
 *
 * List view for media playlists
 * Phase 6: Digital Signage Management UI
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AGTable, type AGTableColumn } from '@/components/ag/AGTable';
import {
  Plus,
  ListVideo,
  MoreVertical,
  Pencil,
  Trash2,
  Clock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mediaListApi, type MediaList } from '@/lib/api/digitalSignage';
import MediaListForm from './MediaListForm';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export default function MediaListList() {
  const [lists, setLists] = useState<MediaList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingList, setEditingList] = useState<MediaList | null>(null);

  const fetchLists = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await mediaListApi.list();
      if (response.success && response.data) {
        setLists(response.data.data || []);
      } else {
        setError(response.error || 'Failed to load media lists');
      }
    } catch (err) {
      setError('Failed to load media lists');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media list?')) return;

    const response = await mediaListApi.delete(id);
    if (response.success) {
      fetchLists();
    } else {
      setError(response.error || 'Failed to delete');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingList(null);
    fetchLists();
  };

  const columns: AGTableColumn<MediaList>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (list) => (
        <Link
          to={`/admin/digital-signage/media/lists/${list.id}`}
          className="font-medium text-primary hover:underline"
        >
          {list.name}
        </Link>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (list) => (
        <span className="text-sm text-muted-foreground">
          {list.description || '-'}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (list) => (
        <Badge variant="outline">{list.items?.length || 0} items</Badge>
      ),
    },
    {
      key: 'totalDuration',
      header: 'Duration',
      render: (list) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3 text-muted-foreground" />
          {formatDuration(list.totalDuration || 0)}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (list) => (
        <Badge variant={list.isActive ? 'default' : 'secondary'}>
          {list.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (list) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingList(list)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(list.id)}
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
            <ListVideo className="h-6 w-6" />
            Media Lists
          </h1>
          <p className="text-muted-foreground">
            Manage playlists for digital signage
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create List
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
          {lists.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListVideo className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No media lists yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                Create your first media list
              </Button>
            </div>
          ) : (
            <AGTable data={lists} columns={columns} rowKey="id" />
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      {(showForm || editingList) && (
        <MediaListForm
          list={editingList}
          onClose={() => {
            setShowForm(false);
            setEditingList(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
