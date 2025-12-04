/**
 * Visual View Designer - Canvas
 *
 * Central canvas where components are rendered and edited
 */

import { useDesigner } from '../state/DesignerContext';
import { DesignerNode } from '../types/designer.types';

export default function Canvas() {
  const { state, selectNode } = useDesigner();

  const handleCanvasClick = (e: React.MouseEvent) => {
    // If clicking on canvas background (not a component), deselect
    if (e.target === e.currentTarget) {
      selectNode(null);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-auto p-8" onClick={handleCanvasClick}>
      {/* Canvas Container */}
      <div className="bg-white shadow-lg rounded-lg min-h-[600px] max-w-6xl mx-auto">
        {/* Render Tree */}
        {state.rootNode.children.length === 0 ? (
          <div className="flex items-center justify-center h-96 text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-lg font-medium">Canvas is empty</p>
              <p className="text-sm mt-2">Add components from the left panel to get started</p>
            </div>
          </div>
        ) : (
          <div className="p-8">
            {state.rootNode.children.map(child => (
              <CanvasNode key={child.id} node={child} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Recursive component for rendering designer nodes
 */
function CanvasNode({ node }: { node: DesignerNode }) {
  const { state, selectNode, deleteNode } = useDesigner();
  const isSelected = state.selectedNodeId === node.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(node.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete ${node.type}?`)) {
      deleteNode(node.id);
    }
  };

  // Render based on component type
  const renderComponent = () => {
    switch (node.type) {
      case 'Section':
        return (
          <section className={node.props.className || 'py-12'}>
            {node.children.map(child => (
              <CanvasNode key={child.id} node={child} />
            ))}
          </section>
        );

      case 'Row':
        return (
          <div className={node.props.className || 'flex flex-row gap-4'}>
            {node.children.map(child => (
              <CanvasNode key={child.id} node={child} />
            ))}
          </div>
        );

      case 'Column':
        return (
          <div className={node.props.className || 'flex flex-col gap-2'}>
            {node.children.map(child => (
              <CanvasNode key={child.id} node={child} />
            ))}
          </div>
        );

      case 'Text':
        return (
          <p className={node.props.className || 'text-base'}>
            {node.props.content || 'Text'}
          </p>
        );

      case 'Heading':
        const HeadingTag = `h${node.props.level || 2}` as keyof JSX.IntrinsicElements;
        return (
          <HeadingTag className={node.props.className || 'text-2xl font-bold'}>
            {node.props.content || 'Heading'}
          </HeadingTag>
        );

      case 'Button':
        return (
          <a
            href={node.props.href || '#'}
            className={node.props.className || 'px-6 py-2 bg-blue-600 text-white rounded inline-block'}
          >
            {node.props.text || 'Button'}
          </a>
        );

      case 'Image':
        return (
          <img
            src={node.props.src || 'https://via.placeholder.com/400x300'}
            alt={node.props.alt || 'Image'}
            className={node.props.className || 'w-full h-auto'}
          />
        );

      case 'Hero':
        return (
          <div
            className={node.props.className || 'py-20 text-center'}
            style={{
              backgroundImage: node.props.backgroundImage
                ? `url(${node.props.backgroundImage})`
                : undefined,
            }}
          >
            <h1 className="text-4xl font-bold mb-4">{node.props.title || 'Hero Title'}</h1>
            <p className="text-xl text-gray-600">{node.props.subtitle || 'Subtitle'}</p>
          </div>
        );

      case 'CPTList':
        return (
          <div className={node.props.className || 'grid grid-cols-3 gap-4'}>
            <div className="p-4 border border-dashed border-gray-300 rounded text-center text-gray-500">
              CPT List: {node.props.postType || '(not set)'}
            </div>
          </div>
        );

      case 'FeatureGrid':
        return (
          <div className="py-12">
            <h2 className="text-3xl font-bold text-center mb-8">
              {node.props.title || 'Features'}
            </h2>
            <div className={`grid grid-cols-${node.props.columns || 3} gap-6`}>
              <div className="p-6 border border-dashed border-gray-300 rounded text-center text-gray-500">
                Feature Item (add children)
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 border border-gray-300 rounded bg-gray-50">
            <div className="text-sm text-gray-600">
              {node.type}
            </div>
            {node.children.map(child => (
              <CanvasNode key={child.id} node={child} />
            ))}
          </div>
        );
    }
  };

  return (
    <div
      className={`relative group ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
      onClick={handleClick}
    >
      {/* Component Label (shows on hover) */}
      <div className="absolute -top-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-mono">
            {node.type}
          </span>
          {isSelected && (
            <button
              onClick={handleDelete}
              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Render Component */}
      {renderComponent()}

      {/* Drop Zone Indicator (for children) */}
      {isSelected && node.children.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-blue-300 rounded pointer-events-none">
          <span className="text-blue-500 text-sm">Drop components here</span>
        </div>
      )}
    </div>
  );
}
