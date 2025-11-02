/**
 * Blog Panel Component
 * Customizer의 Blog/Archive 설정 패널
 * Refactored to use sub-components for better organization
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BlogSettings } from '../../types/customizer-types';
import { Grid, Palette, Type, User } from 'lucide-react';
import { BlogArchiveSettings } from './blog/BlogArchiveSettings';
import { BlogContentSettings } from './blog/BlogContentSettings';
import { BlogStylingSettings } from './blog/BlogStylingSettings';

interface BlogPanelProps {
  settings?: BlogSettings;
  onChange: (settings: BlogSettings) => void;
}

const defaultSettings: BlogSettings = {
  archive: {
    layout: 'grid',
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    contentWidth: 'default',
    showArchiveHeader: true,
    showLayoutSwitcher: true,
    showSortOptions: true,
    cardStyle: 'shadow',
    cardSpacing: 20,
    featuredImage: {
      enabled: true,
      position: 'top',
      ratio: '16:9',
      customRatio: { width: 16, height: 9 },
      size: 'medium',
      hoverEffect: 'zoom'
    },
    meta: {
      position: 'after-title',
      showIcons: true,
      separator: '·',
      items: [
        { id: 'date', label: 'Date', enabled: true, showIcon: true, order: 1 },
        { id: 'author', label: 'Author', enabled: true, showIcon: true, order: 2 },
        { id: 'category', label: 'Category', enabled: true, showIcon: true, order: 3 },
        { id: 'comments', label: 'Comments', enabled: false, showIcon: true, order: 4 }
      ],
      colors: {
        text: '#6c757d',
        links: '#0073e6',
        icons: '#6c757d'
      }
    },
    content: {
      showTitle: true,
      titleTag: 'h2',
      showExcerpt: true,
      excerptSource: 'auto',
      excerptLength: 25,
      showReadMoreButton: true,
      readMoreText: 'Read More'
    },
    pagination: {
      enabled: true,
      type: 'numbers',
      postsPerPage: 12,
      showNumbers: true,
      showPrevNext: true,
      prevText: 'Previous',
      nextText: 'Next',
      infiniteScrollThreshold: 100
    },
    sorting: {
      defaultOrder: 'date-desc',
      showSortOptions: true,
      enableSearch: false,
      enableFilters: false
    },
    styling: {
      backgroundColor: '#ffffff',
      borderColor: '#e1e5e9',
      borderRadius: 8,
      cardPadding: 20,
      titleColor: '#333333',
      titleHoverColor: '#0073e6',
      excerptColor: '#6c757d',
      metaColor: '#6c757d',
      typography: {
        titleSize: { desktop: 20, tablet: 18, mobile: 16 },
        titleWeight: 600,
        excerptSize: { desktop: 14, tablet: 13, mobile: 12 },
        metaSize: { desktop: 12, tablet: 11, mobile: 10 }
      }
    }
  },
  single: {
    layout: 'default',
    showFeaturedImage: true,
    showBreadcrumb: true,
    showPostNavigation: true,
    showAuthorBox: true,
    showRelatedPosts: true,
    relatedPostsCount: 3,
    meta: {
      showAuthor: true,
      showDate: true,
      showCategory: true,
      showTags: true,
      showComments: true,
      showReadTime: false,
      showViews: false,
      position: 'after-title'
    },
    relatedPosts: {
      title: 'Related Posts',
      layout: 'grid',
      columns: { desktop: 3, tablet: 2, mobile: 1 },
      basedOn: 'category'
    }
  },
  taxonomy: {
    showDescription: true,
    showPostCount: true,
    showHierarchy: true,
    inheritArchiveSettings: true
  }
};

export const BlogPanel: React.FC<BlogPanelProps> = ({
  settings: propSettings,
  onChange
}) => {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const settings = { ...defaultSettings, ...propSettings };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Blog & Archive Settings</h3>

        {/* Preview */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-3">Layout Preview</p>
          <div className="flex gap-2 items-center mb-2">
            <div className="text-xs text-gray-500">Layout:</div>
            <div className="text-sm font-medium">{settings.archive.layout}</div>
            <div className="text-xs text-gray-500">•</div>
            <div className="text-xs text-gray-500">Card Style:</div>
            <div className="text-sm font-medium">{settings.archive.cardStyle}</div>
          </div>
          <div
            className={`grid gap-3 ${
              settings.archive.layout === 'grid' ? 'grid-cols-3' :
              settings.archive.layout === 'list' ? 'grid-cols-1' : 'columns-3'
            }`}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`bg-white rounded border p-3 ${
                  settings.archive.cardStyle === 'shadow' ? 'shadow-sm' :
                  settings.archive.cardStyle === 'boxed' ? 'border-gray-300' :
                  'border-transparent'
                }`}
                style={{
                  borderRadius: `${settings.archive.styling.borderRadius}px`,
                  backgroundColor: settings.archive.styling.backgroundColor
                }}
              >
                {settings.archive.featuredImage.enabled && (
                  <div className="w-full h-12 bg-gray-200 rounded mb-2"></div>
                )}
                <div
                  className="text-xs font-medium mb-1"
                  style={{
                    color: settings.archive.styling.titleColor,
                    fontSize: `${settings.archive.styling.typography.titleSize[device] * 0.6}px`
                  }}
                >
                  Post Title {i + 1}
                </div>
                {settings.archive.content.showExcerpt && (
                  <div
                    className="text-xs text-gray-500 mb-2"
                    style={{
                      color: settings.archive.styling.excerptColor,
                      fontSize: `${settings.archive.styling.typography.excerptSize[device] * 0.6}px`
                    }}
                  >
                    Excerpt text here...
                  </div>
                )}
                {settings.archive.meta.items.filter(item => item.enabled).length > 0 && (
                  <div className="flex gap-2 text-xs">
                    {settings.archive.meta.items
                      .filter(item => item.enabled)
                      .slice(0, 2)
                      .map(item => (
                        <span
                          key={item.id}
                          style={{ color: settings.archive.meta.colors.text }}
                        >
                          {item.id === 'date' ? 'Jan 1' :
                           item.id === 'author' ? 'Author' :
                           item.id === 'category' ? 'Tech' : '5 comments'}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Tabs defaultValue="layout" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="layout" className="flex items-center gap-2">
              <Grid size={16} />
              Layout
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Type size={16} />
              Content
            </TabsTrigger>
            <TabsTrigger value="styling" className="flex items-center gap-2">
              <Palette size={16} />
              Styling
            </TabsTrigger>
          </TabsList>

          <TabsContent value="layout" className="space-y-6 mt-6">
            <BlogArchiveSettings settings={settings} onChange={onChange} />
          </TabsContent>

          <TabsContent value="content" className="space-y-6 mt-6">
            <BlogContentSettings settings={settings} onChange={onChange} />
          </TabsContent>

          <TabsContent value="styling" className="space-y-6 mt-6">
            <BlogStylingSettings
              settings={settings}
              onChange={onChange}
              device={device}
              setDevice={setDevice}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 p-3 rounded text-sm text-blue-900">
        <strong>Note:</strong> These settings control how your blog archive pages appear.
        You can customize layouts, styling, meta information, and pagination to match your design needs.
      </div>
    </div>
  );
};

export default BlogPanel;
