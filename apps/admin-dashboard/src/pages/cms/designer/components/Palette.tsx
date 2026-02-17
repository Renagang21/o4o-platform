/**
 * Visual View Designer - Component Palette
 *
 * Left sidebar showing available components to drag onto canvas
 */

import { useState } from 'react';
import { useDrag } from 'react-dnd';
import { COMPONENT_REGISTRY, ComponentDefinition } from '../config/componentRegistry';
import { useDesigner } from '../state/DesignerContext';
import { DND_ITEM_TYPES, PaletteDragItem } from '../types/dnd.types';

export default function Palette() {
  const { addNode, state } = useDesigner();
  const [activeCategory, setActiveCategory] = useState<string>('Basic');

  // Support both uppercase and lowercase categories
  const categories = [
    { id: 'Basic', label: 'Basic', includes: ['Basic', 'basic'] },
    { id: 'Layout', label: 'Layout', includes: ['Layout', 'layout'] },
    { id: 'Marketing', label: 'Marketing', includes: ['Marketing', 'marketing'] },
    { id: 'CMS', label: 'CMS', includes: ['CMS', 'cms'] },
    { id: 'Media', label: 'Media', includes: ['Media'] },
  ];

  const activeCategories = categories.find(c => c.id === activeCategory)?.includes || [];
  const filteredComponents = COMPONENT_REGISTRY.filter(comp =>
    activeCategories.includes(comp.category as string)
  );

  const handleComponentClick = (componentType: string) => {
    // Add to selected node or root
    const parentId = state.selectedNodeId || 'root';
    addNode(parentId, componentType);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Components</h2>
        <p className="text-xs text-gray-500 mt-1">Drag or click to add</p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              activeCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Component List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {filteredComponents.map(comp => (
            <PaletteItem
              key={comp.type}
              component={comp}
              onClick={() => handleComponentClick(comp.type)}
            />
          ))}
        </div>
      </div>

      {/* Footer Tips */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-600">
          💡 Tip: Drag components to canvas or click to add to selected element
        </p>
      </div>
    </div>
  );
}

/**
 * Draggable Palette Item
 */
interface PaletteItemProps {
  component: ComponentDefinition;
  onClick: () => void;
}

function PaletteItem({ component, onClick }: PaletteItemProps) {
  const [{ isDragging }, drag] = useDrag<PaletteDragItem, unknown, { isDragging: boolean }>({
    type: DND_ITEM_TYPES.PALETTE_COMPONENT,
    item: {
      type: DND_ITEM_TYPES.PALETTE_COMPONENT,
      componentType: component.type,
      label: component.label,
      icon: component.icon,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <button
      ref={(node: HTMLButtonElement | null) => { drag(node); }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group cursor-move ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100'
      }`}
    >
      <span className="text-2xl">{component.icon}</span>
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
          {component.label}
        </div>
        {component.description ? (
          <div className="text-xs text-gray-500">{component.description}</div>
        ) : (
          <div className="text-xs text-gray-400 italic">{component.type}</div>
        )}
      </div>
    </button>
  );
}
