/**
 * Digital Signage Action History
 *
 * Historical view of action executions with filters.
 * Phase 12: Operations convenience features
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  actionApi,
  displaySlotApi,
  ActionExecution,
  DisplaySlot,
  ExecutionStatus,
} from '@/lib/api/digitalSignage';

const statusColors: Record<ExecutionStatus, string> = {
  pending: 'bg-yellow-500',
  running: 'bg-blue-500',
  paused: 'bg-orange-500',
  completed: 'bg-green-500',
  stopped: 'bg-gray-500',
  failed: 'bg-red-500',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(startStr?: string, endStr?: string): string {
  if (!startStr) return '-';
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date();
  const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default function ActionHistory() {
  const [actions, setActions] = useState<ActionExecution[]>([]);
  const [slots, setSlots] = useState<DisplaySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const [actionsRes, slotsRes] = await Promise.all([
      actionApi.listExecutions(),
      displaySlotApi.list(),
    ]);

    if (!actionsRes.success) {
      setError('Failed to load actions');
    } else {
      setActions(actionsRes.data?.data || []);
    }

    if (slotsRes.success) {
      setSlots(slotsRes.data?.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Apply filters
  const filteredActions = actions.filter(action => {
    // Status filter
    if (statusFilter !== 'all' && action.status !== statusFilter) {
      return false;
    }

    // Slot filter
    if (slotFilter !== 'all' && action.displaySlotId !== slotFilter) {
      return false;
    }

    // Date filters
    if (startDate && action.createdAt) {
      const actionDate = new Date(action.createdAt);
      const filterDate = new Date(startDate);
      if (actionDate < filterDate) return false;
    }

    if (endDate && action.createdAt) {
      const actionDate = new Date(action.createdAt);
      const filterDate = new Date(endDate);
      filterDate.setHours(23, 59, 59, 999);
      if (actionDate > filterDate) return false;
    }

    return true;
  }).sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const clearFilters = () => {
    setStatusFilter('all');
    setSlotFilter('all');
    setStartDate('');
    setEndDate('');
  };

  if (loading && actions.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Action History</h1>
          <p className="text-muted-foreground text-sm">
            Historical view of all action executions
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="stopped">Stopped</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Display Slot</Label>
              <Select value={slotFilter} onValueChange={setSlotFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All slots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Slots</SelectItem>
                  {slots.map(slot => (
                    <SelectItem key={slot.id} value={slot.id}>
                      {slot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button variant="ghost" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Showing {filteredActions.length} of {actions.length} actions
        </p>
      </div>

      {/* Actions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Media List</TableHead>
                <TableHead>Display Slot</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No actions found matching the filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredActions.map(action => (
                  <TableRow key={action.id}>
                    <TableCell>
                      <Badge className={statusColors[action.status]}>
                        {action.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {action.mediaList?.name || action.mediaListId.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      {action.displaySlot?.name || action.displaySlotId.slice(0, 8)}
                    </TableCell>
                    <TableCell>{formatDate(action.startedAt)}</TableCell>
                    <TableCell>
                      {formatDuration(action.startedAt, action.completedAt)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {action.error || '-'}
                    </TableCell>
                    <TableCell>
                      <Link to={`/digital-signage/actions/${action.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
