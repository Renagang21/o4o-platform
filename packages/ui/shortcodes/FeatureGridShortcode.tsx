/**
 * [feature-grid] 숏코드 컴포넌트
 */

import React from 'react';
import { ShortcodeRendererProps } from '../../lib/shortcode/renderer';

const FeatureGridShortcode: React.FC<ShortcodeRendererProps> = ({
  shortcode,
  editorMode = false
}) => {
  const {
    features = 'speed,security,scalability',
    columns = 3,
    icon_style = 'outline',
    className = ''
  } = shortcode.attributes;

  // 기본 기능 데이터
  const defaultFeatures = {
    speed: {
      title: '빠른 속도',
      description: '최적화된 성능으로 빠른 로딩 속도를 제공합니다.',
      icon: 'zap'
    },
    security: {
      title: '보안',
      description: '강력한 보안 시스템으로 데이터를 안전하게 보호합니다.',
      icon: 'shield'
    },
    scalability: {
      title: '확장성',
      description: '비즈니스 성장에 따라 유연하게 확장 가능합니다.',
      icon: 'trending-up'
    },
    support: {
      title: '24/7 지원',
      description: '언제든지 도움이 필요할 때 전문가 지원을 받을 수 있습니다.',
      icon: 'headphones'
    },
    integration: {
      title: '통합',
      description: '다양한 서비스와 쉽게 연동하여 사용할 수 있습니다.',
      icon: 'link'
    },
    analytics: {
      title: '분석',
      description: '상세한 분석 도구로 비즈니스 인사이트를 얻으세요.',
      icon: 'bar-chart'
    }
  };

  const featureList = (features as string).split(',').map(f => f.trim());

  const getIcon = (iconName: string) => {
    const iconProps = {
      className: `w-8 h-8 ${icon_style === 'filled' ? 'text-blue-600' : 'text-blue-500'}`,
      fill: icon_style === 'filled' ? 'currentColor' : 'none',
      stroke: icon_style === 'filled' ? 'none' : 'currentColor',
      viewBox: "0 0 24 24",
      strokeWidth: 2
    };

    const icons: { [key: string]: JSX.Element } = {
      zap: (
        <svg {...iconProps}>
          <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
        </svg>
      ),
      shield: (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      'trending-up': (
        <svg {...iconProps}>
          <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
          <polyline points="17,6 23,6 23,12" />
        </svg>
      ),
      headphones: (
        <svg {...iconProps}>
          <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
        </svg>
      ),
      link: (
        <svg {...iconProps}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
      ),
      'bar-chart': (
        <svg {...iconProps}>
          <line x1="12" y1="20" x2="12" y2="10"></line>
          <line x1="18" y1="20" x2="18" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="16"></line>
        </svg>
      )
    };

    return icons[iconName] || icons.zap;
  };

  const getGridCols = (): string => {
    const cols = Math.min(Math.max(1, Number(columns)), 4);
    const colsMap: { [key: number]: string } = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    };
    return colsMap[cols] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  };

  return (
    <div className={`feature-grid-shortcode ${editorMode ? 'editor-mode' : ''} ${className}`}>
      <div className={`features-grid grid gap-8 ${getGridCols()}`}>
        {featureList.map((featureKey) => {
          const feature = defaultFeatures[featureKey as keyof typeof defaultFeatures];
          if (!feature) return null;

          return (
            <div
              key={featureKey}
              className="feature-item text-center group hover:scale-105 transition-transform duration-200"
            >
              <div className={`feature-icon mb-4 flex justify-center ${
                icon_style === 'filled' 
                  ? 'p-3 bg-blue-100 rounded-full w-16 h-16 mx-auto items-center'
                  : ''
              }`}>
                {getIcon(feature.icon)}
              </div>
              
              <h3 className="feature-title text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              
              <p className="feature-description text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>

      {editorMode && (
        <div className="shortcode-editor-overlay">
          <div className="shortcode-info bg-blue-500 text-white text-xs px-2 py-1 rounded">
            Feature Grid: {featureList.length} features ({columns} columns)
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureGridShortcode;