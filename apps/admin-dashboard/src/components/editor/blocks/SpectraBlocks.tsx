import { FC } from 'react';
import { 
  Star, 
  DollarSign, 
  MessageSquare, 
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// CTA Block Component
export const CTABlock: FC<{
  content: {
    title?: string;
    description?: string;
    buttonText?: string;
    buttonUrl?: string;
    backgroundColor?: string;
    textColor?: string;
    buttonColor?: string;
    alignment?: 'left' | 'center' | 'right';
  };
  onUpdate: (content: any) => void;
  isEditing?: boolean;
}> = ({ content, onUpdate, isEditing = true }) => {
  const {
    title = 'Ready to Get Started?',
    description = 'Join thousands of satisfied customers and transform your business today.',
    buttonText = 'Get Started Now',
    backgroundColor = 'var(--primary-500)',
    textColor = 'white',
    buttonColor = 'white',
    alignment = 'center'
  } = content;

  return (
    <div
      className={cn(
        'p-12 rounded-lg relative overflow-hidden',
        alignment === 'center' && 'text-center',
        alignment === 'left' && 'text-left',
        alignment === 'right' && 'text-right'
      )}
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
        {isEditing ? (
          <>
            <Input
              className="text-3xl font-bold mb-4 bg-transparent border-0 text-center placeholder-white/50"
              style={{ color: textColor }}
              placeholder="Enter title..."
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ ...content, title: e.target.value })}
            />
            <Textarea
              className="text-lg mb-8 bg-transparent border-0 text-center resize-none placeholder-white/50"
              style={{ color: textColor }}
              placeholder="Enter description..."
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onUpdate({ ...content, description: e.target.value })}
              rows={2}
            />
            <Input
              className="inline-block px-8 py-3 text-lg font-medium rounded-md transition-all hover:scale-105 bg-white/20 border-2"
              style={{ 
                borderColor: buttonColor,
                color: textColor
              }}
              placeholder="Button text..."
              value={buttonText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ ...content, buttonText: e.target.value })}
            />
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-4">{title}</h2>
            <p className="text-lg mb-8">{description}</p>
            <Button
              size="lg"
              className="transition-all hover:scale-105"
              style={{
                backgroundColor: buttonColor,
                color: backgroundColor
              }}
            >
              {buttonText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

// Pricing Table Block Component
export const PricingTableBlock: FC<{
  content: {
    plans?: Array<{
      name: string;
      price: string;
      period: string;
      features: string[];
      highlighted?: boolean;
    }>;
  };
  onUpdate: (content: any) => void;
  isEditing?: boolean;
}> = ({ content, onUpdate, isEditing = true }) => {
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

  const plans = content.plans || defaultPlans;

  return (
    <div className="grid md:grid-cols-3 gap-8 py-8">
      {plans.map((plan, index) => (
        <div
          key={index}
          className={cn(
            'relative p-8 rounded-lg border-2 transition-all hover:shadow-xl',
            plan.highlighted 
              ? 'border-primary-500 shadow-lg scale-105' 
              : 'border-gray-200'
          )}
        >
          {plan.highlighted && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium">
              Most Popular
            </div>
          )}

          <div className="text-center mb-8">
            {isEditing ? (
              <Input
                className="text-2xl font-bold mb-2 text-center border-0"
                placeholder="Plan name"
                value={plan.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const newPlans = [...plans];
                  newPlans[index].name = e.target.value;
                  onUpdate({ ...content, plans: newPlans });
                }}
              />
            ) : (
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
            )}
            
            <div className="flex items-baseline justify-center gap-1">
              {isEditing ? (
                <>
                  <Input
                    className="text-4xl font-bold w-24 text-right border-0 p-0"
                    placeholder="$0"
                    value={plan.price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const newPlans = [...plans];
                      newPlans[index].price = e.target.value;
                      onUpdate({ ...content, plans: newPlans });
                    }}
                  />
                  <span className="text-gray-600">/</span>
                  <Input
                    className="text-gray-600 w-20 border-0 p-0"
                    placeholder="month"
                    value={plan.period}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const newPlans = [...plans];
                      newPlans[index].period = e.target.value;
                      onUpdate({ ...content, plans: newPlans });
                    }}
                  />
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-600">/{plan.period}</span>
                </>
              )}
            </div>
          </div>

          <ul className="space-y-3 mb-8">
            {plan.features.map((feature, featureIndex) => (
              <li key={featureIndex} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                {isEditing ? (
                  <Input
                    className="flex-1 border-0 p-0"
                    placeholder="Feature"
                    value={feature}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const newPlans = [...plans];
                      newPlans[index].features[featureIndex] = e.target.value;
                      onUpdate({ ...content, plans: newPlans });
                    }}
                  />
                ) : (
                  <span>{feature}</span>
                )}
              </li>
            ))}
          </ul>

          <Button
            className={cn(
              'w-full',
              plan.highlighted && 'bg-primary-500 hover:bg-primary-600'
            )}
            variant={plan.highlighted ? 'default' : 'outline'}
          >
            Get Started
          </Button>
        </div>
      ))}
    </div>
  );
};

