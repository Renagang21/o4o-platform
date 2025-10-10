/**
 * General Panel Component
 * Customizer의 일반 설정 패널
 */

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollToTopSettings, ButtonVariants, BreadcrumbsSettings } from '../../types/customizer-types';
import { Input } from '@/components/ui/input';
import { ButtonsPanel } from './ButtonsPanel';
import { BreadcrumbsPanel } from './BreadcrumbsPanel';
import { ArrowUp, Palette, Navigation } from 'lucide-react';

interface GeneralPanelProps {
  settings?: {
    scrollToTop?: ScrollToTopSettings;
    buttons?: ButtonVariants;
    breadcrumbs?: BreadcrumbsSettings;
  };
  onChange: (settings: any) => void;
}

const defaultSettings: ScrollToTopSettings = {
  enabled: false,
  displayType: 'both',
  threshold: 300,
  backgroundColor: '#333333',
  iconColor: '#ffffff',
  position: 'right'
};

export const GeneralPanel: React.FC<GeneralPanelProps> = ({
  settings,
  onChange
}) => {
  const scrollToTop = { ...defaultSettings, ...settings?.scrollToTop };

  const handleScrollChange = (field: keyof ScrollToTopSettings, value: any) => {
    onChange({
      ...settings,
      scrollToTop: {
        ...scrollToTop,
        [field]: value
      }
    });
  };

  const handleButtonsChange = (buttonSettings: ButtonVariants) => {
    onChange({
      ...settings,
      buttons: buttonSettings
    });
  };

  const handleBreadcrumbsChange = (breadcrumbsSettings: BreadcrumbsSettings) => {
    onChange({
      ...settings,
      breadcrumbs: breadcrumbsSettings
    });
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">General Settings</h3>
        
        <Tabs defaultValue="scroll-to-top" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scroll-to-top" className="flex items-center gap-2">
              <ArrowUp size={16} />
              Scroll to Top
            </TabsTrigger>
            <TabsTrigger value="buttons" className="flex items-center gap-2">
              <Palette size={16} />
              Buttons
            </TabsTrigger>
            <TabsTrigger value="breadcrumbs" className="flex items-center gap-2">
              <Navigation size={16} />
              Breadcrumbs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scroll-to-top" className="mt-6">
            {/* Scroll to Top Section */}
            <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-4">Scroll to Top Button</h4>
          
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between mb-4">
            <Label htmlFor="scroll-enabled">Enable Scroll to Top</Label>
            <Switch
              id="scroll-enabled"
              checked={scrollToTop.enabled}
              onCheckedChange={(checked) => handleScrollChange('enabled', checked)}
            />
          </div>

          {scrollToTop.enabled && (
            <>
              {/* Display Type */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="display-type">Display On</Label>
                <Select
                  value={scrollToTop.displayType}
                  onValueChange={(value) => handleScrollChange('displayType', value)}
                >
                  <SelectTrigger id="display-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Desktop & Mobile</SelectItem>
                    <SelectItem value="desktop">Desktop Only</SelectItem>
                    <SelectItem value="mobile">Mobile Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Position */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="position">Position</Label>
                <Select
                  value={scrollToTop.position}
                  onValueChange={(value) => handleScrollChange('position', value)}
                >
                  <SelectTrigger id="position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Bottom Right</SelectItem>
                    <SelectItem value="left">Bottom Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scroll Threshold */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="threshold">
                  Show After Scrolling (px)
                  <span className="ml-2 text-sm text-gray-500">
                    Default: 300px
                  </span>
                </Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  max="2000"
                  step="50"
                  value={scrollToTop.threshold}
                  onChange={(e) => handleScrollChange('threshold', parseInt(e.target.value) || 300)}
                />
              </div>

              {/* Background Color */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="bg-color">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="bg-color"
                    type="color"
                    value={scrollToTop.backgroundColor}
                    onChange={(e) => handleScrollChange('backgroundColor', e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    type="text"
                    value={scrollToTop.backgroundColor}
                    onChange={(e) => handleScrollChange('backgroundColor', e.target.value)}
                    className="flex-1"
                    placeholder="#333333"
                  />
                </div>
              </div>

              {/* Icon Color */}
              <div className="space-y-2">
                <Label htmlFor="icon-color">Icon Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="icon-color"
                    type="color"
                    value={scrollToTop.iconColor}
                    onChange={(e) => handleScrollChange('iconColor', e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    type="text"
                    value={scrollToTop.iconColor}
                    onChange={(e) => handleScrollChange('iconColor', e.target.value)}
                    className="flex-1"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="buttons" className="mt-6">
        <ButtonsPanel
          settings={settings?.buttons}
          onChange={handleButtonsChange}
        />
      </TabsContent>

      <TabsContent value="breadcrumbs" className="mt-6">
        <BreadcrumbsPanel
          settings={settings?.breadcrumbs}
          onChange={handleBreadcrumbsChange}
        />
      </TabsContent>
    </Tabs>
      </div>
    </div>
  );
};

export default GeneralPanel;