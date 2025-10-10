/**
 * Blog Section Component
 * Blog/Archive 설정을 위한 메인 섹션 컴포넌트
 */

import React from 'react';
import { useCustomizer } from '../../context/CustomizerContext';
import { BlogPanel } from '../../components/panels/BlogPanel';
import { BlogSettings } from '../../types/customizer-types';

export const BlogSection: React.FC = () => {
  const { settings, updateSetting } = useCustomizer();

  const handleBlogSettingsChange = (newSettings: BlogSettings) => {
    updateSetting('blog', newSettings);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Blog & Archive</h2>
        <p className="text-sm text-gray-600 mb-6">
          Customize your blog archive layout, post cards, pagination, and metadata display.
        </p>
      </div>

      <BlogPanel
        settings={settings.blog}
        onChange={handleBlogSettingsChange}
      />
    </div>
  );
};