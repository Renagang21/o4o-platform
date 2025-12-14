/**
 * Display Slot List
 *
 * List view for all display slots across displays
 * Phase 6: Digital Signage Management UI
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AGTable, type AGTableColumn } from '@/components/ag/AGTable';
import { LayoutGrid, Monitor } from 'lucide-react';
import { displaySlotApi, type DisplaySlot, type SlotStatus } from '@/lib/api/digitalSignage';

const SLOT_STATUS_COLORS: Record<SlotStatus, string> = {
  idle: 'bg-gray-100 text-gray-700',
  playing: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
};

export default function DisplaySlotList() {
  const [slots, setSlots] = useState<DisplaySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await displaySlotApi.list();
      if (response.success && response.data) {
        setSlots(response.data.data || []);
      } else {
        setError(response.error || 'Failed to load display slots');
      }
    } catch (err) {
      setError('Failed to load display slots');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const columns: AGTableColumn<DisplaySlot>[] = [
    {
      key: 'status',
      header: 'Status',
      render: (slot) => (
        <Badge className={SLOT_STATUS_COLORS[slot.status]}>
          {slot.status}
        </Badge>
      ),
    },
    {
      key: 'name',
      header: 'Slot Name',
      render: (slot) => (
        <span className="font-medium">{slot.name}</span>
      ),
    },
    {
      key: 'display',
      header: 'Display',
      render: (slot) => (
        <Link
          to={`/admin/digital-signage/displays/${slot.displayId}`}
          className="text-primary hover:underline flex items-center gap-1"
        >
          <Monitor className="h-3 w-3" />
          {slot.display?.name || slot.displayId}
        </Link>
      ),
    },
    {
      key: 'position',
      header: 'Position',
      render: (slot) => (
        <span className="text-sm text-muted-foreground">
          {slot.position || '-'}
        </span>
      ),
    },
    {
      key: 'currentAction',
      header: 'Current Action',
      render: (slot) => (
        slot.currentActionId ? (
          <Link
            to={`/admin/digital-signage/actions/${slot.currentActionId}`}
            className="text-xs text-primary hover:underline"
          >
            View Action
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">None</span>
        )
      ),
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (slot) => (
        <Badge variant={slot.isActive ? 'default' : 'secondary'}>
          {slot.isActive ? 'Yes' : 'No'}
        </Badge>
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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutGrid className="h-6 w-6" />
          Display Slots
        </h1>
        <p className="text-muted-foreground">
          View all display slots and their current status
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {slots.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <LayoutGrid className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No display slots found</p>
              <p className="text-sm">Create slots on individual displays</p>
            </div>
          ) : (
            <AGTable data={slots} columns={columns} keyField="id" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
