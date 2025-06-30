import React from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';

interface HeroMinimalProps {
  title: string;
  subtitle?: string;
  primaryButtonText?: string;
  onPrimaryClick?: () => void;
  onScrollClick?: () => void;
  showScrollIndicator?: boolean;
  textColor?: string;
  backgroundColor?: string;
  centered?: boolean;
  className?: string;
}

export const HeroMinimal: React.FC<HeroMinimalProps> = ({
  title,
  subtitle,
  primaryButtonText = '시작하기',
  onPrimaryClick,
  onScrollClick,
  showScrollIndicator = true,
  textColor = 'text-gray-900',
  backgroundColor = 'bg-white',
  centered = true,
  className = ''
}) => {
  const contentAlignment = centered ? 'text-center' : 'text-left';

  return (
    <section className={`hero-minimal relative min-h-screen flex items-center ${backgroundColor} ${className}`}>
      <div className="container mx-auto px-6">
        <div className={`max-w-4xl mx-auto ${contentAlignment}`}>
          {/* Subtitle */}
          {subtitle && (
            <div className="mb-8">
              <span className={`text-lg font-medium tracking-wide uppercase ${textColor} opacity-70`}>
                {subtitle}
              </span>
            </div>
          )}

          {/* Main Title */}
          <h1 className={`text-5xl md:text-7xl lg:text-8xl font-light mb-12 leading-tight tracking-tight ${textColor}`}>
            <span className="block">{title}</span>
          </h1>

          {/* Call to Action */}
          {primaryButtonText && (
            <div className="mb-16">
              <button
                onClick={onPrimaryClick}
                className={`group inline-flex items-center gap-3 text-lg font-medium transition-all duration-300 ${textColor} hover:opacity-70`}
              >
                <span className="border-b-2 border-current pb-1">{primaryButtonText}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
              </button>
            </div>
          )}

          {/* Minimal Decorative Line */}
          <div className={`w-24 h-px ${textColor === 'text-gray-900' ? 'bg-gray-900' : 'bg-white'} ${centered ? 'mx-auto' : ''} opacity-50`}></div>
        </div>
      </div>

      {/* Scroll Indicator */}
      {showScrollIndicator && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <button
            onClick={onScrollClick}
            className={`flex flex-col items-center gap-2 ${textColor} opacity-60 hover:opacity-100 transition-opacity duration-300 group`}
            aria-label="Scroll down"
          >
            <span className="text-sm font-medium tracking-wide">SCROLL</span>
            <div className="w-px h-8 bg-current group-hover:h-12 transition-all duration-300"></div>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </button>
        </div>
      )}

      {/* Background Pattern (Optional) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-current rounded-full"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-current rounded-full"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-current rounded-full"></div>
        <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-current rounded-full"></div>
      </div>

      {/* Side Navigation Dots (Optional) */}
      <div className="absolute right-8 top-1/2 transform -translate-y-1/2 hidden lg:flex flex-col gap-4">
        <div className={`w-2 h-2 rounded-full ${textColor === 'text-gray-900' ? 'bg-gray-900' : 'bg-white'}`}></div>
        <div className={`w-2 h-2 rounded-full ${textColor === 'text-gray-900' ? 'bg-gray-900' : 'bg-white'} opacity-30`}></div>
        <div className={`w-2 h-2 rounded-full ${textColor === 'text-gray-900' ? 'bg-gray-900' : 'bg-white'} opacity-30`}></div>
      </div>
    </section>
  );
};