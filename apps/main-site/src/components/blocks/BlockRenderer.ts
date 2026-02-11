/**
 * Block Renderer Types
 *
 * Core types for rendering blocks from Designer JSON
 */

import { ReactNode } from 'react';

export interface DesignerNode {
  id: string;
  type: string;
  props: Record<string, any>;
  children: DesignerNode[];
}

export interface BlockRendererProps {
  node: DesignerNode;
  children?: ReactNode;
}

export type BlockRenderer = (props: BlockRendererProps) => React.JSX.Element | null;