// Testimonial Block Component
export const TestimonialBlock: FC<{
  content: {
    quote?: string;
    author?: string;
    position?: string;
    company?: string;
    image?: string;
    rating?: number;
  };
  onUpdate: (content: any) => void;
  isEditing?: boolean;
}> = ({ content, onUpdate, isEditing = true }) => {
  const {
    quote = 'This product has completely transformed how we do business. The results speak for themselves.',
    author = 'Jane Doe',
    position = 'CEO',
    company = 'Tech Company',
    image = '',
    rating = 5
  } = content;

  return (
    <div className="max-w-3xl mx-auto p-8 text-center">
      {/* Rating Stars */}
      <div className="flex justify-center gap-1 mb-6">
        {[...Array(5)].map((_, i) => (
          <button
            key={i}
            onClick={() => isEditing && onUpdate({ ...content, rating: i + 1 })}
            className={cn(
              'transition-colors',
              isEditing && 'cursor-pointer hover:scale-110'
            )}
          >
            <Star
              className={cn(
                'h-6 w-6',
                i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              )}
            />
          </button>
        ))}
      </div>

      {/* Quote */}
      <blockquote className="mb-8">
        {isEditing ? (
          <Textarea
            className="text-2xl leading-relaxed text-gray-700 italic text-center border-0 resize-none"
            placeholder="Enter testimonial quote..."
            value={quote}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onUpdate({ ...content, quote: e.target.value })}
            rows={3}
          />
        ) : (
          <p className="text-2xl leading-relaxed text-gray-700 italic">"{quote}"</p>
        )}
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
          {isEditing ? (
            <>
              <Input
                className="font-semibold text-lg border-0 p-0 h-auto"
                placeholder="Author name"
                value={author}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ ...content, author: e.target.value })}
              />
              <div className="flex gap-2 text-gray-600">
                <Input
                  className="border-0 p-0 h-auto text-sm"
                  placeholder="Position"
                  value={position}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ ...content, position: e.target.value })}
                />
                <span>at</span>
                <Input
                  className="border-0 p-0 h-auto text-sm"
                  placeholder="Company"
                  value={company}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ ...content, company: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold text-lg">{author}</div>
              <div className="text-gray-600">
                {position} at {company}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Star Rating Block Component
export const StarRatingBlock: FC<{
  content: {
    title?: string;
    rating?: number;
    maxRating?: number;
    size?: 'small' | 'medium' | 'large';
    color?: string;
    showNumber?: boolean;
  };
  onUpdate: (content: any) => void;
  isEditing?: boolean;
}> = ({ content, onUpdate, isEditing = true }) => {
  const {
    title = 'Rate this product',
    rating = 4,
    maxRating = 5,
    size = 'medium',
    color = '#facc15',
    showNumber = true
  } = content;

  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-8 w-8',
    large: 'h-10 w-10'
  };

  return (
    <div className="space-y-3">
      {title && (
        isEditing ? (
          <Input
            className="font-medium text-lg border-0 p-0"
            placeholder="Rating title..."
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ ...content, title: e.target.value })}
          />
        ) : (
          <h4 className="font-medium text-lg">{title}</h4>
        )
      )}
      
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {[...Array(maxRating)].map((_, i) => (
            <button
              key={i}
              onClick={() => isEditing && onUpdate({ ...content, rating: i + 1 })}
              className={cn(
                'transition-all',
                isEditing && 'cursor-pointer hover:scale-110'
              )}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  i < rating ? 'fill-current' : 'fill-none'
                )}
                style={{ color: i < rating ? color : '#e5e7eb' }}
              />
            </button>
          ))}
        </div>
        
        {showNumber && (
          <span className="text-lg font-medium text-gray-700">
            {rating}/{maxRating}
          </span>
        )}
      </div>
    </div>
  );
};

// Info Box Block Component
export const InfoBoxBlock: FC<{
  content: {
    icon?: string;
    title?: string;
    description?: string;
    iconColor?: string;
    iconBackground?: string;
    alignment?: 'left' | 'center' | 'right';
  };
  onUpdate: (content: any) => void;
  isEditing?: boolean;
}> = ({ content, onUpdate, isEditing = true }) => {
  const {
    icon = 'mail',
    title = 'Contact Us',
    description = 'Get in touch with our team for any questions or support.',
    iconColor = 'var(--primary-500)',
    iconBackground = 'var(--primary-100)',
    alignment = 'center'
  } = content;

  const IconComponent = {
    mail: Mail,
    phone: Phone,
    mapPin: MapPin,
    star: Star,
    dollarSign: DollarSign,
    messageSquare: MessageSquare
  }[icon] || Mail;

  return (
    <div className={cn(
      'p-6',
      alignment === 'center' && 'text-center',
      alignment === 'left' && 'text-left',
      alignment === 'right' && 'text-right'
    )}>
      <div
        className={cn(
          'w-16 h-16 rounded-lg flex items-center justify-center mb-4',
          alignment === 'center' && 'mx-auto',
          alignment === 'right' && 'ml-auto'
        )}
        style={{ backgroundColor: iconBackground }}
      >
        <IconComponent className="h-8 w-8" style={{ color: iconColor }} />
      </div>
      
      {isEditing ? (
        <>
          <Input
            className={cn(
              'text-xl font-semibold mb-2 border-0 p-0',
              alignment === 'center' && 'text-center',
              alignment === 'right' && 'text-right'
            )}
            placeholder="Enter title..."
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ ...content, title: e.target.value })}
          />
          <Textarea
            className={cn(
              'text-gray-600 border-0 p-0 resize-none',
              alignment === 'center' && 'text-center',
              alignment === 'right' && 'text-right'
            )}
            placeholder="Enter description..."
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onUpdate({ ...content, description: e.target.value })}
            rows={2}
          />
        </>
      ) : (
        <>
          <h3 className="text-xl font-semibold mb-2">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </>
      )}
    </div>
  );
};