/**
 * Visual View Designer - State Management
 *
 * React Context for managing designer state
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { DesignerState, DesignerNode } from '../types/designer.types';
import { getComponentDefinition } from '../config/componentRegistry';
import { cmsViewToDesigner } from '../core/jsonAdapter';

interface DesignerContextValue {
  state: DesignerState;
  selectNode: (nodeId: string | null) => void;
  addNode: (parentId: string, componentType: string, position?: number) => void;
  updateNode: (nodeId: string, props: Record<string, any>) => void;
  deleteNode: (nodeId: string) => void;
  cloneNode: (nodeId: string) => void;
  moveNode: (nodeId: string, targetParentId: string, position: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  setRootNode: (node: DesignerNode) => void;
  getNode: (nodeId: string) => DesignerNode | null;
  getNodePath: (nodeId: string) => DesignerNode[];
  clearDirty: () => void;
}

const DesignerContext = createContext<DesignerContextValue | null>(null);

const INITIAL_STATE: DesignerState = {
  rootNode: {
    id: 'root',
    type: 'Root',
    props: {},
    children: [],
  },
  selectedNodeId: null,
  undoStack: [],
  redoStack: [],
  isDirty: false,
};

export function DesignerProvider({ children, initialView }: { children: ReactNode; initialView?: any }) {
  const [state, setState] = useState<DesignerState>(() => {
    if (initialView) {
      // Convert CMS View JSON to DesignerNode tree
      const rootNode = cmsViewToDesigner(initialView);
      return {
        ...INITIAL_STATE,
        rootNode,
      };
    }
    return INITIAL_STATE;
  });

  // Helper: Find node by ID in tree
  const findNode = useCallback((nodeId: string, node: DesignerNode = state.rootNode): DesignerNode | null => {
    if (node.id === nodeId) return node;
    for (const child of node.children) {
      const found = findNode(nodeId, child);
      if (found) return found;
    }
    return null;
  }, [state.rootNode]);

  // Helper: Clone tree deeply
  const cloneNode = (node: DesignerNode): DesignerNode => ({
    ...node,
    children: node.children.map(cloneNode),
  });

  // Helper: Save to undo stack
  const pushToUndoStack = useCallback(() => {
    setState(prev => ({
      ...prev,
      undoStack: [...prev.undoStack, cloneNode(prev.rootNode)],
      redoStack: [],
      isDirty: true,
    }));
  }, []);

  // Select node
  const selectNode = useCallback((nodeId: string | null) => {
    setState(prev => ({ ...prev, selectedNodeId: nodeId }));
  }, []);

  // Add node
  const addNode = useCallback((parentId: string, componentType: string, position?: number) => {
    pushToUndoStack();

    const componentDef = getComponentDefinition(componentType);
    if (!componentDef) {
      console.error('Component not found:', componentType);
      return;
    }

    const newNode: DesignerNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type: componentType,
      props: { ...componentDef.defaultProps },
      children: [],
      parentId,
    };

    setState(prev => {
      const newRoot = cloneNode(prev.rootNode);
      const parentNode = findNodeInTree(newRoot, parentId);
      if (parentNode) {
        if (position !== undefined) {
          parentNode.children.splice(position, 0, newNode);
        } else {
          parentNode.children.push(newNode);
        }
      }
      return {
        ...prev,
        rootNode: newRoot,
        selectedNodeId: newNode.id,
        isDirty: true,
      };
    });
  }, [pushToUndoStack]);

  // Update node props
  const updateNode = useCallback((nodeId: string, props: Record<string, any>) => {
    pushToUndoStack();

    setState(prev => {
      const newRoot = cloneNode(prev.rootNode);
      const node = findNodeInTree(newRoot, nodeId);
      if (node) {
        node.props = { ...node.props, ...props };
      }
      return {
        ...prev,
        rootNode: newRoot,
        isDirty: true,
      };
    });
  }, [pushToUndoStack]);

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    if (nodeId === 'root') return; // Can't delete root

    pushToUndoStack();

    setState(prev => {
      const newRoot = cloneNode(prev.rootNode);
      removeNodeFromTree(newRoot, nodeId);
      return {
        ...prev,
        rootNode: newRoot,
        selectedNodeId: prev.selectedNodeId === nodeId ? null : prev.selectedNodeId,
        isDirty: true,
      };
    });
  }, [pushToUndoStack]);

  // Clone node
  const cloneNodeAction = useCallback((nodeId: string) => {
    if (nodeId === 'root') return; // Can't clone root

    pushToUndoStack();

    setState(prev => {
      const newRoot = cloneNode(prev.rootNode);
      const nodeToClone = findNodeInTree(newRoot, nodeId);
      if (!nodeToClone || !nodeToClone.parentId) return prev;

      // Deep clone the node with new IDs
      const clonedNode = deepCloneWithNewIds(nodeToClone);

      // Find parent and add cloned node after original
      const parentNode = findNodeInTree(newRoot, nodeToClone.parentId);
      if (parentNode) {
        const index = parentNode.children.findIndex(child => child.id === nodeId);
        if (index !== -1) {
          parentNode.children.splice(index + 1, 0, clonedNode);
        }
      }

      return {
        ...prev,
        rootNode: newRoot,
        selectedNodeId: clonedNode.id,
        isDirty: true,
      };
    });
  }, [pushToUndoStack]);

  // Move node
  const moveNode = useCallback((nodeId: string, targetParentId: string, position: number) => {
    pushToUndoStack();

    setState(prev => {
      const newRoot = cloneNode(prev.rootNode);

      // Find and remove node from current parent
      const node = findNodeInTree(newRoot, nodeId);
      if (!node) return prev;

      removeNodeFromTree(newRoot, nodeId);

      // Add to new parent
      const targetParent = findNodeInTree(newRoot, targetParentId);
      if (targetParent) {
        node.parentId = targetParentId;
        targetParent.children.splice(position, 0, node);
      }

      return {
        ...prev,
        rootNode: newRoot,
        isDirty: true,
      };
    });
  }, [pushToUndoStack]);

  // Undo
  const undo = useCallback(() => {
    setState(prev => {
      if (prev.undoStack.length === 0) return prev;

      const previousState = prev.undoStack[prev.undoStack.length - 1];
      const newUndoStack = prev.undoStack.slice(0, -1);

      return {
        ...prev,
        rootNode: previousState,
        undoStack: newUndoStack,
        redoStack: [...prev.redoStack, cloneNode(prev.rootNode)],
      };
    });
  }, []);

  // Redo
  const redo = useCallback(() => {
    setState(prev => {
      if (prev.redoStack.length === 0) return prev;

      const nextState = prev.redoStack[prev.redoStack.length - 1];
      const newRedoStack = prev.redoStack.slice(0, -1);

      return {
        ...prev,
        rootNode: nextState,
        undoStack: [...prev.undoStack, cloneNode(prev.rootNode)],
        redoStack: newRedoStack,
      };
    });
  }, []);

  // Set root node (for loading existing view)
  const setRootNode = useCallback((node: DesignerNode) => {
    setState(prev => ({
      ...prev,
      rootNode: node,
      undoStack: [],
      redoStack: [],
      isDirty: false,
    }));
  }, []);

  // Get node
  const getNode = useCallback((nodeId: string) => {
    return findNode(nodeId);
  }, [findNode]);

  // Get node path (for breadcrumb)
  const getNodePath = useCallback((nodeId: string): DesignerNode[] => {
    const path: DesignerNode[] = [];
    const buildPath = (node: DesignerNode): boolean => {
      if (node.id === nodeId) {
        path.push(node);
        return true;
      }
      for (const child of node.children) {
        if (buildPath(child)) {
          path.unshift(node);
          return true;
        }
      }
      return false;
    };
    buildPath(state.rootNode);
    return path.filter(n => n.id !== 'root'); // Exclude root from path
  }, [state.rootNode]);

  // Clear dirty flag (called after save)
  const clearDirty = useCallback(() => {
    setState(prev => ({ ...prev, isDirty: false }));
  }, []);

  const value: DesignerContextValue = {
    state,
    selectNode,
    addNode,
    updateNode,
    deleteNode,
    cloneNode: cloneNodeAction,
    moveNode,
    undo,
    redo,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    setRootNode,
    getNode,
    getNodePath,
    clearDirty,
  };

  return (
    <DesignerContext.Provider value={value}>
      {children}
    </DesignerContext.Provider>
  );
}

export function useDesigner() {
  const context = useContext(DesignerContext);
  if (!context) {
    throw new Error('useDesigner must be used within DesignerProvider');
  }
  return context;
}

// Helper functions
function findNodeInTree(node: DesignerNode, nodeId: string): DesignerNode | null {
  if (node.id === nodeId) return node;
  for (const child of node.children) {
    const found = findNodeInTree(child, nodeId);
    if (found) return found;
  }
  return null;
}

function removeNodeFromTree(tree: DesignerNode, nodeId: string): boolean {
  for (let i = 0; i < tree.children.length; i++) {
    if (tree.children[i].id === nodeId) {
      tree.children.splice(i, 1);
      return true;
    }
    if (removeNodeFromTree(tree.children[i], nodeId)) {
      return true;
    }
  }
  return false;
}

function deepCloneWithNewIds(node: DesignerNode): DesignerNode {
  const newId = `node_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  return {
    ...node,
    id: newId,
    children: node.children.map(child => deepCloneWithNewIds(child)),
  };
}
