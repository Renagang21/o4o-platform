/**
 * Media List Detail
 *
 * Detail view for a media list with item management
 * Phase 6: Digital Signage Management UI
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  ListVideo,
  Plus,
  GripVertical,
  Clock,
} from 'lucide-react';
import {
  mediaListApi,
  mediaSourceApi,
  type MediaList,
  type MediaSource,
} from '@/lib/api/digitalSignage';
import MediaListForm from './MediaListForm';

export default function MediaListDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [list, setList] = useState<MediaList | null>(null);
  const [sources, setSources] = useState<MediaSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    try {
      const [listRes, sourcesRes] = await Promise.all([
        mediaListApi.get(id),
        mediaSourceApi.list(),
      ]);

      if (listRes.success && listRes.data) {
        setList(listRes.data);
      } else {
        setError(listRes.error || 'Failed to load media list');
      }

      if (sourcesRes.success && sourcesRes.data) {
        setSources(sourcesRes.data.data || []);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this media list?')) return;

    const response = await mediaListApi.delete(id);
    if (response.success) {
      navigate('/admin/digital-signage/media/lists');
    } else {
      setError(response.error || 'Failed to delete');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm('Remove this item from the list?')) return;

    const response = await mediaListApi.removeItem(itemId);
    if (response.success) {
      fetchData();
    } else {
      setError(response.error || 'Failed to remove item');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Media list not found'}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/admin/digital-signage/media/lists')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/digital-signage/media/lists')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ListVideo className="h-6 w-6" />
              {list.name}
            </h1>
            <p className="text-muted-foreground">
              {list.description || 'Media List Details'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowForm(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>List Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={list.isActive ? 'default' : 'secondary'}>
                {list.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Items</p>
              <p className="font-medium">{list.items?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Duration</p>
              <p className="font-medium">{formatDuration(list.totalDuration || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Media Items</CardTitle>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {(!list.items || list.items.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No items in this list</p>
              <p className="text-sm">Add media sources to build your playlist</p>
            </div>
          ) : (
            <div className="space-y-2">
              {list.items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="text-sm text-muted-foreground w-6">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">
                      {item.mediaSource?.name || 'Unknown Source'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.mediaSource?.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {item.duration || item.mediaSource?.duration || 0}s
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      {showForm && (
        <MediaListForm
          list={list}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
