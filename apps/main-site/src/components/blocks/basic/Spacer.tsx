/**
 * Spacer Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const SpacerBlock = ({ node }: BlockRendererProps) => {
  const { height = 40 } = node.props;

  return <div style={{ height: `${height}px` }} />;
};
