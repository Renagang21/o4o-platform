/**
 * CitationEditor Component
 * 고급 인용 출처 편집 컴포넌트
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Link as LinkIcon, MapPin, Calendar } from 'lucide-react';

interface CitationEditorProps {
  citation: string;
  citationUrl?: string;
  author?: string;
  source?: string;
  position: 'left' | 'center' | 'right';
  style: 'normal' | 'italic' | 'bold';
  prefix: 'dash' | 'quote' | 'none';
  onCitationChange: (citation: string) => void;
  onCitationUrlChange?: (url: string) => void;
  onAuthorChange?: (author: string) => void;
  onSourceChange?: (source: string) => void;
  onPositionChange: (position: 'left' | 'center' | 'right') => void;
  onStyleChange: (style: 'normal' | 'italic' | 'bold') => void;
  onPrefixChange: (prefix: 'dash' | 'quote' | 'none') => void;
}

const CITATION_POSITIONS = [
  { value: 'left', label: 'Left', description: 'Align to left' },
  { value: 'center', label: 'Center', description: 'Center aligned' },
  { value: 'right', label: 'Right', description: 'Align to right' },
] as const;

const CITATION_STYLES = [
  { value: 'normal', label: 'Normal', example: 'Normal text' },
  { value: 'italic', label: 'Italic', example: 'Italic text' },
  { value: 'bold', label: 'Bold', example: 'Bold text' },
] as const;

const CITATION_PREFIXES = [
  { value: 'dash', label: 'Em Dash', example: '— Author Name' },
  { value: 'quote', label: 'Quote', example: '" Author Name' },
  { value: 'none', label: 'None', example: 'Author Name' },
] as const;

export const CitationEditor: React.FC<CitationEditorProps> = ({
  citation,
  citationUrl,
  author,
  source,
  position,
  style,
  prefix,
  onCitationChange,
  onCitationUrlChange,
  onAuthorChange,
  onSourceChange,
  onPositionChange,
  onStyleChange,
  onPrefixChange,
}) => {
  const formatCitation = () => {
    const parts = [];

    if (author) parts.push(author);
    if (source) parts.push(source);
    if (!author && !source && citation) parts.push(citation);

    const fullCitation = parts.join(', ');

    switch (prefix) {
      case 'dash':
        return `— ${fullCitation}`;
      case 'quote':
        return `" ${fullCitation}`;
      case 'none':
      default:
        return fullCitation;
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-2">
        <User className="h-4 w-4" />
        <Label className="text-sm font-medium">Citation Settings</Label>
      </div>

      {/* Basic Citation */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Citation Text</Label>
        <Input
          placeholder="Author, Source, or Custom citation"
          value={citation}
          onChange={(e) => onCitationChange(e.target.value)}
          className="text-xs"
        />
      </div>

      {/* Advanced Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-700">Author</Label>
          <div className="relative">
            <User className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Author name"
              value={author || ''}
              onChange={(e) => onAuthorChange?.(e.target.value)}
              className="pl-7 text-xs"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-700">Source</Label>
          <div className="relative">
            <MapPin className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Book, Website, etc."
              value={source || ''}
              onChange={(e) => onSourceChange?.(e.target.value)}
              className="pl-7 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Citation URL */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Citation Link (Optional)</Label>
        <div className="relative">
          <LinkIcon className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
          <Input
            type="url"
            placeholder="https://example.com"
            value={citationUrl || ''}
            onChange={(e) => onCitationUrlChange?.(e.target.value)}
            className="pl-7 text-xs"
          />
        </div>
      </div>

      {/* Style Settings */}
      <div className="space-y-3">
        {/* Position */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-700">Position</Label>
          <Select value={position} onValueChange={(value: any) => onPositionChange(value)}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITATION_POSITIONS.map((pos) => (
                <SelectItem key={pos.value} value={pos.value}>
                  <div>
                    <div className="font-medium">{pos.label}</div>
                    <div className="text-gray-500 text-xs">{pos.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Style */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-700">Text Style</Label>
          <Select value={style} onValueChange={(value: any) => onStyleChange(value)}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITATION_STYLES.map((styleOption) => (
                <SelectItem key={styleOption.value} value={styleOption.value}>
                  <span
                    style={{
                      fontWeight: styleOption.value === 'bold' ? 'bold' : 'normal',
                      fontStyle: styleOption.value === 'italic' ? 'italic' : 'normal',
                    }}
                  >
                    {styleOption.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prefix */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-700">Prefix Style</Label>
          <Select value={prefix} onValueChange={(value: any) => onPrefixChange(value)}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITATION_PREFIXES.map((prefixOption) => (
                <SelectItem key={prefixOption.value} value={prefixOption.value}>
                  <div>
                    <div className="font-medium">{prefixOption.label}</div>
                    <div className="text-gray-500 text-xs">{prefixOption.example}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preview */}
      {(citation || author || source) && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-700">Preview</Label>
          <div
            className={`
              p-3 bg-white rounded border text-sm
              ${position === 'center' ? 'text-center' :
                position === 'right' ? 'text-right' : 'text-left'}
            `}
          >
            <span
              style={{
                fontWeight: style === 'bold' ? 'bold' : 'normal',
                fontStyle: style === 'italic' ? 'italic' : 'normal',
              }}
            >
              {formatCitation()}
            </span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onCitationChange('');
            onAuthorChange?.('');
            onSourceChange?.('');
            onCitationUrlChange?.('');
          }}
          className="flex-1 text-xs"
        >
          Clear All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onPositionChange('right');
            onStyleChange('italic');
            onPrefixChange('dash');
          }}
          className="flex-1 text-xs"
        >
          Default Style
        </Button>
      </div>
    </div>
  );
};

export default CitationEditor;