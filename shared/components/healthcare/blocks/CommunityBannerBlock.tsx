import React, { useState } from 'react';
import { CommunityBannerBlockData } from '../types';
import { communityBanner } from '../sampleData';
import { Button, Card, CardContent } from '@o4o/shared/ui';
import { Edit2, MessageSquare, Users, Eye, HelpCircle, ArrowRight } from 'lucide-react';

interface CommunityBannerBlockProps {
  data: CommunityBannerBlockData;
  isEditing: boolean;
  onEdit?: (data: CommunityBannerBlockData) => void;
}

export const CommunityBannerBlock: React.FC<CommunityBannerBlockProps> = ({
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
        
        <h3 className="text-lg font-semibold mb-6">커뮤니티 배너 편집</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">배너 위치</label>
            <select
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="header">헤더 영역</option>
              <option value="top">상단</option>
              <option value="middle">중간</option>
              <option value="bottom">하단</option>
            </select>
          </div>
          
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.showRecentQA}
                onChange={(e) => setFormData({ ...formData, showRecentQA: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium">최근 Q&A 표시</span>
            </label>
          </div>
          
          {formData.showRecentQA && (
            <div>
              <label className="block text-sm font-medium mb-1">Q&A 표시 개수</label>
              <input
                type="number"
                value={formData.qaCount}
                onChange={(e) => setFormData({ ...formData, qaCount: parseInt(e.target.value) })}
                min={1}
                max={10}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  const positionClasses = {
    header: 'py-4 md:py-6',
    top: 'py-8 md:py-12',
    middle: 'py-12 md:py-16',
    bottom: 'py-8 md:py-12'
  };

  const backgroundClasses = {
    header: 'bg-white border-b',
    top: 'bg-purple-50',
    middle: 'bg-gradient-to-r from-purple-500 to-indigo-600',
    bottom: 'bg-gray-50'
  };

  const textColorClasses = {
    header: 'text-gray-900',
    top: 'text-purple-900',
    middle: 'text-white',
    bottom: 'text-gray-900'
  };

  return (
    <section className={`${positionClasses[data.position]} ${backgroundClasses[data.position]}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            {isEditing && (
              <Button
                onClick={() => setEditMode(true)}
                size="sm"
                variant="outline"
                className={data.position === 'middle' ? 'text-white border-white hover:bg-white hover:text-purple-600' : ''}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                편집
              </Button>
            )}
          </div>
        </div>
        
        <Card className={`overflow-hidden ${data.position === 'middle' ? 'bg-white/10 backdrop-blur-sm border-white/20' : ''}`}>
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-1 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                  <div className={`p-3 rounded-full ${data.position === 'middle' ? 'bg-white/20' : 'bg-purple-100'}`}>
                    <Users className={`w-8 h-8 ${data.position === 'middle' ? 'text-white' : 'text-purple-600'}`} />
                  </div>
                  <h2 className={`text-2xl md:text-3xl font-bold ${data.position === 'middle' ? 'text-white' : textColorClasses[data.position]}`}>
                    {communityBanner.title}
                  </h2>
                </div>
                
                <p className={`text-lg md:text-xl mb-6 ${data.position === 'middle' ? 'text-white/90' : 'text-gray-600'}`}>
                  {communityBanner.subtitle}
                </p>
                
                <Button
                  size="lg"
                  className={`px-8 py-3 text-lg ${
                    data.position === 'middle' 
                      ? 'bg-white text-purple-600 hover:bg-gray-100' 
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                  onClick={() => window.location.href = communityBanner.link}
                >
                  {communityBanner.ctaText}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
              
              {data.showRecentQA && communityBanner.recentQA && (
                <div className="w-full lg:w-96">
                  <h3 className={`text-lg font-semibold mb-4 ${data.position === 'middle' ? 'text-white' : textColorClasses[data.position]}`}>
                    최근 인기 질문
                  </h3>
                  <div className="space-y-3">
                    {communityBanner.recentQA.slice(0, data.qaCount).map(qa => (
                      <div
                        key={qa.id}
                        className={`p-4 rounded-lg cursor-pointer transition-colors ${
                          data.position === 'middle' 
                            ? 'bg-white/10 hover:bg-white/20 border border-white/20' 
                            : 'bg-white hover:bg-gray-50 border'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <HelpCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            data.position === 'middle' ? 'text-white/80' : 'text-purple-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium mb-2 line-clamp-2 ${
                              data.position === 'middle' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {qa.question}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className={`flex items-center gap-1 ${
                                data.position === 'middle' ? 'text-white/70' : 'text-gray-500'
                              }`}>
                                <MessageSquare className="w-4 h-4" />
                                답변 {qa.answerCount}개
                              </span>
                              <span className={`flex items-center gap-1 ${
                                data.position === 'middle' ? 'text-white/70' : 'text-gray-500'
                              }`}>
                                <Eye className="w-4 h-4" />
                                {qa.views}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};