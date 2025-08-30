/**
 * NavigationEditor - Navigation menu editor component
 */

import React, { useState, useCallback } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { 
  Plus, 
  GripVertical, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  ChevronDown,
  ChevronRight,
  Home,
  FileText,
  Tag,
  Mail
} from 'lucide-react'
import { NavigationConfig, NavigationItem } from '@o4o/types'

interface NavigationEditorProps {
  navigation: NavigationConfig
  onUpdate: (navigation: NavigationConfig) => void
}

const NAVIGATION_ITEM_TYPE = 'navigation-item'

// Predefined navigation item types
const PREDEFINED_ITEMS = [
  { label: 'Home', url: '/', icon: Home },
  { label: 'About', url: '/about', icon: FileText },
  { label: 'Products', url: '/products', icon: Tag },
  { label: 'Contact', url: '/contact', icon: Mail },
]

// Draggable navigation item component
const DraggableNavigationItem: React.FC<{
  item: NavigationItem
  index: number
  level: number
  onUpdate: (index: number, updates: Partial<NavigationItem>) => void
  onDelete: (index: number) => void
  onAddChild: (parentIndex: number) => void
  onMoveItem: (dragIndex: number, hoverIndex: number) => void
}> = ({ 
  item, 
  index, 
  level, 
  onUpdate, 
  onDelete, 
  onAddChild, 
  onMoveItem 
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [editData, setEditData] = useState({ label: item.label, url: item.url })

  const [{ isDragging }, drag, preview] = useDrag({
    type: NAVIGATION_ITEM_TYPE,
    item: { index, level },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  const [, drop] = useDrop({
    accept: NAVIGATION_ITEM_TYPE,
    hover: (draggedItem: { index: number; level: number }) => {
      if (draggedItem.index !== index) {
        onMoveItem(draggedItem.index, index)
        draggedItem.index = index
      }
    }
  })

  // Handle edit save
  const handleSave = useCallback(() => {
    if (editData.label.trim() && editData.url.trim()) {
      onUpdate(index, editData)
      setIsEditing(false)
    }
  }, [editData, index, onUpdate])

  // Handle edit cancel
  const handleCancel = useCallback(() => {
    setEditData({ label: item.label, url: item.url })
    setIsEditing(false)
  }, [item])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }, [handleSave, handleCancel])

  const hasChildren = item.children && item.children.length > 0
  const indentClass = level > 0 ? 'ml-8' : ''

  return (
    <div ref={(node) => drag(drop(node))} className={`navigation-item ${indentClass}`}>
      <div
        ref={preview}
        className={`item-content flex items-center p-3 bg-white border border-gray-200 rounded-lg mb-2 ${
          isDragging ? 'opacity-50' : 'hover:border-gray-300'
        }`}
      >
        {/* Drag handle */}
        <div className="drag-handle mr-3 cursor-move text-gray-400">
          <GripVertical size={16} />
        </div>

        {/* Expand/Collapse for items with children */}
        {hasChildren && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="expand-button mr-2 p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? (
              <ChevronDown size={16} className="text-gray-600" />
            ) : (
              <ChevronRight size={16} className="text-gray-600" />
            )}
          </button>
        )}

        {/* Item content */}
        <div className="item-info flex-1">
          {isEditing ? (
            <div className="edit-form flex items-center space-x-2">
              <input
                type="text"
                value={editData.label}
                onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                placeholder="Menu label"
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <input
                type="text"
                value={editData.url}
                onChange={(e) => setEditData({ ...editData, url: e.target.value })}
                placeholder="/path or https://example.com"
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                onKeyDown={handleKeyDown}
              />
              <button
                onClick={handleSave}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                title="Save"
              >
                <Check size={16} />
              </button>
              <button
                onClick={handleCancel}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="item-display">
              <div className="flex items-center">
                <span className="font-medium text-gray-900">{item.label}</span>
                {item.url.startsWith('http') && (
                  <ExternalLink size={12} className="ml-2 text-gray-400" />
                )}
              </div>
              <div className="text-sm text-gray-500">{item.url}</div>
            </div>
          )}
        </div>

        {/* Item actions */}
        {!isEditing && (
          <div className="item-actions flex items-center space-x-1">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Edit"
            >
              <Edit3 size={14} />
            </button>
            
            <button
              onClick={() => onAddChild(index)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Add child item"
            >
              <Plus size={14} />
            </button>
            
            <button
              onClick={() => onDelete(index)}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Child items */}
      {hasChildren && isExpanded && item.children && (
        <div className="child-items ml-4">
          {item.children.map((childItem, childIndex) => (
            <DraggableNavigationItem
              key={childIndex}
              item={childItem}
              index={childIndex}
              level={level + 1}
              onUpdate={(childIdx, updates) => {
                const updatedChildren = [...(item.children || [])]
                updatedChildren[childIdx] = { ...updatedChildren[childIdx], ...updates }
                onUpdate(index, { children: updatedChildren })
              }}
              onDelete={(childIdx) => {
                const updatedChildren = (item.children || []).filter((_, idx) => idx !== childIdx)
                onUpdate(index, { children: updatedChildren })
              }}
              onAddChild={(childIdx) => {
                const newItem: NavigationItem = {
                  id: `item-${Date.now()}-${Math.random()}`,
                  label: 'New Item',
                  url: '/',
                  children: []
                }
                const updatedChildren = [...(item.children || [])]
                updatedChildren.splice(childIdx + 1, 0, newItem)
                onUpdate(index, { children: updatedChildren })
              }}
              onMoveItem={(dragIdx, hoverIdx) => {
                const updatedChildren = [...(item.children || [])]
                const [moved] = updatedChildren.splice(dragIdx, 1)
                updatedChildren.splice(hoverIdx, 0, moved)
                onUpdate(index, { children: updatedChildren })
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Main navigation editor component
const NavigationEditorContent: React.FC<NavigationEditorProps> = ({
  navigation,
  onUpdate
}) => {
  const [showPredefined, setShowPredefined] = useState(false)

  // Add new navigation item
  const addNavigationItem = useCallback((item?: Partial<NavigationItem>) => {
    const newItem: NavigationItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      label: item?.label || 'New Item',
      url: item?.url || '/',
      children: [],
      ...item
    }

    const updatedItems = [...navigation.items, newItem]
    onUpdate({ ...navigation, items: updatedItems })
  }, [navigation, onUpdate])

  // Update navigation item
  const updateNavigationItem = useCallback((index: number, updates: Partial<NavigationItem>) => {
    const updatedItems = [...navigation.items]
    updatedItems[index] = { ...updatedItems[index], ...updates }
    onUpdate({ ...navigation, items: updatedItems })
  }, [navigation, onUpdate])

  // Delete navigation item
  const deleteNavigationItem = useCallback((index: number) => {
    const updatedItems = navigation.items.filter((_, idx) => idx !== index)
    onUpdate({ ...navigation, items: updatedItems })
  }, [navigation, onUpdate])

  // Move navigation item
  const moveNavigationItem = useCallback((dragIndex: number, hoverIndex: number) => {
    const updatedItems = [...navigation.items]
    const [moved] = updatedItems.splice(dragIndex, 1)
    updatedItems.splice(hoverIndex, 0, moved)
    onUpdate({ ...navigation, items: updatedItems })
  }, [navigation, onUpdate])

  // Add child to navigation item
  const addChildToItem = useCallback((parentIndex: number) => {
    const newChildItem: NavigationItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      label: 'New Child Item',
      url: '/',
      children: []
    }

    const updatedItems = [...navigation.items]
    const parent = updatedItems[parentIndex]
    parent.children = [...(parent.children || []), newChildItem]
    
    onUpdate({ ...navigation, items: updatedItems })
  }, [navigation, onUpdate])

  return (
    <div className="navigation-editor space-y-6">
      {/* Header */}
      <div className="editor-header">
        <h3 className="text-base font-medium text-gray-900 mb-2">Navigation Menu</h3>
        <p className="text-sm text-gray-600 mb-4">
          Customize your site's main navigation menu. Drag items to reorder them.
        </p>

        {/* Add buttons */}
        <div className="add-buttons flex items-center space-x-2">
          <button
            onClick={() => addNavigationItem()}
            className="add-custom flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <Plus size={16} className="mr-2" />
            Add Custom Item
          </button>
          
          <button
            onClick={() => setShowPredefined(!showPredefined)}
            className="add-predefined flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
          >
            <Plus size={16} className="mr-2" />
            Quick Add
          </button>
        </div>

        {/* Predefined items */}
        {showPredefined && (
          <div className="predefined-items mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-2">
              {PREDEFINED_ITEMS.map(item => {
                const IconComponent = item.icon
                return (
                  <button
                    key={item.label}
                    onClick={() => addNavigationItem(item)}
                    className="flex items-center p-2 bg-white rounded border hover:border-blue-300 hover:bg-blue-50 text-sm"
                  >
                    <IconComponent size={16} className="mr-2 text-gray-400" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navigation items */}
      <div className="navigation-items">
        {navigation.items.length === 0 ? (
          <div className="empty-state text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-gray-400 mb-2">
              <FileText size={32} className="mx-auto" />
            </div>
            <p className="text-sm text-gray-500 mb-4">No navigation items yet</p>
            <button
              onClick={() => addNavigationItem()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              <Plus size={16} className="mr-2" />
              Add Your First Item
            </button>
          </div>
        ) : (
          <div className="items-list">
            {navigation.items.map((item, index) => (
              <DraggableNavigationItem
                key={item.id}
                item={item}
                index={index}
                level={0}
                onUpdate={updateNavigationItem}
                onDelete={deleteNavigationItem}
                onAddChild={addChildToItem}
                onMoveItem={moveNavigationItem}
              />
            ))}
          </div>
        )}
      </div>

      {/* Navigation preview */}
      <div className="navigation-preview bg-gray-50 p-4 rounded-lg border">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Navigation Preview</h4>
        
        {navigation.items.length > 0 ? (
          <nav className="preview-nav">
            <ul className="flex items-center space-x-6 text-sm">
              {navigation.items.slice(0, 5).map(item => (
                <li key={item.id} className="relative">
                  <span className="text-gray-900 hover:text-blue-600 cursor-pointer">
                    {item.label}
                  </span>
                  {item.children && item.children.length > 0 && (
                    <ChevronDown size={12} className="inline-block ml-1 text-gray-400" />
                  )}
                </li>
              ))}
              {navigation.items.length > 5 && (
                <li className="text-gray-500">
                  +{navigation.items.length - 5} more
                </li>
              )}
            </ul>
          </nav>
        ) : (
          <p className="text-sm text-gray-500">Add navigation items to see preview</p>
        )}
      </div>

      {/* Navigation settings */}
      <div className="navigation-settings">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Settings</h4>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={navigation.showHome !== false}
              onChange={(e) => onUpdate({ ...navigation, showHome: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Show Home link</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={navigation.sticky === true}
              onChange={(e) => onUpdate({ ...navigation, sticky: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Sticky navigation</span>
          </label>
        </div>
      </div>
    </div>
  )
}

export const NavigationEditor: React.FC<NavigationEditorProps> = (props) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <NavigationEditorContent {...props} />
    </DndProvider>
  )
}

export default NavigationEditor