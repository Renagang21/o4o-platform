/**
 * Visual View Designer - JSON Adapter
 *
 * Converts between Designer internal format and CMS View JSON format
 */

import { DesignerNode } from '../types/designer.types';
import { ViewSchema } from '@/lib/cms';

/**
 * Convert Designer tree to CMS View JSON
 */
export function designerToCMSView(root: DesignerNode): ViewSchema {
  // Convert children to components array
  const components = root.children.map(node => designerNodeToViewComponent(node));

  return {
    version: '2.0',
    type: 'standard',
    components,
    bindings: [],
    styles: {},
  };
}

/**
 * Convert CMS View JSON to Designer tree
 */
export function cmsViewToDesigner(view: ViewSchema): DesignerNode {
  const children = view.components?.map((comp, index) =>
    viewComponentToDesignerNode(comp, `imported_${index}`)
  ) || [];

  return {
    id: 'root',
    type: 'Root',
    props: {},
    children,
  };
}

/**
 * Convert single DesignerNode to ViewComponent
 */
function designerNodeToViewComponent(node: DesignerNode): any {
  const component: any = {
    id: node.id,
    type: node.type,
    props: { ...node.props },
  };

  // If node has children, recursively convert them
  if (node.children && node.children.length > 0) {
    // For layout components, children might be nested
    if (node.type === 'Section' || node.type === 'Row' || node.type === 'Column') {
      component.children = node.children.map(child => designerNodeToViewComponent(child));
    }
  }

  return component;
}

/**
 * Convert ViewComponent to DesignerNode
 */
function viewComponentToDesignerNode(comp: any, idPrefix: string): DesignerNode {
  const node: DesignerNode = {
    id: comp.id || `${idPrefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    type: comp.type,
    props: { ...comp.props } || {},
    children: [],
  };

  // If component has children, recursively convert them
  if (comp.children && Array.isArray(comp.children)) {
    node.children = comp.children.map((child: any, index: number) =>
      viewComponentToDesignerNode(child, `${node.id}_child_${index}`)
    );
  }

  return node;
}

/**
 * Validate View JSON schema
 */
export function validateViewJSON(json: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!json.version) {
    errors.push('Missing version field');
  }

  if (!json.type) {
    errors.push('Missing type field');
  }

  if (!Array.isArray(json.components)) {
    errors.push('components must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
