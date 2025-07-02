import React from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Globe, 
  MessageCircle,
  ExternalLink,
  Calendar,
  Users
} from 'lucide-react';

interface ContactDetail {
  id: string;
  type: 'address' | 'phone' | 'email' | 'hours' | 'website' | 'social';
  label: string;
  value: string;
  description?: string;
  icon?: React.ReactNode;
  link?: string;
  highlight?: boolean;
}

interface SocialLink {
  platform: string;
  url: string;
  icon?: React.ReactNode;
}

interface ContactInfoProps {
  title?: string;
  subtitle?: string;
  description?: string;
  contactDetails?: ContactDetail[];
  socialLinks?: SocialLink[];
  showBusinessHours?: boolean;
  showMap?: boolean;
  layout?: 'grid' | 'list' | 'cards';
  backgroundColor?: string;
  className?: string;
}

export const ContactInfo: React.FC<ContactInfoProps> = ({
  title = '연락처 정보',
  subtitle,
  description = '언제든 편리한 방법으로 연락해 주세요. 빠르고 정확한 답변을 드리겠습니다.',
  contactDetails,
  socialLinks = [
    { platform: 'LinkedIn', url: '#', icon: <ExternalLink className="w-4 h-4" /> },
    { platform: 'Twitter', url: '#', icon: <ExternalLink className="w-4 h-4" /> },
    { platform: 'Facebook', url: '#', icon: <ExternalLink className="w-4 h-4" /> }
  ],
  showBusinessHours = true,
  showMap = false,
  layout = 'grid',
  backgroundColor = 'bg-primary',
  className = ''
}) => {
  const defaultContactDetails: ContactDetail[] = [
    {
      id: '1',
      type: 'address',
      label: '주소',
      value: '서울특별시 강남구 테헤란로 123',
      description: '지하철 2호선 강남역 2번 출구 도보 5분',
      icon: <MapPin className="w-5 h-5" />,
      highlight: true
    },
    {
      id: '2',
      type: 'phone',
      label: '전화번호',
      value: '02-1234-5678',
      description: '평일 09:00 - 18:00',
      icon: <Phone className="w-5 h-5" />,
      link: 'tel:02-1234-5678'
    },
    {
      id: '3',
      type: 'email',
      label: '이메일',
      value: 'contact@company.com',
      description: '24시간 접수 가능',
      icon: <Mail className="w-5 h-5" />,
      link: 'mailto:contact@company.com'
    },
    {
      id: '4',
      type: 'hours',
      label: '운영시간',
      value: '평일 09:00 - 18:00',
      description: '주말 및 공휴일 휴무',
      icon: <Clock className="w-5 h-5" />
    }
  ];

  const details = contactDetails || defaultContactDetails;

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'address':
        return <MapPin className="w-5 h-5" />;
      case 'phone':
        return <Phone className="w-5 h-5" />;
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'hours':
        return <Clock className="w-5 h-5" />;
      case 'website':
        return <Globe className="w-5 h-5" />;
      default:
        return <MessageCircle className="w-5 h-5" />;
    }
  };

  const renderContactDetail = (detail: ContactDetail) => {
    const icon = detail.icon || getContactIcon(detail.type);
    const content = (
      <div className={`${layout === 'cards' ? 'card p-6 rounded-lg' : 'flex items-start gap-4'} ${detail.highlight ? 'ring-2 ring-accent-primary' : ''}`}>
        <div className={`${layout === 'cards' ? 'w-12 h-12 bg-accent-primary/10 text-accent-primary rounded-lg flex items-center justify-center mb-4' : 'flex-shrink-0 w-10 h-10 bg-accent-primary/10 text-accent-primary rounded-lg flex items-center justify-center'}`}>
          {icon}
        </div>
        
        <div className={layout === 'cards' ? '' : 'flex-1'}>
          <h3 className={`font-semibold mb-1 ${layout === 'cards' ? 'text-lg' : ''}`}>
            {detail.label}
          </h3>
          
          <div className="text-lg font-medium mb-2">
            {detail.link ? (
              <a 
                href={detail.link}
                className="text-accent-primary hover:underline"
                target={detail.type === 'email' || detail.type === 'website' ? '_blank' : undefined}
                rel={detail.type === 'website' ? 'noopener noreferrer' : undefined}
              >
                {detail.value}
              </a>
            ) : (
              <span>{detail.value}</span>
            )}
          </div>
          
          {detail.description && (
            <p className="text-secondary text-sm">
              {detail.description}
            </p>
          )}
        </div>
      </div>
    );

    return (
      <div key={detail.id}>
        {content}
      </div>
    );
  };

  const renderLayout = () => {
    if (layout === 'list') {
      return (
        <div className="space-y-6">
          {details.map(renderContactDetail)}
        </div>
      );
    }

    if (layout === 'cards') {
      return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {details.map(renderContactDetail)}
        </div>
      );
    }

    return (
      <div className="grid md:grid-cols-2 gap-8">
        {details.map(renderContactDetail)}
      </div>
    );
  };

  return (
    <section className={`contact-info py-16 md:py-24 ${backgroundColor} ${className}`}>
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
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

          {/* Contact Details */}
          <div className="mb-12">
            {renderLayout()}
          </div>

          {/* Business Hours (if enabled) */}
          {showBusinessHours && (
            <div className="mb-12">
              <div className="card p-8 rounded-2xl shadow-theme">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Clock className="w-6 h-6 text-accent-primary" />
                      영업시간
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>월요일 - 금요일</span>
                        <span className="font-medium">09:00 - 18:00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>토요일</span>
                        <span className="font-medium">10:00 - 15:00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>일요일 / 공휴일</span>
                        <span className="text-red-500 font-medium">휴무</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="inline-block p-6 bg-accent-primary/5 rounded-xl">
                      <Calendar className="w-8 h-8 text-accent-primary mx-auto mb-2" />
                      <div className="text-sm text-secondary mb-2">현재 상태</div>
                      <div className="font-semibold text-green-600">영업 중</div>
                      <div className="text-xs text-secondary mt-1">18:00에 마감</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Social Links & Additional Info */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Social Media */}
            {socialLinks.length > 0 && (
              <div className="card p-6 rounded-lg">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent-primary" />
                  소셜 미디어
                </h3>
                <div className="flex gap-4">
                  {socialLinks.map((social) => (
                    <a
                      key={social.platform}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-accent-primary/10 text-accent-primary rounded-lg hover:bg-accent-primary hover:text-white transition-colors"
                    >
                      {social.icon}
                      <span className="text-sm">{social.platform}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency Contact */}
            <div className="card p-6 rounded-lg">
              <h3 className="font-bold mb-4 text-red-600">🚨 긴급 연락처</h3>
              <p className="text-secondary text-sm mb-3">
                시스템 장애나 긴급 상황 시 24시간 대응 가능합니다.
              </p>
              <a 
                href="tel:010-9999-9999"
                className="inline-flex items-center gap-2 text-red-600 font-medium hover:underline"
              >
                <Phone className="w-4 h-4" />
                010-9999-9999
              </a>
            </div>
          </div>

          {/* Map Placeholder (if enabled) */}
          {showMap && (
            <div className="mt-12">
              <div className="card p-4 rounded-lg">
                <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-2" />
                    <p>지도가 여기에 표시됩니다</p>
                    <p className="text-sm">Google Maps 또는 Kakao Map 연동</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};