/**
 * Timeline Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const TimelineBlock = ({ node }: BlockRendererProps) => {
  const {
    date = '',
    title = '',
    description = '',
    icon = '●',
  } = node.props;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
          {icon}
        </div>
        <div className="w-0.5 h-full bg-blue-200 mt-2"></div>
      </div>
      <div className="flex-1 pb-8">
        {date && <div className="text-sm text-blue-600 font-semibold mb-1">{date}</div>}
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        {description && <p className="text-gray-600">{description}</p>}
      </div>
    </div>
  );
};
