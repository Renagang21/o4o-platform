import React, { useState } from 'react';

interface CreateSiteModalProps {
  onClose: () => void;
  onCreate: (siteData: any) => Promise<void>;
}

const TEMPLATES = [
  {
    id: 'default',
    name: 'Default',
    description: 'Standard e-commerce site with commerce, customer, and admin apps',
    apps: ['commerce', 'customer', 'admin'],
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    description: 'Full-featured online store with cart and wishlist',
    apps: ['commerce', 'customer', 'admin', 'cart', 'wishlist'],
  },
  {
    id: 'forum',
    name: 'Community Forum',
    description: 'Discussion forum with customer and admin apps',
    apps: ['forum', 'customer', 'admin'],
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    description: 'Pharmacy store with Yaksa forum integration',
    apps: ['commerce', 'customer', 'admin', 'forum-yaksa'],
  },
  {
    id: 'signage',
    name: 'Digital Signage',
    description: 'Digital signage system for displays',
    apps: ['signage', 'admin'],
  },
];

export function CreateSiteModal({ onClose, onCreate }: CreateSiteModalProps) {
  const [formData, setFormData] = useState({
    domain: '',
    name: '',
    description: '',
    template: 'default',
    deployNow: false,
    variables: {
      siteName: '',
      contactEmail: '',
      contactPhone: '',
      contactAddress: '',
      logoUrl: '',
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedTemplate = TEMPLATES.find((t) => t.id === formData.template);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.domain) {
      setError('Domain is required');
      return;
    }
    if (!formData.name) {
      setError('Site name is required');
      return;
    }

    // Clean up empty variables
    const cleanedVariables: Record<string, string> = {};
    Object.entries(formData.variables).forEach(([key, value]) => {
      if (value.trim()) {
        cleanedVariables[key] = value;
      }
    });

    setLoading(true);
    try {
      await onCreate({
        domain: formData.domain,
        name: formData.name,
        description: formData.description || undefined,
        template: formData.template,
        deployNow: formData.deployNow,
        variables: Object.keys(cleanedVariables).length > 0 ? cleanedVariables : undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create site');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Create New Site</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain *
              </label>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="mystore.example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The domain where your site will be accessible
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Awesome Store"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description of your site"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Template</h3>

            <div className="grid grid-cols-1 gap-3">
              {TEMPLATES.map((template) => (
                <label
                  key={template.id}
                  className={`
                    relative flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors
                    ${
                      formData.template === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={formData.template === template.id}
                    onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                    className="mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <div className="font-medium text-gray-900">{template.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      Apps: {template.apps.join(', ')}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Template Variables */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Customization (Optional)</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Name (for templates)
              </label>
              <input
                type="text"
                value={formData.variables.siteName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    variables: { ...formData.variables, siteName: e.target.value },
                  })
                }
                placeholder="Leave empty to use domain"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.variables.contactEmail}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    variables: { ...formData.variables, contactEmail: e.target.value },
                  })
                }
                placeholder="info@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.variables.contactPhone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      variables: { ...formData.variables, contactPhone: e.target.value },
                    })
                  }
                  placeholder="+1-555-0123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={formData.variables.logoUrl}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      variables: { ...formData.variables, logoUrl: e.target.value },
                    })
                  }
                  placeholder="/media/logo.png"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Address
              </label>
              <input
                type="text"
                value={formData.variables.contactAddress}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    variables: { ...formData.variables, contactAddress: e.target.value },
                  })
                }
                placeholder="123 Main St, City, Country"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Deployment Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Deployment</h3>

            <label className="flex items-start">
              <input
                type="checkbox"
                checked={formData.deployNow}
                onChange={(e) => setFormData({ ...formData, deployNow: e.target.checked })}
                className="mt-1"
              />
              <div className="ml-3">
                <div className="font-medium text-gray-900">Deploy Immediately</div>
                <div className="text-sm text-gray-600">
                  Automatically scaffold and deploy the site after creation
                </div>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
