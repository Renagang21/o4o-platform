/**
 * CMS Slot List Page
 *
 * WO-P3-CMS-SLOT-MANAGEMENT-P1: Admin UI for managing content slots
 *
 * Features:
 * - List all slots grouped by slotKey
 * - Filter by service and active status
 * - Create/Edit/Delete slots
 * - Assign contents to slots
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Layout,
  Filter,
  X,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import cmsAPI, { CmsContentSlot } from '@/lib/cms';
import toast from 'react-hot-toast';
import SlotFormModal from './SlotFormModal';
import SlotContentAssignment from './SlotContentAssignment';

// Available services
const SERVICES = [
  { value: '', label: 'All Services' },
  { value: 'glycopharm', label: 'Glycopharm' },
  { value: 'kpa', label: 'KPA Society' },
  { value: 'glucoseview', label: 'GlucoseView' },
  { value: 'neture', label: 'Neture' },
  { value: 'k-cosmetics', label: 'K-Cosmetics' },
];

// Common slot keys for quick creation
const COMMON_SLOT_KEYS = [
  { value: 'home-hero', label: 'Home Hero', description: 'Main homepage banner' },
  { value: 'intranet-hero', label: 'Intranet Hero', description: 'Intranet main banner' },
  { value: 'dashboard-banner', label: 'Dashboard Banner', description: 'Admin dashboard banner' },
  { value: 'promo-sidebar', label: 'Promo Sidebar', description: 'Promotional sidebar' },
];

interface SlotGroup {
  slotKey: string;
  slots: CmsContentSlot[];
  isExpanded: boolean;
}

export default function CMSSlotList() {
  const [slots, setSlots] = useState<CmsContentSlot[]>([]);
  const [slotGroups, setSlotGroups] = useState<SlotGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterService, setFilterService] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<CmsContentSlot | null>(null);
  const [assigningSlotKey, setAssigningSlotKey] = useState<string | null>(null);
  const [assigningServiceKey, setAssigningServiceKey] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (filterService) params.serviceKey = filterService;
      if (filterActive !== 'all') params.isActive = filterActive === 'active';

      const response = await cmsAPI.listSlots(params);
      setSlots(response.data);

      // Group by slotKey
      const groups: Record<string, CmsContentSlot[]> = {};
      for (const slot of response.data) {
        if (!groups[slot.slotKey]) {
          groups[slot.slotKey] = [];
        }
        groups[slot.slotKey].push(slot);
      }

      setSlotGroups(
        Object.entries(groups).map(([slotKey, groupSlots]) => ({
          slotKey,
          slots: groupSlots.sort((a, b) => a.sortOrder - b.sortOrder),
          isExpanded: true,
        }))
      );
    } catch (error) {
      console.error('Failed to load slots:', error);
      toast.error('Failed to load slots');
    } finally {
      setLoading(false);
    }
  }, [filterService, filterActive]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const toggleGroup = (slotKey: string) => {
    setSlotGroups((prev) =>
      prev.map((g) =>
        g.slotKey === slotKey ? { ...g, isExpanded: !g.isExpanded } : g
      )
    );
  };

  const handleCreate = () => {
    setEditingSlot(null);
    setIsFormOpen(true);
  };

  const handleEdit = (slot: CmsContentSlot) => {
    setEditingSlot(slot);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingSlot(null);
  };

  const handleFormSave = () => {
    loadSlots();
    handleFormClose();
  };

  const handleDelete = async (slot: CmsContentSlot) => {
    if (!confirm(`Delete this slot assignment? (Content will not be deleted)`)) {
      return;
    }

    try {
      await cmsAPI.deleteSlot(slot.id);
      toast.success('Slot deleted successfully');
      loadSlots();
    } catch (error) {
      console.error('Failed to delete slot:', error);
      toast.error('Failed to delete slot');
    }
  };

  const handleToggleActive = async (slot: CmsContentSlot) => {
    try {
      await cmsAPI.updateSlot(slot.id, { isActive: !slot.isActive });
      toast.success(`Slot ${slot.isActive ? 'deactivated' : 'activated'}`);
      loadSlots();
    } catch (error) {
      console.error('Failed to toggle slot:', error);
      toast.error('Failed to update slot');
    }
  };

  const handleManageContents = (slotKey: string, serviceKey: string | null) => {
    setAssigningSlotKey(slotKey);
    setAssigningServiceKey(serviceKey);
  };

  const handleAssignmentClose = () => {
    setAssigningSlotKey(null);
    setAssigningServiceKey(null);
    loadSlots();
  };

  const clearFilters = () => {
    setFilterService('');
    setFilterActive('all');
  };

  const hasActiveFilters = filterService || filterActive !== 'all';

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Layout className="w-6 h-6" />
              CMS Slots
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage content placement across services
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Slot
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />

          {/* Service Filter */}
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SERVICES.map((service) => (
              <option key={service.value} value={service.value}>
                {service.label}
              </option>
            ))}
          </select>

          {/* Active Filter */}
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}

          <span className="text-sm text-gray-500">
            {slots.length} slot{slots.length !== 1 ? 's' : ''} in {slotGroups.length} group{slotGroups.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && slots.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Layout className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {hasActiveFilters ? 'No slots match your filters' : 'No slots found'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {hasActiveFilters
              ? 'Try adjusting your filters or create a new slot.'
              : 'Get started by creating a slot to place your content.'}
          </p>
          <div className="mt-6">
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Slot
            </button>
          </div>
        </div>
      )}

      {/* Slot Groups */}
      {!loading && slotGroups.length > 0 && (
        <div className="space-y-4">
          {slotGroups.map((group) => (
            <div key={group.slotKey} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Group Header */}
              <div
                className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between cursor-pointer"
                onClick={() => toggleGroup(group.slotKey)}
              >
                <div className="flex items-center gap-3">
                  {group.isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="font-medium text-gray-900">{group.slotKey}</span>
                  <span className="text-sm text-gray-500">
                    ({group.slots.length} content{group.slots.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManageContents(group.slotKey, group.slots[0]?.serviceKey || null);
                  }}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                >
                  <Layers className="w-4 h-4" />
                  Manage Contents
                </button>
              </div>

              {/* Group Contents */}
              {group.isExpanded && (
                <ul className="divide-y divide-gray-200">
                  {group.slots.map((slot) => (
                    <li key={slot.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {slot.content?.title || 'No content'}
                            </span>
                            {slot.content?.type && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                                {slot.content.type}
                              </span>
                            )}
                            {slot.serviceKey && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                                {slot.serviceKey}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                            <span>Order: {slot.sortOrder}</span>
                            {slot.startsAt && <span>Starts: {formatDate(slot.startsAt)}</span>}
                            {slot.endsAt && <span>Ends: {formatDate(slot.endsAt)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {/* Active Toggle */}
                          <button
                            onClick={() => handleToggleActive(slot)}
                            className={`p-1.5 rounded ${
                              slot.isActive
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-gray-400 hover:bg-gray-50'
                            }`}
                            title={slot.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {slot.isActive ? (
                              <ToggleRight className="w-5 h-5" />
                            ) : (
                              <ToggleLeft className="w-5 h-5" />
                            )}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleEdit(slot)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(slot)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <SlotFormModal
          slot={editingSlot}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}

      {/* Content Assignment Modal */}
      {assigningSlotKey && (
        <SlotContentAssignment
          slotKey={assigningSlotKey}
          serviceKey={assigningServiceKey}
          onClose={handleAssignmentClose}
        />
      )}
    </div>
  );
}
