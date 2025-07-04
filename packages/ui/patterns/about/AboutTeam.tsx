import React from 'react';
import { Linkedin, Twitter, Mail, MapPin } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  description?: string;
  avatar: string;
  location?: string;
  social?: {
    linkedin?: string;
    twitter?: string;
    email?: string;
  };
}

interface AboutTeamProps {
  title?: string;
  subtitle?: string;
  description?: string;
  teamMembers: TeamMember[];
  columns?: 2 | 3 | 4;
  showSocial?: boolean;
  showLocation?: boolean;
  backgroundColor?: string;
  className?: string;
}

export const AboutTeam: React.FC<AboutTeamProps> = ({
  title = '우리 팀',
  subtitle,
  description = '열정적이고 전문적인 팀원들을 소개합니다.',
  teamMembers,
  columns = 3,
  showSocial = true,
  showLocation = false,
  backgroundColor = 'bg-secondary',
  className = ''
}) => {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <section className={`about-team py-16 md:py-24 ${backgroundColor} ${className}`}>
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

        {/* Team Grid */}
        <div className={`grid grid-cols-1 ${gridCols[columns]} gap-8`}>
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="group text-center"
            >
              {/* Avatar */}
              <div className="relative mb-6">
                <div className="relative inline-block">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover mx-auto shadow-theme transition-transform duration-300 group-hover:scale-105"
                  />
                  
                  {/* Hover Overlay */}
                  {showSocial && member.social && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 rounded-full transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-3">
                        {member.social.linkedin && (
                          <a
                            href={member.social.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 bg-white text-gray-700 rounded-full flex items-center justify-center hover:bg-accent-primary hover:text-white transition-colors"
                          >
                            <Linkedin className="w-4 h-4" />
                          </a>
                        )}
                        {member.social.twitter && (
                          <a
                            href={member.social.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 bg-white text-gray-700 rounded-full flex items-center justify-center hover:bg-accent-primary hover:text-white transition-colors"
                          >
                            <Twitter className="w-4 h-4" />
                          </a>
                        )}
                        {member.social.email && (
                          <a
                            href={`mailto:${member.social.email}`}
                            className="w-10 h-10 bg-white text-gray-700 rounded-full flex items-center justify-center hover:bg-accent-primary hover:text-white transition-colors"
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Member Info */}
              <div>
                <h3 className="text-xl font-bold mb-2">
                  {member.name}
                </h3>
                
                <p className="text-accent-primary font-medium mb-3">
                  {member.role}
                </p>
                
                {member.description && (
                  <p className="text-secondary text-sm leading-relaxed mb-4">
                    {member.description}
                  </p>
                )}
                
                {showLocation && member.location && (
                  <div className="flex items-center justify-center gap-1 text-secondary text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{member.location}</span>
                  </div>
                )}
              </div>

              {/* Social Links (Mobile) */}
              {showSocial && member.social && (
                <div className="mt-4 flex justify-center gap-3 md:hidden">
                  {member.social.linkedin && (
                    <a
                      href={member.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 bg-accent-primary/10 text-accent-primary rounded-full flex items-center justify-center hover:bg-accent-primary hover:text-white transition-colors"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                  {member.social.twitter && (
                    <a
                      href={member.social.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 bg-accent-primary/10 text-accent-primary rounded-full flex items-center justify-center hover:bg-accent-primary hover:text-white transition-colors"
                    >
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {member.social.email && (
                    <a
                      href={`mailto:${member.social.email}`}
                      className="w-8 h-8 bg-accent-primary/10 text-accent-primary rounded-full flex items-center justify-center hover:bg-accent-primary hover:text-white transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="inline-block p-8 card rounded-2xl shadow-theme">
            <h3 className="text-xl font-bold mb-4">팀에 합류하세요!</h3>
            <p className="text-secondary mb-6">
              우리와 함께 놀라운 프로젝트를 만들어가실 분을 찾고 있습니다.
            </p>
            <button className="btn-theme-primary px-6 py-3 rounded-lg font-semibold transition-colors">
              채용 정보 보기
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};