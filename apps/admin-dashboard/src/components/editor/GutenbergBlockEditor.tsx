/**
 * GutenbergBlockEditor Component
 * Enhanced WordPress Gutenberg-like editor with 3-column layout
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditorHeader } from './EditorHeader';
import '../../styles/editor.css';
import '../../styles/inspector-sidebar.css';
import { postApi } from '@/services/api/postApi';
import { debugTokenStatus } from '@/utils/token-debug';
import { Block } from '@/types/post.types';
import GutenbergBlockInserter from './GutenbergBlockInserter';
import { initializeWordPress } from '@/utils/wordpress-initializer';
import DesignLibraryModalImproved from './DesignLibraryModalImproved';
import { SimpleAIModal } from '../ai/SimpleAIModal';
import { DynamicRenderer } from '@/blocks/registry/DynamicRenderer';
import { registerAllBlocks } from '@/blocks';
import GutenbergSidebar from './GutenbergSidebar';
import { BlockWrapper } from './BlockWrapper';
import SlashCommandMenu from './SlashCommandMenu';
// Toast 기능을 직접 구현
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCustomizerSettings } from '@/hooks/useCustomizerSettings';
import {
  saveEditorSession,
  loadEditorSession,
  clearEditorSession,
  hasStoredSession,
  createHistoryEntry,
  trimHistory,
  type HistoryEntry,
} from '@/utils/history-manager';

// Block interface는 이제 @/types/post.types에서 import

interface PostSettings {
  status: 'draft' | 'pending' | 'private' | 'publish' | 'scheduled';
  visibility: 'public' | 'private' | 'password';
  publishDate: string;
  author: string;
  featuredImage?: string;
  excerpt: string;
  slug: string;
  slugError?: boolean;
  categories: string[];
  tags: string[];
  template: string;
  commentStatus: boolean;
  pingStatus: boolean;
  sticky: boolean;
  format: 'standard' | 'aside' | 'gallery' | 'link' | 'image' | 'quote' | 'status' | 'video' | 'audio' | 'chat';
}

interface GutenbergBlockEditorProps {
  documentTitle?: string;
  initialBlocks?: Block[];
  onChange?: (blocks: Block[]) => void;
  onTitleChange?: (title: string) => void;
  onSave?: () => void;
  onPublish?: () => void;
  slug?: string;
  postSettings?: Partial<PostSettings>;
  onPostSettingsChange?: (settings: Partial<PostSettings>) => void;
  mode?: 'post' | 'page' | 'template' | 'pattern';
  hideHeader?: boolean; // Hide header when embedded in another editor
  // Skip restoring previous local session (used when editing an existing post)
  disableSessionRestore?: boolean;
}

const GutenbergBlockEditor: React.FC<GutenbergBlockEditorProps> = ({
  documentTitle: propDocumentTitle = '',
  initialBlocks = [],
  onChange,
  onTitleChange,
  onSave,
  onPublish,
  slug = '',
  postSettings: propPostSettings,
  onPostSettingsChange,
  mode = 'post',
  hideHeader = false,
  disableSessionRestore = false,
}) => {
  // Initialize with empty state
  // Don't create any blocks automatically - user should add blocks manually
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (initialBlocks.length > 0) {
      return initialBlocks;
    }
    // Start with completely empty editor
    return [];
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState(propDocumentTitle);
  const [isBlockInserterOpen, setIsBlockInserterOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([createHistoryEntry(blocks)]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  
  // Initialize block registry
  useEffect(() => {
    registerAllBlocks();
  }, []);

  // Session restoration on mount
  useEffect(() => {
    if (disableSessionRestore || sessionRestored || initialBlocks.length > 0) return;

    const storedSession = loadEditorSession();
    if (storedSession && storedSession.history.length > 0) {
      // Restore session
      setHistory(storedSession.history);
      setHistoryIndex(storedSession.historyIndex);
      setBlocks(storedSession.history[storedSession.historyIndex].blocks);
      setDocumentTitle(storedSession.documentTitle);
      setSessionRestored(true);
      showToast('편집 내역이 복원되었습니다', 'info');
    }
  }, [disableSessionRestore, sessionRestored, initialBlocks.length]);

  // Sync blocks with initialBlocks prop changes
  useEffect(() => {
    if (initialBlocks && initialBlocks.length > 0 && !sessionRestored) {
      setBlocks(initialBlocks);
      setHistory([createHistoryEntry(initialBlocks)]);
      setHistoryIndex(0);
      setIsDirty(false);
    }
  }, [initialBlocks, sessionRestored]);
  
  // Sync title with prop changes
  useEffect(() => {
    setDocumentTitle(propDocumentTitle);
  }, [propDocumentTitle]);

  // Save session on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveEditorSession(history, historyIndex, documentTitle);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Final save on unmount
      saveEditorSession(history, historyIndex, documentTitle);
    };
  }, [history, historyIndex, documentTitle]);
  
  // Sync post settings with prop changes
  useEffect(() => {
    if (propPostSettings) {
      setPostSettings(prev => ({ ...prev, ...propPostSettings }));
    }
  }, [propPostSettings]);
  const [isCodeView, setIsCodeView] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [copiedBlock, setCopiedBlock] = useState<Block | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isDesignLibraryOpen, setIsDesignLibraryOpen] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);

  // Slash command menu states
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashTriggerBlockId, setSlashTriggerBlockId] = useState<string | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<string[]>([]);
  const slashMenuRef = useRef<{ query: string; blockId: string | null }>({ query: '', blockId: null });
  
  // Sidebar states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'document' | 'block'>('document');
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  
  // Post settings state - ensure slug from props is preserved
  const [postSettings, setPostSettings] = useState<PostSettings>({
    status: 'draft',
    visibility: 'public',
    publishDate: new Date().toISOString().slice(0, 16),
    author: 'Admin User',
    featuredImage: undefined,
    excerpt: '',
    slugError: false,
    categories: [],
    tags: [],
    template: 'default',
    commentStatus: true,
    pingStatus: true,
    sticky: false,
    format: 'standard',
    ...propPostSettings,
    slug: propPostSettings?.slug || slug || '' // Ensure slug is not overridden
  });
  
  const navigate = useNavigate();

  // Viewport mode hook
  const { viewportMode, currentConfig, switchViewport, containerSettings } = useCustomizerSettings();

  // Initialize WordPress on mount
  useEffect(() => {
    initializeWordPress().catch(error => {
      // Failed to initialize WordPress
    });
  }, []);
  
  // Update slug when propPostSettings or slug prop changes
  useEffect(() => {
    const newSlug = propPostSettings?.slug || slug || '';
    if (newSlug !== postSettings.slug) {
      setPostSettings(prev => ({ ...prev, slug: newSlug }));
    }
  }, [propPostSettings?.slug, slug]);
  
  // Update selectedBlock when selectedBlockId changes
  useEffect(() => {
    if (selectedBlockId) {
      const block = blocks.find(b => b.id === selectedBlockId);
      setSelectedBlock(block || null);
    } else {
      setSelectedBlock(null);
    }
  }, [selectedBlockId, blocks]);
  
  // Simple toast function
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Update blocks and history
  const updateBlocks = useCallback(
    (newBlocks: Block[], skipOnChange = false) => {
      setBlocks(newBlocks);
      setIsDirty(true);

      // Add to history with optimization
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(createHistoryEntry(newBlocks));

      // Trim history to max size
      const trimmedHistory = trimHistory(newHistory);
      setHistory(trimmedHistory);
      setHistoryIndex(trimmedHistory.length - 1);

      // Save to session storage
      saveEditorSession(trimmedHistory, trimmedHistory.length - 1, documentTitle);

      // Notify parent (unless skipped for initialization)
      if (!skipOnChange) {
        onChange?.(newBlocks);
      }
    },
    [history, historyIndex, documentTitle, onChange]
  );

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setBlocks(history[newIndex].blocks);

      // Update session storage
      saveEditorSession(history, newIndex, documentTitle);
    }
  }, [history, historyIndex, documentTitle]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setBlocks(history[newIndex].blocks);

      // Update session storage
      saveEditorSession(history, newIndex, documentTitle);
    }
  }, [history, historyIndex, documentTitle]);

  // Handle block update
  const handleBlockUpdate = useCallback(
    (blockId: string, content: any, attributes?: any) => {
      const newBlocks = blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              content: typeof content === 'string' ? { text: content } : content,
              attributes: attributes || block.attributes,
            }
          : block
      );
      updateBlocks(newBlocks);
    },
    [blocks, updateBlocks]
  );

  // Handle block deletion
  const handleBlockDelete = useCallback(
    (blockId: string) => {
      const newBlocks = blocks.filter((block) => block.id !== blockId);
      // Allow completely empty editor - don't auto-create blocks
      updateBlocks(newBlocks);
      setSelectedBlockId(null);
    },
    [blocks, updateBlocks]
  );

  // Convert block to HTML representation
  const blockToHTML = useCallback((block: Block): string => {
    const { type, content, attributes } = block;

    // Handle different block types
    if (type === 'o4o/paragraph') {
      return `<p class="block-paragraph">${content?.text || ''}</p>`;
    } else if (type === 'o4o/heading') {
      const level = content?.level || 2;
      return `<h${level} class="block-heading">${content?.text || ''}</h${level}>`;
    } else if (type === 'core/image') {
      return `<figure class="block-image"><img src="${content?.url || ''}" alt="${content?.alt || ''}" /></figure>`;
    } else if (type === 'core/list') {
      const tag = content?.ordered ? 'ol' : 'ul';
      const items = (content?.items || []).map((item: string) => `<li>${item}</li>`).join('');
      return `<${tag} class="block-list">${items}</${tag}>`;
    } else if (type === 'core/quote') {
      return `<blockquote class="block-quote"><p>${content?.text || ''}</p><cite>${content?.citation || ''}</cite></blockquote>`;
    } else if (type === 'core/code') {
      return `<pre class="block-code"><code>${content?.code || ''}</code></pre>`;
    } else if (type === 'o4o/button') {
      return `<a href="${content?.url || '#'}" class="block-button">${content?.text || 'Button'}</a>`;
    }

    // Default fallback
    return `<div class="block-${type.replace('/', '-')}" data-block-type="${type}">${JSON.stringify(content)}</div>`;
  }, []);

  // Handle block copy with HTML + JSON clipboard support
  const handleBlockCopy = useCallback(
    async (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;

      setCopiedBlock({ ...block });

      try {
        // Prepare both HTML and JSON representations
        const jsonContent = JSON.stringify(block);
        const htmlContent = blockToHTML(block);

        // Use ClipboardItem API for multi-format clipboard
        if (typeof ClipboardItem !== 'undefined') {
          const clipboardItem = new ClipboardItem({
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([jsonContent], { type: 'text/plain' }),
            'application/json': new Blob([jsonContent], { type: 'application/json' })
          });
          await navigator.clipboard.write([clipboardItem]);
        } else {
          // Fallback for browsers without ClipboardItem
          await navigator.clipboard.writeText(jsonContent);
        }
      } catch (error) {
        // 클립보드 접근 실패 시 내부 상태만 사용
        console.warn('Clipboard write failed, using internal state only:', error);
      }
    },
    [blocks, blockToHTML]
  );

  // Parse HTML to block
  const htmlToBlock = useCallback((html: string): Block | null => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const element = doc.body.firstChild as HTMLElement;

    if (!element) return null;

    const tagName = element.tagName.toLowerCase();
    const className = element.className;

    // Try to parse based on tag name and class
    if (tagName === 'p' || className.includes('block-paragraph')) {
      return {
        id: `block-${Date.now()}`,
        type: 'o4o/paragraph',
        content: { text: element.textContent || '' },
        attributes: {}
      };
    } else if (tagName.match(/^h[1-6]$/) || className.includes('block-heading')) {
      const level = parseInt(tagName.charAt(1)) || 2;
      return {
        id: `block-${Date.now()}`,
        type: 'o4o/heading',
        content: { text: element.textContent || '', level },
        attributes: {}
      };
    } else if ((tagName === 'ul' || tagName === 'ol') || className.includes('block-list')) {
      const items = Array.from(element.querySelectorAll('li')).map(li => li.textContent || '');
      return {
        id: `block-${Date.now()}`,
        type: 'core/list',
        content: { items, ordered: tagName === 'ol' },
        attributes: {}
      };
    } else if (tagName === 'blockquote' || className.includes('block-quote')) {
      const text = element.querySelector('p')?.textContent || '';
      const citation = element.querySelector('cite')?.textContent || '';
      return {
        id: `block-${Date.now()}`,
        type: 'core/quote',
        content: { text, citation },
        attributes: {}
      };
    } else if (tagName === 'pre' || className.includes('block-code')) {
      const code = element.querySelector('code')?.textContent || element.textContent || '';
      return {
        id: `block-${Date.now()}`,
        type: 'core/code',
        content: { code },
        attributes: {}
      };
    } else if (tagName === 'figure' && element.querySelector('img')) {
      const img = element.querySelector('img')!;
      return {
        id: `block-${Date.now()}`,
        type: 'core/image',
        content: { url: img.src, alt: img.alt },
        attributes: {}
      };
    }

    // Fallback to paragraph
    return {
      id: `block-${Date.now()}`,
      type: 'o4o/paragraph',
      content: { text: element.textContent || '' },
      attributes: {}
    };
  }, []);

  // Handle block paste with clipboard reading support
  const handleBlockPaste = useCallback(
    async (afterBlockId?: string) => {
      let newBlock: Block | null = null;

      // Try to read from system clipboard first
      try {
        if (navigator.clipboard && navigator.clipboard.read) {
          const clipboardItems = await navigator.clipboard.read();

          for (const item of clipboardItems) {
            // Try JSON first (most accurate)
            if (item.types.includes('application/json')) {
              const blob = await item.getType('application/json');
              const text = await blob.text();
              const parsedBlock = JSON.parse(text) as Block;
              newBlock = { ...parsedBlock, id: `block-${Date.now()}` };
              break;
            }
            // Try plain text JSON
            else if (item.types.includes('text/plain')) {
              const blob = await item.getType('text/plain');
              const text = await blob.text();
              try {
                const parsedBlock = JSON.parse(text) as Block;
                if (parsedBlock.type && parsedBlock.content) {
                  newBlock = { ...parsedBlock, id: `block-${Date.now()}` };
                  break;
                }
              } catch {
                // Not JSON, will try HTML next
              }
            }
            // Try HTML
            if (!newBlock && item.types.includes('text/html')) {
              const blob = await item.getType('text/html');
              const html = await blob.text();
              newBlock = htmlToBlock(html);
              break;
            }
          }
        } else {
          // Fallback: try readText
          const text = await navigator.clipboard.readText();
          try {
            const parsedBlock = JSON.parse(text) as Block;
            if (parsedBlock.type && parsedBlock.content) {
              newBlock = { ...parsedBlock, id: `block-${Date.now()}` };
            }
          } catch {
            // Not JSON, create as paragraph
            newBlock = {
              id: `block-${Date.now()}`,
              type: 'o4o/paragraph',
              content: { text },
              attributes: {}
            };
          }
        }
      } catch (error) {
        console.warn('Clipboard read failed, using internal state:', error);
      }

      // Fallback to internal copiedBlock state
      if (!newBlock && copiedBlock) {
        newBlock = {
          ...copiedBlock,
          id: `block-${Date.now()}`,
        };
      }

      // Insert the block
      if (newBlock) {
        if (afterBlockId) {
          const index = blocks.findIndex((b) => b.id === afterBlockId);
          const newBlocks = [...blocks];
          newBlocks.splice(index + 1, 0, newBlock);
          updateBlocks(newBlocks);
        } else {
          // 마지막에 추가
          updateBlocks([...blocks, newBlock]);
        }

        setSelectedBlockId(newBlock.id);
        setIsDirty(true);
      }
    },
    [blocks, copiedBlock, updateBlocks, htmlToBlock]
  );

  // Handle block insertion
  const handleInsertBlock = useCallback(
    (blockType: string) => {
      const newBlock: Block = {
        id: `block-${Date.now()}`,
        type: blockType,
        content: blockType.includes('heading') ? { text: '', level: 2 } : { text: '' },
        attributes: {},
      };

      const insertIndex = selectedBlockId
        ? blocks.findIndex((b) => b.id === selectedBlockId) + 1
        : blocks.length;

      const newBlocks = [...blocks];
      newBlocks.splice(insertIndex, 0, newBlock);
      updateBlocks(newBlocks);
      setSelectedBlockId(newBlock.id);
      setIsBlockInserterOpen(false);
    },
    [blocks, selectedBlockId, updateBlocks]
  );

  // Handle add block at position
  const handleAddBlock = useCallback(
    (blockId: string, position: 'before' | 'after', blockType = 'o4o/paragraph') => {
      const index = blocks.findIndex((b) => b.id === blockId);
      const newBlock: Block = {
        id: `block-${Date.now()}`,
        type: blockType,
        content: { text: '' },
        attributes: {},
      };

      const newBlocks = [...blocks];
      const insertIndex = position === 'after' ? index + 1 : index;
      newBlocks.splice(insertIndex, 0, newBlock);
      updateBlocks(newBlocks);
      setSelectedBlockId(newBlock.id);
    },
    [blocks, updateBlocks]
  );

  // Handle slash command block selection
  const handleSlashCommandSelect = useCallback(
    (blockType: string) => {
      const triggerBlockId = slashTriggerBlockId || selectedBlockId;
      if (!triggerBlockId) return;

      // Find the block that triggered slash command
      const blockIndex = blocks.findIndex(b => b.id === triggerBlockId);
      if (blockIndex === -1) return;

      const triggerBlock = blocks[blockIndex];

      // Remove "/" and query text from the trigger block
      let cleanedText = '';
      if (triggerBlock.content && typeof triggerBlock.content === 'object' && 'text' in triggerBlock.content) {
        const text = triggerBlock.content.text as string || '';
        // Find and remove the "/" and everything after it
        const slashIndex = text.lastIndexOf('/');
        if (slashIndex !== -1) {
          cleanedText = text.substring(0, slashIndex);
        } else {
          cleanedText = text;
        }
      }

      // Create new block
      const newBlock: Block = {
        id: `block-${Date.now()}`,
        type: blockType,
        content: blockType.includes('heading') ? { text: '', level: 2 } : { text: '' },
        attributes: {},
      };

      const newBlocks = [...blocks];

      // If trigger block is empty (only had "/"), replace it
      if (!cleanedText.trim()) {
        newBlocks[blockIndex] = newBlock;
      } else {
        // Update trigger block and insert new block after
        newBlocks[blockIndex] = {
          ...triggerBlock,
          content: { ...triggerBlock.content, text: cleanedText }
        };
        newBlocks.splice(blockIndex + 1, 0, newBlock);
      }

      updateBlocks(newBlocks);
      setSelectedBlockId(newBlock.id);

      // Update recent blocks
      setRecentBlocks(prev => {
        const updated = [blockType, ...prev.filter(t => t !== blockType)];
        return updated.slice(0, 5); // Keep only 5 most recent
      });

      // Close slash menu
      setIsSlashMenuOpen(false);
      setSlashQuery('');
      setSlashTriggerBlockId(null);

      // Focus new block
      setTimeout(() => {
        const newBlockElement = document.querySelector(`[data-block-id="${newBlock.id}"]`);
        if (newBlockElement) {
          const editableElement = newBlockElement.querySelector('[contenteditable="true"]') as HTMLElement;
          if (editableElement) {
            editableElement.focus();
          }
        }
      }, 50);
    },
    [blocks, selectedBlockId, slashTriggerBlockId, updateBlocks]
  );

  // Detect "/" input in contentEditable elements
  useEffect(() => {
    const handleInput = (e: Event) => {
      const target = e.target as HTMLElement;

      // Only proceed if it's a contentEditable element
      if (!target.isContentEditable) return;

      // Get the block ID from the closest block wrapper
      const blockWrapper = target.closest('[data-block-id]') as HTMLElement;
      if (!blockWrapper) return;

      const blockId = blockWrapper.getAttribute('data-block-id');
      if (!blockId) return;

      const text = target.textContent || '';

      // Check if text contains "/"
      const slashIndex = text.lastIndexOf('/');
      if (slashIndex !== -1) {
        // Get query after "/"
        const query = text.substring(slashIndex + 1);

        // Only show menu if "/" is at the end or followed by search text
        const afterSlash = text.substring(slashIndex);
        if (afterSlash === '/' || /^\/[\w\s]*$/.test(afterSlash)) {
          // Get cursor position for menu placement
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            setSlashMenuPosition({
              top: rect.bottom + window.scrollY + 4,
              left: rect.left + window.scrollX
            });
          }

          setSlashQuery(query);
          setSlashTriggerBlockId(blockId);
          setIsSlashMenuOpen(true);
          slashMenuRef.current = { query, blockId };
          return;
        }
      }

      // Close menu if "/" was removed
      if (isSlashMenuOpen && !text.includes('/')) {
        setIsSlashMenuOpen(false);
        setSlashQuery('');
        setSlashTriggerBlockId(null);
      }
    };

    document.addEventListener('input', handleInput);
    return () => document.removeEventListener('input', handleInput);
  }, [isSlashMenuOpen]);

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      // If parent provided handler, delegate to avoid duplicate creates
      if (onSave) {
        await onSave();
        setIsDirty(false);
        showToast('Draft saved', 'success');
        return;
      }

      // Fallback (no parent handler): save draft directly
      if (import.meta.env.DEV) {
        debugTokenStatus();
      }
      showToast('Saving draft...', 'info');
      const response = await postApi.saveDraft({
        title: documentTitle,
        content: blocks,
        status: 'draft',
      });
      if (response.success) {
        setIsDirty(false);
        showToast('Draft saved successfully', 'success');
      } else {
        showToast(response.error || 'Failed to save draft', 'error');
      }
    } catch (error) {
      showToast('Failed to save draft. Please try again.', 'error');
    }
  }, [documentTitle, blocks, onSave, showToast]);

  // Handle publish
  const handlePublish = useCallback(async () => {
    try {
      if (onPublish) {
        await onPublish();
        setIsDirty(false);
        showToast('Published successfully', 'success');
        return;
      }

      // Fallback (no parent handler): create directly
      if (import.meta.env.DEV) {
        debugTokenStatus();
      }
      showToast('Publishing post...', 'info');
      const response = await postApi.create({
        title: documentTitle,
        content: blocks,
        status: 'published',
      });
      if (response.success && response.data) {
        setIsDirty(false);
        showToast('Post published successfully!', 'success');
      } else {
        showToast(response.error || 'Failed to publish post', 'error');
      }
    } catch (error) {
      showToast('Failed to publish post. Please try again.', 'error');
    }
  }, [documentTitle, blocks, onPublish, showToast]);

  // Toggle fullscreen
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  // Toggle code view
  const handleToggleCodeView = useCallback(() => {
    setIsCodeView(!isCodeView);
  }, [isCodeView]);

  // Handle drag start
  const handleDragStart = useCallback((blockId: string, e: React.DragEvent) => {
    setDraggedBlockId(blockId);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((blockId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverBlockId(blockId);
  }, []);

  // Handle drop
  const handleDrop = useCallback((targetBlockId: string, draggedBlockId: string, e: React.DragEvent) => {
    e.preventDefault();

    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      setDraggedBlockId(null);
      setDragOverBlockId(null);
      return;
    }

    const draggedIndex = blocks.findIndex(b => b.id === draggedBlockId);
    const targetIndex = blocks.findIndex(b => b.id === targetBlockId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedBlockId(null);
      setDragOverBlockId(null);
      return;
    }

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);

    // Insert at the correct position
    const insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex;
    newBlocks.splice(insertIndex, 0, draggedBlock);

    updateBlocks(newBlocks);
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  }, [blocks, updateBlocks]);

  // Handle drag end
  const handleDragEnd = useCallback((blockId: string, e: React.DragEvent) => {
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  }, []);

  // Handle block duplication
  const handleDuplicate = useCallback((blockId: string) => {
    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1) return;

    const blockToDuplicate = blocks[blockIndex];
    const duplicatedBlock: Block = {
      ...blockToDuplicate,
      id: `block-${Date.now()}`,
    };

    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex + 1, 0, duplicatedBlock);
    updateBlocks(newBlocks);
    setSelectedBlockId(duplicatedBlock.id);
  }, [blocks, updateBlocks]);

  // Handle block move up
  const handleMoveUp = useCallback((blockId: string) => {
    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    if (blockIndex <= 0) return;

    const newBlocks = [...blocks];
    const [block] = newBlocks.splice(blockIndex, 1);
    newBlocks.splice(blockIndex - 1, 0, block);
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  // Handle block move down
  const handleMoveDown = useCallback((blockId: string) => {
    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1 || blockIndex >= blocks.length - 1) return;

    const newBlocks = [...blocks];
    const [block] = newBlocks.splice(blockIndex, 1);
    newBlocks.splice(blockIndex + 1, 0, block);
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  // Handle preview
  const handlePreview = useCallback(() => {
    // Create preview content
    const previewContent = {
      title: documentTitle,
      blocks: blocks,
    };
    
    // Store in session storage for preview page
    sessionStorage.setItem('previewContent', JSON.stringify(previewContent));
    
    // Open preview in new tab with correct route
    window.open('/admin/preview', '_blank');
  }, [documentTitle, blocks]);

  // Removed automatic tab switching - let user control the tab selection

  // Handle navigation with unsaved changes warning
  const handleNavigation = useCallback(() => {
    if (isDirty) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmLeave) return;
    }
    navigate('/admin');
  }, [isDirty, navigate]);

  // Handle block type change
  const handleBlockTypeChange = useCallback(
    (blockId: string, newType: string) => {
      const newBlocks = blocks.map((block) => {
        if (block.id === blockId) {
          // Convert heading types
          if (newType.startsWith('core/heading-')) {
            const level = parseInt(newType.replace('o4o/heading-h', ''));
            return {
              ...block,
              type: 'o4o/heading',
              content: { text: typeof block.content === 'string' ? block.content : block.content?.text || '', level },
              attributes: block.attributes || {},
            };
          }
          // Convert to paragraph
          if (newType === 'o4o/paragraph') {
            return {
              ...block,
              type: 'o4o/paragraph',
              content: { text: typeof block.content === 'string' ? block.content : block.content?.text || '' },
              attributes: block.attributes || {},
            };
          }
        }
        return block;
      });
      updateBlocks(newBlocks);
    },
    [blocks, updateBlocks]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save: Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Redo: Ctrl/Cmd + Shift + Z
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleRedo();
      }
      // Toggle block inserter: /
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsBlockInserterOpen(!isBlockInserterOpen);
      }
      // Delete key for block deletion
      if (e.key === 'Delete' && selectedBlockId && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (!target.isContentEditable && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleBlockDelete(selectedBlockId);
        }
      }
      // Tab navigation between blocks
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (!target.isContentEditable && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          if (selectedBlockId) {
            const currentIndex = blocks.findIndex(b => b.id === selectedBlockId);
            if (e.shiftKey) {
              // Previous block
              if (currentIndex > 0) {
                setSelectedBlockId(blocks[currentIndex - 1].id);
              }
            } else {
              // Next block
              if (currentIndex < blocks.length - 1) {
                setSelectedBlockId(blocks[currentIndex + 1].id);
              }
            }
          } else if (blocks.length > 0) {
            setSelectedBlockId(blocks[0].id);
          }
        }
      }
      // Arrow key navigation
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (!target.isContentEditable && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          if (selectedBlockId) {
            const currentIndex = blocks.findIndex(b => b.id === selectedBlockId);
            if (e.key === 'ArrowUp' && currentIndex > 0) {
              setSelectedBlockId(blocks[currentIndex - 1].id);
            } else if (e.key === 'ArrowDown' && currentIndex < blocks.length - 1) {
              setSelectedBlockId(blocks[currentIndex + 1].id);
            }
          } else if (blocks.length > 0) {
            setSelectedBlockId(blocks[0].id);
          }
        }
      }
      // Enter key to add new block after selected
      // Support both Shift+Enter (forced) and regular Enter (when content is empty)
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;

        // Skip if in input or textarea
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }

        // Shift+Enter: Always create new block (works in contentEditable too)
        if (e.shiftKey) {
          e.preventDefault();
          if (selectedBlockId) {
            const currentIndex = blocks.findIndex(b => b.id === selectedBlockId);
            const newBlock: Block = {
              id: `block-${Date.now()}`,
              type: 'o4o/paragraph',
              content: { text: '' },
              attributes: {},
            };
            const newBlocks = [...blocks];
            newBlocks.splice(currentIndex + 1, 0, newBlock);
            updateBlocks(newBlocks);
            setSelectedBlockId(newBlock.id);
            setIsDirty(true);

            // Focus the new block
            setTimeout(() => {
              const newBlockElement = document.querySelector(`[data-block-id="${newBlock.id}"]`);
              if (newBlockElement) {
                const editableElement = newBlockElement.querySelector('[contenteditable="true"]') as HTMLElement;
                if (editableElement) {
                  editableElement.focus();
                }
              }
            }, 50);
          }
          return;
        }

        // Regular Enter: Smart block-specific behavior
        if (!e.shiftKey) {
          // If in contentEditable, check if content is empty
          if (target.isContentEditable) {
            const block = blocks.find(b => b.id === selectedBlockId);
            if (block) {
              const isEmpty = !block.content ||
                             (typeof block.content === 'string' && !block.content.trim()) ||
                             (typeof block.content === 'object' && 'text' in block.content && !block.content.text?.trim());

              if (isEmpty) {
                e.preventDefault();
                const currentIndex = blocks.findIndex(b => b.id === selectedBlockId);

                // Smart behavior based on block type
                let newBlockType = 'o4o/paragraph';

                // Heading → always Paragraph
                if (block.type === 'o4o/heading') {
                  newBlockType = 'o4o/paragraph';
                }
                // Quote → always Paragraph
                else if (block.type === 'core/quote') {
                  newBlockType = 'o4o/paragraph';
                }
                // List → exit list (create Paragraph)
                else if (block.type === 'core/list') {
                  newBlockType = 'o4o/paragraph';
                }
                // Other blocks → Paragraph
                else {
                  newBlockType = 'o4o/paragraph';
                }

                const newBlock: Block = {
                  id: `block-${Date.now()}`,
                  type: newBlockType,
                  content: { text: '' },
                  attributes: {},
                };
                const newBlocks = [...blocks];
                newBlocks.splice(currentIndex + 1, 0, newBlock);
                updateBlocks(newBlocks);
                setSelectedBlockId(newBlock.id);
                setIsDirty(true);

                // Focus the new block
                setTimeout(() => {
                  const newBlockElement = document.querySelector(`[data-block-id="${newBlock.id}"]`);
                  if (newBlockElement) {
                    const editableElement = newBlockElement.querySelector('[contenteditable="true"]') as HTMLElement;
                    if (editableElement) {
                      editableElement.focus();
                    }
                  }
                }, 50);
              }
            }
          } else {
            // Outside contentEditable: works as before
            e.preventDefault();
            if (selectedBlockId) {
              const currentIndex = blocks.findIndex(b => b.id === selectedBlockId);
              const newBlock: Block = {
                id: `block-${Date.now()}`,
                type: 'o4o/paragraph',
                content: { text: '' },
                attributes: {},
              };
              const newBlocks = [...blocks];
              newBlocks.splice(currentIndex + 1, 0, newBlock);
              updateBlocks(newBlocks);
              setSelectedBlockId(newBlock.id);
              setIsDirty(true);
            }
          }
        }
      }
      // Backspace to delete empty selected block
      if (e.key === 'Backspace' && selectedBlockId) {
        const target = e.target as HTMLElement;

        // Check if we should delete the block
        const shouldDeleteBlock = () => {
          const block = blocks.find(b => b.id === selectedBlockId);
          if (!block) return false;

          const isEmpty = !block.content ||
                         (typeof block.content === 'string' && !block.content.trim()) ||
                         (typeof block.content === 'object' && 'text' in block.content && !block.content.text?.trim());

          if (!isEmpty) return false;

          // If in contentEditable, check cursor position
          if (target.isContentEditable) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              // Only delete if cursor is at the start (offset 0)
              return range.startOffset === 0 && range.endOffset === 0;
            }
            return false;
          }

          // Outside contentEditable, allow deletion
          return target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA';
        };

        if (shouldDeleteBlock()) {
          e.preventDefault();
          const currentIndex = blocks.findIndex(b => b.id === selectedBlockId);
          handleBlockDelete(selectedBlockId);

          // Select previous block if available, otherwise next
          setTimeout(() => {
            if (currentIndex > 0) {
              setSelectedBlockId(blocks[currentIndex - 1].id);
              // Focus the previous block
              const prevBlockElement = document.querySelector(`[data-block-id="${blocks[currentIndex - 1].id}"]`);
              if (prevBlockElement) {
                const editableElement = prevBlockElement.querySelector('[contenteditable="true"]') as HTMLElement;
                if (editableElement) {
                  editableElement.focus();
                  // Move cursor to end
                  const range = document.createRange();
                  const sel = window.getSelection();
                  range.selectNodeContents(editableElement);
                  range.collapse(false);
                  sel?.removeAllRanges();
                  sel?.addRange(range);
                }
              }
            } else if (blocks.length > 1) {
              setSelectedBlockId(blocks[1].id);
            }
          }, 10);
        }
      }
      // Ctrl/Cmd + D to duplicate block
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedBlockId) {
        e.preventDefault();
        handleDuplicate(selectedBlockId);
      }
      // Ctrl/Cmd + Y for redo (alternative to Ctrl+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }

      // Text formatting shortcuts (Cmd+B/I/U/K/Shift+X)
      // Only work in contentEditable elements (text blocks)
      const target = e.target as HTMLElement;
      if (target.isContentEditable || target.getAttribute('contenteditable') === 'true') {
        // Cmd+B for Bold
        if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !e.shiftKey) {
          e.preventDefault();
          document.execCommand('bold', false);
        }

        // Cmd+I for Italic
        if ((e.ctrlKey || e.metaKey) && e.key === 'i' && !e.shiftKey) {
          e.preventDefault();
          document.execCommand('italic', false);
        }

        // Cmd+U for Underline
        if ((e.ctrlKey || e.metaKey) && e.key === 'u' && !e.shiftKey) {
          e.preventDefault();
          document.execCommand('underline', false);
        }

        // Cmd+Shift+X for Strikethrough
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
          e.preventDefault();
          document.execCommand('strikeThrough', false);
        }

        // Cmd+K for Link
        if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !e.shiftKey) {
          e.preventDefault();
          const selection = window.getSelection();
          if (selection && selection.toString()) {
            const url = prompt('Enter URL:', 'https://');
            if (url) {
              document.execCommand('createLink', false, url);
            }
          } else {
            showToast('Please select text to create a link', 'info');
          }
        }
      }

      // Copy/Paste shortcuts (Cmd+C/V)
      // Cmd+C to copy selected block
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedBlockId) {
        // Only intercept if not in contentEditable (allow native copy in text)
        if (!target.isContentEditable && target.getAttribute('contenteditable') !== 'true') {
          e.preventDefault();
          handleBlockCopy(selectedBlockId);
        }
      }

      // Cmd+V to paste block
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // Only intercept if not in contentEditable (allow native paste in text)
        if (!target.isContentEditable && target.getAttribute('contenteditable') !== 'true') {
          e.preventDefault();
          handleBlockPaste(selectedBlockId || undefined);
        }
      }

      // Cmd+/ to trigger slash command
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        if (selectedBlockId && target.isContentEditable) {
          // Insert "/" at cursor position to trigger slash menu
          document.execCommand('insertText', false, '/');
        } else {
          showToast('Slash commands work in text blocks. Try typing "/" in a paragraph.', 'info');
        }
      }

      // Cmd+Opt+I to open Block Inserter
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'i') {
        e.preventDefault();
        setIsBlockInserterOpen(prev => !prev);
      }

      // Ctrl+Opt+T or Cmd+Opt+T to show block type converter
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 't') {
        e.preventDefault();
        if (selectedBlockId) {
          const block = blocks.find(b => b.id === selectedBlockId);
          if (block && (block.type === 'o4o/paragraph' || block.type === 'o4o/heading')) {
            // Cycle through: paragraph → h2 → h3 → h4 → paragraph
            if (block.type === 'o4o/paragraph') {
              handleBlockTypeChange(selectedBlockId, 'o4o/heading-h2');
              showToast('Changed to Heading 2', 'success');
            } else if (block.type === 'o4o/heading') {
              const level = (block.content as any)?.level || 2;
              if (level === 2) {
                handleBlockTypeChange(selectedBlockId, 'o4o/heading-h3');
                showToast('Changed to Heading 3', 'success');
              } else if (level === 3) {
                handleBlockTypeChange(selectedBlockId, 'o4o/heading-h4');
                showToast('Changed to Heading 4', 'success');
              } else {
                handleBlockTypeChange(selectedBlockId, 'o4o/paragraph');
                showToast('Changed to Paragraph', 'success');
              }
            }
          } else {
            showToast('Block type conversion works for text blocks only', 'info');
          }
        }
      }

      // Shift+Alt+H to show keyboard shortcuts help
      if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        showToast('Keyboard Shortcuts: Cmd+K (Link), Cmd+Shift+X (Strikethrough), Cmd+/ (Slash menu), Cmd+Opt+I (Inserter), Ctrl+Opt+T (Block type), Cmd+B/I/U (Format)', 'info');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleUndo, handleRedo, isBlockInserterOpen, selectedBlockId, blocks, handleBlockDelete, handleDuplicate, updateBlocks, handleBlockCopy, handleBlockPaste, handleBlockTypeChange, showToast]);

  // Handle template application
  const handleApplyTemplate = useCallback(
    (templateBlocks: Block[]) => {
      // Replace all current blocks with template blocks, preserving document title
      updateBlocks(templateBlocks);
      setSelectedBlockId(null);
      showToast('템플릿이 적용되었습니다!', 'success');
    },
    [updateBlocks, showToast]
  );

  // Render block component
  const renderBlock = (block: Block) => {
    const commonProps = {
      id: block.id,
      content: typeof block.content === 'string' ? block.content : block.content?.text || '',
      onChange: (content: any, attributes?: any) =>
        handleBlockUpdate(block.id, content, attributes),
      onDelete: () => handleBlockDelete(block.id),
      onDuplicate: () => {
        const newBlock = { ...block, id: `block-${Date.now()}` };
        const index = blocks.findIndex((b) => b.id === block.id);
        const newBlocks = [...blocks];
        newBlocks.splice(index + 1, 0, newBlock);
        updateBlocks(newBlocks);
      },
      onMoveUp: () => {
        const index = blocks.findIndex((b) => b.id === block.id);
        if (index > 0) {
          const newBlocks = [...blocks];
          [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
          updateBlocks(newBlocks);
        }
      },
      onMoveDown: () => {
        const index = blocks.findIndex((b) => b.id === block.id);
        if (index < blocks.length - 1) {
          const newBlocks = [...blocks];
          [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
          updateBlocks(newBlocks);
        }
      },
      onAddBlock: (position: 'before' | 'after', type?: string) =>
        handleAddBlock(block.id, position, type),
      isSelected: selectedBlockId === block.id,
      onSelect: () => setSelectedBlockId(block.id),
      attributes: block.attributes || {},
      isDragging: draggedBlockId === block.id,
      onDragStart: (e: React.DragEvent) => handleDragStart(block.id, e),
      onDragOver: (e: React.DragEvent) => handleDragOver(block.id, e),
      onDrop: (e: React.DragEvent) => {
        const draggedId = e.dataTransfer.getData('application/block-id') || e.dataTransfer.getData('text/plain');
        handleDrop(block.id, draggedId, e);
      },
      onDragEnd: (e: React.DragEvent) => handleDragEnd(block.id, e),
      onCopy: () => handleBlockCopy(block.id),
      onPaste: () => handleBlockPaste(block.id),
      onChangeType: (newType: string) => handleBlockTypeChange(block.id, newType),
      onUpdate: (updates: any) => {
        const newBlocks = blocks.map(b =>
          b.id === block.id ? { ...b, ...updates } : b
        );
        updateBlocks(newBlocks);
      },
      onInnerBlocksChange: (newInnerBlocks: Block[]) => {
        const newBlocks = blocks.map(b =>
          b.id === block.id ? { ...b, innerBlocks: newInnerBlocks } : b
        );
        updateBlocks(newBlocks);
      },
    };

    const blockIndex = blocks.findIndex((b) => b.id === block.id);
    const enhancedProps = {
      ...commonProps,
      canMoveUp: blockIndex > 0,
      canMoveDown: blockIndex < blocks.length - 1,
    };

    // Normalize block content to ensure it's a string
    const normalizedBlock = {
      ...block,
      content: typeof block.content === 'string'
        ? block.content
        : block.content?.text || '',
    };

    // Use DynamicRenderer for all blocks
    return (
      <DynamicRenderer
        key={block.id}
        block={normalizedBlock}
        {...enhancedProps}
      />
    );
  };

  return (
    <div className="h-full w-full bg-transparent flex flex-col">
      {/* Header - Hidden when used within StandaloneEditor */}
      {!hideHeader && (
        <EditorHeader
          onSave={handleSave}
          onPublish={handlePublish}
          onBack={handleNavigation}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          isDirty={isDirty}
          onToggleListView={() => {}}
          onToggleCodeView={handleToggleCodeView}
          isCodeView={isCodeView}
          onPreview={handlePreview}
          onOpenDesignLibrary={() => setIsDesignLibraryOpen(true)}
          onOpenAIGenerator={() => setIsAIGeneratorOpen(true)}
          onToggleInspector={() => setSidebarOpen(!sidebarOpen)}
          isInspectorOpen={sidebarOpen}
          viewportMode={viewportMode}
          onViewportModeChange={switchViewport}
          containerWidth={containerSettings.width}
        />
      )}

      {/* Main Layout */}
      <div className="flex-1 flex relative">
        {/* Block Inserter */}
        <GutenbergBlockInserter
          isOpen={isBlockInserterOpen}
          onClose={() => setIsBlockInserterOpen(false)}
          onSelect={handleInsertBlock}
        />

        {/* Editor Canvas */}
        <div
          className={`flex-1 transition-all duration-300 overflow-y-auto bg-gray-100 ${
            isBlockInserterOpen ? 'ml-80' : 'ml-0'
          } ${
            sidebarOpen ? 'mr-80' : 'mr-0'
          }`}
          style={{ paddingTop: '10px', maxHeight: 'calc(100vh - 60px)' }}
        >
          <div
            className="mx-auto p-8 bg-white shadow-md transition-all duration-300 ease-in-out"
            style={{
              width: `${currentConfig.width}px`,
              maxWidth: '100%',
            }}
          >
            {/* Title Section - WordPress-style two-tier design */}
            <div className="mb-10">
              {/* Title Preview Display */}
              <div className="mb-6">
                <h1 className="text-4xl font-light text-gray-800 leading-tight">
                  {documentTitle || ''}
                </h1>
                <div className="mt-2 h-px bg-gradient-to-r from-gray-200 to-transparent"></div>
              </div>
              
              {/* Title Input Field */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Document Title
                </label>
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => {
                    setDocumentTitle(e.target.value);
                    setIsDirty(true);
                    // Notify parent component of title change
                    if (onTitleChange) {
                      onTitleChange(e.target.value);
                    }
                  }}
                  placeholder="Enter your title here..."
                  className="w-full px-0 py-1 text-xl font-medium text-gray-900 border-0 border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 outline-none transition-colors bg-transparent"
                  autoComplete="off"
                />
                <p className="mt-2 text-xs text-gray-500">
                  This title will appear at the top of your page
                </p>
              </div>
            </div>

            {/* Blocks */}
            {isCodeView ? (
              <div>
                <textarea
                  value={JSON.stringify(blocks, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setBlocks(parsed);
                    } catch (error) {
                      // Error log removed
                    }
                  }}
                  className="w-full min-h-[500px] font-mono text-sm p-4 border border-gray-300 rounded"
                />
              </div>
            ) : (
              <div className="blocks-container">
                {blocks.map((block, index) => (
                  <BlockWrapper
                    key={block.id}
                    blockId={block.id}
                    blockType={block.type}
                    isSelected={selectedBlockId === block.id}
                    onSelect={setSelectedBlockId}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDuplicate={handleDuplicate}
                    onDelete={handleBlockDelete}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    canMoveUp={index > 0}
                    canMoveDown={index < blocks.length - 1}
                  >
                    {renderBlock(block)}
                  </BlockWrapper>
                ))}
              </div>
            )}

            {/* Add block button */}
            {!isCodeView && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setIsBlockInserterOpen(true)}
                  className="px-6 py-3 border-2 border-dashed border-gray-300 rounded hover:border-gray-400 hover:bg-gray-50 text-gray-600 text-sm transition-colors"
                >
                  + Add Block
                </button>
              </div>
            )}
          </div>
        </div>

        {/* GutenbergSidebar - Right Sidebar */}
        {sidebarOpen && (
          <div className={cn(
            "fixed right-0 top-[60px] bg-white border-l overflow-y-auto transition-all duration-300 z-30",
            "shadow-lg"
          )}
               style={{ height: 'calc(100vh - 60px)', width: '280px' }}>
            <GutenbergSidebar
              activeTab={activeTab}
              postSettings={postSettings}
              blockSettings={selectedBlockId ? {
                id: selectedBlockId,
                type: blocks.find(b => b.id === selectedBlockId)?.type || '',
                attributes: blocks.find(b => b.id === selectedBlockId)?.attributes || {}
              } : undefined}
              mode={mode}
              onPostSettingsChange={(settings) => {
                setPostSettings(prev => ({ ...prev, ...settings }));
                setIsDirty(true);
                onPostSettingsChange?.(settings);
              }}
              onBlockSettingsChange={(settings) => {
                if (selectedBlockId && settings.attributes) {
                  const newBlocks = blocks.map(block => {
                    if (block.id === selectedBlockId) {
                      return {
                        ...block,
                        attributes: { ...block.attributes, ...settings.attributes }
                      };
                    }
                    return block;
                  });
                  updateBlocks(newBlocks);
                  setIsDirty(true);
                }
              }}
              onTabChange={(tab) => setActiveTab(tab)}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}
      </div>
      
      {/* Simple Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg bg-white ${
            toast.type === 'success' ? 'border-green-200' :
            toast.type === 'error' ? 'border-red-200' :
            'border-blue-200'
          }`}>
            {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {toast.type === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
            {toast.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
            <p className="text-sm font-medium text-gray-900">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Design Library Modal */}
      <DesignLibraryModalImproved
        isOpen={isDesignLibraryOpen}
        onClose={() => setIsDesignLibraryOpen(false)}
        onApplyTemplate={handleApplyTemplate}
      />

      {/* AI Generator Modal */}
      <SimpleAIModal
        isOpen={isAIGeneratorOpen}
        onClose={() => setIsAIGeneratorOpen(false)}
        onGenerate={(generatedBlocks) => {
          // Replace existing blocks with AI generated blocks
          // Convert AI blocks to ensure they have required content property
          const convertedBlocks = generatedBlocks.map(block => ({
            ...block,
            content: block.content || {}
          }));
          updateBlocks(convertedBlocks);
          showToast('AI 페이지가 생성되었습니다!', 'success');
        }}
      />

      {/* Slash Command Menu */}
      {isSlashMenuOpen && (
        <SlashCommandMenu
          query={slashQuery}
          onSelectBlock={handleSlashCommandSelect}
          onClose={() => {
            setIsSlashMenuOpen(false);
            setSlashQuery('');
            setSlashTriggerBlockId(null);
          }}
          position={slashMenuPosition}
          recentBlocks={recentBlocks}
        />
      )}
    </div>
  );
};

export default GutenbergBlockEditor;
