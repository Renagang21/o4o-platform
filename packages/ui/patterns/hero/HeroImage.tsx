import React from 'react';
import { ArrowRight, Shield, Zap, Heart } from 'lucide-react';

interface FeaturePoint {
  icon: React.ReactNode;
  text: string;
}

interface HeroImageProps {
  title: string;
  subtitle?: string;
  description?: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  heroImage: string;
  imageAlt?: string;
  features?: FeaturePoint[];
  className?: string;
}

export const HeroImage: React.FC<HeroImageProps> = ({
  title,
  subtitle,
  description,
  primaryButtonText = '시작하기',
  secondaryButtonText = '자세히 보기',
  onPrimaryClick,
  onSecondaryClick,
  heroImage,
  imageAlt = 'Hero Image',
  features = [
    { icon: <Shield className="w-5 h-5" />, text: '안전한 서비스' },
    { icon: <Zap className="w-5 h-5" />, text: '빠른 처리' },
    { icon: <Heart className="w-5 h-5" />, text: '사용자 중심' }
  ],
  className = ''
}) => {
  return (
    <section className={`hero-image py-20 md:py-32 bg-secondary ${className}`}>
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="order-2 lg:order-1">
            {/* Subtitle */}
            {subtitle && (
              <div className="mb-6">
                <span className="inline-block px-4 py-2 bg-accent-primary/10 text-accent-primary text-sm font-medium rounded-full">
                  {subtitle}
                </span>
              </div>
            )}

            {/* Main Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {title}
            </h1>

            {/* Description */}
            {description && (
              <p className="text-xl text-secondary mb-8 leading-relaxed">
                {description}
              </p>
            )}

            {/* Feature Points */}
            {features.length > 0 && (
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-accent-primary/10 text-accent-primary rounded-lg flex items-center justify-center">
                      {feature.icon}
                    </div>
                    <span className="text-sm font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {primaryButtonText && (
                <button
                  onClick={onPrimaryClick}
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 btn-theme-primary rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-theme"
                >
                  {primaryButtonText}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
              
              {secondaryButtonText && (
                <button
                  onClick={onSecondaryClick}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 btn-theme-secondary rounded-lg font-semibold text-lg transition-all duration-300"
                >
                  {secondaryButtonText}
                </button>
              )}
            </div>
          </div>

          {/* Right Image */}
          <div className="order-1 lg:order-2 relative">
            <div className="relative">
              {/* Main Image */}
              <div className="relative z-10 rounded-2xl overflow-hidden shadow-theme">
                <img
                  src={heroImage}
                  alt={imageAlt}
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-accent-primary/20 rounded-2xl -z-10"></div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-accent-secondary/20 rounded-2xl -z-10"></div>
              
              {/* Floating Badge */}
              <div className="absolute top-6 right-6 z-20">
                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-theme">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Live</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="absolute -bottom-8 -left-8 bg-white rounded-xl shadow-theme p-4 z-20">
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-primary">99%</div>
                <div className="text-sm text-secondary">만족도</div>
              </div>
            </div>

            <div className="absolute top-1/2 -right-8 bg-white rounded-xl shadow-theme p-4 z-20">
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-primary">24/7</div>
                <div className="text-sm text-secondary">지원</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};