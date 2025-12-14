/**
 * Media Source Detail
 *
 * Detail view for a single media source
 * Phase 6: Digital Signage Management UI
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Pencil, Trash2, Film, Youtube, Video, Image } from 'lucide-react';
import { mediaSourceApi, type MediaSource, type MediaType } from '@/lib/api/digitalSignage';
import MediaSourceForm from './MediaSourceForm';

const MEDIA_TYPE_ICONS: Record<MediaType, React.ReactNode> = {
  youtube: <Youtube className="h-5 w-5 text-red-500" />,
  vimeo: <Video className="h-5 w-5 text-blue-500" />,
  internal_video: <Film className="h-5 w-5 text-purple-500" />,
  image: <Image className="h-5 w-5 text-green-500" />,
};

export default function MediaSourceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [source, setSource] = useState<MediaSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchSource = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await mediaSourceApi.get(id);
      if (response.success && response.data) {
        setSource(response.data);
      } else {
        setError(response.error || 'Failed to load media source');
      }
    } catch (err) {
      setError('Failed to load media source');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSource();
  }, [id]);

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this media source?')) return;

    const response = await mediaSourceApi.delete(id);
    if (response.success) {
      navigate('/admin/digital-signage/media/sources');
    } else {
      setError(response.error || 'Failed to delete');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !source) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Media source not found'}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/admin/digital-signage/media/sources')}
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
            onClick={() => navigate('/admin/digital-signage/media/sources')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {MEDIA_TYPE_ICONS[source.type]}
              {source.name}
            </h1>
            <p className="text-muted-foreground">Media Source Details</p>
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

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{source.type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={source.isActive ? 'default' : 'secondary'}>
                {source.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">URL</p>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
              >
                {source.url}
              </a>
            </div>
            {source.thumbnailUrl && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Thumbnail</p>
                <img
                  src={source.thumbnailUrl}
                  alt={source.name}
                  className="mt-2 max-w-xs rounded border"
                />
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">
                {source.duration ? `${source.duration} seconds` : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(source.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Modal */}
      {showForm && (
        <MediaSourceForm
          source={source}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            fetchSource();
          }}
        />
      )}
    </div>
  );
}
