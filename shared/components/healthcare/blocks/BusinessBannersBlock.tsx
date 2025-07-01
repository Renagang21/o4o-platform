import React, { useState } from 'react';
import { BusinessBannersBlockData } from '../types';
import { BusinessBanner, businessBanners } from '../sampleData';
import { Button, Card } from '@o4o/shared/ui';
import { Edit2, ArrowRight, Briefcase, Monitor, TrendingUp } from 'lucide-react';

interface BusinessBannersBlockProps {
  data: BusinessBannersBlockData;
  isEditing: boolean;
  onEdit?: (data: BusinessBannersBlockData) => void;
}

export const BusinessBannersBlock: React.FC<BusinessBannersBlockProps> = ({
  data,
  isEditing,
  onEdit
}) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(data);

  const handleSave = () => {
    if (onEdit) {
      onEdit(formData);
    }
    setEditMode(false);
  };

  const handleCancel = () => {
    setFormData(data);
    setEditMode(false);
  };

  // Get banners based on IDs
  const banners = data.bannerIds
    .map(id => businessBanners.find(banner => banner.id === id))
    .filter(Boolean) as BusinessBanner[];

  const getIcon = (type: BusinessBanner['type']) => {
    switch (type) {
      case 'partners':
        return <Briefcase className="w-8 h-8" />;
      case 'signage':
        return <Monitor className="w-8 h-8" />;
      case 'crowdfunding':
        return <TrendingUp className="w-8 h-8" />;
      default:
        return <Briefcase className="w-8 h-8" />;
    }
  };

  const renderBannerCard = (banner: BusinessBanner) => (
    <Card
      key={banner.id}
      className="relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 group"
      style={{
        backgroundColor: banner.backgroundColor,
        color: banner.textColor
      }}
    >
      <div className="p-6 md:p-8 relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="opacity-80">
            {getIcon(banner.type)}
          </div>
          <ArrowRight className="w-6 h-6 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <h3 className="text-xl md:text-2xl font-bold mb-2">{banner.title}</h3>
        <p className="text-base md:text-lg opacity-90 mb-6">{banner.subtitle}</p>
        
        <Button
          variant="outline"
          className="border-current text-current hover:bg-current hover:text-white transition-colors"
          onClick={() => window.location.href = banner.link}
        >
          {banner.ctaText}
        </Button>
      </div>
      
      {banner.image && (
        <div className="absolute inset-0 opacity-10">
          <img
            src={banner.image}
            alt={banner.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20" />
    </Card>
  );

  if (isEditing && editMode) {
    return (
      <div className="relative bg-gray-50 p-8 rounded-lg border-2 border-blue-500">
        <div className="absolute top-4 right-4 flex gap-2">
          <Button onClick={handleSave} size="sm" variant="default">
            저장
          </Button>
          <Button onClick={handleCancel} size="sm" variant="outline">
            취소
          </Button>
        </div>
        
        <h3 className="text-lg font-semibold mb-6">비즈니스 배너 편집</h3>
        
        <div className="space-y-4">
          {data.title && (
            <div>
              <label className="block text-sm font-medium mb-1">섹션 제목 (선택)</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">배너 레이아웃</label>
            <select
              value={formData.layout}
              onChange={(e) => setFormData({ ...formData, layout: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="horizontal">가로 배치</option>
              <option value="vertical">세로 배치</option>
              <option value="mixed">혼합 배치</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">배너 간격</label>
            <select
              value={formData.spacing}
              onChange={(e) => setFormData({ ...formData, spacing: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="compact">좁게</option>
              <option value="normal">보통</option>
              <option value="relaxed">넓게</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">표시할 배너 선택</label>
            <div className="border rounded-lg p-4 space-y-2">
              {businessBanners.map(banner => (
                <label key={banner.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.bannerIds.includes(banner.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          bannerIds: [...formData.bannerIds, banner.id]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          bannerIds: formData.bannerIds.filter(id => id !== banner.id)
                        });
                      }
                    }}
                    className="rounded"
                  />
                  <div className="flex items-center gap-2">
                    {getIcon(banner.type)}
                    <span className="text-sm">{banner.title}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const spacingClass = {
    compact: 'gap-4',
    normal: 'gap-6',
    relaxed: 'gap-8'
  };

  return (
    <section className="py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4">
        {data.title && (
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold">{data.title}</h2>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1">
            {isEditing && (
              <Button
                onClick={() => setEditMode(true)}
                size="sm"
                variant="outline"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                편집
              </Button>
            )}
          </div>
        </div>
        
        {data.layout === 'horizontal' && (
          <div className={`grid grid-cols-1 md:grid-cols-3 ${spacingClass[data.spacing]}`}>
            {banners.map(renderBannerCard)}
          </div>
        )}
        
        {data.layout === 'vertical' && (
          <div className={`grid grid-cols-1 max-w-md mx-auto ${spacingClass[data.spacing]}`}>
            {banners.map(renderBannerCard)}
          </div>
        )}
        
        {data.layout === 'mixed' && (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${spacingClass[data.spacing]}`}>
            {banners.slice(0, 1).map(banner => (
              <div key={banner.id} className="md:col-span-2 lg:col-span-2">
                {renderBannerCard(banner)}
              </div>
            ))}
            {banners.slice(1).map(renderBannerCard)}
          </div>
        )}
      </div>
    </section>
  );
};