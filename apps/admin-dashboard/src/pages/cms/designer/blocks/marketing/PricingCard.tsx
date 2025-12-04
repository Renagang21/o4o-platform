/**
 * Marketing Block - PricingCard
 *
 * Pricing card with plan details, price, and features
 */

export interface PricingCardProps {
  planName: string;
  price: string;
  period?: string;
  description?: string;
  features?: string[];
  buttonText?: string;
  buttonHref?: string;
  highlighted?: boolean;
  highlightColor?: string;
}

export default function PricingCard({
  planName = 'Basic Plan',
  price = '$9',
  period = '/month',
  description = 'Perfect for individuals',
  features = [
    'Feature 1',
    'Feature 2',
    'Feature 3',
  ],
  buttonText = 'Get Started',
  buttonHref = '#',
  highlighted = false,
  highlightColor = '#3b82f6',
}: PricingCardProps) {
  return (
    <div
      className={`relative bg-white p-8 rounded-lg shadow-md border-2 transition-all hover:shadow-lg ${
        highlighted ? 'border-blue-500 scale-105' : 'border-gray-200'
      }`}
      style={highlighted ? { borderColor: highlightColor } : undefined}
    >
      {/* Highlighted Badge */}
      {highlighted && (
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-sm font-semibold"
          style={{ backgroundColor: highlightColor }}
        >
          Most Popular
        </div>
      )}

      {/* Plan Name */}
      <h3 className="text-2xl font-bold text-gray-900 mb-2">{planName}</h3>

      {/* Description */}
      {description && (
        <p className="text-gray-600 mb-6">{description}</p>
      )}

      {/* Price */}
      <div className="mb-6">
        <span className="text-5xl font-bold text-gray-900">{price}</span>
        {period && <span className="text-gray-600 ml-2">{period}</span>}
      </div>

      {/* Features */}
      {features && features.length > 0 && (
        <ul className="space-y-3 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      )}

      {/* CTA Button */}
      <a
        href={buttonHref}
        className="block w-full py-3 px-6 text-center font-semibold rounded-lg transition-colors"
        style={
          highlighted
            ? {
                backgroundColor: highlightColor,
                color: '#ffffff',
              }
            : {
                backgroundColor: '#e5e7eb',
                color: '#1f2937',
              }
        }
      >
        {buttonText}
      </a>
    </div>
  );
}
