/**
 * Mobile Header Panel Component
 * Customizer의 Mobile Header 설정 패널
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MobileHeaderSettings } from '../../types/customizer-types';
import { Upload, Smartphone, Menu, X } from 'lucide-react';

interface MobileHeaderPanelProps {
  settings?: MobileHeaderSettings;
  onChange: (settings: MobileHeaderSettings) => void;
}

const defaultSettings: MobileHeaderSettings = {
  enabled: true,
  breakpoint: 768,
  mobileLogoUrl: '',
  mobileLogoWidth: 120,
  hamburgerStyle: 'default',
  menuPosition: 'left',
  menuAnimation: 'slide',
  overlayEnabled: true,
  overlayColor: '#000000',
  overlayOpacity: 0.5,
  backgroundColor: '#ffffff',
  textColor: '#000000',
  showAccountIcon: true,
  showCartIcon: true,
  showSearchIcon: false,
  submenuStyle: 'accordion',
  closeOnItemClick: false,
  swipeToClose: true
};

export const MobileHeaderPanel: React.FC<MobileHeaderPanelProps> = ({
  settings: propSettings,
  onChange
}) => {
  const settings = { ...defaultSettings, ...propSettings };

  const handleChange = <K extends keyof MobileHeaderSettings>(
    field: K,
    value: MobileHeaderSettings[K]
  ) => {
    onChange({
      ...settings,
      [field]: value
    });
  };

  const handleLogoUpload = () => {
    // In a real implementation, this would open a media library
    const mockUrl = prompt('Enter mobile logo URL:');
    if (mockUrl) {
      handleChange('mobileLogoUrl', mockUrl);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Mobile Header Settings</h3>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label htmlFor="mobile-enabled" className="text-base font-medium">
              Enable Mobile Header
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Show mobile-optimized header on small screens
            </p>
          </div>
          <Switch
            id="mobile-enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => handleChange('enabled', checked)}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Breakpoint */}
            <div className="space-y-2 mb-6">
              <Label htmlFor="breakpoint">
                Mobile Breakpoint (px)
                <span className="ml-2 text-sm text-gray-500">
                  Default: 768px
                </span>
              </Label>
              <Input
                id="breakpoint"
                type="number"
                min="320"
                max="1024"
                value={settings.breakpoint}
                onChange={(e) => handleChange('breakpoint', parseInt(e.target.value) || 768)}
              />
              <p className="text-xs text-gray-500">
                Switch to mobile header below this screen width
              </p>
            </div>

            {/* Mobile Logo */}
            <div className="space-y-4 mb-6 p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Smartphone size={18} />
                Mobile Logo
              </h4>
              
              <div className="space-y-3">
                <div>
                  <Label>Mobile Logo</Label>
                  {settings.mobileLogoUrl ? (
                    <div className="mt-2 p-4 border rounded bg-gray-50">
                      <img 
                        src={settings.mobileLogoUrl} 
                        alt="Mobile Logo" 
                        className="max-h-12 mx-auto"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => handleChange('mobileLogoUrl', '')}
                      >
                        Remove Logo
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={handleLogoUpload}
                    >
                      <Upload size={16} className="mr-2" />
                      Upload Mobile Logo
                    </Button>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Different logo for mobile devices
                  </p>
                </div>

                <div>
                  <Label htmlFor="logo-width">Logo Width (px)</Label>
                  <Input
                    id="logo-width"
                    type="number"
                    min="50"
                    max="200"
                    value={settings.mobileLogoWidth}
                    onChange={(e) => handleChange('mobileLogoWidth', parseInt(e.target.value) || 120)}
                  />
                </div>
              </div>
            </div>

            {/* Hamburger Menu Style */}
            <div className="space-y-4 mb-6 p-4 border rounded-lg">
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
            <div className="space-y-4 mb-6 p-4 border rounded-lg">
              <h4 className="font-medium">Menu Appearance</h4>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="bg-color">Background Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={settings.backgroundColor}
                      onChange={(e) => handleChange('backgroundColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={settings.backgroundColor}
                      onChange={(e) => handleChange('backgroundColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="text-color">Text Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={settings.textColor}
                      onChange={(e) => handleChange('textColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={settings.textColor}
                      onChange={(e) => handleChange('textColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

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

            {/* Overlay Settings */}
            <div className="space-y-4 mb-6 p-4 border rounded-lg">
              <h4 className="font-medium">Overlay</h4>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="overlay-enabled"
                    checked={settings.overlayEnabled}
                    onCheckedChange={(checked) => handleChange('overlayEnabled', checked)}
                  />
                  <Label htmlFor="overlay-enabled">Enable Overlay</Label>
                </div>

                {settings.overlayEnabled && (
                  <>
                    <div>
                      <Label htmlFor="overlay-color">Overlay Color</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={settings.overlayColor}
                          onChange={(e) => handleChange('overlayColor', e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          type="text"
                          value={settings.overlayColor}
                          onChange={(e) => handleChange('overlayColor', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="overlay-opacity">
                        Overlay Opacity
                        <span className="ml-2 text-sm text-gray-500">
                          {Math.round((settings.overlayOpacity || 0.5) * 100)}%
                        </span>
                      </Label>
                      <Input
                        id="overlay-opacity"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.overlayOpacity}
                        onChange={(e) => handleChange('overlayOpacity', parseFloat(e.target.value))}
                        className="mt-2"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-4 mb-6 p-4 border rounded-lg">
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
        )}
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 p-3 rounded text-sm text-blue-900">
        <strong>Tip:</strong> The mobile header will automatically activate on screens smaller than the breakpoint.
        Test responsiveness by resizing the preview window.
      </div>
    </div>
  );
};

export default MobileHeaderPanel;