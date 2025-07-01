import React, { useState } from 'react';
import { ExpertContentBlockData } from '../types';
import { ExpertContent, expertContents } from '../sampleData';
import { Button, Card, CardContent, CardHeader } from '@o4o/shared/ui';
import { Edit2, CheckCircle, Clock, Eye, Heart, ChevronLeft, ChevronRight } from 'lucide-react';

interface ExpertContentBlockProps {
  data: ExpertContentBlockData;
  isEditing: boolean;
  onEdit?: (data: ExpertContentBlockData) => void;
}

export const ExpertContentBlock: React.FC<ExpertContentBlockProps> = ({
  data,
  isEditing,
  onEdit
}) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(data);
  const [currentSlide, setCurrentSlide] = useState(0);

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

  // Get content items based on IDs
  const contentItems = data.contentIds
    .map(id => expertContents.find(content => content.id === id))
    .filter(Boolean) as ExpertContent[];

  const renderContentCard = (content: ExpertContent) => (
    <Card key={content.id} className="h-full hover:shadow-lg transition-shadow cursor-pointer">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={content.thumbnail}
          alt={content.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2">
          <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
            {content.category === 'health' ? '건강' : 
             content.category === 'beauty' ? '뷰티' :
             content.category === 'fitness' ? '피트니스' : '여성건강'}
          </span>
        </div>
      </div>
      
      <CardHeader className="pb-3">
        <h3 className="font-semibold text-lg line-clamp-2">{content.title}</h3>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{content.summary}</p>
        
        <div className="flex items-center gap-3 mb-3">
          <img
            src={content.author.profileImage}
            alt={content.author.name}
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <p className="font-medium text-sm">{content.author.name}</p>
              {content.author.verified && (
                <CheckCircle className="w-4 h-4 text-blue-500" />
              )}
            </div>
            <p className="text-xs text-gray-500">{content.author.title}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {content.readTime}분
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {content.views.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {content.likes}
            </span>
          </div>
          <span>{new Date(content.publishedAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );

  const renderCarousel = () => {
    const itemsPerSlide = window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3;
    const totalSlides = Math.ceil(contentItems.length / itemsPerSlide);
    
    return (
      <div className="relative">
        <div className="overflow-hidden">
          <div 
            className="flex transition-transform duration-300"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {Array.from({ length: totalSlides }).map((_, slideIndex) => (
              <div key={slideIndex} className="w-full flex-shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-1">
                  {contentItems
                    .slice(slideIndex * itemsPerSlide, (slideIndex + 1) * itemsPerSlide)
                    .map(renderContentCard)}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {totalSlides > 1 && (
          <>
            <button
              onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
              className="absolute -left-4 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50"
              disabled={currentSlide === 0}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setCurrentSlide(Math.min(totalSlides - 1, currentSlide + 1))}
              className="absolute -right-4 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50"
              disabled={currentSlide === totalSlides - 1}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    );
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
        
        <h3 className="text-lg font-semibold mb-6">전문가 콘텐츠 편집</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">섹션 제목</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">부제목 (선택)</label>
            <input
              type="text"
              value={formData.subtitle || ''}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">레이아웃</label>
            <select
              value={formData.layout}
              onChange={(e) => setFormData({ ...formData, layout: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="grid">그리드</option>
              <option value="carousel">캐러셀</option>
              <option value="list">리스트</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">표시 개수</label>
            <input
              type="number"
              value={formData.showCount}
              onChange={(e) => setFormData({ ...formData, showCount: parseInt(e.target.value) })}
              min={1}
              max={12}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">콘텐츠 선택</label>
            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
              {expertContents.map(content => (
                <label key={content.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.contentIds.includes(content.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          contentIds: [...formData.contentIds, content.id]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          contentIds: formData.contentIds.filter(id => id !== content.id)
                        });
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{content.title}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="py-12 md:py-16 lg:py-20 bg-gray-50" id="expert-content">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{data.title}</h2>
            {data.subtitle && (
              <p className="text-gray-600">{data.subtitle}</p>
            )}
          </div>
          
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
        
        {data.layout === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {contentItems.slice(0, data.showCount).map(renderContentCard)}
          </div>
        )}
        
        {data.layout === 'carousel' && renderCarousel()}
        
        {data.layout === 'list' && (
          <div className="space-y-4">
            {contentItems.slice(0, data.showCount).map(content => (
              <Card key={content.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3 aspect-[4/3] md:aspect-auto">
                    <img
                      src={content.thumbnail}
                      alt={content.title}
                      className="w-full h-full object-cover rounded-t-lg md:rounded-l-lg md:rounded-t-none"
                    />
                  </div>
                  <div className="flex-1 p-6">
                    <h3 className="font-semibold text-xl mb-2">{content.title}</h3>
                    <p className="text-gray-600 mb-4">{content.summary}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={content.author.profileImage}
                          alt={content.author.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-sm">{content.author.name}</p>
                            {content.author.verified && (
                              <CheckCircle className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{content.author.title}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {content.readTime}분
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {content.views.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {content.likes}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};