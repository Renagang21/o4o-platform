/**
 * Marketing Block - StepGuide
 *
 * Step-by-step guide item with number, title, and description
 */

export interface StepGuideProps {
  stepNumber: number;
  title: string;
  description?: string;
  icon?: string;
  accentColor?: string;
  layout?: 'horizontal' | 'vertical';
}

export default function StepGuide({
  stepNumber = 1,
  title = 'Step Title',
  description = 'Description of this step',
  icon,
  accentColor = '#3b82f6',
  layout = 'horizontal',
}: StepGuideProps) {
  if (layout === 'vertical') {
    return (
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl"
          style={{ backgroundColor: accentColor }}
        >
          {icon || stepNumber}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        {description && <p className="text-gray-600">{description}</p>}
      </div>
    );
  }

  // Default: horizontal layout
  return (
    <div className="flex gap-6 items-start">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
        style={{ backgroundColor: accentColor }}
      >
        {icon || stepNumber}
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        {description && <p className="text-gray-600">{description}</p>}
      </div>
    </div>
  );
}
