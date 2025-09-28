/**
 * ShortcodeBlock Component
 * WordPress-compatible shortcode block with regex parsing and custom builder
 */

import React, { useState, useRef, useEffect } from 'react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { cn } from '@/lib/utils';
import {
  Code,
  Settings,
  Eye,
  Copy,
  Check,
  Plus,
  X,
  Info,
  AlertTriangle,
  CheckCircle,
  Book
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ShortcodeBlockProps {
  id: string;
  content: string;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    shortcode?: string;
    parameters?: Record<string, string>;
    preview?: string;
    valid?: boolean;
    errorMessage?: string;
  };
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onChangeType?: (newType: string) => void;
}

interface ShortcodeMatch {
  tag: string;
  attributes: Record<string, string>;
  content?: string;
  selfClosing: boolean;
}

interface ShortcodeParameter {
  name: string;
  required: boolean;
  description: string;
  type: 'text' | 'number' | 'url' | 'select';
  default?: string;
  options?: string[];
}

interface ShortcodeTemplate {
  name: string;
  description: string;
  template: string;
  parameters: ShortcodeParameter[];
  hasContent?: boolean;
}

/**
 * Common shortcodes with their parameter definitions
 */
const SHORTCODE_TEMPLATES: ShortcodeTemplate[] = [
  // Dynamic Data Shortcodes
  {
    name: 'cpt_list',
    description: 'CPT 게시물 목록 표시',
    template: '[cpt_list type="ds_product" count="6" template="grid" columns="3"]',
    parameters: [
      { name: 'type', required: true, description: 'CPT slug (예: ds_product, ds_supplier)', type: 'text' },
      { name: 'count', required: false, description: '표시할 개수', type: 'number', default: '10' },
      { name: 'template', required: false, description: '템플릿 스타일', type: 'select', options: ['default', 'grid', 'list', 'card'], default: 'default' },
      { name: 'columns', required: false, description: '그리드 컬럼 수', type: 'number', default: '3' },
      { name: 'orderby', required: false, description: '정렬 기준', type: 'select', options: ['date', 'title', 'menu_order', 'rand'], default: 'date' },
      { name: 'order', required: false, description: '정렬 순서', type: 'select', options: ['ASC', 'DESC'], default: 'DESC' }
    ]
  },
  {
    name: 'cpt_field',
    description: 'CPT 필드 값 표시',
    template: '[cpt_field field="title"]',
    parameters: [
      { name: 'field', required: true, description: '필드명 (title, content, price 등)', type: 'text' },
      { name: 'post_type', required: false, description: 'CPT slug', type: 'text' },
      { name: 'post_id', required: false, description: '특정 포스트 ID', type: 'text' },
      { name: 'format', required: false, description: '출력 포맷', type: 'select', options: ['default', 'currency', 'date', 'excerpt'], default: 'default' },
      { name: 'default', required: false, description: '기본값', type: 'text' }
    ]
  },
  {
    name: 'acf_field',
    description: 'ACF 커스텀 필드 표시',
    template: '[acf_field name="custom_price" format="currency"]',
    parameters: [
      { name: 'name', required: true, description: 'ACF 필드명', type: 'text' },
      { name: 'post_id', required: false, description: '포스트 ID', type: 'text' },
      { name: 'format', required: false, description: '출력 포맷', type: 'select', options: ['raw', 'formatted', 'html'], default: 'formatted' },
      { name: 'type', required: false, description: '필드 타입', type: 'text' },
      { name: 'default', required: false, description: '기본값', type: 'text' }
    ]
  },
  {
    name: 'meta_field',
    description: '메타 필드 값 표시',
    template: '[meta_field key="_stock_status" default="재고 확인 중"]',
    parameters: [
      { name: 'key', required: true, description: '메타 키', type: 'text' },
      { name: 'post_id', required: false, description: '포스트 ID', type: 'text' },
      { name: 'format', required: false, description: '출력 포맷', type: 'text' },
      { name: 'default', required: false, description: '기본값', type: 'text' }
    ]
  },
  // Original shortcodes
  {
    name: 'gallery',
    description: 'Display image gallery',
    template: '[gallery ids="1,2,3" columns="3" size="medium"]',
    parameters: [
      { name: 'ids', required: true, description: 'Comma-separated image IDs', type: 'text' },
      { name: 'columns', required: false, description: 'Number of columns', type: 'number', default: '3' },
      { name: 'size', required: false, description: 'Image size', type: 'select', options: ['thumbnail', 'medium', 'large', 'full'], default: 'medium' }
    ]
  },
  {
    name: 'embed',
    description: 'Embed external content',
    template: '[embed width="560" height="315"]https://www.youtube.com/watch?v=example[/embed]',
    parameters: [
      { name: 'width', required: false, description: 'Width in pixels', type: 'number', default: '560' },
      { name: 'height', required: false, description: 'Height in pixels', type: 'number', default: '315' }
    ],
    hasContent: true
  },
  {
    name: 'button',
    description: 'Display button with link',
    template: '[button url="https://example.com" style="primary" size="medium"]Click here[/button]',
    parameters: [
      { name: 'url', required: true, description: 'Button URL', type: 'url' },
      { name: 'style', required: false, description: 'Button style', type: 'select', options: ['primary', 'secondary', 'outline'], default: 'primary' },
      { name: 'size', required: false, description: 'Button size', type: 'select', options: ['small', 'medium', 'large'], default: 'medium' }
    ],
    hasContent: true
  },
  {
    name: 'contact-form',
    description: 'Contact form',
    template: '[contact-form id="1" subject="Contact Form"]',
    parameters: [
      { name: 'id', required: true, description: 'Form ID', type: 'number' },
      { name: 'subject', required: false, description: 'Email subject', type: 'text', default: 'Contact Form' }
    ]
  },
  {
    name: 'custom',
    description: 'Custom shortcode',
    template: '[custom-shortcode param1="value1" param2="value2"]',
    parameters: []
  }
];

