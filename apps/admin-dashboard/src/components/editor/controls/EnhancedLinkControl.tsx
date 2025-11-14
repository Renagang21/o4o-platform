/**
 * EnhancedLinkControl Component
 *
 * Advanced link editing control with:
 * - Link type selector (URL, Page, Email, Phone, Anchor)
 * - Internal page search and selection
 * - Link preview
 * - Recent links history
 * - URL validation and normalization
 * - SEO settings (target, rel, title)
 *
 * Inspired by WordPress Gutenberg link control but tailored for O4O platform
 */

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  Link2,
  ExternalLink,
  Mail,
  Phone,
  Hash,
  FileText,
  Clock,
  ChevronDown,
  X,
  Search,
  Check,
} from 'lucide-react';
import { URLInput, normalizeURL } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

export type LinkType = 'url' | 'page' | 'email' | 'phone' | 'anchor';

export interface LinkData {
  url: string;
  type: LinkType;
  target?: '_blank' | '_self';
  rel?: string;
  title?: string;
  pageId?: string; // For internal page links
}

interface EnhancedLinkControlProps {
  value: LinkData;
  onChange: (data: LinkData) => void;
  onClose: () => void;
  onApply: () => void;
  className?: string;
  showRecent?: boolean;
}

interface RecentLink {
  url: string;
  type: LinkType;
  label: string;
  timestamp: number;
}

const RECENT_LINKS_KEY = 'o4o-recent-links';
const MAX_RECENT_LINKS = 5;

