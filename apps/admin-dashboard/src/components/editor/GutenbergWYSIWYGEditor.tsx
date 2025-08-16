/**
 * Gutenberg WYSIWYG Editor
 * True inline editing experience like WordPress Gutenberg
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BlockEditorProvider,
  BlockCanvas,
  BlockTools,
  BlockInspector,
  BlockToolbar,
  WritingFlow,
  ObserveTyping,
  BlockList,
  Inserter,
  BlockNavigationDropdown,
  BlockBreadcrumb,
  __experimentalLibrary as Library
} from '@wordpress/block-editor';
import { 
  createBlock,
  serialize,
  parse,
  registerBlockType,
  unregisterBlockType,
  getBlockTypes
} from '@wordpress/blocks';
import {
  DropdownMenu,
  Button as WPButton,
  Popover,
  SlotFillProvider,
  ToolbarButton,
  ToolbarGroup
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { plus, more, undo, redo, navigation, formatListBullets } from '@wordpress/icons';
import { Button } from '../ui/button';
import { 
  Save, 
  Eye, 
  EyeOff, 
  Maximize2,
  Settings,
  Info,
  FileText,
  ChevronDown,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { initializeCustomBlocks } from '../../blocks';
import { ensureWordPressLoaded } from '@/utils/wordpress-loader';

interface GutenbergWYSIWYGEditorProps {
  initialContent?: string;
  onChange?: (content: string, blocks: any[]) => void;
  onSave?: (content: string) => void;
  title?: string;
  onTitleChange?: (title: string) => void;
  autoSave?: boolean;
  showInspector?: boolean;
  fullScreen?: boolean;
}

const GutenbergWYSIWYGEditor: React.FC<GutenbergWYSIWYGEditorProps> = ({
  initialContent = '',
  onChange,
  onSave,
  title = '',
  onTitleChange,
  autoSave = true,
  showInspector = false,
  fullScreen = false
}) => {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(fullScreen);
  const [showBlockInspector, setShowBlockInspector] = useState(showInspector);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [documentTitle, setDocumentTitle] = useState(title);
  const [showInserter, setShowInserter] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Editor settings for true WYSIWYG experience
  const editorSettings = {
    alignWide: true,
    allowedBlockTypes: true,
    bodyPlaceholder: __('Start writing or type / to choose a block'),
    codeEditingEnabled: true,
    disableCustomColors: false,
    disableCustomFontSizes: false,
    disableCustomGradients: false,
    enableCustomLineHeight: true,
    enableCustomSpacing: true,
    enableCustomUnits: true,
    fontSizes: [
      { name: 'Small', size: 13, slug: 'small' },
      { name: 'Normal', size: 16, slug: 'normal' },
      { name: 'Medium', size: 20, slug: 'medium' },
      { name: 'Large', size: 36, slug: 'large' },
      { name: 'Huge', size: 48, slug: 'huge' }
    ],
    hasFixedToolbar: false,
    hasInlineToolbar: true,
    imageEditing: true,
    imageDefaultSize: 'large',
    imageSizes: [
      { slug: 'thumbnail', name: 'Thumbnail' },
      { slug: 'medium', name: 'Medium' },
      { slug: 'large', name: 'Large' },
      { slug: 'full', name: 'Full Size' }
    ],
    isRTL: false,
    keepCaretInsideBlock: false,
    maxWidth: 840,
    styles: [],
    template: null,
    templateLock: false,
    titlePlaceholder: __('Add title'),
    // Enable inline editing features
    __experimentalFeatures: {
      'appearanceTools': true,
      'border': {
        'color': true,
        'radius': true,
        'style': true,
        'width': true
      },
      'color': {
        'background': true,
        'gradient': true,
        'link': true,
        'text': true
      },
      'spacing': {
        'blockGap': true,
        'margin': true,
        'padding': true
      },
      'typography': {
        'customFontSize': true,
        'dropCap': true,
        'fontStyle': true,
        'fontWeight': true,
        'letterSpacing': true,
        'lineHeight': true,
        'textDecoration': true,
        'textTransform': true
      }
    }
  };

  // Initialize WordPress and blocks
  useEffect(() => {
    const initEditor = async () => {
      await ensureWordPressLoaded();
      initializeCustomBlocks();
      setIsReady(true);
    };
    initEditor();
  }, []);

  // Parse initial content
  useEffect(() => {
    if (isReady && initialContent) {
      try {
        const parsedBlocks = parse(initialContent);
        if (parsedBlocks.length > 0) {
          setBlocks(parsedBlocks);
        } else {
          // Start with an empty paragraph
          setBlocks([createBlock('core/paragraph')]);
        }
      } catch (error) {
        console.error('Error parsing content:', error);
        setBlocks([createBlock('core/paragraph')]);
      }
    } else if (isReady && !initialContent) {
      // Start with an empty paragraph
      setBlocks([createBlock('core/paragraph')]);
    }
  }, [isReady, initialContent]);

  // Handle block changes
  const handleBlocksChange = useCallback((newBlocks: any[]) => {
    setBlocks(newBlocks);
    
    if (onChange) {
      const content = serialize(newBlocks);
      onChange(content, newBlocks);
    }

    // Auto-save logic
    if (autoSave && onSave) {
      // Debounced auto-save
      clearTimeout((window as any).__autoSaveTimeout);
      (window as any).__autoSaveTimeout = setTimeout(() => {
        const content = serialize(newBlocks);
        onSave(content);
      }, 2000);
    }
  }, [onChange, onSave, autoSave]);

  // Handle title change
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setDocumentTitle(newTitle);
    if (onTitleChange) {
      onTitleChange(newTitle);
    }
  }, [onTitleChange]);

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave) {
      setIsSaving(true);
      const content = serialize(blocks);
      onSave(content);
      setTimeout(() => setIsSaving(false), 1000);
    }
  }, [blocks, onSave]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Cmd/Ctrl + Shift + P to toggle preview
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setShowPreview(!showPreview);
      }
      // Escape to exit fullscreen
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, showPreview, isFullScreen]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <SlotFillProvider>
      <div 
        className={cn(
          "gutenberg-wysiwyg-editor",
          isFullScreen && "fixed inset-0 z-50 bg-white",
          !isFullScreen && "h-full"
        )}
        ref={editorRef}
      >
        {/* Top Toolbar - Gutenberg Style */}
        <div className="editor-header bg-white border-b sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 py-2">
            {/* Left side - Editor controls */}
            <div className="flex items-center gap-2">
              {/* Add block button */}
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => setShowInserter(!showInserter)}
              >
                <div className={cn(
                  "w-6 h-6 rounded flex items-center justify-center transition-all",
                  showInserter ? "bg-black text-white rotate-45" : "bg-blue-600 text-white"
                )}>
                  <plus className="w-4 h-4" />
                </div>
              </Button>

              {/* Block navigation */}
              <BlockNavigationDropdown />

              {/* Undo/Redo */}
              <div className="flex items-center border-l pl-2 ml-2">
                <Button variant="ghost" size="sm" className="p-2">
                  <undo className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="p-2">
                  <redo className="w-4 h-4" />
                </Button>
              </div>

              {/* View options */}
              <div className="flex items-center border-l pl-2 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2"
                  onClick={() => setIsFullScreen(!isFullScreen)}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Right side - Document controls */}
            <div className="flex items-center gap-2">
              {/* Save status */}
              {isSaving && (
                <span className="text-sm text-gray-500">Saving...</span>
              )}
              
              {/* Preview button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                Preview
              </Button>

              {/* Settings toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBlockInspector(!showBlockInspector)}
              >
                <Settings className="w-4 h-4" />
              </Button>

              {/* Publish/Update button */}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Publish
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="editor-body flex h-[calc(100%-60px)]">
          {/* Block Inserter Sidebar */}
          {showInserter && (
            <div className="w-80 bg-gray-50 border-r overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Add Block</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowInserter(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Library />
              </div>
            </div>
          )}

          {/* Editor Canvas */}
          <BlockEditorProvider
            value={blocks}
            onInput={handleBlocksChange}
            onChange={handleBlocksChange}
            settings={editorSettings}
          >
            <div className="flex-1 overflow-y-auto">
              <div className="editor-canvas max-w-5xl mx-auto px-8 py-12">
                {/* Title */}
                <input
                  ref={titleRef}
                  type="text"
                  value={documentTitle}
                  onChange={handleTitleChange}
                  placeholder="Add title"
                  className="w-full text-4xl font-bold border-none outline-none mb-8 placeholder-gray-400"
                  style={{ lineHeight: 1.2 }}
                />

                {/* Block Editor Canvas */}
                {!showPreview ? (
                  <div className="prose prose-lg max-w-none">
                    <BlockTools>
                      <WritingFlow>
                        <ObserveTyping>
                          <BlockList
                            className="wp-block-list"
                            __experimentalLayout={{
                              type: 'default',
                              alignments: []
                            }}
                          />
                        </ObserveTyping>
                      </WritingFlow>
                    </BlockTools>
                  </div>
                ) : (
                  /* Preview Mode */
                  <div className="prose prose-lg max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: serialize(blocks) }} />
                  </div>
                )}
              </div>
            </div>

            {/* Inspector Sidebar */}
            {showBlockInspector && (
              <div className="w-80 bg-white border-l overflow-y-auto">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Block Settings</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowBlockInspector(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <BlockInspector />
                </div>
              </div>
            )}
          </BlockEditorProvider>
        </div>

        {/* Block Breadcrumb */}
        <div className="editor-footer border-t bg-gray-50 px-4 py-2">
          <BlockBreadcrumb />
        </div>
      </div>

      <style jsx global>{`
        /* Gutenberg WYSIWYG Editor Styles */
        .gutenberg-wysiwyg-editor {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Editor Canvas */
        .editor-canvas {
          min-height: calc(100vh - 200px);
        }

        /* Block List */
        .wp-block-list .block-editor-block-list__layout {
          position: relative;
        }

        /* Block hover and selection */
        .wp-block-list .block-editor-block-list__block {
          position: relative;
          margin-top: 28px;
          margin-bottom: 28px;
        }

        .wp-block-list .block-editor-block-list__block:first-child {
          margin-top: 0;
        }

        .wp-block-list .block-editor-block-list__block.is-selected {
          outline: 1px solid #1e40af;
          outline-offset: 1px;
        }

        .wp-block-list .block-editor-block-list__block.is-hovered {
          outline: 1px dashed #1e40af;
          outline-offset: 1px;
        }

        /* Block Toolbar */
        .block-editor-block-contextual-toolbar {
          position: absolute;
          top: -48px;
          left: 0;
          z-index: 30;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        /* Inline Rich Text */
        .block-editor-rich-text__editable {
          outline: none;
          word-break: break-word;
          white-space: pre-wrap;
        }

        .block-editor-rich-text__editable:focus {
          outline: none;
        }

        /* Block Inserter */
        .block-editor-default-block-appender {
          margin-top: 28px;
        }

        .block-editor-default-block-appender .block-editor-default-block-appender__content {
          color: #9ca3af;
        }

        /* Typography */
        .editor-canvas h1 { font-size: 2.5em; font-weight: 700; }
        .editor-canvas h2 { font-size: 2em; font-weight: 600; }
        .editor-canvas h3 { font-size: 1.75em; font-weight: 600; }
        .editor-canvas h4 { font-size: 1.5em; font-weight: 600; }
        .editor-canvas h5 { font-size: 1.25em; font-weight: 600; }
        .editor-canvas h6 { font-size: 1.125em; font-weight: 600; }

        .editor-canvas p {
          line-height: 1.8;
          margin-bottom: 1.5em;
        }

        /* Placeholder text */
        .block-editor-rich-text__editable[data-is-placeholder-visible="true"]::before {
          content: attr(aria-label);
          pointer-events: none;
          color: #9ca3af;
        }

        /* Plus button for adding blocks inline */
        .block-editor-block-list__insertion-point-inserter {
          position: absolute;
          left: -44px;
          top: 4px;
        }

        .block-editor-block-list__insertion-point-inserter .block-editor-inserter__toggle {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          background: #1e40af;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .block-editor-block-list__insertion-point-inserter .block-editor-inserter__toggle:hover {
          transform: scale(1.1);
          background: #1e3a8a;
        }

        /* Popover and dropdown menus */
        .components-popover {
          z-index: 100000;
        }

        .components-popover__content {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
        }

        /* Focus mode styles */
        .is-fullscreen-mode .editor-header {
          transition: transform 0.3s ease;
        }

        .is-fullscreen-mode.is-focus-mode .editor-header {
          transform: translateY(-100%);
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .editor-canvas {
            padding: 1rem;
          }

          .wp-block-list .block-editor-block-list__block {
            margin-top: 20px;
            margin-bottom: 20px;
          }
        }
      `}</style>
    </SlotFillProvider>
  );
};

export default GutenbergWYSIWYGEditor;