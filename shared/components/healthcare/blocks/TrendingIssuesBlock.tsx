import React, { useState } from 'react';
import { TrendingBlockData } from '../types';
import { TrendingIssue, trendingIssues, recommendedProducts } from '../sampleData';
import { Button, Card, CardContent, CardHeader } from '@o4o/shared/ui';
import { Edit2, TrendingUp, Eye, ChevronRight } from 'lucide-react';

interface TrendingIssuesBlockProps {
  data: TrendingBlockData;
  isEditing: boolean;
  onEdit?: (data: TrendingBlockData) => void;
}

export const TrendingIssuesBlock: React.FC<TrendingIssuesBlockProps> = ({
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

  // Get trending items based on IDs
  const trendingItems = data.issueIds
    .map(id => trendingIssues.find(issue => issue.id === id))
    .filter(Boolean) as TrendingIssue[];

  const renderTrendingCard = (issue: TrendingIssue) => {
    const relatedProducts = issue.relatedProducts
      ?.map(id => recommendedProducts.find(p => p.id === id))
      .filter(Boolean)
      .slice(0, 3);

    return (
      <Card key={issue.id} className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
        <div className="relative aspect-[16/9] overflow-hidden">
          <img
            src={issue.image}
            alt={issue.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            트렌딩
          </div>
          <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {issue.views.toLocaleString()}
          </div>
        </div>
        
        <CardHeader>
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
            {issue.title}
          </h3>
        </CardHeader>
        
        <CardContent className="pt-0">
          <p className="text-gray-600 mb-4 line-clamp-2">{issue.description}</p>
          
          {data.showRelatedProducts && relatedProducts && relatedProducts.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">연관 제품</p>
              <div className="space-y-2">
                {relatedProducts.map(product => (
                  <div key={product.id} className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded transition-colors">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.brand}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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
        
        <h3 className="text-lg font-semibold mb-6">트렌딩 이슈 편집</h3>
        
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
            </select>
          </div>
          
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.showRelatedProducts}
                onChange={(e) => setFormData({ ...formData, showRelatedProducts: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium">연관 제품 표시</span>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">트렌딩 이슈 선택</label>
            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
              {trendingIssues.map(issue => (
                <label key={issue.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.issueIds.includes(issue.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          issueIds: [...formData.issueIds, issue.id]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          issueIds: formData.issueIds.filter(id => id !== issue.id)
                        });
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{issue.title}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="py-12 md:py-16 lg:py-20 bg-gray-50">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {trendingItems.map(renderTrendingCard)}
          </div>
        )}
        
        {data.layout === 'carousel' && (
          <div className="relative">
            <div className="flex gap-6 overflow-x-auto scrollbar-hide">
              {trendingItems.map(issue => (
                <div key={issue.id} className="flex-shrink-0 w-full md:w-1/2 lg:w-1/2">
                  {renderTrendingCard(issue)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};