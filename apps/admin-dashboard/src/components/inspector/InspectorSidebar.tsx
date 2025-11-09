/**
 * InspectorSidebar Component
 * Right sidebar for block and document settings (WordPress Gutenberg style)
 */

import React, { useState } from 'react';
import { Settings, FileText } from 'lucide-react';
import { Block } from '@/types/post.types';

interface InspectorSidebarProps {
  selectedBlock?: Block | null;
  blocks: Block[];
  documentSettings?: {
    status: string;
    visibility: string;
    publishDate: string;
    categories: string[];
    tags: string[];
    featuredImage?: string;
    excerpt?: string;
  };
  onBlockUpdate?: (blockId: string, updates: { content?: any; attributes?: any }) => void;
  onDocumentUpdate?: (settings: any) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

type InspectorTab = 'block' | 'document';

export const InspectorSidebar: React.FC<InspectorSidebarProps> = ({
  selectedBlock,
  blocks,
  documentSettings,
  onBlockUpdate,
  onDocumentUpdate,
  isOpen = true,
  onToggle,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('block');

  if (!isOpen) {
    return null;
  }

  return (
    <div className="inspector-sidebar">
      {/* Tabs */}
      <div className="inspector-tabs">
        <button
          className={`inspector-tab ${activeTab === 'block' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('block')}
          aria-label="Block settings"
        >
          <Settings size={20} />
          <span>Block</span>
        </button>
        <button
          className={`inspector-tab ${activeTab === 'document' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('document')}
          aria-label="Document settings"
        >
          <FileText size={20} />
          <span>Document</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="inspector-content">
        {activeTab === 'block' && (
          <div className="inspector-panel">
            {selectedBlock ? (
              <BlockInspector
                block={selectedBlock}
                onUpdate={(updates) => onBlockUpdate?.(selectedBlock.id, updates)}
              />
            ) : (
              <div className="inspector-empty-state">
                <Settings size={48} className="text-gray-300" />
                <p className="text-gray-500 text-sm mt-4">
                  Select a block to view its settings
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'document' && (
          <div className="inspector-panel">
            <DocumentInspector
              settings={documentSettings}
              blocks={blocks}
              onUpdate={onDocumentUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * BlockInspector - Settings for selected block
 */
interface BlockInspectorProps {
  block: Block;
  onUpdate: (updates: { content?: any; attributes?: any }) => void;
}

const BlockInspector: React.FC<BlockInspectorProps> = ({ block, onUpdate }) => {
  // Dynamically import block settings
  const getBlockSettingsComponent = () => {
    // Map block types to settings components
    const settingsMap: Record<string, React.ComponentType<any>> = {
      'o4o/paragraph': React.lazy(() => import('./block-settings/ParagraphSettings').then(m => ({ default: m.ParagraphSettings }))),
      'o4o/heading': React.lazy(() => import('./block-settings/HeadingSettings').then(m => ({ default: m.HeadingSettings }))),
      'o4o/image': React.lazy(() => import('./block-settings/ImageSettings').then(m => ({ default: m.ImageSettings }))),
      'o4o/button': React.lazy(() => import('./block-settings/ButtonSettings').then(m => ({ default: m.ButtonSettings }))),
      'o4o/list': React.lazy(() => import('./block-settings/ListSettings').then(m => ({ default: m.ListSettings }))),
    };

    return settingsMap[block.type] || null;
  };

  const BlockSettingsComponent = getBlockSettingsComponent();

  return (
    <div className="block-inspector">
      {/* Block Type Header */}
      <div className="inspector-header">
        <h3 className="inspector-title">{block.type}</h3>
        <p className="inspector-subtitle text-xs text-gray-500">
          Block ID: {block.id}
        </p>
      </div>

      {/* Block Settings Panel */}
      <div className="inspector-panels">
        {BlockSettingsComponent ? (
          <React.Suspense fallback={<div className="text-sm text-gray-500">Loading settings...</div>}>
            <BlockSettingsComponent block={block} onUpdate={onUpdate} />
          </React.Suspense>
        ) : (
          <div className="text-sm text-gray-500 p-4">
            No specific settings available for this block type.
          </div>
        )}

        {/* Advanced Settings - Always show */}
        <div className="inspector-panel-section">
          <h4 className="inspector-section-title">Advanced</h4>
          <div className="inspector-controls">
            <div className="inspector-control">
              <label className="inspector-label text-xs">Additional CSS Class(es)</label>
              <input
                type="text"
                className="inspector-input text-sm"
                placeholder="custom-class"
                value={(block.attributes?.className as string) || ''}
                onChange={(e) => onUpdate({
                  attributes: { ...block.attributes, className: e.target.value }
                })}
              />
            </div>
            <div className="inspector-control">
              <label className="inspector-label text-xs">HTML Anchor</label>
              <input
                type="text"
                className="inspector-input text-sm"
                placeholder="unique-id"
                value={(block.attributes?.anchor as string) || ''}
                onChange={(e) => onUpdate({
                  attributes: { ...block.attributes, anchor: e.target.value }
                })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * DocumentInspector - Document-level settings
 */
interface DocumentInspectorProps {
  settings?: any;
  blocks: Block[];
  onUpdate?: (settings: any) => void;
}

const DocumentInspector: React.FC<DocumentInspectorProps> = ({
  settings,
  blocks,
  onUpdate,
}) => {
  return (
    <div className="document-inspector">
      {/* Document Header */}
      <div className="inspector-header">
        <h3 className="inspector-title">Document</h3>
      </div>

      {/* Document Settings */}
      <div className="inspector-panels">
        {/* Status & Visibility */}
        <div className="inspector-panel-section">
          <h4 className="inspector-section-title">Status & Visibility</h4>
          <div className="inspector-controls">
            <div className="inspector-control">
              <label className="inspector-label text-xs">Status</label>
              <div className="text-sm">
                {settings?.status || 'Draft'}
              </div>
            </div>
            <div className="inspector-control">
              <label className="inspector-label text-xs">Visibility</label>
              <div className="text-sm">
                {settings?.visibility || 'Public'}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="inspector-panel-section">
          <h4 className="inspector-section-title">Statistics</h4>
          <div className="inspector-controls">
            <div className="inspector-stat">
              <span className="text-xs text-gray-500">Blocks:</span>
              <span className="text-sm font-medium">{blocks.length}</span>
            </div>
            <div className="inspector-stat">
              <span className="text-xs text-gray-500">Words:</span>
              <span className="text-sm font-medium">
                {blocks.reduce((count, block) => {
                  const text = typeof block.content === 'string'
                    ? block.content
                    : block.content?.text || '';
                  return count + text.split(/\s+/).filter(Boolean).length;
                }, 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Categories & Tags */}
        {settings?.categories && (
          <div className="inspector-panel-section">
            <h4 className="inspector-section-title">Categories</h4>
            <div className="inspector-controls">
              <div className="flex flex-wrap gap-2">
                {settings.categories.map((cat: string, idx: number) => (
                  <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {settings?.tags && settings.tags.length > 0 && (
          <div className="inspector-panel-section">
            <h4 className="inspector-section-title">Tags</h4>
            <div className="inspector-controls">
              <div className="flex flex-wrap gap-2">
                {settings.tags.map((tag: string, idx: number) => (
                  <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InspectorSidebar;
