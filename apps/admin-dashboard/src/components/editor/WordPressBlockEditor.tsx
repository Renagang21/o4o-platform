/**
 * WordPress Block Editor Integration
 * 
 * Integrates @wordpress/block-editor with existing admin dashboard
 */

import { useState, useEffect, useRef } from 'react';
import { ensureWordPressLoaded } from '@/utils/wordpress-loader';
import { 
  BlockEditorProvider, 
  BlockList, 
  WritingFlow, 
  ObserveTyping,
  BlockInspector,
  BlockToolbar
} from '@wordpress/block-editor';
import { 
  createBlock, 
  serialize, 
  parse 
} from '@wordpress/blocks';
import { SlotFillProvider } from '@wordpress/components';
import { Button } from '../ui/button';
import { Save, Archive, Layers, AlertCircle, RotateCcw } from 'lucide-react';
import ReusableBlocksBrowser from './ReusableBlocksBrowser';
import SaveAsReusableBlockModal from './SaveAsReusableBlockModal';
import BlockPatternsBrowser from './BlockPatternsBrowser';
import useReusableBlocks from '../../hooks/useReusableBlocks';
import useBlockPatterns from '../../hooks/useBlockPatterns';
import { initializeCustomBlocks } from '../../blocks';
import { initializeLazyBlocks, loadBlocksForContent } from '../../blocks/lazy';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { useAutoSave } from '../../hooks/useAutoSave';
import { EditorSkeleton, SaveIndicator } from '../common/LoadingStates';
import { Alert, AlertDescription } from '../ui/alert';
// import { ShortcutProvider } from '@wordpress/keyboard-shortcuts';
// import { DropZoneProvider } from '@wordpress/compose';
// import { uploadMedia } from '@wordpress/media-utils';

interface WordPressBlockEditorProps {
  initialContent?: string;
  onChange?: (content: string, blocks: any[]) => void;
  settings?: any;
  readOnly?: boolean;
  showReusableBlocks?: boolean;
}

interface EditorSettings {
  alignWide: boolean;
  availableTemplates: any[];
  allowedBlockTypes: boolean | string[];
  disableCustomColors: boolean;
  disableCustomFontSizes: boolean;
  disableCustomGradients: boolean;
  enableCustomSpacing: boolean;
  isRTL: boolean;
  mediaUpload?: (args: any) => void;
  __experimentalBlockPatterns: any[];
  __experimentalSetIsInserterOpened: (isOpen: boolean) => void;
}

