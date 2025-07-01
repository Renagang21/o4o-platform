import React, { useState } from 'react';
import { HeroBlockData } from '../types';
import { Button } from '@o4o/shared/ui';
import { Edit2, Eye, EyeOff, Upload } from 'lucide-react';

interface HeroSectionBlockProps {
  data: HeroBlockData;
  isEditing: boolean;
  onEdit?: (data: HeroBlockData) => void;
}

export const HeroSectionBlock: React.FC<HeroSectionBlockProps> = ({
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

  const handleImageUpload = (field: 'backgroundImage' | 'mobileImage') => {
    // Placeholder for image upload
    const placeholder = field === 'backgroundImage' 
      ? 'https://via.placeholder.com/1920x600?text=New+Hero+Image'
      : 'https://via.placeholder.com/800x600?text=New+Mobile+Image';
    setFormData({ ...formData, [field]: placeholder });
  };

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
        
        <h3 className="text-lg font-semibold mb-6">히어로 섹션 편집</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">제목</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">부제목</label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">CTA 버튼 텍스트</label>
              <input
                type="text"
                value={formData.ctaText}
                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">CTA 링크</label>
              <input
                type="text"
                value={formData.ctaLink}
                onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">배경 이미지</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.backgroundImage}
                  onChange={(e) => setFormData({ ...formData, backgroundImage: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  onClick={() => handleImageUpload('backgroundImage')}
                  size="sm"
                  variant="outline"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">모바일 이미지</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.mobileImage || ''}
                  onChange={(e) => setFormData({ ...formData, mobileImage: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  onClick={() => handleImageUpload('mobileImage')}
                  size="sm"
                  variant="outline"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {isEditing && (
        <div className="absolute top-4 right-4 z-10">
          <Button
            onClick={() => setEditMode(true)}
            size="sm"
            variant="secondary"
            className="bg-white/90 backdrop-blur-sm"
          >
            <Edit2 className="w-4 h-4 mr-1" />
            편집
          </Button>
        </div>
      )}
      
      <div 
        className="relative min-h-[400px] md:min-h-[500px] lg:min-h-[600px] flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, ${data.overlayOpacity || 0.4}), rgba(0, 0, 0, ${data.overlayOpacity || 0.4})), url(${data.backgroundImage})`
        }}
      >
        <div className="container mx-auto px-4 py-16 md:py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {data.title}
            </h1>
            <h2 className="text-xl md:text-2xl lg:text-3xl mb-6">
              {data.subtitle}
            </h2>
            <p className="text-base md:text-lg lg:text-xl mb-8 opacity-90">
              {data.description}
            </p>
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
              onClick={() => window.location.href = data.ctaLink}
            >
              {data.ctaText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};