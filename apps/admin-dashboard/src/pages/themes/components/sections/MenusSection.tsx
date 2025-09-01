/**
 * MenusSection - Menu configuration section
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, ExternalLink } from 'lucide-react';

interface MenuSettings {
  primaryMenu?: string;
  footerMenu?: string;
  socialMenu?: string;
}

interface MenusSectionProps {
  settings: MenuSettings;
  onChange: (updates: Partial<MenuSettings>) => void;
}

export const MenusSection: React.FC<MenusSectionProps> = ({
  settings,
  onChange
}) => {
  // Mock menu options - would be fetched from API
  const availableMenus = [
    { id: 'main-menu', name: 'Main Menu' },
    { id: 'footer-menu', name: 'Footer Menu' },
    { id: 'social-links', name: 'Social Links' }
  ];

  return (
    <div className="wp-section-content">
      <div className="form-group">
        <p className="text-sm text-gray-600 mb-4">
          Select which menu appears in each location. You can edit menu content in the Menus screen.
        </p>
      </div>

      {/* Primary Menu */}
      <div className="form-group">
        <Label htmlFor="primary-menu">Primary Menu</Label>
        <Select 
          value={settings.primaryMenu || ''} 
          onValueChange={(value) => onChange({ primaryMenu: value })}
        >
          <SelectTrigger id="primary-menu">
            <SelectValue placeholder="— Select —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">— Select —</SelectItem>
            {availableMenus.map(menu => (
              <SelectItem key={menu.id} value={menu.id}>
                {menu.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          The main navigation menu, typically in the header.
        </p>
      </div>

      {/* Footer Menu */}
      <div className="form-group">
        <Label htmlFor="footer-menu">Footer Menu</Label>
        <Select 
          value={settings.footerMenu || ''} 
          onValueChange={(value) => onChange({ footerMenu: value })}
        >
          <SelectTrigger id="footer-menu">
            <SelectValue placeholder="— Select —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">— Select —</SelectItem>
            {availableMenus.map(menu => (
              <SelectItem key={menu.id} value={menu.id}>
                {menu.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          Navigation menu in the footer area.
        </p>
      </div>

      {/* Social Menu */}
      <div className="form-group">
        <Label htmlFor="social-menu">Social Links Menu</Label>
        <Select 
          value={settings.socialMenu || ''} 
          onValueChange={(value) => onChange({ socialMenu: value })}
        >
          <SelectTrigger id="social-menu">
            <SelectValue placeholder="— Select —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">— Select —</SelectItem>
            {availableMenus.map(menu => (
              <SelectItem key={menu.id} value={menu.id}>
                {menu.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          Social media links menu.
        </p>
      </div>

      {/* Actions */}
      <div className="form-group">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => window.open('/themes/menus', '_blank')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Menu
        </Button>
      </div>

      <div className="form-group">
        <Button
          type="button"
          variant="link"
          size="sm"
          className="w-full"
          onClick={() => window.open('/themes/menus', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Manage Menus
        </Button>
      </div>
    </div>
  );
};

export default MenusSection;