import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CreateInstanceModalProps {
  onClose: () => void;
  onSubmit: (data: {
    domain: string;
    apps: string[];
    region?: string;
    instanceType?: string;
    description?: string;
  }) => Promise<void>;
}

const AVAILABLE_APPS = [
  { id: 'commerce', name: 'Commerce', description: 'E-commerce functionality' },
  { id: 'customer', name: 'Customer Portal', description: 'Customer dashboard' },
  { id: 'admin', name: 'Admin Dashboard', description: 'Administration interface' },
  { id: 'forum-yaksa', name: 'Yaksa Forum', description: 'Community forum' },
  { id: 'forum-neture', name: 'Neture Forum', description: 'Neture community' },
  { id: 'signage', name: 'Digital Signage', description: 'Signage system' },
];

const REGIONS = [
  { id: 'ap-northeast-2', name: 'Seoul (ap-northeast-2)' },
  { id: 'us-east-1', name: 'N. Virginia (us-east-1)' },
  { id: 'eu-west-1', name: 'Ireland (eu-west-1)' },
];

const INSTANCE_TYPES = [
  { id: 'nano_3_0', name: 'Nano', description: '512MB RAM, 2 vCPUs' },
  { id: 'micro_3_0', name: 'Micro', description: '1GB RAM, 2 vCPUs' },
  { id: 'small_3_0', name: 'Small', description: '2GB RAM, 2 vCPUs' },
  { id: 'medium_3_0', name: 'Medium', description: '4GB RAM, 2 vCPUs' },
];

const CreateInstanceModal: React.FC<CreateInstanceModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    domain: '',
    apps: [] as string[],
    region: 'ap-northeast-2',
    instanceType: 'nano_3_0',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.domain) {
      setError('Domain is required');
      return;
    }

    if (formData.apps.length === 0) {
      setError('Please select at least one app');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to create instance');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleApp = (appId: string) => {
    setFormData(prev => ({
      ...prev,
      apps: prev.apps.includes(appId)
        ? prev.apps.filter(id => id !== appId)
        : [...prev.apps, appId],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Create New Instance</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {/* Domain */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Domain *
            </label>
            <input
              type="text"
              value={formData.domain}
              onChange={e => setFormData({ ...formData, domain: e.target.value })}
              placeholder="example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              The domain where this instance will be accessible
            </p>
          </div>

          {/* Apps Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Apps to Install *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AVAILABLE_APPS.map(app => (
                <label
                  key={app.id}
                  className={`flex items-start p-4 border rounded-lg cursor-pointer transition ${
                    formData.apps.includes(app.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.apps.includes(app.id)}
                    onChange={() => toggleApp(app.id)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{app.name}</p>
                    <p className="text-sm text-gray-600">{app.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Region
            </label>
            <select
              value={formData.region}
              onChange={e => setFormData({ ...formData, region: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {REGIONS.map(region => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          {/* Instance Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instance Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {INSTANCE_TYPES.map(type => (
                <label
                  key={type.id}
                  className={`flex items-start p-4 border rounded-lg cursor-pointer transition ${
                    formData.instanceType === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="instanceType"
                    value={type.id}
                    checked={formData.instanceType === type.id}
                    onChange={e => setFormData({ ...formData, instanceType: e.target.value })}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{type.name}</p>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add a description for this instance..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Instance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateInstanceModal;
