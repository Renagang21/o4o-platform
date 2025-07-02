import React from 'react';
import { Quote, Target, Eye, Heart, Lightbulb } from 'lucide-react';

interface Mission {
  id: string;
  type: 'mission' | 'vision' | 'values';
  title: string;
  content: string;
  icon?: React.ReactNode;
  author?: string;
  role?: string;
}

interface AboutMissionProps {
  title?: string;
  subtitle?: string;
  description?: string;
  missions: Mission[];
  layout?: 'cards' | 'quote' | 'split';
  showIcons?: boolean;
  backgroundColor?: string;
  className?: string;
}

export const AboutMission: React.FC<AboutMissionProps> = ({
  title = '우리의 사명과 비전',
  subtitle,
  description = '우리가 추구하는 가치와 미래에 대한 비전을 소개합니다.',
  missions = [
    {
      id: '1',
      type: 'mission',
      title: '사명 (Mission)',
      content: '기술을 통해 사람들의 삶을 더 편리하고 의미있게 만들어, 모든 사람이 자신의 잠재력을 최대한 발휘할 수 있는 세상을 만든다.',
      icon: <Target className="w-6 h-6" />
    },
    {
      id: '2',
      type: 'vision',
      title: '비전 (Vision)',
      content: '2030년까지 전 세계 1억 명의 사람들이 우리의 기술을 통해 더 나은 삶을 살 수 있도록 하여, 글로벌 기술 혁신의 선도기업이 된다.',
      icon: <Eye className="w-6 h-6" />
    },
    {
      id: '3',
      type: 'values',
      title: '핵심 가치 (Values)',
      content: '고객 중심, 혁신적 사고, 지속 가능한 성장, 상호 존중과 협력, 사회적 책임을 바탕으로 모든 의사결정과 행동의 기준으로 삼는다.',
      icon: <Heart className="w-6 h-6" />
    }
  ],
  layout = 'cards',
  showIcons = true,
  backgroundColor = 'bg-secondary',
  className = ''
}) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mission':
        return 'text-blue-600';
      case 'vision':
        return 'text-purple-600';
      case 'values':
        return 'text-green-600';
      default:
        return 'text-accent-primary';
    }
  };

  const getTypeBackground = (type: string) => {
    switch (type) {
      case 'mission':
        return 'bg-blue-100';
      case 'vision':
        return 'bg-purple-100';
      case 'values':
        return 'bg-green-100';
      default:
        return 'bg-accent-primary/10';
    }
  };

  const renderCards = () => (
    <div className="grid md:grid-cols-3 gap-8">
      {missions.map((mission) => (
        <div key={mission.id} className="card p-8 rounded-2xl shadow-theme hover:shadow-lg transition-all duration-300">
          {/* Icon */}
          {showIcons && mission.icon && (
            <div className={`inline-flex items-center justify-center w-16 h-16 ${getTypeBackground(mission.type)} rounded-xl mb-6`}>
              <div className={getTypeColor(mission.type)}>
                {mission.icon}
              </div>
            </div>
          )}
          
          {/* Title */}
          <h3 className="text-xl font-bold mb-4">
            {mission.title}
          </h3>
          
          {/* Content */}
          <p className="text-secondary leading-relaxed">
            {mission.content}
          </p>
          
          {/* Author */}
          {mission.author && (
            <div className="mt-6 pt-6 border-t border-theme">
              <div className="text-sm">
                <div className="font-medium">{mission.author}</div>
                {mission.role && (
                  <div className="text-secondary">{mission.role}</div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderQuote = () => {
    const mainMission = missions.find(m => m.type === 'mission') || missions[0];
    
    return (
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          {/* Quote Icon */}
          <div className="absolute -top-4 -left-4 w-16 h-16 bg-accent-primary/10 text-accent-primary rounded-full flex items-center justify-center">
            <Quote className="w-8 h-8" />
          </div>
          
          {/* Quote Content */}
          <div className="bg-white/50 backdrop-blur-sm p-12 rounded-2xl shadow-theme border border-accent-primary/20">
            <blockquote className="text-2xl md:text-3xl font-light leading-relaxed text-center mb-8">
              "{mainMission.content}"
            </blockquote>
            
            {mainMission.author && (
              <div className="text-center">
                <div className="font-semibold text-lg">{mainMission.author}</div>
                {mainMission.role && (
                  <div className="text-secondary">{mainMission.role}</div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Supporting Values */}
        {missions.length > 1 && (
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            {missions.slice(1).map((mission) => (
              <div key={mission.id} className="text-center p-6">
                {showIcons && mission.icon && (
                  <div className={`inline-flex items-center justify-center w-12 h-12 ${getTypeBackground(mission.type)} rounded-lg mb-4`}>
                    <div className={getTypeColor(mission.type)}>
                      {mission.icon}
                    </div>
                  </div>
                )}
                <h3 className="text-lg font-bold mb-3">{mission.title}</h3>
                <p className="text-secondary">{mission.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSplit = () => {
    const mainMission = missions.find(m => m.type === 'mission') || missions[0];
    const otherMissions = missions.filter(m => m.id !== mainMission.id);
    
    return (
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: Main Mission */}
        <div>
          <div className="mb-8">
            {showIcons && mainMission.icon && (
              <div className={`inline-flex items-center justify-center w-20 h-20 ${getTypeBackground(mainMission.type)} rounded-2xl mb-6`}>
                <div className={getTypeColor(mainMission.type)}>
                  {mainMission.icon}
                </div>
              </div>
            )}
            
            <h3 className="text-2xl font-bold mb-4">{mainMission.title}</h3>
            <p className="text-lg text-secondary leading-relaxed">{mainMission.content}</p>
            
            {mainMission.author && (
              <div className="mt-6 pt-6 border-t border-theme">
                <div className="font-medium">{mainMission.author}</div>
                {mainMission.role && (
                  <div className="text-secondary text-sm">{mainMission.role}</div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Right: Other Missions */}
        <div className="space-y-6">
          {otherMissions.map((mission) => (
            <div key={mission.id} className="card p-6 rounded-lg">
              <div className="flex items-start gap-4">
                {showIcons && mission.icon && (
                  <div className={`flex-shrink-0 w-12 h-12 ${getTypeBackground(mission.type)} rounded-lg flex items-center justify-center`}>
                    <div className={getTypeColor(mission.type)}>
                      {mission.icon}
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="font-bold mb-2">{mission.title}</h4>
                  <p className="text-secondary text-sm">{mission.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className={`about-mission py-16 md:py-24 ${backgroundColor} ${className}`}>
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
        {layout === 'cards' && renderCards()}
        {layout === 'quote' && renderQuote()}
        {layout === 'split' && renderSplit()}

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="inline-block">
            <div className="flex items-center gap-4 p-6 bg-accent-primary/5 rounded-lg">
              <Lightbulb className="w-8 h-8 text-accent-primary" />
              <div className="text-left">
                <div className="font-semibold">함께 만들어가는 미래</div>
                <div className="text-sm text-secondary">우리의 비전에 동참해 주세요</div>
              </div>
              <button className="btn-theme-primary px-6 py-2 rounded-lg font-medium ml-4">
                자세히 보기
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};