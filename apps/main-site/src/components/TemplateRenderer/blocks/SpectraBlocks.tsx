import React from 'react';
import { 
  Star, 
  ArrowRight,
  Check,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  MessageSquare
} from 'lucide-react';

// CTA Block Component
export const CTABlock: React.FC<{
  title?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  buttonColor?: string;
  alignment?: 'left' | 'center' | 'right';
}> = ({ 
  title = 'Ready to Get Started?',
  description = 'Join thousands of satisfied customers and transform your business today.',
  buttonText = 'Get Started Now',
  buttonUrl = '#',
  backgroundColor = '#3b82f6',
  textColor = 'white',
  buttonColor = 'white',
  alignment = 'center'
}) => {
  return (
    <div
      className={`p-12 rounded-lg relative overflow-hidden ${
        alignment === 'center' ? 'text-center' : 
        alignment === 'left' ? 'text-left' : 
        'text-right'
      }`}
      style={{ 
        backgroundColor,
        color: textColor
      }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/20" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-white/20" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold mb-4">{title}</h2>
        <p className="text-lg mb-8">{description}</p>
        <a
          href={buttonUrl}
          className="inline-flex items-center px-8 py-3 text-lg font-medium rounded-md transition-all hover:scale-105"
          style={{
            backgroundColor: buttonColor,
            color: backgroundColor
          }}
        >
          {buttonText}
          <ArrowRight className="ml-2 h-5 w-5" />
        </a>
      </div>
    </div>
  );
};

// Pricing Table Block Component
export const PricingTableBlock: React.FC<{
  plans?: Array<{
    name: string;
    price: string;
    period: string;
    features: string[];
    highlighted?: boolean;
  }>;
}> = ({ plans }) => {
  const defaultPlans = [
    {
      name: 'Basic',
      price: '$9',
      period: 'month',
      features: ['10 GB Storage', '100 GB Bandwidth', 'Email Support', 'Basic Analytics'],
      highlighted: false
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'month',
      features: ['100 GB Storage', '1 TB Bandwidth', 'Priority Support', 'Advanced Analytics', 'Custom Domain'],
      highlighted: true
    },
    {
      name: 'Enterprise',
      price: '$99',
      period: 'month',
      features: ['Unlimited Storage', 'Unlimited Bandwidth', '24/7 Phone Support', 'Advanced Analytics', 'Custom Domain', 'API Access'],
      highlighted: false
    }
  ];

  const displayPlans = plans || defaultPlans;

  return (
    <div className="grid md:grid-cols-3 gap-8 py-8">
      {displayPlans.map((plan, index) => (
        <div
          key={index}
          className={`relative p-8 rounded-lg border-2 transition-all hover:shadow-xl ${
            plan.highlighted 
              ? 'border-blue-500 shadow-lg scale-105' 
              : 'border-gray-200'
          }`}
        >
          {plan.highlighted && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
              Most Popular
            </div>
          )}

          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
            
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className="text-gray-600">/{plan.period}</span>
            </div>
          </div>

          <ul className="space-y-3 mb-8">
            {plan.features.map((feature, featureIndex) => (
              <li key={featureIndex} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <button
            className={`w-full py-3 px-4 rounded-md font-medium transition-all ${
              plan.highlighted 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'border-2 border-gray-300 hover:border-gray-400'
            }`}
          >
            Get Started
          </button>
        </div>
      ))}
    </div>
  );
};

// Testimonial Block Component
export const TestimonialBlock: React.FC<{
  quote?: string;
  author?: string;
  position?: string;
  company?: string;
  image?: string;
  rating?: number;
}> = ({ 
  quote = 'This product has completely transformed how we do business. The results speak for themselves.',
  author = 'Jane Doe',
  position = 'CEO',
  company = 'Tech Company',
  image = '',
  rating = 5
}) => {
  return (
    <div className="max-w-3xl mx-auto p-8 text-center">
      {/* Rating Stars */}
      <div className="flex justify-center gap-1 mb-6">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-6 w-6 ${
              i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Quote */}
      <blockquote className="mb-8">
        <p className="text-2xl leading-relaxed text-gray-700 italic">"{quote}"</p>
      </blockquote>

      {/* Author Info */}
      <div className="flex items-center justify-center gap-4">
        {image ? (
          <img
            src={image}
            alt={author}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-500">
              {author.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className="text-left">
          <div className="font-semibold text-lg">{author}</div>
          <div className="text-gray-600">
            {position} at {company}
          </div>
        </div>
      </div>
    </div>
  );
};

// Info Box Block Component  
export const InfoBoxBlock: React.FC<{
  icon?: string;
  title?: string;
  description?: string;
  iconColor?: string;
  iconBackground?: string;
  alignment?: 'left' | 'center' | 'right';
}> = ({ 
  icon = 'mail',
  title = 'Contact Us',
  description = 'Get in touch with our team for any questions or support.',
  iconColor = '#3b82f6',
  iconBackground = '#dbeafe',
  alignment = 'center'
}) => {
  const IconComponent = {
    mail: Mail,
    phone: Phone,
    mapPin: MapPin,
    star: Star,
    dollarSign: DollarSign,
    messageSquare: MessageSquare
  }[icon] || Mail;

  return (
    <div className={`p-6 ${
      alignment === 'center' ? 'text-center' : 
      alignment === 'left' ? 'text-left' : 
      'text-right'
    }`}>
      <div
        className={`w-16 h-16 rounded-lg flex items-center justify-center mb-4 ${
          alignment === 'center' ? 'mx-auto' : 
          alignment === 'right' ? 'ml-auto' : ''
        }`}
        style={{ backgroundColor: iconBackground }}
      >
        <IconComponent className="h-8 w-8" style={{ color: iconColor }} />
      </div>
      
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};