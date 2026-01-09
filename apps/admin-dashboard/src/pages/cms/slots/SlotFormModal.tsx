/**
 * Slot Form Modal
 *
 * WO-P3-CMS-SLOT-MANAGEMENT-P1: Create/Edit slot form
 */

import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import cmsAPI, { CmsContentSlot, CmsContent } from '@/lib/cms';
import toast from 'react-hot-toast';

interface SlotFormModalProps {
  slot: CmsContentSlot | null;
  onClose: () => void;
  onSave: () => void;
}

// Available services
const SERVICES = [
  { value: '', label: 'Global (No Service)' },
  { value: 'glycopharm', label: 'Glycopharm' },
  { value: 'kpa', label: 'KPA Society' },
  { value: 'glucoseview', label: 'GlucoseView' },
  { value: 'neture', label: 'Neture' },
  { value: 'k-cosmetics', label: 'K-Cosmetics' },
];

// Common slot keys
const COMMON_SLOT_KEYS = [
  'home-hero',
  'intranet-hero',
  'dashboard-banner',
  'promo-sidebar',
  'notice-banner',
];

interface FormData {
  slotKey: string;
  serviceKey: string;
  contentId: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
}

export default function SlotFormModal({ slot, onClose, onSave }: SlotFormModalProps) {
  const isEditing = !!slot;

  const [formData, setFormData] = useState<FormData>({
    slotKey: slot?.slotKey || '',
    serviceKey: slot?.serviceKey || '',
    contentId: slot?.contentId || '',
    sortOrder: slot?.sortOrder || 0,
    isActive: slot?.isActive ?? true,
    startsAt: slot?.startsAt ? slot.startsAt.slice(0, 16) : '',
    endsAt: slot?.endsAt ? slot.endsAt.slice(0, 16) : '',
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [contents, setContents] = useState<CmsContent[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);
  const [contentSearch, setContentSearch] = useState('');

  // Load available contents
  useEffect(() => {
    const loadContents = async () => {
      setLoadingContents(true);
      try {
        const params: Record<string, any> = { status: 'published', limit: 100 };
        if (formData.serviceKey) {
          params.serviceKey = formData.serviceKey;
        }
        const response = await cmsAPI.listContents(params);
        setContents(response.data);
      } catch (error) {
        console.error('Failed to load contents:', error);
      } finally {
        setLoadingContents(false);
      }
    };
    loadContents();
  }, [formData.serviceKey]);

  const filteredContents = contents.filter((c) =>
    c.title.toLowerCase().includes(contentSearch.toLowerCase())
  );

  const selectedContent = contents.find((c) => c.id === formData.contentId);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.slotKey.trim()) {
      newErrors.slotKey = 'Slot key is required';
    }

    if (!formData.contentId) {
      newErrors.contentId = 'Content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const data = {
        slotKey: formData.slotKey.trim(),
        serviceKey: formData.serviceKey || undefined,
        contentId: formData.contentId,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
        startsAt: formData.startsAt || undefined,
        endsAt: formData.endsAt || undefined,
      };

      if (isEditing) {
        await cmsAPI.updateSlot(slot!.id, data);
        toast.success('Slot updated successfully');
      } else {
        await cmsAPI.createSlot(data);
        toast.success('Slot created successfully');
      }

      onSave();
    } catch (error: any) {
      console.error('Failed to save slot:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to save slot');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Slot' : 'Create New Slot'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Slot Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slot Key <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="slotKey"
                    value={formData.slotKey}
                    onChange={handleChange}
                    className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.slotKey ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., home-hero"
                  />
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setFormData((prev) => ({ ...prev, slotKey: e.target.value }));
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Quick select...</option>
                    {COMMON_SLOT_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.slotKey && (
                  <p className="mt-1 text-sm text-red-600">{errors.slotKey}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Unique identifier for the slot position (e.g., home-hero, intranet-hero)
                </p>
              </div>

              {/* Service Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service
                </label>
                <select
                  name="serviceKey"
                  value={formData.serviceKey}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SERVICES.map((service) => (
                    <option key={service.value} value={service.value}>
                      {service.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content <span className="text-red-500">*</span>
                </label>

                {/* Search */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={contentSearch}
                    onChange={(e) => setContentSearch(e.target.value)}
                    placeholder="Search contents..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Selected content */}
                {selectedContent && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-blue-900">{selectedContent.title}</span>
                        <span className="ml-2 px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700">
                          {selectedContent.type}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, contentId: '' }))}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Content list */}
                <div className={`border rounded-md max-h-48 overflow-y-auto ${errors.contentId ? 'border-red-500' : 'border-gray-300'}`}>
                  {loadingContents ? (
                    <div className="p-4 text-center text-gray-500">Loading...</div>
                  ) : filteredContents.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No published contents found
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {filteredContents.map((content) => (
                        <li
                          key={content.id}
                          onClick={() => setFormData((prev) => ({ ...prev, contentId: content.id }))}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                            content.id === formData.contentId ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-900">{content.title}</span>
                            <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                              {content.type}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {errors.contentId && (
                  <p className="mt-1 text-sm text-red-600">{errors.contentId}</p>
                )}
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  name="sortOrder"
                  value={formData.sortOrder}
                  onChange={handleChange}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">Lower numbers appear first</p>
              </div>

              {/* Active Toggle */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <p className="mt-1 text-xs text-gray-500 ml-6">
                  Inactive slots will not be displayed
                </p>
              </div>

              {/* Time Window */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Starts At
                  </label>
                  <input
                    type="datetime-local"
                    name="startsAt"
                    value={formData.startsAt}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ends At
                  </label>
                  <input
                    type="datetime-local"
                    name="endsAt"
                    value={formData.endsAt}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Leave empty for no time restrictions
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving}
              >
                {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
