/**
 * View Renderer
 *
 * Renders Designer JSON into React components
 */

'use client';

import { ReactNode } from 'react';
import { DesignerNode } from './blocks/BlockRenderer';
import { getBlockRenderer } from './blocks/BlockRegistry';
import { CMSBlockWrapper, isCMSBlock } from './blocks/CMSBlockWrapper';

interface ViewRendererProps {
  view: {
    id?: string;
    name?: string;
    rootNode: DesignerNode;
    metadata?: Record<string, any>;
  };
}

/**
 * Recursively render a node and its children
 */
function renderNode(node: DesignerNode): ReactNode {
  const Renderer = getBlockRenderer(node.type);

  // Recursively render children
  const children = node.children && node.children.length > 0
    ? node.children.map((child) => renderNode(child))
    : null;

  // Check if this is a CMS block that needs data fetching
  if (isCMSBlock(node.type)) {
    return (
      <CMSBlockWrapper key={node.id} node={node}>
        {(nodeWithData) => (
          <Renderer node={nodeWithData}>
            {children}
          </Renderer>
        )}
      </CMSBlockWrapper>
    );
  }

  // Regular block rendering
  return (
    <Renderer key={node.id} node={node}>
      {children}
    </Renderer>
  );
}

/**
 * Main ViewRenderer component
 */
export function ViewRenderer({ view }: ViewRendererProps) {
  if (!view || !view.rootNode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No content to display</p>
        </div>
      </div>
    );
  }

  // Render all root-level children
  const content = view.rootNode.children && view.rootNode.children.length > 0
    ? view.rootNode.children.map((child) => renderNode(child))
    : null;

  return <>{content}</>;
}
