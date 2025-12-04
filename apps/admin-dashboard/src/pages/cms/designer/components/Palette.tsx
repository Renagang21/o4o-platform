/**
 * Visual View Designer - Component Palette
 *
 * Left sidebar showing available components to drag onto canvas
 */

import { useState } from 'react';
import { COMPONENT_REGISTRY, ComponentDefinition } from '../config/componentRegistry';
import { useDesigner } from '../state/DesignerContext';

export default function Palette() {
  const { addNode, state } = useDesigner();
  const [activeCategory, setActiveCategory] = useState<ComponentDefinition['category']>('Layout');

  const categories: ComponentDefinition['category'][] = ['Layout', 'Basic', 'Media', 'CMS', 'Marketing'];

  const filteredComponents = COMPONENT_REGISTRY.filter(comp => comp.category === activeCategory);

  const handleComponentClick = (componentType: string) => {
    // Add to root for now - later we'll support dropping to specific locations
    const parentId = state.selectedNodeId || 'root';
    addNode(parentId, componentType);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Components</h2>
        <p className="text-xs text-gray-500 mt-1">Click to add to canvas</p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              activeCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Component List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {filteredComponents.map(comp => (
            <button
              key={comp.type}
              onClick={() => handleComponentClick(comp.type)}
              className="w-full flex items-center gap-3 p-3 rounded border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left group"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('componentType', comp.type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
            >
              <span className="text-2xl">{comp.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                  {comp.label}
                </div>
                <div className="text-xs text-gray-500">{comp.type}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer Tips */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-600">
          💡 Tip: Click a component to add it to the selected element, or drag it to the canvas
        </p>
      </div>
    </div>
  );
}
