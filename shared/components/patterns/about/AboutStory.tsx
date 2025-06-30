import React from 'react';
import { Calendar, Users, Award, Zap } from 'lucide-react';

interface TimelineEvent {
  id: string;
  year: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  image?: string;
  highlight?: boolean;
}

interface AboutStoryProps {
  title?: string;
  subtitle?: string;
  description?: string;
  storyText?: string;
  timeline?: TimelineEvent[];
  layout?: 'timeline' | 'story' | 'mixed';
  backgroundColor?: string;
  className?: string;
}

export const AboutStory: React.FC<AboutStoryProps> = ({
  title = '우리의 이야기',
  subtitle,
  description = '작은 아이디어에서 시작되어 오늘날의 성공까지, 우리의 여정을 소개합니다.',
  storyText,
  timeline = [
    {
      id: '1',
      year: '2020',
      title: '시작',
      description: '작은 사무실에서 3명의 창립자가 함께 시작했습니다.',
      icon: <Zap className="w-5 h-5" />
    },
    {
      id: '2',
      year: '2021',
      title: '첫 번째 성과',
      description: '첫 번째 제품 출시와 함께 100명의 고객을 확보했습니다.',
      icon: <Award className="w-5 h-5" />
    },
    {
      id: '3',
      year: '2022',
      title: '팀 확장',
      description: '20명의 전문가로 팀을 확장하고 새로운 오피스로 이전했습니다.',
      icon: <Users className="w-5 h-5" />,
      highlight: true
    },
    {
      id: '4',
      year: '2024',
      title: '글로벌 진출',
      description: '해외 시장 진출과 함께 10,000명의 고객을 달성했습니다.',
      icon: <Calendar className="w-5 h-5" />
    }
  ],
  layout = 'mixed',
  backgroundColor = 'bg-primary',
  className = ''
}) => {
  const defaultStoryText = `
    2020년, 세 명의 친구가 작은 카페에서 나눈 대화에서 모든 것이 시작되었습니다. 
    "더 나은 방법이 있을 것"이라는 단순한 믿음으로 시작된 우리의 여정은 
    오늘날 수많은 고객들에게 가치를 제공하는 회사로 성장했습니다.
    
    우리는 기술이 사람들의 삶을 더 편리하고 의미있게 만들 수 있다고 믿습니다. 
    매일 이 믿음을 바탕으로 더 나은 제품과 서비스를 만들기 위해 노력하고 있습니다.
  `;

  const renderTimeline = () => (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-accent-primary/30 transform md:-translate-x-0.5"></div>
      
      <div className="space-y-12">
        {timeline.map((event, index) => (
          <div
            key={event.id}
            className={`relative flex items-center ${
              index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
            }`}
          >
            {/* Timeline Node */}
            <div className="absolute left-8 md:left-1/2 w-4 h-4 bg-accent-primary rounded-full transform -translate-x-2 md:-translate-x-2 z-10 border-4 border-primary">
              {event.highlight && (
                <div className="absolute inset-0 bg-accent-primary rounded-full animate-ping opacity-30"></div>
              )}
            </div>

            {/* Content */}
            <div className={`w-full md:w-1/2 ${index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'} ml-16 md:ml-0`}>
              <div className={`card p-6 rounded-lg shadow-theme ${event.highlight ? 'ring-2 ring-accent-primary' : ''}`}>
                {/* Year Badge */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-block px-3 py-1 bg-accent-primary text-white text-sm font-bold rounded-full">
                    {event.year}
                  </span>
                  {event.icon && (
                    <div className="w-8 h-8 bg-accent-primary/10 text-accent-primary rounded-lg flex items-center justify-center">
                      {event.icon}
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-bold mb-3">{event.title}</h3>
                <p className="text-secondary leading-relaxed">{event.description}</p>
                
                {event.image && (
                  <div className="mt-4 rounded-lg overflow-hidden">
                    <img src={event.image} alt={event.title} className="w-full h-32 object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStory = () => (
    <div className="max-w-4xl mx-auto">
      <div className="prose prose-lg mx-auto">
        <div className="text-lg leading-relaxed text-secondary space-y-6">
          {(storyText || defaultStoryText).split('\n\n').map((paragraph, index) => (
            <p key={index} className="mb-6">
              {paragraph.trim()}
            </p>
          ))}
        </div>
      </div>
      
      {/* Story Image */}
      <div className="mt-12 grid md:grid-cols-2 gap-8 items-center">
        <div className="order-2 md:order-1">
          <img
            src="/api/placeholder/500/400"
            alt="우리의 사무실"
            className="w-full h-64 md:h-80 object-cover rounded-lg shadow-theme"
          />
        </div>
        <div className="order-1 md:order-2">
          <div className="bg-accent-primary/5 p-8 rounded-lg">
            <h3 className="text-2xl font-bold mb-4">우리의 가치</h3>
            <ul className="space-y-3 text-secondary">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-accent-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>고객 중심의 혁신적 사고</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-accent-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>지속 가능한 성장과 발전</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-accent-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>팀워크와 상호 존중</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-accent-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>사회적 책임과 기여</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section className={`about-story py-16 md:py-24 ${backgroundColor} ${className}`}>
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          {subtitle && (
            <div className="mb-4">
              <span className="inline-block px-4 py-2 bg-accent-primary/10 text-accent-primary text-sm font-medium rounded-full">
                {subtitle}
              </span>
            </div>
          )}
          
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {title}
          </h2>
          
          {description && (
            <p className="text-lg text-secondary max-w-3xl mx-auto leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Content */}
        {layout === 'timeline' && renderTimeline()}
        {layout === 'story' && renderStory()}
        {layout === 'mixed' && (
          <div className="space-y-20">
            {renderStory()}
            <div>
              <h3 className="text-2xl font-bold text-center mb-12">주요 성장 과정</h3>
              {renderTimeline()}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};