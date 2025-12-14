/**
 * Display Detail
 *
 * Detail view for a display with slots
 * Phase 6: Digital Signage Management UI
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Monitor,
  Wifi,
  WifiOff,
  Plus,
  LayoutGrid,
} from 'lucide-react';
import {
  displayApi,
  displaySlotApi,
  type Display,
  type DisplaySlot,
  type DisplayStatus,
  type SlotStatus,
} from '@/lib/api/digitalSignage';
import DisplayForm from './DisplayForm';

const STATUS_CONFIG: Record<DisplayStatus, { icon: React.ReactNode; color: string }> = {
  online: { icon: <Wifi className="h-5 w-5" />, color: 'text-green-500' },
  offline: { icon: <WifiOff className="h-5 w-5" />, color: 'text-red-500' },
  unknown: { icon: <Monitor className="h-5 w-5" />, color: 'text-gray-500' },
};

const SLOT_STATUS_COLORS: Record<SlotStatus, string> = {
  idle: 'bg-gray-100 text-gray-700',
  playing: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
};

export default function DisplayDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [display, setDisplay] = useState<Display | null>(null);
  const [slots, setSlots] = useState<DisplaySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    try {
      const [displayRes, slotsRes] = await Promise.all([
        displayApi.get(id),
        displaySlotApi.list(id),
      ]);

      if (displayRes.success && displayRes.data) {
        setDisplay(displayRes.data);
      } else {
        setError(displayRes.error || 'Failed to load display');
      }

      if (slotsRes.success && slotsRes.data) {
        setSlots(slotsRes.data.data || []);
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
    if (!id || !confirm('Are you sure you want to delete this display?')) return;

    const response = await displayApi.delete(id);
    if (response.success) {
      navigate('/admin/digital-signage/displays');
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

  if (error || !display) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Display not found'}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/admin/digital-signage/displays')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[display.status];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/digital-signage/displays')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Monitor className="h-6 w-6" />
              {display.name}
            </h1>
            <p className="text-muted-foreground">
              {display.location || 'Display Details'}
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

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Display Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Connection</p>
              <div className={`flex items-center gap-2 font-medium ${statusConfig.color}`}>
                {statusConfig.icon}
                <span className="capitalize">{display.status}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <Badge variant={display.isActive ? 'default' : 'secondary'}>
                {display.isActive ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Device ID</p>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {display.deviceId || 'Not set'}
              </code>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Heartbeat</p>
              <p className="font-medium">
                {display.lastHeartbeat
                  ? new Date(display.lastHeartbeat).toLocaleString()
                  : 'Never'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slots Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Display Slots
          </CardTitle>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Slot
          </Button>
        </CardHeader>
        <CardContent>
          {slots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No slots configured for this display</p>
              <p className="text-sm">Add slots to define playback regions</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{slot.name}</h4>
                    <Badge className={SLOT_STATUS_COLORS[slot.status]}>
                      {slot.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {slot.position || 'No position set'}
                  </p>
                  {slot.currentActionId && (
                    <Link
                      to={`/admin/digital-signage/actions/${slot.currentActionId}`}
                      className="text-xs text-primary hover:underline mt-2 block"
                    >
                      View current action
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      {showForm && (
        <DisplayForm
          display={display}
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
