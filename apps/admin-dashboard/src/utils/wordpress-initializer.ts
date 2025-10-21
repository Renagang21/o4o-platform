/**
 * WordPress Initializer
 * This module is only loaded when WordPress functionality is needed
 * Prevents WordPress from being included in the initial bundle
 * Updated: 2025-09-30 - Fixed React 18.2.0 compatibility
 */

import React, {
  createElement, createContext, useContext, useState, useEffect,
  useCallback, useMemo, useRef, Component, Fragment, Children,
  forwardRef, memo, lazy, Suspense, StrictMode, PureComponent,
  cloneElement, isValidElement
} from 'react';
import ReactDOM, { createPortal, render, unmountComponentAtNode } from 'react-dom';
import { getBlockManager } from '@/utils/block-manager';
import '../styles/wordpress-dashboard.css';

// Initialize WordPress polyfills only when needed
export async function initializeWordPress() {
  // Check if already initialized
  if (window.wp?._initialized) {
    return;
  }

  // Create React bridge for WordPress
  if (typeof window !== 'undefined') {
    // No longer dependent on window.React - use directly imported React
    
    // Initialize WordPress global object
    window.wp = window.wp || {};
    
    // Initialize WordPress element with React
    window.wp.element = {
      createElement,
      createContext,
      useContext,
      useState,
      useEffect,
      useCallback,
      useMemo,
      useRef,
      Component,
      Fragment,
      Children,
      forwardRef,
      memo,
      lazy,
      Suspense,
      StrictMode,
      PureComponent,
      cloneElement,
      isValidElement,
      createPortal,
      render,
      unmountComponentAtNode,
    };

    // Initialize i18n
    window.wp.i18n = {
      __: (text: string) => text,
      _x: (text: string) => text,
      _n: (single: string, plural: string, number: number) => number === 1 ? single : plural,
      _nx: (single: string, plural: string, number: number) => number === 1 ? single : plural,
      sprintf: (format: string, ...args: any[]) => {
        let i = 0;
        return format.replace(/%[sdjf]/g, () => String(args[i++]));
      },
      isRTL: () => false,
      setLocaleData: () => {},
      getLocaleData: () => ({}),
      hasTranslation: () => false,
      subscribe: () => () => {}
    };

    // Initialize hooks
    const filters: Record<string, Function[]> = {};
    const actions: Record<string, Function[]> = {};
    
    window.wp.hooks = {
      addFilter: (hookName: string, _namespace: string, callback: Function, _priority = 10) => {
        filters[hookName] = filters[hookName] || [];
        filters[hookName].push(callback);
        return hookName;
      },
      applyFilters: (hookName: string, value: any, ...args: any[]) => {
        const callbacks = filters[hookName] || [];
        return callbacks.reduce((val, callback) => callback(val, ...args), value);
      },
      addAction: (hookName: string, _namespace: string, callback: Function, _priority = 10) => {
        actions[hookName] = actions[hookName] || [];
        actions[hookName].push(callback);
        return hookName;
      },
      doAction: (hookName: string, ...args: any[]) => {
        const callbacks = actions[hookName] || [];
        callbacks.forEach(callback => callback(...args));
      },
      removeFilter: () => 0,
      removeAction: () => 0,
      hasFilter: () => false,
      hasAction: () => false,
      removeAllFilters: () => 0,
      removeAllActions: () => 0,
      currentFilter: () => null,
      currentAction: () => null,
      doingFilter: () => false,
      doingAction: () => false,
      didFilter: () => 0,
      didAction: () => 0
    };

    // Simple publish-subscribe mechanism for block changes
    const blockSubscribers = new Set<Function>();
    
    // Initialize data with working subscribe mechanism
    window.wp.data = {
      select: () => ({}),
      dispatch: () => ({}),
      subscribe: (callback: Function) => {
        // Add callback to block subscribers
        blockSubscribers.add(callback);
        
        // Return unsubscribe function
        return () => {
          blockSubscribers.delete(callback);
        };
      },
      registerStore: () => {},
      combineReducers: () => () => ({}),
      createRegistry: () => ({}),
      createRegistrySelector: () => () => {},
      createRegistryControl: () => () => {},
      withSelect: () => (component: any) => component,
      withDispatch: () => (component: any) => component,
      useSelect: () => {},
      useDispatch: () => ({}),
      useRegistry: () => ({}),
      AsyncModeProvider: ({ children }: any) => children,
      RegistryProvider: ({ children }: any) => children,
      createReduxStore: () => ({}),
      register: () => {},
      registerGenericStore: () => {},
      use: () => {},
      plugins: {
        registerPlugin: () => {},
        unregisterPlugin: () => {},
        getPlugin: () => null,
        getPlugins: () => [],
      }
    };

    // Initialize standard Gutenberg block categories
    let blockCategories = [
      { slug: 'text', title: 'Text' },
      { slug: 'media', title: 'Media' },
      { slug: 'design', title: 'Design' },
      { slug: 'widgets', title: 'Widgets' },
      { slug: 'theme', title: 'Theme' },
      { slug: 'embed', title: 'Embeds' },
      { slug: 'dynamic', title: 'Dynamic' }
    ];
    
    // Store registered blocks
    const registeredBlocks = new Map();
    
    window.wp.blocks = {
      registerBlockType: (name: string, settings: any) => {
        // Store the block definition
        const block = { name, ...settings };
        registeredBlocks.set(name, block);
        
        // Notify all subscribers about the change
        blockSubscribers.forEach(callback => {
          try {
            callback();
          } catch (error) {
            // Prevent one subscriber's error from affecting others
          }
        });
        
        return block;
      },
      unregisterBlockType: (name: string) => {
        return registeredBlocks.delete(name);
      },
      getBlockType: (name: string) => {
        return registeredBlocks.get(name) || null;
      },
      getBlockTypes: () => {
        return Array.from(registeredBlocks.values());
      },
      getCategories: () => blockCategories,
      setCategories: (categories: any) => {
        blockCategories = [...categories];
      },
      updateCategory: () => {},
      registerBlockCollection: () => {},
      unregisterBlockCollection: () => {},
      getCollections: () => [],
      hasBlockSupport: () => false,
      isReusableBlock: () => false,
      getChildBlockNames: () => [],
      hasChildBlocks: () => false,
      hasChildBlocksWithInserterSupport: () => false,
      unstable__bootstrapServerSideBlockDefinitions: () => {},
      registerBlockStyle: () => {},
      unregisterBlockStyle: () => {},
      registerBlockVariation: () => {},
      unregisterBlockVariation: () => {},
      getBlockVariations: () => [],
      getDefaultBlockVariation: () => null,
      getActiveBlockVariation: () => null,
      getBlockStyles: () => [],
      getBlockSupport: () => undefined,
      getPossibleBlockTransformations: () => [],
      switchToBlockType: () => null,
      getBlockTransforms: () => [],
      findTransform: () => null,
      parse: () => [],
      parseWithAttributeSchema: () => {},
      pasteHandler: () => [],
      serialize: () => '',
      getBlockContent: () => '',
      getBlockDefaultClassName: () => '',
      getBlockMenuDefaultClassName: () => '',
      getSaveElement: () => null,
      getSaveContent: () => '',
      getBlockAttributes: () => ({}),
      createBlock: () => ({}),
      cloneBlock: () => ({}),
      __experimentalCloneSanitizedBlock: () => ({}),
      getPossibleBlockInsertions: () => [],
      isValidBlockContent: () => true,
      getBlockFromExample: () => ({}),
      doBlocksMatchTemplate: () => true,
      synchronizeBlocksWithTemplate: () => [],
      getPhrasingContentSchema: () => '',
      isValidIcon: () => true,
      normalizeIconObject: () => ({}),
      store: {}
    };

    // Initialize components
    window.wp.components = {
      Button: () => null,
      TextControl: () => null,
      SelectControl: () => null,
      ToggleControl: () => null,
      Panel: () => null,
      PanelBody: () => null,
      PanelRow: () => null,
      Placeholder: () => null,
      Spinner: () => null,
      Notice: () => null,
      ExternalLink: () => null,
      ToolbarButton: () => null,
      ToolbarGroup: () => null,
      Toolbar: () => null,
      DropdownMenu: () => null,
      MenuItem: () => null,
      MenuGroup: () => null,
      Modal: () => null,
      DateTimePicker: () => null,
      DatePicker: () => null,
      TimePicker: () => null,
      ColorPicker: () => null,
      ColorPalette: () => null,
      RangeControl: () => null,
      CheckboxControl: () => null,
      RadioControl: () => null,
      BaseControl: () => null,
      FormToggle: () => null,
      FormTokenField: () => null,
      TreeSelect: () => null,
      TabPanel: () => null,
      Card: () => null,
      CardBody: () => null,
      CardDivider: () => null,
      CardFooter: () => null,
      CardHeader: () => null,
      CardMedia: () => null,
      Flex: () => null,
      FlexBlock: () => null,
      FlexItem: () => null,
      Icon: () => null,
      Dashicon: () => null,
      Popover: () => null,
      Slot: () => null,
      Fill: () => null,
      SlotFillProvider: ({ children }: any) => children,
      NavigableMenu: () => null,
      TabbableContainer: () => null,
      __experimentalHStack: () => null,
      __experimentalVStack: () => null,
      __experimentalSpacer: () => null,
      __experimentalText: () => null,
      createSlotFill: () => ({ Slot: () => null, Fill: () => null }),
      withConstrainedTabbing: (component: any) => component,
      withFallbackStyles: (component: any) => component,
      withFilters: (component: any) => component,
      withFocusOutside: (component: any) => component,
      withFocusReturn: (component: any) => component,
      withNotices: (component: any) => component,
      withSpokenMessages: (component: any) => component,
    };

    // Initialize blockEditor
    window.wp.blockEditor = {
      BlockEditorProvider: ({ children }: any) => children,
      BlockList: () => null,
      BlockTools: () => null,
      BlockInspector: () => null,
      WritingFlow: ({ children }: any) => children,
      ObserveTyping: ({ children }: any) => children,
      BlockEditorKeyboardShortcuts: () => null,
      EditorHistoryUndo: () => null,
      EditorHistoryRedo: () => null,
      CopyHandler: ({ children }: any) => children,
      BlockSelectionClearer: ({ children }: any) => children,
      MultiSelectScrollIntoView: () => null,
      __experimentalBlockSettingsMenuFirstItem: () => null,
      __experimentalBlockSettingsMenuLastItem: () => null,
      BlockSettingsMenu: () => null,
      BlockSettingsMenuControls: () => null,
      BlockTitle: () => null,
      BlockToolbar: () => null,
      DefaultBlockAppender: () => null,
      __unstableBlockToolbarLastItem: () => null,
      __unstableBlockNameContext: () => null,
      InnerBlocks: () => null,
      InspectorControls: () => null,
      InspectorAdvancedControls: () => null,
      MediaPlaceholder: () => null,
      MediaUpload: () => null,
      MediaUploadCheck: ({ children }: any) => children,
      PanelColorSettings: () => null,
      PlainText: () => null,
      RichText: () => null,
      RichTextShortcut: () => null,
      RichTextToolbarButton: () => null,
      __unstableRichTextInputEvent: () => null,
      URLInput: () => null,
      URLInputButton: () => null,
      URLPopover: () => null,
      AlignmentControl: () => null,
      AlignmentToolbar: () => null,
      Autocomplete: () => null,
      BlockAlignmentControl: () => null,
      BlockAlignmentToolbar: () => null,
      BlockBreadcrumb: () => null,
      BlockContextProvider: ({ children }: any) => children,
      BlockControls: () => null,
      BlockEdit: () => null,
      BlockFormatControls: () => null,
      BlockIcon: () => null,
      BlockNavigationDropdown: () => null,
      __experimentalBlockNavigationBlockFill: () => null,
      __experimentalBlockNavigationEditor: () => null,
      __experimentalBlockNavigationTree: () => null,
      __experimentalBlockVariationPicker: () => null,
      __experimentalBlockVariationTransforms: () => null,
      BlockVerticalAlignmentControl: () => null,
      BlockVerticalAlignmentToolbar: () => null,
      ButtonBlockAppender: () => null,
      ButtonBlockerAppender: () => null,
      ColorPaletteControl: () => null,
      ContrastChecker: () => null,
      __experimentalDuotoneControl: () => null,
      __experimentalFontAppearanceControl: () => null,
      __experimentalFontFamilyControl: () => null,
      __experimentalColorGradientControl: () => null,
      __experimentalColorGradientSettingsDropdown: () => null,
      __experimentalPanelColorGradientSettings: () => null,
      __experimentalImageEditor: () => null,
      __experimentalImageEditingProvider: ({ children }: any) => children,
      __experimentalImageSizeControl: () => null,
      __experimentalImageURLInputUI: () => null,
      __experimentalLayoutStyle: () => null,
      __experimentalLetterSpacingControl: () => null,
      __experimentalLineHeightControl: () => null,
      __experimentalListView: () => null,
      __experimentalPanelBody: () => null,
      __experimentalPreviewOptions: () => null,
      __experimentalResponsiveBlockControl: () => null,
      __experimentalTextDecorationControl: () => null,
      __experimentalTextTransformControl: () => null,
      __experimentalUnitControl: () => null,
      __experimentalWritingModeControl: () => null,
      __unstableBlockSettingsMenuFirstItem: () => null,
      __unstableEditorStyles: () => null,
      __unstableIframe: ({ children }: any) => children,
      __unstableInserterMenuExtension: () => null,
      __unstableUseBlockSelectionClearer: () => null,
      __unstableUseClipboardHandler: () => null,
      __unstableUseDispatchWithMap: () => null,
      __unstableUseDropZone: () => null,
      __unstableUseEditorStyles: () => null,
      __unstableUseTypewriter: () => null,
      __unstableUseTypingObserver: () => null,
      __unstableUseValidateOnChange: () => null,
      getColorClassName: () => '',
      getColorObjectByAttributeValues: () => null,
      getColorObjectByColorValue: () => null,
      getFontSize: () => null,
      getFontSizeClass: () => '',
      createCustomColorsHOC: () => (component: any) => component,
      withColorContext: (component: any) => component,
      withColors: () => (component: any) => component,
      withFontSizes: () => (component: any) => component,
      store: {},
      Warning: () => null,
      useBlockProps: () => ({}),
      useInnerBlocksProps: () => ({}),
      __experimentalUseBlockPreview: () => null,
      __experimentalUseResizeCanvas: () => null,
      useBlockEditContext: () => ({}),
      useBlockDisplayInformation: () => null,
    };

    // Initialize compose
    window.wp.compose = {
      compose: (..._args: any[]) => (component: any) => component,
      createHigherOrderComponent: (fn: Function) => fn,
      debounce: (fn: Function, _delay: number) => fn,
      ifCondition: () => (component: any) => component,
      pure: (component: any) => component,
      throttle: (fn: Function, _delay: number) => fn,
      withGlobalEvents: () => (component: any) => component,
      withInstanceId: (component: any) => component,
      withSafeTimeout: (component: any) => component,
      withState: () => (component: any) => component,
      useAsyncList: () => [],
      useCopyOnClick: () => ({ ref: { current: null } }),
      useCopyToClipboard: () => [() => {}, () => {}],
      useDebounce: (value: any) => value,
      useFocusOnMount: () => ({ current: null }),
      useFocusReturn: () => ({ current: null }),
      useFocusableIframe: () => ({ current: null }),
      useInstanceId: () => '',
      useIsomorphicLayoutEffect: () => {},
      useKeyboardShortcut: () => {},
      useMediaQuery: () => false,
      useMergeRefs: () => ({ current: null }),
      usePrevious: (value: any) => value,
      useReducedMotion: () => false,
      useRefEffect: () => () => {},
      useResizeObserver: () => [null, { width: 0, height: 0 }],
      useThrottle: (value: any) => value,
      useViewportMatch: () => false,
      useWarnOnChange: () => {},
      __experimentalUseDragging: () => ({ isDragging: false }),
      __experimentalUseDropZone: () => ({ isOver: false }),
      __experimentalUseFocusOutside: () => {},
      __experimentalUseFixedWindowList: () => [],
    };

    // Initialize privateApis
    window.wp.privateApis = {
      lock: () => {},
      unlock: () => {},
      __dangerousOptInToUnstableAPIsOnlyForCoreModules: () => ({
        lock: () => {},
        unlock: () => {}
      })
    };

    // Initialize apiFetch with authentication
    window.wp.apiFetch = function(options: any) {
      // Get token from multiple sources
      const token = localStorage.getItem('accessToken') || 
                   localStorage.getItem('token') || 
                   localStorage.getItem('authToken');
      
      const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers
      };
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      return fetch(options.url || options.path, {
        ...options,
        headers
      }).then(response => response.json());
    };

    // Initialize domReady
    window.wp.domReady = function(callback: Function) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => callback());
      } else {
        callback();
      }
    };

    // Mark as initialized
    window.wp._initialized = true;
  }

  // Load block manager for optimized block loading
  const blockManager = getBlockManager();

  // Load only essential blocks initially
  await blockManager.loadEssentialBlocks();
  
  // Load embeds category for markdown support
  await blockManager.loadCategory('embeds');
  
  // Load dynamic blocks category
  await blockManager.loadCategory('dynamic');
  
  // Start progressive loading of other blocks
  blockManager.loadBlocksProgressive();

  return true;
}

// Check if WordPress is needed for current route
export function isWordPressRoute(pathname: string): boolean {
  const wordpressRoutes = [
    '/pages/gutenberg',
    '/pages/form',
    '/pages/edit',
    '/pages/new',
    '/tools/blocks',
    '/tools/patterns',
    '/content/editor',
    '/theme/editor',
    '/theme/preview'
  ];
  
  return wordpressRoutes.some(route => pathname.includes(route));
}