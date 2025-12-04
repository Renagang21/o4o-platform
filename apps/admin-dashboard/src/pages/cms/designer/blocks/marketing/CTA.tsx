/**
 * Marketing Block - CTA (Call to Action)
 *
 * Call-to-action section with title, description, and buttons
 */

export interface CTAProps {
  title: string;
  description?: string;
  primaryButtonText: string;
  primaryButtonHref: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
  bgColor?: string;
  textColor?: string;
  layout?: 'center' | 'left' | 'split';
}

export default function CTA({
  title = 'Ready to Get Started?',
  description = 'Join thousands of satisfied customers today.',
  primaryButtonText = 'Get Started',
  primaryButtonHref = '#',
  secondaryButtonText,
  secondaryButtonHref = '#',
  bgColor = '#3b82f6',
  textColor = '#ffffff',
  layout = 'center',
}: CTAProps) {
  if (layout === 'split') {
    return (
      <div className="py-16 px-4" style={{ backgroundColor: bgColor, color: textColor }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
            {description && <p className="text-lg opacity-90">{description}</p>}
          </div>
          <div className="flex gap-4">
            <a
              href={primaryButtonHref}
              className="px-8 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              {primaryButtonText}
            </a>
            {secondaryButtonText && (
              <a
                href={secondaryButtonHref}
                className="px-8 py-3 border-2 border-white font-semibold rounded-lg hover:bg-white hover:text-gray-900 transition-colors"
                style={{ borderColor: textColor }}
              >
                {secondaryButtonText}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const alignClass = layout === 'center' ? 'text-center' : 'text-left';
  const buttonContainerClass = layout === 'center' ? 'justify-center' : 'justify-start';

  return (
    <div className="py-16 px-4" style={{ backgroundColor: bgColor, color: textColor }}>
      <div className={`max-w-4xl mx-auto ${alignClass}`}>
        <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
        {description && <p className="text-lg mb-8 opacity-90">{description}</p>}
        <div className={`flex flex-wrap gap-4 ${buttonContainerClass}`}>
          <a
            href={primaryButtonHref}
            className="px-8 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            {primaryButtonText}
          </a>
          {secondaryButtonText && (
            <a
              href={secondaryButtonHref}
              className="px-8 py-3 border-2 border-white font-semibold rounded-lg hover:bg-white hover:text-gray-900 transition-colors"
              style={{ borderColor: textColor }}
            >
              {secondaryButtonText}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
