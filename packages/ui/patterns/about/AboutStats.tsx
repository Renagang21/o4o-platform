import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, Users, Award, Target, Globe, Heart } from 'lucide-react';

interface Statistic {
  id: string;
  number: number;
  suffix?: string;
  prefix?: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  color?: string;
}

interface AboutStatsProps {
  title?: string;
  subtitle?: string;
  description?: string;
  statistics: Statistic[];
  layout?: 'grid' | 'horizontal';
  columns?: 2 | 3 | 4;
  animateOnView?: boolean;
  backgroundColor?: string;
  className?: string;
}

export const AboutStats: React.FC<AboutStatsProps> = ({
  title = '숫자로 보는 성과',
  subtitle,
  description = '우리가 걸어온 길과 달성한 성과를 숫자로 보여드립니다.',
  statistics = [
    {
      id: '1',
      number: 10000,
      suffix: '+',
      label: '만족한 고객',
      description: '전 세계 고객들의 신뢰',
      icon: <Users className="w-6 h-6" />,
      color: 'text-blue-600'
    },
    {
      id: '2',
      number: 98,
      suffix: '%',
      label: '고객 만족도',
      description: '지속적인 품질 개선',
      icon: <Heart className="w-6 h-6" />,
      color: 'text-red-500'
    },
    {
      id: '3',
      number: 150,
      suffix: '+',
      label: '성공 프로젝트',
      description: '다양한 분야의 경험',
      icon: <Award className="w-6 h-6" />,
      color: 'text-yellow-500'
    },
    {
      id: '4',
      number: 50,
      suffix: '+',
      label: '글로벌 파트너',
      description: '전 세계 네트워크',
      icon: <Globe className="w-6 h-6" />,
      color: 'text-green-500'
    }
  ],
  layout = 'grid',
  columns = 4,
  animateOnView = true,
  backgroundColor = 'bg-accent-primary',
  className = ''
}) => {
  const [inView, setInView] = useState(false);
  const [animatedNumbers, setAnimatedNumbers] = useState<Record<string, number>>({});
  const sectionRef = useRef<HTMLElement>(null);

  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4'
  };

  useEffect(() => {
    if (!animateOnView) {
      const initialNumbers: Record<string, number> = {};
      statistics.forEach(stat => {
        initialNumbers[stat.id] = stat.number;
      });
      setAnimatedNumbers(initialNumbers);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !inView) {
          setInView(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [animateOnView, inView]);

  useEffect(() => {
    if (!inView || !animateOnView) return;

    const duration = 2000; // 2 seconds
    const steps = 60; // 60 FPS
    const stepDuration = duration / steps;

    statistics.forEach(stat => {
      let currentNumber = 0;
      const increment = stat.number / steps;
      
      const timer = setInterval(() => {
        currentNumber += increment;
        if (currentNumber >= stat.number) {
          currentNumber = stat.number;
          clearInterval(timer);
        }
        
        setAnimatedNumbers(prev => ({
          ...prev,
          [stat.id]: Math.floor(currentNumber)
        }));
      }, stepDuration);
    });
  }, [inView, statistics, animateOnView]);

  const formatNumber = (stat: Statistic) => {
    const number = animatedNumbers[stat.id] || stat.number;
    return `${stat.prefix || ''}${number.toLocaleString()}${stat.suffix || ''}`;
  };

  const renderStats = () => {
    if (layout === 'horizontal') {
      return (
        <div className="flex flex-wrap justify-center gap-8 md:gap-12">
          {statistics.map((stat) => (
            <div key={stat.id} className="text-center">
              <div className="flex items-center justify-center mb-2">
                {stat.icon && (
                  <div className={`${stat.color || 'text-white'} mr-2`}>
                    {stat.icon}
                  </div>
                )}
                <div className="text-3xl md:text-4xl font-bold text-white">
                  {formatNumber(stat)}
                </div>
              </div>
              <div className="text-white/90 font-medium">{stat.label}</div>
              {stat.description && (
                <div className="text-white/70 text-sm mt-1">{stat.description}</div>
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={`grid grid-cols-1 ${gridCols[columns]} gap-8`}>
        {statistics.map((stat) => (
          <div key={stat.id} className="text-center">
            {/* Icon */}
            {stat.icon && (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                <div className="text-white">
                  {stat.icon}
                </div>
              </div>
            )}
            
            {/* Number */}
            <div className="text-4xl md:text-5xl font-bold text-white mb-2">
              {formatNumber(stat)}
            </div>
            
            {/* Label */}
            <div className="text-white/90 font-medium text-lg mb-2">
              {stat.label}
            </div>
            
            {/* Description */}
            {stat.description && (
              <div className="text-white/70 text-sm">
                {stat.description}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <section 
      ref={sectionRef}
      className={`about-stats py-16 md:py-24 ${backgroundColor} ${className}`}
    >
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          {subtitle && (
            <div className="mb-4">
              <span className="inline-block px-4 py-2 bg-white/20 text-white text-sm font-medium rounded-full">
                {subtitle}
              </span>
            </div>
          )}
          
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
            {title}
          </h2>
          
          {description && (
            <p className="text-lg text-white/90 max-w-3xl mx-auto leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Statistics */}
        {renderStats()}

        {/* Additional Content */}
        <div className="mt-16 text-center">
          <div className="inline-block bg-white/10 backdrop-blur-sm rounded-2xl p-8">
            <div className="flex items-center justify-center gap-4 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>지속적인 성장</span>
              </div>
              <div className="w-px h-4 bg-white/30"></div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span>목표 달성</span>
              </div>
              <div className="w-px h-4 bg-white/30"></div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span>업계 인정</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-20 left-20 w-32 h-32 border border-white/30 rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 border border-white/20 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/10 rounded-full"></div>
      </div>
    </section>
  );
};