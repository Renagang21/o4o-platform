/**
 * PricingCard Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const PricingCardBlock = ({ node }: BlockRendererProps) => {
  const {
    title = 'Plan',
    price = '0',
    period = 'month',
    features = [],
    buttonText = 'Get Started',
    buttonLink = '#',
    highlighted = false,
  } = node.props;

  return (
    <div
      className={`bg-white rounded-lg shadow-lg p-8 ${
        highlighted ? 'border-2 border-blue-500 transform scale-105' : 'border border-gray-200'
      }`}
    >
      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      <div className="mb-6">
        <span className="text-4xl font-bold">${price}</span>
        <span className="text-gray-600">/{period}</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature: string, index: number) => (
          <li key={index} className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      <a
        href={buttonLink}
        className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-colors ${
          highlighted
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
        }`}
      >
        {buttonText}
      </a>
    </div>
  );
};
