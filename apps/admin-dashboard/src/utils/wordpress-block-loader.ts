/**
 * WordPress Block Loader - Optimized for smaller chunks
 * Loads only required block editor modules
 */

interface BlockEditorModules {
  core?: any;
  ui?: any;
  formats?: any;
  media?: any;
  misc?: any;
}

let blockEditorCache: BlockEditorModules = {};

/**
 * Load core block editor functionality (required)
 */
export async function loadBlockEditorCore() {
  if (blockEditorCache.core) {
    return blockEditorCache.core;
  }

  try {
    // Import only core functionality
    const module = await import(
      /* webpackChunkName: "wp-block-editor-core" */
      '@wordpress/block-editor'
    ).then(m => ({
      BlockEditorProvider: m.BlockEditorProvider,
      BlockList: m.BlockList,
      WritingFlow: m.WritingFlow,
      ObserveTyping: m.ObserveTyping,
      BlockSelectionClearer: m.BlockSelectionClearer,
      useBlockProps: m.useBlockProps,
      useInnerBlocksProps: m.useInnerBlocksProps,
    }));

    blockEditorCache.core = module;
    return module;
  } catch (error) {
    console.error('Failed to load block editor core:', error);
    throw error;
  }
}

/**
 * Load UI components (toolbar, inspector, etc)
 */
export async function loadBlockEditorUI() {
  if (blockEditorCache.ui) {
    return blockEditorCache.ui;
  }

  try {
    const module = await import(
      /* webpackChunkName: "wp-block-editor-ui" */
      '@wordpress/block-editor'
    ).then(m => ({
      BlockInspector: m.BlockInspector,
      BlockToolbar: m.BlockToolbar,
      BlockControls: m.BlockControls,
      InspectorControls: m.InspectorControls,
      InspectorAdvancedControls: m.InspectorAdvancedControls,
      BlockNavigationDropdown: m.BlockNavigationDropdown,
    }));

    blockEditorCache.ui = module;
    return module;
  } catch (error) {
    console.error('Failed to load block editor UI:', error);
    throw error;
  }
}

/**
 * Load rich text formatting tools
 */
export async function loadBlockEditorFormats() {
  if (blockEditorCache.formats) {
    return blockEditorCache.formats;
  }

  try {
    const module = await import(
      /* webpackChunkName: "wp-block-editor-formats" */
      '@wordpress/block-editor'
    ).then(m => ({
      RichText: m.RichText,
      RichTextToolbarButton: m.RichTextToolbarButton,
      RichTextShortcut: m.RichTextShortcut,
      URLInput: m.URLInput,
      URLInputButton: m.URLInputButton,
      URLPopover: m.URLPopover,
      PlainText: m.PlainText,
    }));

    blockEditorCache.formats = module;
    return module;
  } catch (error) {
    console.error('Failed to load block editor formats:', error);
    throw error;
  }
}

/**
 * Load media handling components
 */
export async function loadBlockEditorMedia() {
  if (blockEditorCache.media) {
    return blockEditorCache.media;
  }

  try {
    const module = await import(
      /* webpackChunkName: "wp-block-editor-media" */
      '@wordpress/block-editor'
    ).then(m => ({
      MediaUpload: m.MediaUpload,
      MediaUploadCheck: m.MediaUploadCheck,
      MediaPlaceholder: m.MediaPlaceholder,
    }));

    blockEditorCache.media = module;
    return module;
  } catch (error) {
    console.error('Failed to load block editor media:', error);
    throw error;
  }
}

/**
 * Load all block editor modules
 */
export async function loadFullBlockEditor() {
  const [core, ui, formats, media] = await Promise.all([
    loadBlockEditorCore(),
    loadBlockEditorUI(),
    loadBlockEditorFormats(),
    loadBlockEditorMedia(),
  ]);

  return {
    ...core,
    ...ui,
    ...formats,
    ...media,
  };
}

/**
 * Load minimal block editor for basic editing
 */
export async function loadMinimalBlockEditor() {
  const core = await loadBlockEditorCore();
  return core;
}

/**
 * Progressive loading based on user interaction
 */
export async function loadBlockEditorProgressive() {
  // Start with core
  const core = await loadBlockEditorCore();
  
  // Preload UI in background
  setTimeout(() => {
    loadBlockEditorUI();
  }, 1000);
  
  // Preload formats after a delay
  setTimeout(() => {
    loadBlockEditorFormats();
  }, 2000);
  
  return core;
}