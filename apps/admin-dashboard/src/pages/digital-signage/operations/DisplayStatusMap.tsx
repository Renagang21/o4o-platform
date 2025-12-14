/**
 * Digital Signage Display Status Map
 *
 * Visual overview of all displays and their slot status.
 * Phase 12: Operations convenience features
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  operationsApi,
  Display,
  DisplaySlot,
  DisplayStatus,
  SlotStatus,
} from '@/lib/api/digitalSignage';

type DisplayWithSlots = Display & { slots: DisplaySlot[] };

const displayStatusConfig: Record<DisplayStatus, { color: string; label: string }> = {
  online: { color: 'bg-green-500', label: 'Online' },
  offline: { color: 'bg-red-500', label: 'Offline' },
  unknown: { color: 'bg-gray-500', label: 'Unknown' },
};

const slotStatusConfig: Record<SlotStatus, { color: string; label: string }> = {
  idle: { color: 'bg-gray-400', label: 'Idle' },
  playing: { color: 'bg-blue-500', label: 'Playing' },
  paused: { color: 'bg-orange-500', label: 'Paused' },
  error: { color: 'bg-red-500', label: 'Error' },
};

function formatLastHeartbeat(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function DisplayCard({ display }: { display: DisplayWithSlots }) {
  const statusConfig = displayStatusConfig[display.status];

  return (
    <Card className={`${display.status === 'offline' ? 'border-red-300 bg-red-50/50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{display.name}</CardTitle>
          <Badge className={statusConfig.color}>
            {statusConfig.label}
          </Badge>
        </div>
        {display.location && (
          <p className="text-sm text-muted-foreground">{display.location}</p>
        )}
      </CardHeader>
      <CardContent>
        {/* Heartbeat info */}
        <div className="text-sm text-muted-foreground mb-3">
          Last heartbeat: {formatLastHeartbeat(display.lastHeartbeat)}
        </div>

        {/* Slots */}
        <div className="space-y-2">
          <div className="text-sm font-medium">
            Slots ({display.slots.length})
          </div>
          {display.slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slots configured</p>
          ) : (
            <div className="grid gap-2">
              {display.slots.map(slot => {
                const slotConfig = slotStatusConfig[slot.status];
                return (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${slotConfig.color}`} />
                      <span className="text-sm">{slot.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {slotConfig.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 pt-3 border-t">
          <Link to={`/digital-signage/displays/${display.id}`}>
            <Button variant="ghost" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DisplayStatusMap() {
  const [displays, setDisplays] = useState<DisplayWithSlots[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const result = await operationsApi.getDisplaysWithSlots();

    if (!result.success) {
      setError('Failed to load displays');
    } else {
      setDisplays(result.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 15 seconds
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Calculate summary
  const summary = {
    total: displays.length,
    online: displays.filter(d => d.status === 'online').length,
    offline: displays.filter(d => d.status === 'offline').length,
    totalSlots: displays.reduce((sum, d) => sum + d.slots.length, 0),
    playingSlots: displays.reduce(
      (sum, d) => sum + d.slots.filter(s => s.status === 'playing').length,
      0
    ),
  };

  if (loading && displays.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Display Status Map</h1>
          <p className="text-muted-foreground text-sm">
            Real-time status of all displays and slots
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/digital-signage/operations">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
          <Button onClick={loadData} variant="outline" disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-6 justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-sm text-muted-foreground">Total Displays</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.online}</div>
              <div className="text-sm text-muted-foreground">Online</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.offline}</div>
              <div className="text-sm text-muted-foreground">Offline</div>
            </div>
            <div className="border-l pl-6 text-center">
              <div className="text-2xl font-bold">{summary.totalSlots}</div>
              <div className="text-sm text-muted-foreground">Total Slots</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.playingSlots}</div>
              <div className="text-sm text-muted-foreground">Playing</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="font-medium">Display Status:</div>
          {Object.entries(displayStatusConfig).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded-full ${config.color}`} />
              <span>{config.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="font-medium">Slot Status:</div>
          {Object.entries(slotStatusConfig).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded-full ${config.color}`} />
              <span>{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Display Grid */}
      {displays.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No displays configured yet.{' '}
            <Link to="/digital-signage/displays" className="text-primary hover:underline">
              Add a display
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displays.map(display => (
            <DisplayCard key={display.id} display={display} />
          ))}
        </div>
      )}
    </div>
  );
}
