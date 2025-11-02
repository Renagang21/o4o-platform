/**
 * Mobile Menu Settings Component
 * Hamburger menu button and menu appearance settings
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MobileHeaderSettings } from '../../../types/customizer-types';
import { Menu } from 'lucide-react';
import { ColorInput } from '../../common/ColorInput';
import { handleMobileHeaderChange } from './utils';

interface MobileMenuSettingsProps {
  settings: MobileHeaderSettings;
  onChange: (settings: MobileHeaderSettings) => void;
}

export const MobileMenuSettings: React.FC<MobileMenuSettingsProps> = ({
  settings,
  onChange
}) => {
  const handleChange = <K extends keyof MobileHeaderSettings>(
    field: K,
    value: MobileHeaderSettings[K]
  ) => handleMobileHeaderChange(settings, onChange, field, value);

  return (
    <>
      {/* Hamburger Menu Style */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h4 className="font-medium flex items-center gap-2">
          <Menu size={18} />
          Menu Button
        </h4>

        <div className="space-y-3">
          <div>
            <Label htmlFor="hamburger-style">Hamburger Style</Label>
            <Select
              value={settings.hamburgerStyle}
              onValueChange={(value) => handleChange('hamburgerStyle', value as 'default' | 'animated' | 'minimal')}
            >
              <SelectTrigger id="hamburger-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (3 lines)</SelectItem>
                <SelectItem value="animated">Animated (morphing)</SelectItem>
                <SelectItem value="minimal">Minimal (2 lines)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="menu-position">Menu Position</Label>
            <Select
              value={settings.menuPosition}
              onValueChange={(value) => handleChange('menuPosition', value as 'left' | 'right' | 'fullscreen')}
            >
              <SelectTrigger id="menu-position">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Slide from Left</SelectItem>
                <SelectItem value="right">Slide from Right</SelectItem>
                <SelectItem value="fullscreen">Fullscreen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="menu-animation">Animation Type</Label>
            <Select
              value={settings.menuAnimation}
              onValueChange={(value) => handleChange('menuAnimation', value as 'slide' | 'fade' | 'push')}
            >
              <SelectTrigger id="menu-animation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slide">Slide</SelectItem>
                <SelectItem value="fade">Fade</SelectItem>
                <SelectItem value="push">Push</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Menu Appearance */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h4 className="font-medium">Menu Appearance</h4>

        <div className="space-y-3">
          <ColorInput
            label="Background Color"
            value={settings.backgroundColor}
            onChange={(value) => handleChange('backgroundColor', value)}
            placeholder="#ffffff"
          />

          <ColorInput
            label="Text Color"
            value={settings.textColor}
            onChange={(value) => handleChange('textColor', value)}
            placeholder="#000000"
          />

          <div>
            <Label htmlFor="submenu-style">Submenu Style</Label>
            <Select
              value={settings.submenuStyle}
              onValueChange={(value) => handleChange('submenuStyle', value as 'accordion' | 'dropdown')}
            >
              <SelectTrigger id="submenu-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accordion">Accordion (expand/collapse)</SelectItem>
                <SelectItem value="dropdown">Dropdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Additional Options */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h4 className="font-medium">Additional Options</h4>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-account"
              checked={settings.showAccountIcon}
              onCheckedChange={(checked) => handleChange('showAccountIcon', checked)}
            />
            <Label htmlFor="show-account">Show Account Icon</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="show-cart"
              checked={settings.showCartIcon}
              onCheckedChange={(checked) => handleChange('showCartIcon', checked)}
            />
            <Label htmlFor="show-cart">Show Cart Icon</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="show-search"
              checked={settings.showSearchIcon}
              onCheckedChange={(checked) => handleChange('showSearchIcon', checked)}
            />
            <Label htmlFor="show-search">Show Search Icon</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="close-on-click"
              checked={settings.closeOnItemClick}
              onCheckedChange={(checked) => handleChange('closeOnItemClick', checked)}
            />
            <Label htmlFor="close-on-click">Close Menu on Item Click</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="swipe-close"
              checked={settings.swipeToClose}
              onCheckedChange={(checked) => handleChange('swipeToClose', checked)}
            />
            <Label htmlFor="swipe-close">Enable Swipe to Close</Label>
          </div>
        </div>
      </div>
    </>
  );
};
