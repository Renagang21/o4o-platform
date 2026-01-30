/**
 * Display List
 *
 * List view for display devices
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
  Monitor,
  MoreVertical,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { displayApi, type Display, type DisplayStatus } from '@/lib/api/digitalSignage';
import DisplayForm from './DisplayForm';

const STATUS_CONFIG: Record<DisplayStatus, { icon: React.ReactNode; color: string; label: string }> = {
  online: { icon: <Wifi className="h-4 w-4" />, color: 'text-green-500', label: 'Online' },
  offline: { icon: <WifiOff className="h-4 w-4" />, color: 'text-red-500', label: 'Offline' },
  unknown: { icon: <Monitor className="h-4 w-4" />, color: 'text-gray-500', label: 'Unknown' },
};

export default function DisplayList() {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDisplay, setEditingDisplay] = useState<Display | null>(null);

  const fetchDisplays = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await displayApi.list();
      if (response.success && response.data) {
        setDisplays(response.data.data || []);
      } else {
        setError(response.error || 'Failed to load displays');
      }
    } catch (err) {
      setError('Failed to load displays');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisplays();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this display?')) return;

    const response = await displayApi.delete(id);
    if (response.success) {
      fetchDisplays();
    } else {
      setError(response.error || 'Failed to delete');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingDisplay(null);
    fetchDisplays();
  };

  const columns: AGTableColumn<Display>[] = [
    {
      key: 'status',
      header: 'Status',
      render: (display) => {
        const config = STATUS_CONFIG[display.status];
        return (
          <div className={`flex items-center gap-2 ${config.color}`}>
            {config.icon}
            <span className="text-sm">{config.label}</span>
          </div>
        );
      },
    },
    {
      key: 'name',
      header: 'Name',
      render: (display) => (
        <Link
          to={`/admin/digital-signage/displays/${display.id}`}
          className="font-medium text-primary hover:underline"
        >
          {display.name}
        </Link>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (display) => (
        <span className="text-sm text-muted-foreground">
          {display.location || '-'}
        </span>
      ),
    },
    {
      key: 'deviceId',
      header: 'Device ID',
      render: (display) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {display.deviceId || '-'}
        </code>
      ),
    },
    {
      key: 'lastHeartbeat',
      header: 'Last Heartbeat',
      render: (display) => (
        <span className="text-sm text-muted-foreground">
          {display.lastHeartbeat
            ? new Date(display.lastHeartbeat).toLocaleString()
            : 'Never'}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (display) => (
        <Badge variant={display.isActive ? 'default' : 'secondary'}>
          {display.isActive ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (display) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingDisplay(display)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(display.id)}
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
            <Monitor className="h-6 w-6" />
            Displays
          </h1>
          <p className="text-muted-foreground">
            Manage digital signage display devices
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Display
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
          {displays.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No displays registered yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                Register your first display
              </Button>
            </div>
          ) : (
            <AGTable data={displays} columns={columns} rowKey="id" />
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      {(showForm || editingDisplay) && (
        <DisplayForm
          display={editingDisplay}
          onClose={() => {
            setShowForm(false);
            setEditingDisplay(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