/**
 * Regex pattern for parsing WordPress shortcodes
 */
const SHORTCODE_REGEX = /\[(\w+)([^\]]*?)\](?:([^[]*(?:\[[^\]]*\][^[]*)*)?\[\/\1\])?/g;

/**
 * Parse shortcode attributes from string
 */
function parseShortcodeAttributes(attrString: string): Record<string, string> {
  const attributes: Record<string, string> = {};

  // Handle various attribute formats: name="value", name='value', name=value
  const attrRegex = /(\w+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g;

  let match;
  while ((match = attrRegex.exec(attrString)) !== null) {
    const [, name, doubleQuoted, singleQuoted, unquoted] = match;
    attributes[name] = doubleQuoted || singleQuoted || unquoted || '';
  }

  return attributes;
}

/**
 * Parse shortcode string into structured data
 */
function parseShortcode(shortcodeString: string): ShortcodeMatch | null {
  const match = SHORTCODE_REGEX.exec(shortcodeString);
  SHORTCODE_REGEX.lastIndex = 0; // Reset regex

  if (!match) return null;

  const [fullMatch, tag, attributeString, content] = match;
  const attributes = parseShortcodeAttributes(attributeString);

  return {
    tag,
    attributes,
    content: content?.trim(),
    selfClosing: !content
  };
}

/**
 * Validate shortcode structure
 */
function validateShortcode(shortcodeString: string): { valid: boolean; error?: string } {
  if (!shortcodeString.trim()) {
    return { valid: false, error: 'Shortcode cannot be empty' };
  }

  // Basic bracket matching
  const openBrackets = (shortcodeString.match(/\[/g) || []).length;
  const closeBrackets = (shortcodeString.match(/\]/g) || []).length;

  if (openBrackets !== closeBrackets) {
    return { valid: false, error: 'Mismatched brackets' };
  }

  // Try to parse the shortcode
  const parsed = parseShortcode(shortcodeString);
  if (!parsed) {
    return { valid: false, error: 'Invalid shortcode syntax' };
  }

  return { valid: true };
}

/**
 * Generate shortcode from template and parameters
 */
function generateShortcode(template: ShortcodeTemplate, parameters: Record<string, string>, content?: string): string {
  let shortcode = `[${template.name}`;

  // Add parameters
  Object.entries(parameters).forEach(([key, value]) => {
    if (value) {
      shortcode += ` ${key}="${value}"`;
    }
  });

  if (template.hasContent && content) {
    shortcode += `]${content}[/${template.name}]`;
  } else {
    shortcode += ']';
  }

  return shortcode;
}

const ShortcodeBlock: React.FC<ShortcodeBlockProps> = ({
  id,
  content,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {},
  canMoveUp = true,
  canMoveDown = true,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCopy,
  onPaste,
  onChangeType,
}) => {
  const {
    shortcode: initialShortcode,
    parameters = {},
    preview = '',
    valid = true,
    errorMessage = ''
  } = attributes;

  const [localShortcode, setLocalShortcode] = useState(initialShortcode || content || '');
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ShortcodeTemplate | null>(null);
  const [builderParams, setBuilderParams] = useState<Record<string, string>>({});
  const [builderContent, setBuilderContent] = useState('');
  const [copied, setCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with external content changes
  useEffect(() => {
    if (initialShortcode !== undefined) {
      setLocalShortcode(initialShortcode);
    } else if (content !== localShortcode) {
      setLocalShortcode(content);
    }
  }, [content, initialShortcode]);

  // Validate shortcode when it changes
  useEffect(() => {
    const validation = validateShortcode(localShortcode);

    if (validation.valid !== valid || validation.error !== errorMessage) {
      const parsed = parseShortcode(localShortcode);
      onChange(localShortcode, {
        ...attributes,
        shortcode: localShortcode,
        parameters: parsed?.attributes || {},
        valid: validation.valid,
        errorMessage: validation.error || ''
      });
    }
  }, [localShortcode]);

  // Handle shortcode change
  const handleShortcodeChange = (newShortcode: string) => {
    setLocalShortcode(newShortcode);
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localShortcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Copy failed, ignore silently
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: ShortcodeTemplate) => {
    setSelectedTemplate(template);

    // Initialize parameters with defaults
    const defaultParams: Record<string, string> = {};
    template.parameters.forEach(param => {
      if (param.default) {
        defaultParams[param.name] = param.default;
      }
    });
    setBuilderParams(defaultParams);
    setBuilderContent('');
    setShowBuilder(true);
  };

  // Handle parameter change in builder
  const handleParamChange = (paramName: string, value: string) => {
    setBuilderParams(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  // Generate shortcode from builder
  const handleGenerateShortcode = () => {
    if (selectedTemplate) {
      const generated = generateShortcode(selectedTemplate, builderParams, builderContent);
      setLocalShortcode(generated);
      setShowBuilder(false);
    }
  };

  // Parse current shortcode for display
  const parsedShortcode = parseShortcode(localShortcode);

  return (
    <EnhancedBlockWrapper
      id={id}
      type="shortcode"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      isDragging={isDragging}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onCopy={onCopy}
      onPaste={onPaste}
      onChangeType={onChangeType}
      currentType="core/shortcode"
      customToolbarContent={
        isSelected ? (
          <div className="flex items-center gap-2">
            <Button
              variant={showBuilder ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowBuilder(!showBuilder)}
            >
              <Settings className="h-3 w-3 mr-1" />
              Builder
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>

            {/* Validation status */}
            {valid ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                <span className="text-xs">Valid</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span className="text-xs">Invalid</span>
              </div>
            )}
          </div>
        ) : null
      }
      customSidebarContent={
        isSelected && showBuilder ? (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Shortcode Templates</Label>
              <div className="space-y-2 mt-2">
                {SHORTCODE_TEMPLATES.map((template) => (
                  <Button
                    key={template.name}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <Code className="h-3 w-3 mr-2" />
                    <div className="text-left">
                      <div className="font-medium">{template.name}</div>
                      <div className="text-gray-500">{template.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {selectedTemplate && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Configure: {selectedTemplate.name}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTemplate(null)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {selectedTemplate.parameters.map((param) => (
                    <div key={param.name}>
                      <Label className="text-xs font-medium flex items-center">
                        {param.name}
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>

                      {param.type === 'select' ? (
                        <select
                          value={builderParams[param.name] || param.default || ''}
                          onChange={(e) => handleParamChange(param.name, e.target.value)}
                          className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {param.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          type={param.type === 'number' ? 'number' : param.type === 'url' ? 'url' : 'text'}
                          value={builderParams[param.name] || ''}
                          onChange={(e) => handleParamChange(param.name, e.target.value)}
                          placeholder={param.default || param.description}
                          className="mt-1 text-xs"
                        />
                      )}

                      <p className="text-xs text-gray-500 mt-1">{param.description}</p>
                    </div>
                  ))}

                  {selectedTemplate.hasContent && (
                    <div>
                      <Label className="text-xs font-medium">Content</Label>
                      <Textarea
                        value={builderContent}
                        onChange={(e) => setBuilderContent(e.target.value)}
                        placeholder="Enter shortcode content..."
                        className="mt-1 text-xs"
                        rows={3}
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleGenerateShortcode}
                    className="w-full mt-3"
                    size="sm"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Generate Shortcode
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null
      }
    >
      <div className="relative">
        {/* Error message */}
        {!valid && errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <div className="flex items-center text-red-800">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span className="font-medium">Invalid Shortcode</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
          </div>
        )}

        {/* Shortcode input */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Shortcode</Label>
            {parsedShortcode && (
              <div className="text-xs text-gray-500">
                Tag: <span className="font-mono bg-gray-100 px-1 rounded">{parsedShortcode.tag}</span>
              </div>
            )}
          </div>

          <Textarea
            ref={textareaRef}
            value={localShortcode}
            onChange={(e) => handleShortcodeChange(e.target.value)}
            placeholder="[shortcode attribute=&quot;value&quot;]content[/shortcode]"
            className={cn(
              'font-mono text-sm',
              !valid && 'border-red-300 focus:border-red-500 focus:ring-red-500'
            )}
            rows={Math.max(2, localShortcode.split('\n').length)}
          />
        </div>

        {/* Parsed parameters display */}
        {parsedShortcode && Object.keys(parsedShortcode.attributes).length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <Label className="text-xs font-medium text-gray-700">Parameters</Label>
            <div className="mt-2 space-y-1">
              {Object.entries(parsedShortcode.attributes).map(([key, value]) => (
                <div key={key} className="flex items-center text-xs">
                  <span className="font-mono bg-blue-100 text-blue-800 px-1 rounded mr-2">{key}</span>
                  <span className="text-gray-600">=</span>
                  <span className="font-mono bg-green-100 text-green-800 px-1 rounded ml-2">{value}</span>
                </div>
              ))}
            </div>

            {parsedShortcode.content && (
              <div className="mt-2">
                <Label className="text-xs font-medium text-gray-700">Content</Label>
                <div className="mt-1 p-2 bg-white border rounded text-xs font-mono">
                  {parsedShortcode.content}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help section when empty */}
        {!localShortcode && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-blue-800 mb-2">
              <Book className="h-4 w-4 mr-2" />
              <span className="font-medium">Shortcode Examples</span>
            </div>
            <div className="space-y-2 text-sm text-blue-700">
              <div>
                <code className="bg-blue-100 px-1 rounded">[gallery ids="1,2,3" columns="3"]</code>
                <span className="ml-2">- Display image gallery</span>
              </div>
              <div>
                <code className="bg-blue-100 px-1 rounded">[button url="#"]Click me[/button]</code>
                <span className="ml-2">- Button with content</span>
              </div>
              <div>
                <code className="bg-blue-100 px-1 rounded">[contact-form id="1"]</code>
                <span className="ml-2">- Contact form</span>
              </div>
            </div>

            <p className="text-xs text-blue-600 mt-3">
              Use the Builder to create shortcodes with guided parameters.
            </p>
          </div>
        )}
      </div>
    </EnhancedBlockWrapper>
  );
};

export default ShortcodeBlock;