/**
 * Channel Form Modal
 *
 * WO-P4-CHANNEL-IMPLEMENT-P0: Create/Edit channel modal form
 */

import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import channelAPI, {
  Channel,
  ChannelType,
  ChannelStatus,
  CreateChannelData,
} from '@/lib/channels';
import toast from 'react-hot-toast';

interface ChannelFormModalProps {
  channel: Channel | null;
  onClose: () => void;
  onSave: () => void;
}

// Available services
const SERVICES = [
  { value: '', label: 'Global (All Services)' },
  { value: 'glycopharm', label: 'Glycopharm' },
  { value: 'kpa', label: 'KPA Society' },
  { value: 'glucoseview', label: 'GlucoseView' },
  { value: 'neture', label: 'Neture' },
  { value: 'k-cosmetics', label: 'K-Cosmetics' },
];

// Channel types
const CHANNEL_TYPES: { value: ChannelType; label: string; description: string }[] = [
  { value: 'tv', label: 'TV', description: 'Television display, typically wall-mounted' },
  { value: 'kiosk', label: 'Kiosk', description: 'Interactive touchscreen kiosk' },
  { value: 'signage', label: 'Signage', description: 'Digital signage display' },
  { value: 'web', label: 'Web', description: 'Web browser banner or widget' },
];

// Channel statuses
const CHANNEL_STATUSES: { value: ChannelStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
];

// Common resolutions
const RESOLUTIONS = [
  { value: '', label: 'Not specified' },
  { value: '1920x1080', label: '1920x1080 (Full HD)' },
  { value: '3840x2160', label: '3840x2160 (4K UHD)' },
  { value: '1080x1920', label: '1080x1920 (Portrait Full HD)' },
  { value: '2160x3840', label: '2160x3840 (Portrait 4K)' },
  { value: '1280x720', label: '1280x720 (HD)' },
];

// Common slot keys for suggestions
const COMMON_SLOT_KEYS = [
  'home-hero',
  'intranet-hero',
  'dashboard-banner',
  'store-tv-loop',
  'lobby-display',
  'promo-sidebar',
];

export default function ChannelFormModal({
  channel,
  onClose,
  onSave,
}: ChannelFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateChannelData>({
    name: '',
    code: '',
    description: '',
    type: 'tv',
    slotKey: '',
    serviceKey: '',
    status: 'active',
    resolution: '',
    orientation: 'landscape',
    autoplay: true,
    refreshIntervalSec: undefined,
    defaultDurationSec: 10,
    location: '',
    metadata: {},
  });

  useEffect(() => {
    if (channel) {
      setFormData({
        name: channel.name,
        code: channel.code || '',
        description: channel.description || '',
        type: channel.type,
        slotKey: channel.slotKey,
        serviceKey: channel.serviceKey || '',
        status: channel.status,
        resolution: channel.resolution || '',
        orientation: channel.orientation,
        autoplay: channel.autoplay,
        refreshIntervalSec: channel.refreshIntervalSec || undefined,
        defaultDurationSec: channel.defaultDurationSec,
        location: channel.location || '',
        metadata: channel.metadata || {},
      });
    }
  }, [channel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!formData.slotKey.trim()) {
      toast.error('Slot Key is required');
      return;
    }

    try {
      setLoading(true);

      const data: CreateChannelData = {
        ...formData,
        serviceKey: formData.serviceKey || undefined,
        code: formData.code || undefined,
        description: formData.description || undefined,
        resolution: formData.resolution || undefined,
        location: formData.location || undefined,
      };

      if (channel) {
        await channelAPI.updateChannel(channel.id, data);
        toast.success('Channel updated successfully');
      } else {
        await channelAPI.createChannel(data);
        toast.success('Channel created successfully');
      }

      onSave();
    } catch (error: any) {
      console.error('Failed to save channel:', error);
      const message = error.response?.data?.error?.message || 'Failed to save channel';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else if (type === 'number') {
      setFormData((prev) => ({
        ...prev,
        [name]: value ? parseInt(value, 10) : undefined,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {channel ? 'Edit Channel' : 'Create Channel'}
            </h2>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {/* Basic Info Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Basic Information</h3>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Gangnam Pharmacy TV-1"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Code (optional)
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="e.g., GN-TV-001"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Machine-readable unique identifier for device binding
                  </p>
                </div>

                {/* Type & Service Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {CHANNEL_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Service */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Service</label>
                    <select
                      name="serviceKey"
                      value={formData.serviceKey}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {SERVICES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {CHANNEL_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CMS Binding Section */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-sm font-medium text-gray-700">CMS Binding</h3>

                {/* Slot Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Slot Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="slotKey"
                    value={formData.slotKey}
                    onChange={handleChange}
                    placeholder="e.g., store-tv-loop"
                    list="slotKeyList"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <datalist id="slotKeyList">
                    {COMMON_SLOT_KEYS.map((key) => (
                      <option key={key} value={key} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-xs text-gray-500">
                    References CMS Slot key to fetch content from
                  </p>
                </div>
              </div>

              {/* Display Options Section */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-sm font-medium text-gray-700">Display Options</h3>

                {/* Resolution & Orientation Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Resolution */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Resolution</label>
                    <select
                      name="resolution"
                      value={formData.resolution}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {RESOLUTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Orientation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Orientation</label>
                    <select
                      name="orientation"
                      value={formData.orientation}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="landscape">Landscape</option>
                      <option value="portrait">Portrait</option>
                    </select>
                  </div>
                </div>

                {/* Duration & Refresh Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Default Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Default Duration (sec)
                    </label>
                    <input
                      type="number"
                      name="defaultDurationSec"
                      value={formData.defaultDurationSec || ''}
                      onChange={handleChange}
                      min="1"
                      max="300"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Per content item in loops</p>
                  </div>

                  {/* Refresh Interval */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Refresh Interval (sec)
                    </label>
                    <input
                      type="number"
                      name="refreshIntervalSec"
                      value={formData.refreshIntervalSec || ''}
                      onChange={handleChange}
                      min="30"
                      placeholder="No auto-refresh"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Leave empty for no auto-refresh</p>
                  </div>
                </div>

                {/* Autoplay */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoplay"
                    name="autoplay"
                    checked={formData.autoplay}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="autoplay" className="text-sm text-gray-700">
                    Auto-start content playback
                  </label>
                </div>
              </div>

              {/* Location Section */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-sm font-medium text-gray-700">Location</h3>

                {/* Physical Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Physical Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g., 1st Floor Lobby, Next to Counter"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Additional notes about this channel..."
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3 border-t pt-6">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {channel ? 'Update' : 'Create'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
