/**
 * CTA (Call to Action) Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const CTABlock = ({ node }: BlockRendererProps) => {
  const {
    title = '',
    subtitle = '',
    primaryButtonText = 'Get Started',
    primaryButtonLink = '#',
    secondaryButtonText,
    secondaryButtonLink = '#',
    bgColor = '#3b82f6',
    textColor = '#ffffff',
  } = node.props;

  return (
    <div
      className="rounded-lg p-8 md:p-12 text-center"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>}
      {subtitle && <p className="text-lg md:text-xl mb-8 opacity-90">{subtitle}</p>}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href={primaryButtonLink}
          className="inline-block bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          {primaryButtonText}
        </a>
        {secondaryButtonText && (
          <a
            href={secondaryButtonLink}
            className="inline-block border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:bg-opacity-10 transition-colors"
          >
            {secondaryButtonText}
          </a>
        )}
      </div>
    </div>
  );
};
