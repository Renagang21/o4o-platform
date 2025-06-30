/**
 * 숏코드 선택 및 삽입 도구
 * TipTap 에디터용 숏코드 UI 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { ShortcodeRenderer } from '../../lib/shortcode/renderer';
import { shortcodeCategories, popularShortcodes } from '../shortcodes';

interface ShortcodeInserterProps {
  editor: any;
  onClose: () => void;
  isOpen: boolean;
}

interface ShortcodeTemplate {
  name: string;
  template: string;
  description: string;
  icon: string;
  category: string;
}

const ShortcodeInserter: React.FC<ShortcodeInserterProps> = ({
  editor,
  onClose,
  isOpen
}) => {
  const [activeTab, setActiveTab] = useState<'popular' | 'category' | 'search'>('popular');
  const [selectedCategory, setSelectedCategory] = useState<string>('Media');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const results = ShortcodeRenderer.searchShortcodes(searchQuery);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const getShortcodeTemplates = (): ShortcodeTemplate[] => {
    const registry = ShortcodeRenderer.getRegistry();
    
    return Object.entries(registry).map(([name, info]) => ({
      name,
      template: generateTemplate(name, info.schema),
      description: info.description || `Insert ${name} shortcode`,
      icon: info.icon || '📝',
      category: info.category || 'General'
    }));
  };

  const generateTemplate = (name: string, schema?: any): string => {
    const templates: { [key: string]: string } = {
      'image': '[image id="123" size="medium" alt="Image description"]',
      'product-grid': '[product-grid category="featured" limit="6" columns="3"]',
      'hero': '[hero title="Welcome to Our Site" subtitle="Amazing products and services" cta_text="Get Started" cta_link="/signup"]',
      'recent-posts': '[recent-posts count="5" show_excerpt="true"]',
      'contact-form': '[contact-form fields="name*,email*,message*" title="Contact Us"]',
      'image-gallery': '[image-gallery ids="1,2,3,4" columns="3" show_captions="true"]',
      'pricing-table': '[pricing-table plans="basic,pro,enterprise" featured="pro"]',
      'testimonials': '[testimonials count="3" layout="grid"]',
      'feature-grid': '[feature-grid features="speed,security,scalability" columns="3"]',
      'call-to-action': '[call-to-action text="시작하기" link="/signup" style="primary" title="Ready to get started?"]'
    };

    return templates[name] || `[${name}]`;
  };

  const insertShortcode = (template: string) => {
    if (editor) {
      editor.commands.insertShortcode(template);
      onClose();
    }
  };

  const renderShortcodeCard = (shortcodeName: string) => {
    const registry = ShortcodeRenderer.getRegistry();
    const shortcodeInfo = registry[shortcodeName];
    const template = generateTemplate(shortcodeName, shortcodeInfo?.schema);

    if (!shortcodeInfo) return null;

    return (
      <div
        key={shortcodeName}
        className="shortcode-card bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-all duration-200 hover:border-blue-300"
        onClick={() => insertShortcode(template)}
      >
        <div className="flex items-start">
          <div className="shortcode-icon text-2xl mr-3">
            {shortcodeInfo.icon}
          </div>
          <div className="flex-1">
            <h3 className="shortcode-name font-medium text-gray-900 mb-1 capitalize">
              {shortcodeName.replace('-', ' ')}
            </h3>
            <p className="shortcode-description text-sm text-gray-600 mb-2">
              {shortcodeInfo.description}
            </p>
            <div className="shortcode-template text-xs font-mono bg-gray-100 p-2 rounded">
              {template}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="shortcode-inserter fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="shortcode-modal bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="shortcode-header flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Insert Shortcode</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="shortcode-tabs flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('popular')}
            className={`tab-button px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'popular'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🔥 Popular
          </button>
          <button
            onClick={() => setActiveTab('category')}
            className={`tab-button px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'category'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📂 Categories
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`tab-button px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'search'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🔍 Search
          </button>
        </div>

        {/* Content */}
        <div className="shortcode-content p-6 overflow-y-auto max-h-[60vh]">
          {/* Popular Tab */}
          {activeTab === 'popular' && (
            <div className="popular-shortcodes">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Most Used Shortcodes</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {popularShortcodes.map(renderShortcodeCard)}
              </div>
            </div>
          )}

          {/* Category Tab */}
          {activeTab === 'category' && (
            <div className="category-shortcodes">
              <div className="flex">
                {/* Category Sidebar */}
                <div className="category-sidebar w-48 mr-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Categories</h3>
                  <div className="space-y-1">
                    {Object.keys(shortcodeCategories).map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`category-button w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedCategory === category
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {category} ({shortcodeCategories[category as keyof typeof shortcodeCategories].length})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Content */}
                <div className="category-content flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{selectedCategory}</h3>
                  <div className="grid gap-4">
                    {shortcodeCategories[selectedCategory as keyof typeof shortcodeCategories]?.map(renderShortcodeCard)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="search-shortcodes">
              <div className="search-input mb-6">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search shortcodes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {searchQuery && (
                <div className="search-results">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Search Results ({searchResults.length})
                  </h3>
                  {searchResults.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {searchResults.map(renderShortcodeCard)}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 20c-4.411 0-8-3.589-8-8 0-4.411 3.589-8 8-8s8 3.589 8 8c0 2.152-.857 4.103-2.248 5.548L19.5 19.5l-3.998-3.998z" />
                      </svg>
                      <p className="text-gray-500">No shortcodes found for "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              )}

              {!searchQuery && (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-gray-500">Start typing to search shortcodes...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shortcode-footer px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              💡 Tip: Use Ctrl+Shift+S to quickly insert shortcodes
            </div>
            <button
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortcodeInserter;