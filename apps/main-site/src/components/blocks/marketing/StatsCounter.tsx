/**
 * StatsCounter Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const StatsCounterBlock = ({ node }: BlockRendererProps) => {
  const {
    value = '0',
    label = '',
    suffix = '',
    prefix = '',
    description = '',
  } = node.props;

  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">
        {prefix}
        {value}
        {suffix}
      </div>
      {label && <div className="text-xl font-semibold text-gray-900 mb-1">{label}</div>}
      {description && <div className="text-sm text-gray-600">{description}</div>}
    </div>
  );
};
