import React from 'react';
import { Plus, X } from 'lucide-react';

interface SocialLink {
  platform: string;
  url: string;
}

interface SocialIconsSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const SocialIconsSettings: React.FC<SocialIconsSettingsProps> = ({
  settings,
  onChange
}) => {
  const links: SocialLink[] = settings.links || [];
  const size = settings.size || 'medium';
  const style = settings.style || 'filled';

  const addLink = () => {
    onChange('links', [...links, { platform: 'facebook', url: '' }]);
  };

  const removeLink = (index: number) => {
    onChange('links', links.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, field: 'platform' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    onChange('links', newLinks);
  };

  return (
    <div className="border-b border-gray-200 pb-6 mb-6">
      <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Social Icons Settings</h4>

      {/* Icon Size */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Icon Size</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={size}
          onChange={(e) => onChange('size', e.target.value)}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>

      {/* Icon Style */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Icon Style</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={style}
          onChange={(e) => onChange('style', e.target.value)}
        >
          <option value="filled">Filled</option>
          <option value="outline">Outline</option>
          <option value="minimal">Minimal</option>
        </select>
      </div>

      {/* Social Links */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Social Links</label>
        {links.map((link, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
              value={link.platform}
              onChange={(e) => updateLink(index, 'platform', e.target.value)}
            >
              <option value="facebook">Facebook</option>
              <option value="twitter">Twitter</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube">YouTube</option>
              <option value="github">GitHub</option>
            </select>
            <input
              type="text"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={link.url}
              onChange={(e) => updateLink(index, 'url', e.target.value)}
              placeholder="https://..."
            />
            <button
              onClick={() => removeLink(index)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={addLink}
          className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Social Link
        </button>
      </div>
    </div>
  );
};
