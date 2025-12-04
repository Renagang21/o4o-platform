/**
 * StepGuide Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const StepGuideBlock = ({ node }: BlockRendererProps) => {
  const {
    stepNumber = 1,
    title = '',
    description = '',
    icon,
  } = node.props;

  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
          {icon || stepNumber}
        </div>
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        {description && <p className="text-gray-600">{description}</p>}
      </div>
    </div>
  );
};
