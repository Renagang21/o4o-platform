/**
 * WordPress Block Editor with Dynamic Module Loading
 * 
 * This version dynamically loads WordPress modules to avoid initialization errors
 */

import { useState, useEffect, useRef } from 'react';
import { ensureWordPressLoaded } from '@/utils/wordpress-loader';
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

interface WordPressBlockEditorProps {
  initialContent?: string;
  onChange?: (serialized: string, blocks: any[]) => void;
  className?: string;
  settings?: any;
}

interface EditorSettings {
  alignWide?: boolean;
  availableTemplates?: any[];
  allowedBlockTypes?: boolean | string[];
  disableCustomColors?: boolean;
  disableCustomFontSizes?: boolean;
  disableCustomGradients?: boolean;
  enableCustomSpacing?: boolean;
  isRTL?: boolean;
  mediaUpload?: (options: any) => void;
  __experimentalBlockPatterns?: any[];
  __experimentalSetIsInserterOpened?: (isOpen: boolean) => void;
}

export default function WordPressBlockEditorDynamic({
  initialContent = '',
  onChange,
  className,
  settings
}: WordPressBlockEditorProps) {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlocks] = useState<any[]>([]);
  const [showReusableBlocksBrowser, setShowReusableBlocksBrowser] = useState(false);
  const [showSaveAsReusableModal, setShowSaveAsReusableModal] = useState(false);
  const [showBlockPatternsBrowser, setShowBlockPatternsBrowser] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isWordPressReady, setIsWordPressReady] = useState(false);
  const [wpModules, setWpModules] = useState<{
    BlockEditorProvider?: any;
    BlockList?: any;
    WritingFlow?: any;
    ObserveTyping?: any;
    BlockInspector?: any;
    BlockToolbar?: any;
    SlotFillProvider?: any;
    createBlock?: any;
    serialize?: any;
    parse?: any;
  }>({});
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { insertReusableBlock, loading: reusableBlocksLoading } = useReusableBlocks();
  const { insertBlockPattern, loading: blockPatternsLoading } = useBlockPatterns();
  
  // Performance monitoring
  const { metrics, measureRenderTime } = usePerformanceMonitor({
    onPerformanceIssue: (metrics) => {
      if (metrics.blockCount > 100) {
        // Handle performance issues
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
      if (onChange && wpModules.serialize) {
        onChange(wpModules.serialize(data), data);
      }
    },
    saveInterval: 30000,
    debounceDelay: 1000
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
      // Handle media upload
    },
    __experimentalBlockPatterns: [],
    __experimentalSetIsInserterOpened: () => {},
    ...settings
  };

  // Load WordPress modules dynamically
  useEffect(() => {
    const loadModules = async () => {
      await ensureWordPressLoaded();
      
      try {
        // Dynamic imports for WordPress modules
        const [blockEditor, blocks, components] = await Promise.all([
          import(/* webpackChunkName: "wp-block-editor" */ '@wordpress/block-editor'),
          import(/* webpackChunkName: "wp-blocks" */ '@wordpress/blocks'),
          import(/* webpackChunkName: "wp-components" */ '@wordpress/components')
        ]);
        
        setWpModules({
          BlockEditorProvider: blockEditor.BlockEditorProvider,
          BlockList: blockEditor.BlockList,
          WritingFlow: blockEditor.WritingFlow,
          ObserveTyping: blockEditor.ObserveTyping,
          BlockInspector: blockEditor.BlockInspector,
          BlockToolbar: blockEditor.BlockToolbar,
          createBlock: blocks.createBlock,
          serialize: blocks.serialize,
          parse: blocks.parse,
          SlotFillProvider: components.SlotFillProvider
        });
        
        setIsWordPressReady(true);
      } catch (error) {
        console.error('Failed to load WordPress modules:', error);
      }
    };
    
    loadModules();
  }, []);

  // Initialize editor systems
  useEffect(() => {
    if (!isWordPressReady || !wpModules.createBlock) return;
    
    const initializeEditor = async () => {
      setIsInitializing(true);
      
      try {
        initializeCustomBlocks();
        initializeLazyBlocks();
        
        if (initialContent) {
          await loadBlocksForContent(initialContent);
        }
        
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
        console.error('Failed to initialize editor:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeEditor();
  }, [isWordPressReady, wpModules]);

  // Initialize blocks from content
  useEffect(() => {
    if (!wpModules.parse || !wpModules.createBlock) return;
    
    if (initialContent) {
      try {
        const parsedBlocks = wpModules.parse(initialContent);
        if (parsedBlocks.length > 0) {
          setBlocks(parsedBlocks);
        } else {
          const paragraphBlock = wpModules.createBlock('core/paragraph', {
            content: initialContent
          });
          setBlocks([paragraphBlock]);
        }
      } catch (error) {
        const emptyBlock = wpModules.createBlock('core/paragraph');
        setBlocks([emptyBlock]);
      }
    } else {
      const emptyBlock = wpModules.createBlock('core/paragraph');
      setBlocks([emptyBlock]);
    }
  }, [initialContent, wpModules]);

  // Handle block changes
  const handleBlocksChange = (newBlocks: any[]) => {
    measureRenderTime(() => {
      setBlocks(newBlocks);
      updateContent(newBlocks);
      
      if (onChange && wpModules.serialize) {
        try {
          const serializedContent = wpModules.serialize(newBlocks);
          onChange(serializedContent, newBlocks);
        } catch (error) {
          console.error('Failed to serialize blocks:', error);
        }
      }
    });
  };

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
      console.error('Failed to insert reusable block:', error);
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
      console.error('Failed to insert block pattern:', error);
    }
  };

  // Handle saving selected blocks as reusable
  const handleSaveAsReusable = () => {
    if (selectedBlocks.length > 0) {
      setShowSaveAsReusableModal(true);
    }
  };

  const handleReusableBlockSaved = () => {
    // Handle successful save
  };

  // Show loading skeleton while initializing
  if (!isWordPressReady || isInitializing || !wpModules.BlockEditorProvider) {
    return <EditorSkeleton showSidebar={true} />;
  }

  const {
    BlockEditorProvider,
    BlockList,
    WritingFlow,
    ObserveTyping,
    BlockInspector,
    BlockToolbar,
    SlotFillProvider
  } = wpModules;

  return (
    <div className={`wordpress-block-editor ${className || ''}`} ref={containerRef}>
      <SlotFillProvider>
        <BlockEditorProvider
          value={blocks}
          onInput={handleBlocksChange}
          onChange={handleBlocksChange}
          settings={defaultSettings}
        >
          <div className="editor-header">
            <div className="editor-header-toolbar">
              <BlockToolbar />
              <div className="editor-header-actions">
                <Button
                  onClick={() => setShowBlockPatternsBrowser(true)}
                  variant="outline"
                  size="sm"
                  disabled={blockPatternsLoading}
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Patterns
                </Button>
                <Button
                  onClick={() => setShowReusableBlocksBrowser(true)}
                  variant="outline"
                  size="sm"
                  disabled={reusableBlocksLoading}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Reusable Blocks
                </Button>
                {selectedBlocks.length > 0 && (
                  <Button
                    onClick={handleSaveAsReusable}
                    variant="outline"
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save as Reusable
                  </Button>
                )}
                {backupExists && (
                  <Button
                    onClick={restoreFromBackup}
                    variant="outline"
                    size="sm"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restore Backup
                  </Button>
                )}
                <SaveIndicator isSaving={isSaving} lastSavedAt={lastSavedAt} />
              </div>
            </div>
          </div>

          <div className="editor-container">
            <div className="editor-content">
              <WritingFlow>
                <ObserveTyping>
                  <BlockList />
                </ObserveTyping>
              </WritingFlow>
            </div>
            <div className="editor-sidebar">
              <BlockInspector />
              {metrics.blockCount > 100 && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Performance notice: Editor contains {metrics.blockCount} blocks.
                    Consider breaking content into smaller sections.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </BlockEditorProvider>
      </SlotFillProvider>

      {/* Modals */}
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
      
      <SaveAsReusableBlockModal
        isOpen={showSaveAsReusableModal}
        selectedBlocks={selectedBlocks}
        onSaved={handleReusableBlockSaved}
        onClose={() => setShowSaveAsReusableModal(false)}
      />
      
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
    </div>
  );
}