export const EnhancedLinkControl: React.FC<EnhancedLinkControlProps> = ({
  value,
  onChange,
  onClose,
  onApply,
  className,
  showRecent = true,
}) => {
  const [linkType, setLinkType] = useState<LinkType>(value.type || 'url');
  const [urlSubType, setUrlSubType] = useState<'external' | 'internal'>(
    value.url && value.url.startsWith('/') && !value.url.startsWith('//') ? 'internal' : 'external'
  );
  const [localUrl, setLocalUrl] = useState(value.url || '');
  const [localTarget, setLocalTarget] = useState(value.target || '_self');
  const [localRel, setLocalRel] = useState(value.rel || '');
  const [localTitle, setLocalTitle] = useState(value.title || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentLinks, setRecentLinks] = useState<RecentLink[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Load recent links
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_LINKS_KEY);
      if (stored) {
        setRecentLinks(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load recent links:', err);
    }
  }, []);

  // Focus input on mount
  useEffect(() => {
    if (urlInputRef.current) {
      urlInputRef.current.focus();
    }
  }, [linkType]);

  // Update parent when local state changes
  useEffect(() => {
    onChange({
      url: localUrl,
      type: linkType,
      target: localTarget,
      rel: localRel,
      title: localTitle,
    });
  }, [localUrl, linkType, localTarget, localRel, localTitle]);

  // Save to recent links
  const saveToRecent = (link: RecentLink) => {
    try {
      const updated = [
        link,
        ...recentLinks.filter(l => l.url !== link.url)
      ].slice(0, MAX_RECENT_LINKS);
      localStorage.setItem(RECENT_LINKS_KEY, JSON.stringify(updated));
      setRecentLinks(updated);
    } catch (err) {
      console.error('Failed to save recent link:', err);
    }
  };

  // Handle link type change
  const handleTypeChange = (type: LinkType) => {
    setLinkType(type);
    // Clear URL when changing type
    setLocalUrl('');
  };

  // Handle URL change based on link type
  const handleUrlChange = (url: string) => {
    setLocalUrl(url);
  };

  // Generate URL based on type and input
  const generateUrl = (): string => {
    switch (linkType) {
      case 'email':
        return localUrl.startsWith('mailto:') ? localUrl : `mailto:${localUrl}`;
      case 'phone':
        return localUrl.startsWith('tel:') ? localUrl : `tel:${localUrl.replace(/\s/g, '')}`;
      case 'anchor':
        return localUrl.startsWith('#') ? localUrl : `#${localUrl}`;
      case 'page':
        // For internal pages, use relative path
        return localUrl.startsWith('/') ? localUrl : `/${localUrl}`;
      case 'url':
      default:
        if (urlSubType === 'internal') {
          // Internal path - ensure it starts with /
          return localUrl.startsWith('/') ? localUrl : `/${localUrl}`;
        }
        // External URL - normalize
        return normalizeURL(localUrl);
    }
  };

  // Handle apply
  const handleApply = () => {
    const finalUrl = generateUrl();

    // Save to recent links
    saveToRecent({
      url: finalUrl,
      type: linkType,
      label: localTitle || finalUrl,
      timestamp: Date.now(),
    });

    // Update parent with final URL
    onChange({
      url: finalUrl,
      type: linkType,
      target: localTarget,
      rel: localRel,
      title: localTitle,
    });

    onApply();
  };

  // Handle recent link click
  const handleRecentLinkClick = (recent: RecentLink) => {
    setLinkType(recent.type);
    setLocalUrl(recent.url);
    setLocalTitle(recent.label);
  };

  // Get placeholder based on link type
  const getPlaceholder = (): string => {
    switch (linkType) {
      case 'email':
        return 'email@example.com';
      case 'phone':
        return '+1 (555) 123-4567';
      case 'anchor':
        return 'section-id';
      case 'page':
        return 'Search for a page...';
      case 'url':
      default:
        if (urlSubType === 'internal') {
          return '/about';
        }
        return 'https://example.com';
    }
  };

  // Get icon for link type
  const getLinkTypeIcon = (type: LinkType) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'anchor': return <Hash className="w-4 h-4" />;
      case 'page': return <FileText className="w-4 h-4" />;
      case 'url':
      default: return <Link2 className="w-4 h-4" />;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-96',
        className
      )}
    >
      {/* Link Type Tabs */}
      <Tabs value={linkType} onValueChange={(val) => handleTypeChange(val as LinkType)}>
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="url" className="text-xs" title="URL">
            <Link2 className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger value="page" className="text-xs" title="Page">
            <FileText className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger value="email" className="text-xs" title="Email">
            <Mail className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger value="phone" className="text-xs" title="Phone">
            <Phone className="w-3 h-3" />
          </TabsTrigger>
          <TabsTrigger value="anchor" className="text-xs" title="Anchor">
            <Hash className="w-3 h-3" />
          </TabsTrigger>
        </TabsList>

        {/* URL Tab */}
        <TabsContent value="url" className="space-y-3">
          {/* URL Type Selector */}
          <div>
            <Label className="text-xs mb-2">Link to</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setUrlSubType('external');
                  setLocalUrl('');
                }}
                className={cn(
                  'px-3 py-2 text-xs rounded border transition-colors',
                  urlSubType === 'external'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                )}
              >
                <ExternalLink className="w-3 h-3 mx-auto mb-1" />
                <div className="font-medium">External URL</div>
                <div className="text-gray-500 mt-0.5">Full web address</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrlSubType('internal');
                  setLocalUrl('');
                }}
                className={cn(
                  'px-3 py-2 text-xs rounded border transition-colors',
                  urlSubType === 'internal'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                )}
              >
                <FileText className="w-3 h-3 mx-auto mb-1" />
                <div className="font-medium">Internal Path</div>
                <div className="text-gray-500 mt-0.5">Relative path</div>
              </button>
            </div>
          </div>

          {/* URL Input */}
          <div>
            <Label className="text-xs mb-1">
              {urlSubType === 'external' ? 'External URL' : 'Internal Path'}
            </Label>
            <URLInput
              ref={urlInputRef}
              value={localUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={getPlaceholder()}
              variant="default"
              showIcon
              helperText={
                urlSubType === 'internal'
                  ? '예: /about, /products/new, /contact'
                  : '예: https://example.com, https://google.com'
              }
            />
          </div>
        </TabsContent>

        {/* Page Tab */}
        <TabsContent value="page" className="space-y-3">
          <div>
            <Label className="text-xs mb-1">Search Pages</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={urlInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages..."
                className="pl-8"
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded">
            {searchQuery ? (
              <div className="p-3 text-xs text-gray-500 text-center">
                Page search will integrate with your CMS pages
              </div>
            ) : (
              <div className="p-3 text-xs text-gray-500 text-center">
                Start typing to search pages
              </div>
            )}
          </div>

          {/* Manual Path Entry */}
          <div>
            <Label className="text-xs mb-1">Or enter path manually</Label>
            <Input
              type="text"
              value={localUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="/about"
            />
          </div>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-3">
          <div>
            <Label className="text-xs mb-1">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={urlInputRef}
                type="email"
                value={localUrl.replace('mailto:', '')}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="email@example.com"
                className="pl-8"
              />
            </div>
          </div>
        </TabsContent>

        {/* Phone Tab */}
        <TabsContent value="phone" className="space-y-3">
          <div>
            <Label className="text-xs mb-1">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={urlInputRef}
                type="tel"
                value={localUrl.replace('tel:', '')}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="pl-8"
              />
            </div>
          </div>
        </TabsContent>

        {/* Anchor Tab */}
        <TabsContent value="anchor" className="space-y-3">
          <div>
            <Label className="text-xs mb-1">Anchor ID</Label>
            <div className="relative">
              <Hash className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={urlInputRef}
                type="text"
                value={localUrl.replace('#', '')}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="section-id"
                className="pl-8"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Common Settings */}
      <div className="mt-4 space-y-3 border-t border-gray-200 pt-3">
        {/* Open in new tab - show for both external and internal URLs */}
        {linkType === 'url' && (
          <div className="flex items-center justify-between">
            <Label className="text-xs">Open in new tab</Label>
            <input
              type="checkbox"
              checked={localTarget === '_blank'}
              onChange={(e) => setLocalTarget(e.target.checked ? '_blank' : '_self')}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
        )}

        {/* Link Title */}
        <div>
          <Label className="text-xs mb-1">Link Title (optional)</Label>
          <Input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            placeholder="Descriptive title for accessibility"
            className="text-sm"
          />
        </div>

        {/* Advanced Settings */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <ChevronDown
              className={cn(
                'w-3 h-3 transition-transform',
                showAdvanced && 'rotate-180'
              )}
            />
            Advanced
          </button>

          {showAdvanced && (
            <div className="mt-2 space-y-2 pl-2 border-l-2 border-gray-200">
              <div>
                <Label className="text-xs mb-1">Link Rel</Label>
                <Input
                  type="text"
                  value={localRel}
                  onChange={(e) => setLocalRel(e.target.value)}
                  placeholder="nofollow, sponsored"
                  className="text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  e.g., nofollow, sponsored, ugc
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Links */}
      {showRecent && recentLinks.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-1 mb-2">
            <Clock className="w-3 h-3 text-gray-400" />
            <Label className="text-xs text-gray-600">Recent Links</Label>
          </div>
          <div className="space-y-1">
            {recentLinks.map((recent, index) => (
              <button
                key={index}
                onClick={() => handleRecentLinkClick(recent)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded hover:bg-gray-100 transition-colors"
              >
                {getLinkTypeIcon(recent.type)}
                <span className="flex-1 truncate">{recent.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-gray-200">
        <Button
          size="sm"
          onClick={handleApply}
          disabled={!localUrl.trim()}
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-1" />
          Apply
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default EnhancedLinkControl;
