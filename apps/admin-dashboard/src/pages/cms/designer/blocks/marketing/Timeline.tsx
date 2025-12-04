/**
 * Marketing Block - Timeline
 *
 * Timeline item with date, title, and description
 */

export interface TimelineProps {
  date: string;
  title: string;
  description?: string;
  icon?: string;
  accentColor?: string;
  side?: 'left' | 'right';
}

export default function Timeline({
  date = '2024',
  title = 'Milestone Title',
  description = 'Description of this milestone',
  icon = '🎯',
  accentColor = '#3b82f6',
  side = 'left',
}: TimelineProps) {
  const isLeft = side === 'left';

  return (
    <div className={`flex gap-6 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Content */}
      <div className={`flex-1 ${isLeft ? 'text-right' : 'text-left'}`}>
        <div className="inline-block bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="text-sm font-semibold mb-2" style={{ color: accentColor }}>
            {date}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          {description && <p className="text-gray-600">{description}</p>}
        </div>
      </div>

      {/* Timeline Line */}
      <div className="flex flex-col items-center">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
          style={{ backgroundColor: accentColor }}
        >
          {icon}
        </div>
        <div className="w-1 flex-1 bg-gray-300 mt-2"></div>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>
    </div>
  );
}
