/**
 * Visual View Designer - Inspector Panel
 *
 * Right sidebar for editing selected component properties
 */

import { useDesigner } from '../state/DesignerContext';
import { getComponentDefinition } from '../config/componentRegistry';
import InputText from '@/components/cms/forms/InputText';
import Textarea from '@/components/cms/forms/Textarea';
import Dropdown from '@/components/cms/forms/Dropdown';
import Switch from '@/components/cms/forms/Switch';

export default function Inspector() {
  const { state, updateNode, getNode } = useDesigner();

  if (!state.selectedNodeId) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-6">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-sm">No component selected</p>
          <p className="text-xs mt-2">Click a component on the canvas to edit its properties</p>
        </div>
      </div>
    );
  }

  const node = getNode(state.selectedNodeId);
  if (!node) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-6">
        <div className="text-center text-red-400">
          <p className="text-sm">Component not found</p>
        </div>
      </div>
    );
  }

  const componentDef = getComponentDefinition(node.type);

  const handlePropChange = (key: string, value: any) => {
    updateNode(node.id, { [key]: value });
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{componentDef?.icon || '📦'}</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{node.type}</h2>
            <p className="text-xs text-gray-500">ID: {node.id.substring(0, 12)}...</p>
          </div>
        </div>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {componentDef?.propSchema.map(prop => (
          <div key={prop.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {prop.label}
            </label>

            {prop.type === 'string' && (
              <InputText
                value={node.props[prop.key] || prop.defaultValue || ''}
                onChange={(value) => handlePropChange(prop.key, value)}
                placeholder={prop.placeholder}
              />
            )}

            {prop.type === 'number' && (
              <InputText
                type="number"
                value={node.props[prop.key]?.toString() || prop.defaultValue?.toString() || '0'}
                onChange={(value) => handlePropChange(prop.key, parseInt(value) || 0)}
              />
            )}

            {prop.type === 'boolean' && (
              <Switch
                value={node.props[prop.key] ?? prop.defaultValue ?? false}
                onChange={(value) => handlePropChange(prop.key, value)}
              />
            )}

            {prop.type === 'select' && prop.options && (
              <Dropdown
                value={node.props[prop.key]?.toString() || prop.defaultValue?.toString() || ''}
                onChange={(value) => handlePropChange(prop.key, value)}
                options={prop.options}
              />
            )}

            {prop.helpText && (
              <p className="text-xs text-gray-500 mt-1">{prop.helpText}</p>
            )}
          </div>
        ))}

        {/* Raw Props Editor (Advanced) */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
            Advanced: Raw Props JSON
          </summary>
          <Textarea
            value={JSON.stringify(node.props, null, 2)}
            onChange={(value) => {
              try {
                const parsed = JSON.parse(value);
                updateNode(node.id, parsed);
              } catch (err) {
                // Invalid JSON, ignore
              }
            }}
            rows={8}
          />
        </details>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-600">
          Changes are applied immediately to the canvas
        </p>
      </div>
    </div>
  );
}
