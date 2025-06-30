import React from 'react';
import { ArrowRight, Play } from 'lucide-react';

interface HeroSimpleProps {
  title: string;
  subtitle?: string;
  description?: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  backgroundGradient?: string;
  textAlign?: 'left' | 'center' | 'right';
  className?: string;
}

export const HeroSimple: React.FC<HeroSimpleProps> = ({
  title,
  subtitle,
  description,
  primaryButtonText = '시작하기',
  secondaryButtonText = '더 알아보기',
  onPrimaryClick,
  onSecondaryClick,
  backgroundGradient = 'from-blue-600 to-purple-600',
  textAlign = 'center',
  className = ''
}) => {
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  return (
    <section className={`hero-simple py-20 md:py-32 bg-gradient-to-r ${backgroundGradient} ${className}`}>
      <div className="container mx-auto px-6">
        <div className={`max-w-4xl mx-auto ${alignmentClasses[textAlign]}`}>
          {/* Subtitle */}
          {subtitle && (
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                {subtitle}
              </span>
            </div>
          )}

          {/* Main Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            {title}
          </h1>

          {/* Description */}
          {description && (
            <p className="text-xl md:text-2xl text-white/90 mb-10 leading-relaxed max-w-3xl mx-auto">
              {description}
            </p>
          )}

          {/* Action Buttons */}
          <div className={`flex flex-col sm:flex-row gap-4 ${textAlign === 'center' ? 'justify-center' : textAlign === 'right' ? 'justify-end' : 'justify-start'}`}>
            {primaryButtonText && (
              <button
                onClick={onPrimaryClick}
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-900 font-semibold text-lg rounded-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                {primaryButtonText}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
            
            {secondaryButtonText && (
              <button
                onClick={onSecondaryClick}
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white font-semibold text-lg rounded-lg hover:bg-white hover:text-gray-900 transition-all duration-300"
              >
                <Play className="w-5 h-5" />
                {secondaryButtonText}
              </button>
            )}
          </div>

          {/* Decorative Elements */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <div className="w-96 h-96 rounded-full border border-white/30"></div>
              <div className="absolute w-72 h-72 rounded-full border border-white/20"></div>
              <div className="absolute w-48 h-48 rounded-full border border-white/10"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/5"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-white/5"></div>
      </div>
    </section>
  );
};