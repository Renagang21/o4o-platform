/**
 * Channel List Page
 *
 * WO-P4-CHANNEL-IMPLEMENT-P0: Admin UI for managing channels
 *
 * Features:
 * - List all channels with filters (serviceKey, type, status)
 * - Create/Edit/Delete channels
 * - Quick status toggle
 * - View channel contents preview
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Filter,
  Tv,
  Monitor,
  Tablet,
  Globe,
  ToggleLeft,
  ToggleRight,
  Eye,
  Wrench,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import channelAPI, { Channel, ChannelType, ChannelStatus } from '@/lib/channels';
import toast from 'react-hot-toast';
import ChannelFormModal from './ChannelFormModal';
import ChannelContentsPreview from './ChannelContentsPreview';

// Available services
const SERVICES = [
  { value: '', label: 'All Services' },
  { value: 'glycopharm', label: 'Glycopharm' },
  { value: 'kpa', label: 'KPA Society' },
  { value: 'glucoseview', label: 'GlucoseView' },
  { value: 'neture', label: 'Neture' },
  { value: 'k-cosmetics', label: 'K-Cosmetics' },
];

// Channel types
const CHANNEL_TYPES: { value: ChannelType | ''; label: string; icon: React.ElementType }[] = [
  { value: '', label: 'All Types', icon: Monitor },
  { value: 'tv', label: 'TV', icon: Tv },
  { value: 'kiosk', label: 'Kiosk', icon: Tablet },
  { value: 'signage', label: 'Signage', icon: Monitor },
  { value: 'web', label: 'Web', icon: Globe },
];

// Channel statuses
const CHANNEL_STATUSES: { value: ChannelStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
];

const getChannelIcon = (type: ChannelType) => {
  switch (type) {
    case 'tv':
      return Tv;
    case 'kiosk':
      return Tablet;
    case 'signage':
      return Monitor;
    case 'web':
      return Globe;
    default:
      return Monitor;
  }
};

const getStatusColor = (status: ChannelStatus) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-800';
    case 'maintenance':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function ChannelList() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterService, setFilterService] = useState('');
  const [filterType, setFilterType] = useState<ChannelType | ''>('');
  const [filterStatus, setFilterStatus] = useState<ChannelStatus | ''>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [previewingChannel, setPreviewingChannel] = useState<Channel | null>(null);
  const [total, setTotal] = useState(0);

  const loadChannels = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (filterService) params.serviceKey = filterService;
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;

      const response = await channelAPI.listChannels(params);
      setChannels(response.data);
      setTotal(response.pagination.total);
    } catch (error) {
      console.error('Failed to load channels:', error);
      toast.error('Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, [filterService, filterType, filterStatus]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const handleCreate = () => {
    setEditingChannel(null);
    setIsFormOpen(true);
  };

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setIsFormOpen(true);
  };

  const handleDelete = async (channel: Channel) => {
    if (!confirm(`Are you sure you want to delete channel "${channel.name}"?`)) {
      return;
    }

    try {
      await channelAPI.deleteChannel(channel.id);
      toast.success('Channel deleted successfully');
      loadChannels();
    } catch (error) {
      console.error('Failed to delete channel:', error);
      toast.error('Failed to delete channel');
    }
  };

  const handleStatusToggle = async (channel: Channel) => {
    const newStatus: ChannelStatus = channel.status === 'active' ? 'inactive' : 'active';
    try {
      await channelAPI.updateChannelStatus(channel.id, newStatus);
      toast.success(`Channel ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      loadChannels();
    } catch (error) {
      console.error('Failed to update channel status:', error);
      toast.error('Failed to update channel status');
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingChannel(null);
  };

  const handleFormSave = () => {
    handleFormClose();
    loadChannels();
  };

  const handlePreview = (channel: Channel) => {
    setPreviewingChannel(channel);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Channels</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage content distribution channels (TV, Kiosk, Signage, Web)
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Add Channel
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>

        {/* Service Filter */}
        <select
          value={filterService}
          onChange={(e) => setFilterService(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {SERVICES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ChannelType | '')}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {CHANNEL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ChannelStatus | '')}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {CHANNEL_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <button
          onClick={loadChannels}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        <div className="ml-auto text-sm text-gray-500">
          {total} channel{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Channel List */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : channels.length === 0 ? (
          <div className="py-12 text-center">
            <Monitor className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No channels</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new channel.</p>
            <div className="mt-6">
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Channel
              </button>
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Slot Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {channels.map((channel) => {
                const TypeIcon = getChannelIcon(channel.type);
                return (
                  <tr key={channel.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                          <TypeIcon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{channel.name}</div>
                          {channel.code && (
                            <div className="text-xs text-gray-500">Code: {channel.code}</div>
                          )}
                          {channel.location && (
                            <div className="text-xs text-gray-400">{channel.location}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        {channel.type.toUpperCase()}
                      </span>
                      {channel.resolution && (
                        <div className="mt-1 text-xs text-gray-400">
                          {channel.resolution} ({channel.orientation})
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <code className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                        {channel.slotKey}
                      </code>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {channel.serviceKey || <span className="text-gray-400">Global</span>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                          channel.status
                        )}`}
                      >
                        {channel.status === 'maintenance' && <Wrench className="mr-1 h-3 w-3" />}
                        {channel.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {/* Preview Button */}
                        <button
                          onClick={() => handlePreview(channel)}
                          className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                          title="Preview Contents"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Status Toggle */}
                        <button
                          onClick={() => handleStatusToggle(channel)}
                          className={`rounded p-1 ${
                            channel.status === 'active'
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={channel.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {channel.status === 'active' ? (
                            <ToggleRight className="h-5 w-5" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleEdit(channel)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(channel)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <ChannelFormModal
          channel={editingChannel}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}

      {/* Contents Preview Modal */}
      {previewingChannel && (
        <ChannelContentsPreview
          channel={previewingChannel}
          onClose={() => setPreviewingChannel(null)}
        />
      )}
    </div>
  );
}
