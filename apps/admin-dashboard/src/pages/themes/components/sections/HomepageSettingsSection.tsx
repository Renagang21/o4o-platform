/**
 * HomepageSettingsSection - Homepage display settings
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface HomepageSettings {
  showOnFront: 'posts' | 'page';
  pageOnFront?: string;
  pageForPosts?: string;
}

interface HomepageSettingsSectionProps {
  settings: HomepageSettings;
  onChange: (updates: Partial<HomepageSettings>) => void;
}

export const HomepageSettingsSection: React.FC<HomepageSettingsSectionProps> = ({
  settings,
  onChange
}) => {
  // Mock pages - would be fetched from API
  const availablePages = [
    { id: '1', title: 'Home' },
    { id: '2', title: 'About' },
    { id: '3', title: 'Blog' },
    { id: '4', title: 'Contact' }
  ];

  return (
    <div className="wp-section-content">
      <div className="form-group">
        <Label>Your homepage displays</Label>
        <RadioGroup
          value={settings.showOnFront}
          onValueChange={(value) => onChange({ showOnFront: value as 'posts' | 'page' })}
        >
          <div className="flex items-start space-x-2 mb-3">
            <RadioGroupItem value="posts" id="show-posts" />
            <div className="flex-1">
              <Label htmlFor="show-posts" className="font-normal cursor-pointer">
                Your latest posts
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Display your blog posts on the homepage
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="page" id="show-page" />
            <div className="flex-1">
              <Label htmlFor="show-page" className="font-normal cursor-pointer">
                A static page
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Select specific pages for your homepage and posts page
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Static Page Options */}
      {settings.showOnFront === 'page' && (
        <>
          <div className="form-group">
            <Label htmlFor="page-on-front">Homepage</Label>
            <Select
              value={settings.pageOnFront || ''}
              onValueChange={(value) => onChange({ pageOnFront: value })}
            >
              <SelectTrigger id="page-on-front">
                <SelectValue placeholder="— Select —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Select —</SelectItem>
                {availablePages.map(page => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="form-group">
            <Label htmlFor="page-for-posts">Posts page</Label>
            <Select
              value={settings.pageForPosts || ''}
              onValueChange={(value) => onChange({ pageForPosts: value })}
              disabled={!settings.pageOnFront}
            >
              <SelectTrigger id="page-for-posts">
                <SelectValue placeholder="— Select —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Select —</SelectItem>
                {availablePages
                  .filter(page => page.id !== settings.pageOnFront)
                  .map(page => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Optional: Choose a page to display your blog posts
            </p>
          </div>
        </>
      )}

      {/* Info Message */}
      <div className="form-group">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> Homepage settings affect how your site's front page displays.
            {settings.showOnFront === 'posts' 
              ? ' Your latest posts will be shown on the homepage.'
              : ' Make sure to select both a homepage and posts page for best results.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomepageSettingsSection;