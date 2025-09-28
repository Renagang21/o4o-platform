/**
 * SlideGroups - Slide grouping and organization
 * Phase 4: Advanced features
 */

import React, { useState, useCallback } from 'react';
import { 
  Folder, 
  FolderOpen, 
  Plus, 
  Edit2, 
  Trash2,
  ChevronRight,
  ChevronDown,
  Copy,
  Move,
  Check,
  X,
  Layers,
  Grid,
  List
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface SlideGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  slides: string[];
  collapsed?: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SlideGroupsProps {
  groups: SlideGroup[];
  slides: Array<{ id: string; title?: string; order: number }>;
  onGroupsChange: (groups: SlideGroup[]) => void;
  onSlideMove: (slideId: string, groupId: string | null, order?: number) => void;
  currentSlideId?: string;
  viewMode?: 'list' | 'grid';
}

const SortableGroupItem: React.FC<{
  group: SlideGroup;
  slides: Array<{ id: string; title?: string; order: number }>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSlideMove: (slideId: string, groupId: string | null, order?: number) => void;
  currentSlideId?: string;
}> = ({ 
  group, 
  slides, 
  isExpanded, 
  onToggleExpand, 
  onEdit, 
  onDelete,
  onSlideMove,
  currentSlideId
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const groupSlides = slides.filter(slide => group.slides.includes(slide.id));

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`slide-group ${isDragging ? 'dragging' : ''}`}
    >
      <div className="group-header" {...attributes} {...listeners}>
        <button 
          className="group-toggle"
          onClick={onToggleExpand}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        
        <div 
          className="group-color"
          style={{ backgroundColor: group.color || '#6b7280' }}
        />
        
        {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
        
        <span className="group-name">{group.name}</span>
        <span className="group-count">({groupSlides.length})</span>
        
        <div className="group-actions">
          <button 
            className="btn-icon"
            onClick={onEdit}
            title="Edit group"
          >
            <Edit2 size={14} />
          </button>
          <button 
            className="btn-icon btn-danger"
            onClick={onDelete}
            title="Delete group"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="group-slides">
          {groupSlides.length === 0 ? (
            <div className="empty-group">
              <p>No slides in this group</p>
              <p className="hint">Drag slides here to add them</p>
            </div>
          ) : (
            <div className="slides-list">
              {groupSlides
                .sort((a, b) => a.order - b.order)
                .map((slide, index) => (
                  <div 
                    key={slide.id}
                    className={`group-slide ${slide.id === currentSlideId ? 'current' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('slideId', slide.id);
                      e.dataTransfer.setData('fromGroup', group.id);
                    }}
                  >
                    <span className="slide-number">{index + 1}</span>
                    <span className="slide-title">
                      {slide.title || `Slide ${slide.id}`}
                    </span>
                    <button
                      className="btn-icon"
                      onClick={() => onSlideMove(slide.id, null)}
                      title="Remove from group"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
            </div>
          )}
          
          {group.description && (
            <div className="group-description">
              {group.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const SlideGroups: React.FC<SlideGroupsProps> = ({
  groups,
  slides,
  onGroupsChange,
  onSlideMove,
  currentSlideId,
  viewMode = 'list'
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingGroup, setEditingGroup] = useState<SlideGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#6b7280');
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get ungrouped slides
  const groupedSlideIds = new Set(groups.flatMap(g => g.slides));
  const ungroupedSlides = slides.filter(slide => !groupedSlideIds.has(slide.id));

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;

    const newGroup: SlideGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName,
      color: newGroupColor,
      slides: [],
      order: groups.length,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onGroupsChange([...groups, newGroup]);
    setNewGroupName('');
    setExpandedGroups(new Set([...expandedGroups, newGroup.id]));
  };

  const handleUpdateGroup = (groupId: string, updates: Partial<SlideGroup>) => {
    onGroupsChange(
      groups.map(g => g.id === groupId ? { ...g, ...updates, updatedAt: new Date() } : g)
    );
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm(`Delete group "${groups.find(g => g.id === groupId)?.name}"? Slides will be ungrouped.`)) {
      onGroupsChange(groups.filter(g => g.id !== groupId));
    }
  };

  const handleToggleExpand = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (!over) return;

    const oldIndex = groups.findIndex(g => g.id === active.id);
    const newIndex = groups.findIndex(g => g.id === over.id);

    if (oldIndex !== newIndex) {
      const newGroups = arrayMove(groups, oldIndex, newIndex);
      onGroupsChange(newGroups.map((g, i) => ({ ...g, order: i })));
    }
  };

  const handleDragOver = (e: React.DragEvent, groupId: string | null) => {
    e.preventDefault();
    setDragOverGroup(groupId);
  };

  const handleDrop = (e: React.DragEvent, groupId: string | null) => {
    e.preventDefault();
    setDragOverGroup(null);

    const slideId = e.dataTransfer.getData('slideId');
    const fromGroup = e.dataTransfer.getData('fromGroup');

    if (!slideId) return;

    // If dropping on a group, add to that group
    if (groupId) {
      const group = groups.find(g => g.id === groupId);
      if (group && !group.slides.includes(slideId)) {
        handleUpdateGroup(groupId, {
          slides: [...group.slides, slideId]
        });
      }
    }

    // Remove from previous group if needed
    if (fromGroup && fromGroup !== groupId) {
      const oldGroup = groups.find(g => g.id === fromGroup);
      if (oldGroup) {
        handleUpdateGroup(fromGroup, {
          slides: oldGroup.slides.filter(id => id !== slideId)
        });
      }
    }

    onSlideMove(slideId, groupId);
  };

  const colorPresets = [
    '#6b7280', '#ef4444', '#f97316', '#eab308', 
    '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
  ];

  return (
    <div className={`slide-groups slide-groups--${viewMode}`}>
      <div className="groups-header">
        <h3>
          <Layers size={18} />
          Slide Groups
        </h3>
        <div className="view-mode">
          <button 
            className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => {}}
            title="List view"
          >
            <List size={16} />
          </button>
          <button 
            className={`btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => {}}
            title="Grid view"
          >
            <Grid size={16} />
          </button>
        </div>
      </div>

      {/* Create New Group */}
      <div className="create-group">
        <input
          type="text"
          placeholder="New group name..."
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
          className="form-input"
        />
        <div className="color-picker">
          {colorPresets.map(color => (
            <button
              key={color}
              className={`color-preset ${newGroupColor === color ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setNewGroupColor(color)}
            />
          ))}
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleCreateGroup}
          disabled={!newGroupName.trim()}
        >
          <Plus size={14} />
          Create Group
        </button>
      </div>

      {/* Groups List */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={groups.map(g => g.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="groups-list">
            {groups.map(group => (
              <div
                key={group.id}
                onDragOver={(e) => handleDragOver(e, group.id)}
                onDrop={(e) => handleDrop(e, group.id)}
                className={dragOverGroup === group.id ? 'drag-over' : ''}
              >
                <SortableGroupItem
                  group={group}
                  slides={slides}
                  isExpanded={expandedGroups.has(group.id)}
                  onToggleExpand={() => handleToggleExpand(group.id)}
                  onEdit={() => setEditingGroup(group)}
                  onDelete={() => handleDeleteGroup(group.id)}
                  onSlideMove={onSlideMove}
                  currentSlideId={currentSlideId}
                />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Ungrouped Slides */}
      {ungroupedSlides.length > 0 && (
        <div 
          className="ungrouped-slides"
          onDragOver={(e) => handleDragOver(e, null)}
          onDrop={(e) => handleDrop(e, null)}
        >
          <h4>Ungrouped Slides ({ungroupedSlides.length})</h4>
          <div className="ungrouped-list">
            {ungroupedSlides.map((slide, index) => (
              <div 
                key={slide.id}
                className={`ungrouped-slide ${slide.id === currentSlideId ? 'current' : ''}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('slideId', slide.id);
                  e.dataTransfer.setData('fromGroup', '');
                }}
              >
                <span className="slide-number">{index + 1}</span>
                <span className="slide-title">
                  {slide.title || `Slide ${slide.id}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Group Dialog */}
      {editingGroup && (
        <div className="edit-group-dialog">
          <div className="dialog-content">
            <h3>Edit Group</h3>
            
            <div className="form-group">
              <label>Group Name</label>
              <input
                type="text"
                value={editingGroup.name}
                onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={editingGroup.description || ''}
                onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                className="form-textarea"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Color</label>
              <div className="color-picker">
                {colorPresets.map(color => (
                  <button
                    key={color}
                    className={`color-preset ${editingGroup.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditingGroup({ ...editingGroup, color })}
                  />
                ))}
              </div>
            </div>

            <div className="dialog-actions">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  handleUpdateGroup(editingGroup.id, editingGroup);
                  setEditingGroup(null);
                }}
              >
                <Check size={14} />
                Save
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setEditingGroup(null)}
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Actions Menu */}
      <div className="group-actions-menu">
        <button 
          className="btn btn-secondary"
          onClick={() => setExpandedGroups(new Set(groups.map(g => g.id)))}
        >
          Expand All
        </button>
        <button 
          className="btn btn-secondary"
          onClick={() => setExpandedGroups(new Set())}
        >
          Collapse All
        </button>
      </div>
    </div>
  );
};

export default SlideGroups;