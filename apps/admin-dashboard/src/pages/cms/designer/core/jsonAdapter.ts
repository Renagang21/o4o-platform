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

  // Check if json is valid object
  if (!json || typeof json !== 'object') {
    errors.push('Invalid JSON: must be an object');
    return { valid: false, errors };
  }

  // Check version
  if (!json.version) {
    errors.push('Missing required field: version');
  } else if (typeof json.version !== 'string') {
    errors.push('Invalid version: must be a string');
  }

  // Check type
  if (!json.type) {
    errors.push('Missing required field: type');
  } else if (typeof json.type !== 'string') {
    errors.push('Invalid type: must be a string');
  }

  // Check components
  if (!json.components) {
    errors.push('Missing required field: components');
  } else if (!Array.isArray(json.components)) {
    errors.push('Invalid components: must be an array');
  } else {
    // Validate each component
    json.components.forEach((comp: any, index: number) => {
      const compErrors = validateComponent(comp, `component[${index}]`);
      errors.push(...compErrors);
    });
  }

  // Check optional fields
  if (json.bindings && !Array.isArray(json.bindings)) {
    errors.push('Invalid bindings: must be an array');
  }

  if (json.styles && typeof json.styles !== 'object') {
    errors.push('Invalid styles: must be an object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate individual component
 */
function validateComponent(comp: any, path: string): string[] {
  const errors: string[] = [];

  if (!comp || typeof comp !== 'object') {
    errors.push(`${path}: must be an object`);
    return errors;
  }

  if (!comp.id) {
    errors.push(`${path}: missing required field 'id'`);
  } else if (typeof comp.id !== 'string') {
    errors.push(`${path}: id must be a string`);
  }

  if (!comp.type) {
    errors.push(`${path}: missing required field 'type'`);
  } else if (typeof comp.type !== 'string') {
    errors.push(`${path}: type must be a string`);
  }

  if (!comp.props) {
    errors.push(`${path}: missing required field 'props'`);
  } else if (typeof comp.props !== 'object') {
    errors.push(`${path}: props must be an object`);
  }

  // Validate children if present
  if (comp.children) {
    if (!Array.isArray(comp.children)) {
      errors.push(`${path}: children must be an array`);
    } else {
      comp.children.forEach((child: any, index: number) => {
        const childErrors = validateComponent(child, `${path}.children[${index}]`);
        errors.push(...childErrors);
      });
    }
  }

  return errors;
}

/**
 * Safe import with validation and error handling
 */
export function safeImportViewJSON(jsonString: string): {
  success: boolean;
  data?: DesignerNode;
  error?: string;
  errors?: string[];
} {
  try {
    // Parse JSON
    const parsed = JSON.parse(jsonString);

    // Validate structure
    const validation = validateViewJSON(parsed);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Invalid View JSON format',
        errors: validation.errors,
      };
    }

    // Convert to Designer format
    const designerNode = cmsViewToDesigner(parsed);

    return {
      success: true,
      data: designerNode,
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to parse JSON: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

/**
 * Safe export with metadata
 */
export function safeExportViewJSON(root: DesignerNode, metadata?: {
  title?: string;
  description?: string;
}): string {
  const viewSchema = designerToCMSView(root);

  // Add metadata if provided
  const output = {
    ...viewSchema,
    metadata: {
      ...metadata,
      exportedAt: new Date().toISOString(),
      exportedBy: 'Visual Designer',
    },
  };

  return JSON.stringify(output, null, 2);
}
