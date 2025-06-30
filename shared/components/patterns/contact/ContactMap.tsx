import React from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Car, 
  Train, 
  Navigation,
  ExternalLink
} from 'lucide-react';

interface LocationInfo {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  hours?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface TransportInfo {
  type: 'subway' | 'bus' | 'parking';
  description: string;
  icon?: React.ReactNode;
}

interface ContactMapProps {
  title?: string;
  subtitle?: string;
  description?: string;
  location: LocationInfo;
  transportInfo?: TransportInfo[];
  mapProvider?: 'google' | 'kakao' | 'placeholder';
  mapHeight?: string;
  showDirections?: boolean;
  backgroundColor?: string;
  className?: string;
}

export const ContactMap: React.FC<ContactMapProps> = ({
  title = '찾아오시는 길',
  subtitle,
  description = '편리한 교통편으로 쉽게 찾아오실 수 있습니다.',
  location,
  transportInfo = [
    {
      type: 'subway',
      description: '지하철 2호선 강남역 2번 출구 도보 5분',
      icon: <Train className="w-5 h-5" />
    },
    {
      type: 'bus',
      description: '강남역 버스정류장 하차 (146, 740, 8001)',
      icon: <Navigation className="w-5 h-5" />
    },
    {
      type: 'parking',
      description: '건물 지하 1~3층 주차장 이용 가능 (2시간 무료)',
      icon: <Car className="w-5 h-5" />
    }
  ],
  mapProvider = 'placeholder',
  mapHeight = '400px',
  showDirections = true,
  backgroundColor = 'bg-secondary',
  className = ''
}) => {
  const handleDirections = () => {
    if (location.coordinates) {
      // Google Maps directions
      const url = `https://www.google.com/maps/dir/?api=1&destination=${location.coordinates.lat},${location.coordinates.lng}`;
      window.open(url, '_blank');
    } else {
      // Fallback to address search
      const encodedAddress = encodeURIComponent(location.address);
      const url = `https://www.google.com/maps/search/${encodedAddress}`;
      window.open(url, '_blank');
    }
  };

  const renderMap = () => {
    if (mapProvider === 'placeholder') {
      return (
        <div 
          className="w-full bg-gray-200 rounded-lg flex items-center justify-center text-gray-500"
          style={{ height: mapHeight }}
        >
          <div className="text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{location.name}</h3>
            <p className="text-sm">{location.address}</p>
            <button
              onClick={handleDirections}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              지도에서 보기
            </button>
          </div>
        </div>
      );
    }

    // Real map implementation would go here
    return (
      <div 
        className="w-full bg-gray-100 rounded-lg"
        style={{ height: mapHeight }}
      >
        {/* Google Maps or Kakao Map iframe would be inserted here */}
        <iframe
          src={`https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(location.address)}`}
          width="100%"
          height="100%"
          style={{ border: 0, borderRadius: '8px' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    );
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'subway':
        return <Train className="w-5 h-5" />;
      case 'bus':
        return <Navigation className="w-5 h-5" />;
      case 'parking':
        return <Car className="w-5 h-5" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  const getTransportColor = (type: string) => {
    switch (type) {
      case 'subway':
        return 'text-blue-600 bg-blue-100';
      case 'bus':
        return 'text-green-600 bg-green-100';
      case 'parking':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <section className={`contact-map py-16 md:py-24 ${backgroundColor} ${className}`}>
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
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

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Map */}
            <div>
              {renderMap()}
              
              {/* Directions Button */}
              {showDirections && (
                <div className="mt-4 text-center">
                  <button
                    onClick={handleDirections}
                    className="inline-flex items-center gap-2 px-6 py-3 btn-theme-primary rounded-lg font-medium transition-colors"
                  >
                    <Navigation className="w-5 h-5" />
                    길찾기
                  </button>
                </div>
              )}
            </div>

            {/* Location Info */}
            <div className="space-y-6">
              {/* Main Location Info */}
              <div className="card p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-accent-primary" />
                  {location.name}
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-secondary mt-0.5" />
                    <div>
                      <div className="font-medium">주소</div>
                      <div className="text-secondary">{location.address}</div>
                    </div>
                  </div>
                  
                  {location.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-secondary" />
                      <div>
                        <div className="font-medium">전화번호</div>
                        <a 
                          href={`tel:${location.phone}`}
                          className="text-accent-primary hover:underline"
                        >
                          {location.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {location.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-secondary" />
                      <div>
                        <div className="font-medium">이메일</div>
                        <a 
                          href={`mailto:${location.email}`}
                          className="text-accent-primary hover:underline"
                        >
                          {location.email}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {location.hours && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-secondary" />
                      <div>
                        <div className="font-medium">운영시간</div>
                        <div className="text-secondary">{location.hours}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transportation Info */}
              <div className="card p-6 rounded-lg">
                <h3 className="text-lg font-bold mb-4">🚇 교통편 안내</h3>
                <div className="space-y-4">
                  {transportInfo.map((transport, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTransportColor(transport.type)}`}>
                        {transport.icon || getTransportIcon(transport.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">
                          {transport.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-accent-primary/5 rounded-lg">
                  <div className="text-2xl font-bold text-accent-primary">5분</div>
                  <div className="text-sm text-secondary">지하철역에서</div>
                </div>
                <div className="text-center p-4 bg-accent-primary/5 rounded-lg">
                  <div className="text-2xl font-bold text-accent-primary">무료</div>
                  <div className="text-sm text-secondary">2시간 주차</div>
                </div>
              </div>

              {/* Visit Tips */}
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                <h4 className="font-medium text-yellow-800 mb-2">💡 방문 팁</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 평일 오후 시간대는 교통이 혼잡할 수 있습니다</li>
                  <li>• 건물 1층 로비에서 방문증을 발급받아 주세요</li>
                  <li>• 주차장 입구는 건물 측면에 위치해 있습니다</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};