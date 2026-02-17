/**
 * Visual View Designer - Canvas
 *
 * Central canvas where components are rendered and edited
 */

import { useDrag, useDrop } from 'react-dnd';
import { useDesigner } from '../state/DesignerContext';
import { DesignerNode } from '../types/designer.types';
import { DND_ITEM_TYPES, PaletteDragItem, CanvasNodeDragItem } from '../types/dnd.types';
import { getRowClasses, getColumnClasses } from '../core/layoutEngine';

interface CanvasProps {
  zoom?: number;
  showGrid?: boolean;
}

export default function Canvas({ zoom = 1.0, showGrid = false }: CanvasProps) {
  const { state, selectNode, addNode, getNodePath } = useDesigner();

  // Drop target for root-level components
  const [{ isOver }, drop] = useDrop<PaletteDragItem | CanvasNodeDragItem, unknown, { isOver: boolean }>({
    accept: [DND_ITEM_TYPES.PALETTE_COMPONENT, DND_ITEM_TYPES.CANVAS_NODE],
    drop: (item) => {
      if (item.type === DND_ITEM_TYPES.PALETTE_COMPONENT) {
        // Add component to root
        addNode('root', item.componentType);
      }
      // Canvas node reordering will be handled at the node level
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  });

  const handleCanvasClick = (e: React.MouseEvent) => {
    // If clicking on canvas background (not a component), deselect
    if (e.target === e.currentTarget) {
      selectNode(null);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-auto flex flex-col" onClick={handleCanvasClick}>
      {/* Path Trail Breadcrumb */}
      {state.selectedNodeId && (
        <div className="bg-white border-b border-gray-200 px-8 py-3">
          <PathTrail nodeId={state.selectedNodeId} getNodePath={getNodePath} selectNode={selectNode} />
        </div>
      )}

      {/* Canvas Container */}
      <div className="flex-1 p-8">
        <div
          ref={(node: HTMLDivElement | null) => { drop(node); }}
          className={`bg-white shadow-lg rounded-lg min-h-[600px] max-w-6xl mx-auto transition-all ${
            isOver ? 'ring-4 ring-blue-400 ring-opacity-50' : ''
          } ${showGrid ? 'bg-grid-pattern' : ''}`}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            backgroundImage: showGrid
              ? 'linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)'
              : undefined,
            backgroundSize: showGrid ? '20px 20px' : undefined,
          }}
        >
          {/* Render Tree */}
          {state.rootNode.children.length === 0 ? (
            <div className="flex items-center justify-center h-96 text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4">📦</div>
                <p className="text-lg font-medium">Canvas is empty</p>
                <p className="text-sm mt-2">
                  {isOver ? (
                    <span className="text-blue-600 font-semibold">Drop component here</span>
                  ) : (
                    'Add components from the left panel to get started'
                  )}
                </p>
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
    </div>
  );
}

/**
 * Path Trail Breadcrumb
 */
interface PathTrailProps {
  nodeId: string;
  getNodePath: (nodeId: string) => DesignerNode[];
  selectNode: (nodeId: string | null) => void;
}

function PathTrail({ nodeId, getNodePath, selectNode }: PathTrailProps) {
  const path = getNodePath(nodeId);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500 font-medium">Path:</span>
      {path.map((node, index) => (
        <div key={node.id} className="flex items-center gap-2">
          {index > 0 && <span className="text-gray-400">→</span>}
          <button
            onClick={() => selectNode(node.id)}
            className="px-2 py-1 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors font-mono text-xs"
          >
            {node.type}
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Recursive component for rendering designer nodes
 */
function CanvasNode({ node }: { node: DesignerNode }) {
  const { state, selectNode, deleteNode, cloneNode, addNode, moveNode } = useDesigner();
  const isSelected = state.selectedNodeId === node.id;

  // Make node draggable for reordering
  const [{ isDragging }, drag] = useDrag<CanvasNodeDragItem, unknown, { isDragging: boolean }>({
    type: DND_ITEM_TYPES.CANVAS_NODE,
    item: {
      type: DND_ITEM_TYPES.CANVAS_NODE,
      nodeId: node.id,
      nodeType: node.type,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Make node a drop target for adding children or reordering
  const [{ isOver, canDrop }, drop] = useDrop<PaletteDragItem | CanvasNodeDragItem, unknown, { isOver: boolean; canDrop: boolean }>({
    accept: [DND_ITEM_TYPES.PALETTE_COMPONENT, DND_ITEM_TYPES.CANVAS_NODE],
    canDrop: (item) => {
      // Prevent dropping a node onto itself or its descendants
      if (item.type === DND_ITEM_TYPES.CANVAS_NODE) {
        return item.nodeId !== node.id;
      }
      return true;
    },
    drop: (item, monitor) => {
      // Only handle drops on this specific node (not its children)
      if (!monitor.isOver({ shallow: true })) {
        return;
      }

      if (item.type === DND_ITEM_TYPES.PALETTE_COMPONENT) {
        // Add component as child of this node
        addNode(node.id, item.componentType);
      } else if (item.type === DND_ITEM_TYPES.CANVAS_NODE) {
        // Move existing node as child of this node
        // Add to end of children array
        moveNode(item.nodeId, node.id, node.children?.length || 0);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(node.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      deleteNode(node.id);
    }
  };

  const handleClone = (e: React.MouseEvent) => {
    e.stopPropagation();
    cloneNode(node.id);
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
          <div className={getRowClasses(node.props)}>
            {node.children.map(child => (
              <CanvasNode key={child.id} node={child} />
            ))}
          </div>
        );

      case 'Column':
        return (
          <div className={getColumnClasses(node.props)}>
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
        const HeadingTag = `h${node.props.level || 2}` as React.ElementType;
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

  // Combine drag and drop refs
  const combinedRef = (el: HTMLDivElement | null) => {
    drag(el);
    drop(el);
  };

  return (
    <div
      ref={combinedRef}
      className={`relative group ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''} ${
        isDragging ? 'opacity-30' : 'opacity-100'
      } ${isOver && canDrop ? 'ring-2 ring-green-500' : ''} transition-all`}
      onClick={handleClick}
    >
      {/* Component Actions (shows on hover or when selected) */}
      <div className="absolute -top-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div className="flex items-center gap-1">
          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-mono cursor-move">
            {node.type}
          </span>
          <button
            onClick={handleClone}
            className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
            title="Clone"
          >
            📋
          </button>
          <button
            onClick={handleDelete}
            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Render Component */}
      {renderComponent()}

      {/* Drop Zone Indicator */}
      {isOver && canDrop && (
        <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-green-400 rounded pointer-events-none" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
          <span className="text-green-600 text-sm font-semibold bg-white px-2 py-1 rounded shadow">Drop here</span>
        </div>
      )}
    </div>
  );
}
