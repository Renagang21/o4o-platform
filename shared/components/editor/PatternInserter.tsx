import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Grid, 
  Layout, 
  Image, 
  Type, 
  ChevronDown,
  Eye,
  Insert,
  Users,
  MessageCircle
} from 'lucide-react';
import { heroPatterns } from '../patterns/hero';
import { aboutPatterns } from '../patterns/about';
import { contactPatterns } from '../patterns/contact';
import { servicesPatterns } from '../patterns/services';

interface Pattern {
  id: string;
  name: string;
  description: string;
  component: string;
  category: string;
  preview: string;
  defaultProps: any;
}

interface PatternInserterProps {
  onInsertPattern: (pattern: Pattern) => void;
  className?: string;
}

const allPatterns: Pattern[] = [
  ...heroPatterns,
  ...aboutPatterns,
  ...contactPatterns,
  ...servicesPatterns
];

const categories = [
  { id: 'all', name: '전체', icon: <Grid className="w-4 h-4" /> },
  { id: 'hero', name: 'Hero 섹션', icon: <Layout className="w-4 h-4" /> },
  { id: 'about', name: 'About 섹션', icon: <Users className="w-4 h-4" /> },
  { id: 'contact', name: 'Contact 섹션', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'services', name: 'Services 섹션', icon: <Type className="w-4 h-4" /> }
];

export const PatternInserter: React.FC<PatternInserterProps> = ({
  onInsertPattern,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewPattern, setPreviewPattern] = useState<Pattern | null>(null);

  const filteredPatterns = allPatterns.filter(pattern => {
    const matchesCategory = selectedCategory === 'all' || pattern.category === selectedCategory;
    const matchesSearch = pattern.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pattern.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleInsertPattern = (pattern: Pattern) => {
    onInsertPattern(pattern);
    setIsOpen(false);
    setPreviewPattern(null);
  };

  return (
    <div className={`pattern-inserter relative ${className}`}>
      {/* Insert Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        패턴 삽입
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Pattern Library Modal */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-96 bg-white rounded-lg shadow-xl border z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold mb-3">패턴 라이브러리</h3>
              
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="패턴 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Categories */}
              <div className="flex gap-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {category.icon}
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Pattern Grid */}
            <div className="p-4 max-h-80 overflow-y-auto">
              {filteredPatterns.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {filteredPatterns.map((pattern) => (
                    <div
                      key={pattern.id}
                      className="group border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer"
                    >
                      {/* Pattern Preview */}
                      <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-xs text-gray-500 text-center">
                            <Layout className="w-6 h-6 mx-auto mb-1" />
                            <span>{pattern.name}</span>
                          </div>
                        </div>
                        
                        {/* Hover Actions */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewPattern(pattern);
                              }}
                              className="p-2 bg-white text-gray-700 rounded-md shadow-lg hover:bg-gray-50"
                              title="미리보기"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInsertPattern(pattern);
                              }}
                              className="p-2 bg-blue-600 text-white rounded-md shadow-lg hover:bg-blue-700"
                              title="삽입"
                            >
                              <Insert className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Pattern Info */}
                      <div className="p-3">
                        <h4 className="font-medium text-sm mb-1">{pattern.name}</h4>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {pattern.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Grid className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">검색 결과가 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Pattern Preview Modal */}
      {previewPattern && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewPattern(null)}
          >
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Preview Header */}
              <div className="p-4 border-b flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">{previewPattern.name}</h3>
                  <p className="text-sm text-gray-600">{previewPattern.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInsertPattern(previewPattern)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    패턴 삽입
                  </button>
                  <button
                    onClick={() => setPreviewPattern(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    닫기
                  </button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="p-4 max-h-[calc(90vh-120px)] overflow-y-auto">
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <Layout className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h4 className="text-xl font-semibold mb-2">{previewPattern.name} 미리보기</h4>
                  <p className="text-gray-600 mb-4">{previewPattern.description}</p>
                  <div className="bg-white rounded-md p-4 text-left">
                    <code className="text-sm text-gray-700">
                      {JSON.stringify(previewPattern.defaultProps, null, 2)}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};