const WordPressBlockEditor: React.FC<WordPressBlockEditorProps> = ({
  initialContent = '',
  onChange,
  settings = {},
  showReusableBlocks = true
}) => {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlocks] = useState<any[]>([]); // TODO: Implement proper block selection
  const [showReusableBlocksBrowser, setShowReusableBlocksBrowser] = useState(false);
  const [showSaveAsReusableModal, setShowSaveAsReusableModal] = useState(false);
  const [showBlockPatternsBrowser, setShowBlockPatternsBrowser] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isWordPressReady, setIsWordPressReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { insertReusableBlock, loading: reusableBlocksLoading } = useReusableBlocks();
  const { insertBlockPattern, loading: blockPatternsLoading } = useBlockPatterns();
  
  // Performance monitoring
  const { metrics, measureRenderTime } = usePerformanceMonitor({
    onPerformanceIssue: (metrics) => {
      if (metrics.blockCount > 100) {
    // Removed console.warn
      }
    }
  });
  
  // Auto-save functionality
  const {
    isSaving,
    lastSavedAt,
    backupExists,
    updateContent,
    restoreFromBackup
  } = useAutoSave(blocks, {
    onSave: async (data) => {
      // Integrate with your save API
      if (onChange) {
        onChange(serialize(data), data);
      }
    },
    saveInterval: 30000, // 30 seconds
    debounceDelay: 1000 // 1 second
  });

  // Default editor settings
  const defaultSettings: EditorSettings = {
    alignWide: true,
    availableTemplates: [],
    allowedBlockTypes: true,
    disableCustomColors: false,
    disableCustomFontSizes: false,
    disableCustomGradients: false,
    enableCustomSpacing: true,
    isRTL: false,
    mediaUpload: (_options: any) => {
      // Handle media upload - integrate with existing media system
      // TODO: Integrate with admin dashboard media system
    },
    __experimentalBlockPatterns: [],
    __experimentalSetIsInserterOpened: () => {},
    ...settings
  };

  // Initialize editor systems on mount
  // WordPress 모듈 초기화
  useEffect(() => {
    ensureWordPressLoaded().then(() => {
      setIsWordPressReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isWordPressReady) return;
    
    const initializeEditor = async () => {
      setIsInitializing(true);
      
      try {
        // Initialize custom blocks
        initializeCustomBlocks();
        
        // Initialize lazy loading
        initializeLazyBlocks();
        
        // Load blocks for initial content
        if (initialContent) {
          await loadBlocksForContent(initialContent);
        }
        
        // Check for backup
        if (backupExists && !initialContent) {
          const shouldRestore = window.confirm('Found unsaved changes. Would you like to restore them?');
          if (shouldRestore) {
            const restoredContent = await restoreFromBackup();
            if (restoredContent) {
              setBlocks(restoredContent);
              setIsInitializing(false);
              return;
            }
          }
        }
      } catch (error) {
    // Error logging - use proper error handler
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeEditor();
  }, [isWordPressReady]);

  // Initialize blocks from content
  useEffect(() => {
    if (initialContent) {
      try {
        // Try to parse as WordPress blocks first
        const parsedBlocks = parse(initialContent);
        if (parsedBlocks.length > 0) {
          setBlocks(parsedBlocks);
        } else {
          // Fallback: create a paragraph block with the content
          const paragraphBlock = createBlock('core/paragraph', {
            content: initialContent
          });
          setBlocks([paragraphBlock]);
        }
      } catch (error) {
    // Removed console.warn
        // Create empty paragraph as fallback
        const emptyBlock = createBlock('core/paragraph');
        setBlocks([emptyBlock]);
      }
    } else {
      // Start with empty paragraph
      const emptyBlock = createBlock('core/paragraph');
      setBlocks([emptyBlock]);
    }
  }, [initialContent]);

  // Handle block changes with performance monitoring
  const handleBlocksChange = (newBlocks: any[]) => {
    measureRenderTime(() => {
      setBlocks(newBlocks);
      
      // Update auto-save content
      updateContent(newBlocks);
      
      if (onChange) {
        try {
          const serializedContent = serialize(newBlocks);
          onChange(serializedContent, newBlocks);
        } catch (error) {
    // Error logging - use proper error handler
        }
      }
    });
  };

  // Handle block selection changes (currently unused but needed for future implementation)
  // const handleSelectionChange = (clientIds: string[]) => {
  //   const selected = blocks.filter(block => clientIds.includes(block.clientId));
  //   setSelectedBlocks(selected);
  // };

  // Handle inserting reusable block
  const handleInsertReusableBlock = async (reusableBlock: any) => {
    try {
      const blocksToInsert = await insertReusableBlock(reusableBlock.id);
      if (blocksToInsert && blocksToInsert.length > 0) {
        const newBlocks = [...blocks, ...blocksToInsert];
        handleBlocksChange(newBlocks);
        setShowReusableBlocksBrowser(false);
      }
    } catch (error) {
    // Error logging - use proper error handler
    }
  };

  // Handle inserting block pattern
  const handleInsertBlockPattern = async (pattern: any) => {
    try {
      const blocksToInsert = await insertBlockPattern(pattern.id);
      if (blocksToInsert && blocksToInsert.length > 0) {
        const newBlocks = [...blocks, ...blocksToInsert];
        handleBlocksChange(newBlocks);
        setShowBlockPatternsBrowser(false);
      }
    } catch (error) {
    // Error logging - use proper error handler
    }
  };

  // Handle saving selected blocks as reusable
  const handleSaveAsReusable = () => {
    if (selectedBlocks.length > 0) {
      setShowSaveAsReusableModal(true);
    }
  };

  // Handle successful save of reusable block
  const handleReusableBlockSaved = () => {
    // Reusable block saved
    // TODO: Show success toast
  };

  // Show loading skeleton while initializing
  if (!isWordPressReady || isInitializing) {
    return <EditorSkeleton showSidebar={true} />;
  }

  return (
    <div className="wordpress-block-editor" ref={containerRef}>
      {/* Performance warning banner */}
      {metrics.blockCount > 100 && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            High block count ({metrics.blockCount} blocks) may affect performance. 
            Consider splitting content into multiple pages.
          </AlertDescription>
        </Alert>
      )}

      {/* Auto-save restore banner */}
      {backupExists && (
        <Alert className="mb-4">
          <AlertDescription className="flex items-center justify-between">
            <span>Found unsaved changes from your last session.</span>
            <Button
              size="sm"
              variant="outline"
              onClick={restoreFromBackup}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <SlotFillProvider>
        <BlockEditorProvider
          value={blocks}
          onInput={handleBlocksChange}
          onChange={handleBlocksChange}
          settings={defaultSettings}
          useSubRegistry={false}
        >
          {/* Enhanced toolbar with reusable blocks and save status */}
          <div className="block-editor-toolbar">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <BlockToolbar />
                {/* Save indicator */}
                <SaveIndicator 
                  isSaving={isSaving}
                  lastSavedAt={lastSavedAt}
                  hasError={false}
                />
              </div>
              
              {showReusableBlocks && (
                <div className="flex items-center gap-2">
                  {selectedBlocks.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveAsReusable}
                      disabled={reusableBlocksLoading}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save as Reusable
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowReusableBlocksBrowser(true)}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Reusable Blocks
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowBlockPatternsBrowser(true)}
                    disabled={blockPatternsLoading}
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    Block Patterns
                  </Button>
                </div>
              )}
            </div>
          </div>
              
              <div className="block-editor-content">
                <WritingFlow>
                  <ObserveTyping>
                    <BlockList 
                      className="block-editor-block-list"
                    />
                  </ObserveTyping>
                </WritingFlow>
              </div>

              {/* Block Inspector (Sidebar) */}
              <div className="block-editor-inspector">
                <BlockInspector />
              </div>

          {/* Popovers for block controls are now managed automatically in newer versions */}
        </BlockEditorProvider>
      </SlotFillProvider>

      {/* Reusable Blocks Browser Modal */}
      {showReusableBlocksBrowser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Reusable Blocks</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReusableBlocksBrowser(false)}
              >
                ×
              </Button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
              <ReusableBlocksBrowser
                onInsertBlock={handleInsertReusableBlock}
                compact={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Save as Reusable Block Modal */}
      <SaveAsReusableBlockModal
        isOpen={showSaveAsReusableModal}
        onClose={() => setShowSaveAsReusableModal(false)}
        selectedBlocks={selectedBlocks}
        onSaved={handleReusableBlockSaved}
      />

      {/* Block Patterns Browser Modal */}
      {showBlockPatternsBrowser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Block Patterns</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBlockPatternsBrowser(false)}
              >
                ×
              </Button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
              <BlockPatternsBrowser
                onInsertPattern={handleInsertBlockPattern}
                compact={false}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        .wordpress-block-editor {
          display: flex;
          flex-direction: column;
          height: 100%;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
        }

        .block-editor-toolbar {
          background: #fff;
          border-bottom: 1px solid #e0e0e0;
          padding: 8px 16px;
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .block-editor-content {
          flex: 1;
          overflow: auto;
          padding: 16px;
          background: #fff;
        }

        .block-editor-inspector {
          width: 280px;
          background: #f8f9fa;
          border-left: 1px solid #e0e0e0;
          overflow: auto;
        }

        /* WordPress Block Editor Styles */
        :global(.block-editor-block-list__layout) {
          max-width: 840px;
          margin: 0 auto;
        }

        :global(.block-editor-block-list__block) {
          margin: 28px 0;
        }

        :global(.block-editor-block-list__block.is-selected) {
          outline: 1px solid #007cba;
          outline-offset: -1px;
        }

        :global(.block-editor-block-list__block.is-hovered) {
          outline: 1px solid #007cba;
          outline-offset: -1px;
          outline-style: dashed;
        }

        /* Block Toolbar Styles */
        :global(.block-editor-block-toolbar) {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }

        /* Popover Styles */
        :global(.components-popover) {
          z-index: 1000000;
        }

        :global(.components-popover__content) {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }

        /* Inspector Styles */
        :global(.block-editor-block-inspector) {
          padding: 16px;
        }

        :global(.block-editor-block-inspector .components-panel) {
          border: none;
          margin-bottom: 16px;
        }

        :global(.block-editor-block-inspector .components-panel__header) {
          background: #f8f9fa;
          border-bottom: 1px solid #e0e0e0;
          padding: 8px 16px;
          font-weight: 600;
        }

        :global(.block-editor-block-inspector .components-panel__body) {
          padding: 16px;
        }
      `}</style>
    </div>
  );
};

export default WordPressBlockEditor;