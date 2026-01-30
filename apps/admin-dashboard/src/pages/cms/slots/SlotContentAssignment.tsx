/**
 * Slot Content Assignment
 *
 * WO-P3-CMS-SLOT-MANAGEMENT-P1: UI for assigning and ordering contents in a slot
 */

import { useState, useEffect } from 'react';
import { X, Plus, GripVertical, Trash2, Search, ArrowUp, ArrowDown } from 'lucide-react';
import cmsAPI, { CmsContentSlot, CmsContent } from '@/lib/cms';
import toast from 'react-hot-toast';

interface SlotContentAssignmentProps {
  slotKey: string;
  serviceKey: string | null;
  onClose: () => void;
}

interface AssignedContent {
  contentId: string;
  content: CmsContent | null;
  sortOrder: number;
  isActive: boolean;
}

export default function SlotContentAssignment({
  slotKey,
  serviceKey,
  onClose,
}: SlotContentAssignmentProps) {
  const [assignedContents, setAssignedContents] = useState<AssignedContent[]>([]);
  const [availableContents, setAvailableContents] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Load current slot contents and available contents
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load current slot contents
        const slotResponse = await cmsAPI.getSlotContents(slotKey, {
          serviceKey: serviceKey || undefined,
          activeOnly: false,
        });

        const assigned: AssignedContent[] = slotResponse.data.map((slot: any) => ({
          contentId: slot.contentId,
          content: slot.content
            ? {
                id: slot.content.id,
                type: slot.content.type,
                title: slot.content.title,
                status: slot.content.status,
              } as CmsContent
            : null,
          sortOrder: slot.sortOrder,
          isActive: slot.isActive,
        }));

        setAssignedContents(assigned);

        // Load available contents (published only)
        const contentParams: Record<string, any> = { status: 'published', limit: 100 };
        if (serviceKey) {
          contentParams.serviceKey = serviceKey;
        }
        const contentResponse = await cmsAPI.listContents(contentParams);
        setAvailableContents(contentResponse.data);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('Failed to load slot data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slotKey, serviceKey]);

  // Filter available contents (exclude already assigned)
  const assignedIds = new Set(assignedContents.map((a) => a.contentId));
  const filteredAvailable = availableContents.filter(
    (c) =>
      !assignedIds.has(c.id) &&
      c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddContent = (content: CmsContent) => {
    const newAssigned: AssignedContent = {
      contentId: content.id,
      content: content as any,
      sortOrder: assignedContents.length,
      isActive: true,
    };
    setAssignedContents((prev) => [...prev, newAssigned]);
    setHasChanges(true);
  };

  const handleRemoveContent = (contentId: string) => {
    setAssignedContents((prev) => prev.filter((a) => a.contentId !== contentId));
    setHasChanges(true);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setAssignedContents((prev) => {
      const newList = [...prev];
      [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
      return newList.map((item, i) => ({ ...item, sortOrder: i }));
    });
    setHasChanges(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === assignedContents.length - 1) return;
    setAssignedContents((prev) => {
      const newList = [...prev];
      [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
      return newList.map((item, i) => ({ ...item, sortOrder: i }));
    });
    setHasChanges(true);
  };

  const handleToggleActive = (contentId: string) => {
    setAssignedContents((prev) =>
      prev.map((a) =>
        a.contentId === contentId ? { ...a, isActive: !a.isActive } : a
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await cmsAPI.assignSlotContents(slotKey, {
        serviceKey: serviceKey || undefined,
        contents: assignedContents.map((a, index) => ({
          contentId: a.contentId,
          sortOrder: index,
          isActive: a.isActive,
        })),
      });
      toast.success('Slot contents saved successfully');
      setHasChanges(false);
      onClose();
    } catch (error: any) {
      console.error('Failed to save slot contents:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Discard?')) {
        return;
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Manage Slot: {slotKey}
            </h2>
            <p className="text-sm text-gray-500">
              {serviceKey ? `Service: ${serviceKey}` : 'Global slot'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Assigned Contents (Left) */}
            <div className="w-1/2 border-r flex flex-col">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-medium text-gray-900">
                  Assigned Contents ({assignedContents.length})
                </h3>
                <p className="text-xs text-gray-500">Drag to reorder</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {assignedContents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No contents assigned to this slot
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {assignedContents.map((item, index) => (
                      <li
                        key={item.contentId}
                        className={`p-3 bg-white border rounded-lg ${
                          item.isActive ? 'border-gray-200' : 'border-gray-200 bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 truncate">
                                {item.content?.title || 'Unknown'}
                              </span>
                              {item.content?.type && (
                                <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-700">
                                  {item.content.type}
                                </span>
                              )}
                              {!item.isActive && (
                                <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              Order: {index + 1}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              title="Move up"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveDown(index)}
                              disabled={index === assignedContents.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              title="Move down"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(item.contentId)}
                              className={`p-1 ${
                                item.isActive
                                  ? 'text-green-600 hover:text-green-800'
                                  : 'text-gray-400 hover:text-green-600'
                              }`}
                              title={item.isActive ? 'Deactivate' : 'Activate'}
                            >
                              <span className="text-xs font-medium">
                                {item.isActive ? 'ON' : 'OFF'}
                              </span>
                            </button>
                            <button
                              onClick={() => handleRemoveContent(item.contentId)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Remove"
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
            </div>

            {/* Available Contents (Right) */}
            <div className="w-1/2 flex flex-col">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-medium text-gray-900">
                  Available Contents ({filteredAvailable.length})
                </h3>
                <div className="mt-2 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search contents..."
                    className="w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {filteredAvailable.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm
                      ? 'No matching contents'
                      : 'All contents are already assigned'}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {filteredAvailable.map((content) => (
                      <li
                        key={content.id}
                        className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => handleAddContent(content)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 truncate">
                                {content.title}
                              </span>
                              <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-700">
                                {content.type}
                              </span>
                            </div>
                            {content.summary && (
                              <p className="text-xs text-gray-500 truncate mt-1">
                                {content.summary}
                              </p>
                            )}
                          </div>
                          <Plus className="w-5 h-5 text-blue-600" />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {hasChanges && (
              <span className="text-amber-600 font-medium">
                You have unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving || !hasChanges}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
