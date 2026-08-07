import { useState, FC, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { Post } from '@/types/post.types';
import { cn } from '@/lib/utils';
import { EditorHeader } from '@/components/editor/header/EditorHeader';
import { initializeWordPress } from '@/utils/editor-runtime';
import { clearEditorSession } from '@/utils/history-manager';
import O4OBlockEditor from '@/components/editor/O4OBlockEditor';
import MediaLibraryAdmin from '@/pages/media/MediaLibraryAdmin';
import ContentTemplates from '@/components/editor/ContentTemplates';
import { SimpleAIModal } from '@/components/ai/SimpleAIModal';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
// Phase 1-C: New Block Request Panel
import { NewBlockRequestPanel } from '@/components/editor/NewBlockRequestPanel';
import { NewBlockRequest } from '@/services/ai/types';
// Phase 2-A: Runtime Block Generation
import { blockCodeGenerator } from '@/services/ai/BlockCodeGenerator';
import { compileComponent } from '@/blocks/runtime/runtime-code-loader';
import { runtimeBlockRegistry } from '@/blocks/runtime/runtime-block-registry';
import { BlockDefinition } from '@/blocks/registry/types';
import toast from 'react-hot-toast';
import { devLog } from '@/utils/logger';
import '@/styles/editor-animations.css';
import { postApi } from '@/services/api/postApi';
import { useCustomizerSettings } from '@/hooks/useCustomizerSettings';

interface StandaloneEditorProps {
  mode?: 'post' | 'page' | 'template' | 'pattern';
  postId?: string | number;  // Now passed from EditorRouteWrapper
}

const StandaloneEditor: FC<StandaloneEditorProps> = ({ mode = 'post', postId: initialPostId }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  // Don't use 'new' as an ID - it should be undefined for new posts
  const [currentPostId, setCurrentPostId] = useState<string | number | undefined>(
    initialPostId === 'new' ? undefined : initialPostId
  );

  // 모바일/태블릿 감지 (Tailwind CSS 표준 breakpoints 사용)
  useEffect(() => {
    const checkResponsive = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);  // sm breakpoint (Tailwind standard)
      setIsTablet(width >= 640 && width < 1024);  // lg breakpoint (Tailwind standard)
    };

    checkResponsive();
    window.addEventListener('resize', checkResponsive);
    return () => window.removeEventListener('resize', checkResponsive);
  }, []);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Viewport mode hook for editor width control
  const { viewportMode, currentConfig, switchViewport, containerSettings } = useCustomizerSettings();

  // Theme preview mode state (applies theme width to editor canvas)
  const [isThemePreviewMode, setIsThemePreviewMode] = useState(() => {
    try {
      const stored = localStorage.getItem('editor-theme-preview-mode');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  // Save theme preview mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('editor-theme-preview-mode', String(isThemePreviewMode));
    } catch {
      // Ignore localStorage errors
    }
  }, [isThemePreviewMode]);

  // Simple and reliable check for new post
  const isNewPost = !currentPostId;
  
  // Component initialized with postId and mode from props
  
  // Editor state
  const [postTitle, setPostTitle] = useState('');
  const [blocks, setBlocks] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Changed to true for better UX and permalink access
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveRequestRef = useRef<AbortController | null>(null);
  const lastSaveHashRef = useRef<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isWordPressReady, setIsWordPressReady] = useState(false);
  const [showListView, setShowListView] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isPostDataLoaded, setIsPostDataLoaded] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [blocksBackup, setBlocksBackup] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  // Phase 1-C: New Block Request Panel state
  const [newBlocksRequest, setNewBlocksRequest] = useState<NewBlockRequest[]>([]);

  // Add refs to track latest state values for save operations
  const blocksRef = useRef<any[]>([]);
  
  // Post settings
  const [postSettings, setPostSettings] = useState({
    status: 'draft' as 'draft' | 'publish' | 'pending' | 'private' | 'scheduled',
    visibility: 'public' as 'public' | 'private' | 'password',
    publishDate: new Date().toISOString().slice(0, 16),
    author: 'Admin User',
    featuredImage: undefined as string | undefined,
    excerpt: '',
    slug: '',
    slugError: false,
    categories: [] as string[],
    tags: [] as string[],
    template: 'default',
    commentStatus: true,
    pingStatus: true,
    sticky: false,
    format: 'standard' as 'standard' | 'aside' | 'chat' | 'gallery' | 'link' | 'image' | 'quote' | 'status' | 'video' | 'audio'
  });
  
  // Initialize ref with postSettings after it's defined
  const postSettingsRef = useRef(postSettings);

  // Helper function to normalize API response
  const normalizePostResponse = (response: any): Post | null => {
    if (!response) return null;
    
    let data = response;
    
    // Handle various response structures
    // Case 1: { success: true, data: { data: {...} } } (postApi wrapper + server response)
    if (data.success && data.data) {
      data = data.data;
    }
    
    // Case 2: { data: {...} } (server response)
    if (data.data && !data.id && !data.title) {
      data = data.data;
    }
    
    // Case 3: { post: {...} } (alternative structure)
    if (data.post && !data.id && !data.title) {
      data = data.post;
    }
    
    // Validate essential fields
    if (!data.id) {
      // Invalid post data: missing id
      return null;
    }
    
    return data as Post;
  };

  // Simplified load post data function
  const loadPostData = async (id: string | number) => {
    const loadingToast = toast.loading(`Loading post...`);
    
    try {
      const response = await postApi.get(String(id));
      
      // Store API response for debugging (works in production too)
      if (typeof window !== 'undefined') {
        (window as any).__LAST_API_RESPONSE = response;
        (window as any).__LAST_API_RESPONSE_TIME = new Date().toISOString();
      }
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load post');
      }
      
      // Normalize the response
      const data = normalizePostResponse(response);
      
      if (!data) {
        throw new Error('Invalid post data received');
      }
      
      // Extract and set title
      const title = data.title || '';
      setPostTitle(title);
      
      // Parse and set content
      let parsedBlocks = [];
      if (data.content) {
        if (typeof data.content === 'string') {
          try {
            const parsed = JSON.parse(data.content);
            parsedBlocks = Array.isArray(parsed) ? parsed : 
                          (parsed?.blocks || []);
          } catch {
            // Plain text - create paragraph block
            // IMPORTANT: Use 'content' field, NOT 'attributes.content'
            // ParagraphBlock expects HTML content in the 'content' prop
            parsedBlocks = [{
              id: 'block-1',
              type: 'o4o/paragraph',
              content: data.content,
              attributes: {}
            }];
          }
        } else if (Array.isArray(data.content)) {
          parsedBlocks = data.content;
        } else if ((data as any).content?.blocks) {
          parsedBlocks = (data as any).content.blocks;
        }
      }
      
      // DEBUG: Store parsed blocks for inspection
      if (typeof window !== 'undefined') {
        (window as any).__PARSED_BLOCKS = parsedBlocks;
        (window as any).__PARSED_BLOCKS_TIME = new Date().toISOString();
      }

      setBlocks(parsedBlocks);
      blocksRef.current = parsedBlocks; // Update ref

      // Set post settings - ensure slug is preserved
      setPostSettings(prev => {
        const mapStatus = (s: any) => {
          if (s === 'published') return 'publish';
          if (s === 'trash') return 'draft';
          return s;
        };
        const toIsoLocal = (input: any) => {
          const d = input ? new Date(input) : new Date();
          return d.toISOString().replace('Z', '').slice(0, 16);
        };
        const newSettings = {
          ...prev,
          status: mapStatus(data.status || 'draft') as any,
          visibility: 'public' as const,
          publishDate: toIsoLocal(data.publishedAt || data.createdAt),
          author: data.author?.name || 'Admin User',
          featuredImage: data.featuredImage?.url,
          excerpt: data.excerpt || '',
          slug: data.slug || prev.slug || '', // Preserve existing slug if API doesn't return one
          categories: data.categories?.map((c: any) => typeof c === 'object' ? c.id : c) || [],
          tags: data.tags?.map((t: any) => typeof t === 'object' ? t.id : t) || [],
          template: 'default',
          commentStatus: true,
          pingStatus: true,
          sticky: false,
          format: 'standard' as const
        };
        
        // Store debug data on window for production debugging
        if (typeof window !== 'undefined') {
          (window as any).__DEBUG_AFTER_SET = {
            newSlug: newSettings.slug,
            dataSlug: data.slug,
            prevSlug: prev.slug,
            allNewSettings: newSettings,
            timestamp: new Date().toISOString()
          };
        }
        
        return newSettings;
      });
      
      // Update postSettings ref
      postSettingsRef.current = {
        ...postSettingsRef.current,
        slug: data.slug || '',
        status: (data.status === 'published' ? 'publish' : (data.status === 'trash' ? 'draft' : (data.status || 'draft'))),
        excerpt: data.excerpt || '',
        categories: (data.categories || []).map((c: any) => typeof c === 'object' ? c.id : c),
        tags: (data.tags || []).map((t: any) => typeof t === 'object' ? t.id : t),
        sticky: (data as any).sticky || false,
        featuredImage: data.featuredImage?.url,
        format: (data as any).format || 'standard',
        commentStatus: (data as any).commentStatus !== false
      };
      
      setIsDirty(false);
      setIsPostDataLoaded(true);  // Mark data as loaded
      toast.dismiss(loadingToast);
      toast.success('Post loaded');
      
    } catch (error: any) {
      // Log error in development only
      if (import.meta.env.DEV) {
        // Load error occurred
      }
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to load post');
      
      // Reset to empty state on error
      setPostTitle('');
      setBlocks([]);
      setIsDirty(false);
    }
  };

  // Initialize editor and load data
  useEffect(() => {
    const initializeEditor = async () => {
      try {
        // Initialize WordPress editor
        await initializeWordPress();
        setIsWordPressReady(true);
        
        // Load post data if editing existing post
        if (currentPostId && !isNewPost) {
          // Prevent GutenbergBlockEditor from restoring previous session
          // which may belong to a different post
          try { clearEditorSession(); } catch { /* 세션 정리 실패는 무시 — 아래 loadPostData 가 어차피 덮어쓴다 */ }
          await loadPostData(currentPostId);
        } else {
          // Reset states for new post
          setPostTitle('');
          setBlocks([]);
          blocksRef.current = []; // Reset ref
          setIsDirty(false);
          setIsPostDataLoaded(true);  // New post is "loaded" immediately
        }
        
        // Editor is ready
        
      } catch (error) {
        if (import.meta.env.DEV) {
          // Init error occurred
        }
        toast.error('Failed to initialize editor');
        setIsWordPressReady(true); // Still show editor even if init fails
      }
    };
    
    initializeEditor();
  }, [currentPostId, isNewPost]); // loadPostData removed - it has empty deps and won't change

  // Track unsaved changes - removed as it causes issues
  // isDirty is now managed manually when actual changes occur
  
  // Autosave removed - only save when user explicitly clicks save/publish

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // This function was moved to above useEffect to avoid temporal dead zone

  // Removed debounce - using direct calls with isSaving flag for duplicate prevention
  
  // Generate hash of save data to prevent duplicate saves
  const generateSaveHash = (data: any) => {
    const str = JSON.stringify({
      title: data.title,
      content: data.content,  // Now includes { blocks: [...] } structure
      status: data.status,
      slug: data.slug
    });
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  };
  
  const handleSave = async (publish = false): Promise<string | undefined> => {
    // Prevent double-clicking and concurrent saves
    if (isSaving) {
      toast('Save already in progress', { icon: '⏳' });
      return;
    }
    
    // isSaving flag prevents duplicate saves
    
    // Cancel any in-flight request
    if (saveRequestRef.current) {
      saveRequestRef.current.abort();
      saveRequestRef.current = null;
    }
    
    // Client-side validation
    // Use refs to get latest values and avoid stale closure
    const currentBlocks = blocksRef.current;
    const currentSettings = postSettingsRef.current;
    
    const trimmedTitle = postTitle?.trim() || '';
    let trimmedSlug = currentSettings.slug?.trim() || '';
    
    // Auto-generate slug from title if empty (for non-Korean titles)
    // Only for new posts, not updates
    if (!trimmedSlug && trimmedTitle && !currentPostId) {
      // Check if title contains Korean characters
      const hasKorean = /[\u3131-\uD79D]/.test(trimmedTitle);
      if (!hasKorean) {
        // Auto-generate slug for English titles
        trimmedSlug = trimmedTitle
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      }
    }
    
    const hasContent = currentBlocks && currentBlocks.length > 0 && currentBlocks.some(block => {
      const content = block.content;
      if (typeof content === 'string') return content.trim().length > 0;
      if (content?.text && typeof content.text === 'string') return content.text.trim().length > 0;
      if (content?.url) return true; // Image blocks
      return false;
    });
    
    // Title validation - Title is required
    if (!trimmedTitle) {
      toast.error('⚠️ 제목을 입력해주세요. 제목은 필수 항목입니다.', {
        duration: 5000,
        icon: '📝'
      });
      return;
    }
    
    // DEBUG: Comprehensive slug debugging
    // Logging removed for CI/CD
    
    // Slug validation - Required for all posts
    if (!trimmedSlug) {
      // Always require slug to be entered manually if it's empty
      const errorMessage = '⚠️ Slug가 비어있습니다. 오른쪽 사이드바의 Permalink 필드에 영문 URL을 입력해주세요.';
      
      toast.error(errorMessage, {
        duration: 5000,
        icon: '🔗'
      });
      setPostSettings(prev => ({ ...prev, slugError: true }));
      setSidebarOpen(true); // Open sidebar to show slug input
      return;
    }
    
    // Validate slug format
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugPattern.test(trimmedSlug)) {
      toast.error('⚠️ 올바르지 않은 slug 형식입니다. 소문자, 숫자, 하이픈만 사용 가능합니다.', {
        duration: 5000
      });
      setPostSettings(prev => ({ ...prev, slugError: true }));
      setSidebarOpen(true);
      return;
    }
    
    setIsSaving(true);
    
    // Create new abort controller for this request
    saveRequestRef.current = new AbortController();
    
    try {
      // Don't use default title - let backend handle empty titles
      
      // Prepare base data for both create and update
      // Use refs for latest state values
      const contentType = mode === 'page' ? 'page' : 'post';
      const baseData = {
        title: trimmedTitle,  // Use validated trimmed title
        content: JSON.stringify(currentBlocks),  // Serialize blocks array to string
        excerpt: currentSettings.excerpt,
        slug: trimmedSlug,  // Use the validated/trimmed slug
        status: publish ? 'publish' : (currentSettings.status || 'draft'),
        type: contentType,  // Explicitly set type based on mode
        categories: currentSettings.categories as any,
        tags: currentSettings.tags as any,
        featured: false,
        sticky: currentSettings.sticky,
        featuredImage: currentSettings.featuredImage as any,
        format: currentSettings.format,
        allowComments: currentSettings.commentStatus
      };
      
      // Debug info removed - Pages type issue resolved in backend
      
      // Check if this is a duplicate save (same content)
      const saveHash = generateSaveHash(baseData);
      if (lastSaveHashRef.current === saveHash && !isDirty) {
        setIsSaving(false);
        toast('No changes to save', { icon: 'ℹ️' });
        return currentPostId != null ? String(currentPostId) : undefined;
      }
      
      // Add unique request ID to prevent duplicate processing
      const requestId = `${Date.now()}-${Math.random()}`;
      const requestData = { ...baseData, _requestId: requestId };
      
      // Call appropriate API method based on whether we have a post ID
      const response = currentPostId 
        ? await postApi.update({ ...requestData, id: String(currentPostId) }) // Update existing post
        : await postApi.create(requestData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to save');
      }
      
      const savedData = response.data;
      
      // Invalidate posts queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts-counts'] });
      
      // If it's a new post and we get an ID back, update the URL and state
      if (!currentPostId && savedData?.id) {
        setCurrentPostId(savedData.id);  // Update internal state
        navigate(`/editor/${mode}s/${savedData.id}`, { replace: true });
        // Don't return here - continue with the rest of the save logic
      }
      
      // Update post settings with saved data
      // Only update slug if it's different from what we sent (server might have modified it)
      if (savedData?.slug && savedData.slug !== trimmedSlug) {
        setPostSettings(prev => ({ ...prev, slug: String(savedData.slug) }));
        postSettingsRef.current = { ...postSettingsRef.current, slug: savedData.slug };
      }
      
      setLastSaved(new Date());
      setIsDirty(false);
      lastSaveHashRef.current = saveHash; // Remember last saved content hash
      
      if (publish) {
        setPostSettings(prev => ({ ...prev, status: 'publish' }));
        toast.success('Published successfully!');
      } else {
        toast.success('Saved as draft');
      }
      
          // Return the saved post ID for use in preview
          const savedId = savedData?.id != null ? String(savedData.id) : undefined;
          return savedId || (currentPostId != null ? String(currentPostId) : undefined);
    } catch (error: any) {
      // Show specific conflict/validation messages when possible
      const status = error?.response?.status;
      const errorMessage = error?.response?.data?.error?.message;
      
      if (import.meta.env.DEV) {
        // Save error occurred
      }
      
      const errorCode = error.response?.data?.error || error.response?.data?.error?.code;
      const errorDetails = error.response?.data?.details;
      
      if (errorCode === 'INVALID_SLUG' || errorCode === 'INVALID_SLUG_FORMAT') {
        toast.error('❌ Slug 에러: ' + (errorDetails || 'Invalid slug format. Use only lowercase letters, numbers, and hyphens'));
        setPostSettings(prev => ({ ...prev, slugError: true }));
        setSidebarOpen(true); // Open sidebar to show the error
      } else if (errorCode === 'SLUG_REQUIRED' || errorCode === 'SLUG_GENERATION_FAILED') {
        toast.error('❌ Slug 생성 실패: 한글 제목은 수동으로 slug를 입력해야 합니다');
        setPostSettings(prev => ({ ...prev, slugError: true }));
        setSidebarOpen(true); // Open sidebar to let user input slug
      } else if (errorCode === 'DUPLICATE_SLUG' || status === 409) {
        toast.error('❌ 중복된 slug: 이미 사용 중인 slug입니다. 다른 slug를 입력해주세요');
        setPostSettings(prev => ({ ...prev, slugError: true }));
        setSidebarOpen(true);
      } else if (status === 400) {
        // Validation error from API
        const message = error.response?.data?.message || errorMessage || '제목이나 내용 중 하나는 입력해야 합니다';
        toast.error('❌ 유효성 검사 실패: ' + message);
      } else if (status === 422) {
        toast.error('Validation failed. Please check required fields.');
      } else {
        toast.error(error?.message || 'Failed to save');
      }
      return undefined;
    } finally {
      setIsSaving(false);
      saveRequestRef.current = null;
    }
  };

  const handlePublish = async () => {
    await handleSave(true);
  };

  // Phase 2-A: Handle block generation from placeholder
  const handleGenerateBlock = async (spec: NewBlockRequest) => {
    try {
      devLog('🚀 Generating block from spec:', spec);

      // Step 1: Generate code using AI
      const generatedCode = await blockCodeGenerator.generate(spec);

      // Step 2: Compile the component
      const compileResult = compileComponent(generatedCode.componentCode);

      if (!compileResult.success || !compileResult.component) {
        throw new Error(compileResult.error || 'Failed to compile component');
      }

      // Step 3: Create block definition
      const blockDefinition: BlockDefinition = {
        name: generatedCode.blockName,
        title: spec.componentName,
        category: spec.spec.category || 'widgets',
        icon: 'Package', // AI-generated blocks use Package icon
        description: spec.reason,
        component: compileResult.component,
        attributes: (spec.spec.props || []).reduce((acc, prop) => {
          acc[prop] = { type: 'string', default: '' };
          return acc;
        }, {} as any),
      };

      // Step 4: Register in runtime registry
      runtimeBlockRegistry.registerRuntimeBlock(
        blockDefinition,
        compileResult.component,
        {
          componentName: spec.componentName,
          reason: spec.reason,
          props: spec.spec.props,
          style: spec.spec.style,
          category: spec.spec.category,
        }
      );

      // Step 5: Replace placeholder with new block
      if (spec.placeholderId) {
        const newBlocks = blocks.map(block => {
          if (block.type === 'o4o/placeholder' &&
              block.attributes?.placeholderId === spec.placeholderId) {
            return {
              ...block,
              type: generatedCode.blockName,
              attributes: {},
            };
          }
          return block;
        });
        setBlocks(newBlocks);
        blocksRef.current = newBlocks;
        setIsDirty(true);
      }

      // Step 6: Remove from newBlocksRequest list
      setNewBlocksRequest(prev =>
        prev.filter(req => req.placeholderId !== spec.placeholderId)
      );

      toast.success(`${spec.componentName} 블록이 생성되고 등록되었습니다!`);
    } catch (error: any) {
      toast.error(error.message || '블록 생성 중 오류가 발생했습니다');
      throw error;
    }
  };

  const handlePreview = async () => {
    let postIdToPreview = currentPostId;
    
    // Save draft first if needed
    if (isDirty || !currentPostId) {
      toast('Saving draft for preview...', { icon: '💾' });
      const savedId = await handleSave(false);
      if (savedId) {
        postIdToPreview = savedId;
      } else {
        toast.error('Failed to save. Cannot preview.');
        return;
      }
    }
    
    // Open preview with the correct ID
    if (postIdToPreview) {
      window.open(`/preview/posts/${postIdToPreview}`, '_blank');
    }
  };

  const handleBack = () => {
    if (isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  const handleSelectTemplate = (template: any) => {
    setBlocks(template.blocks);
    blocksRef.current = template.blocks; // Update ref
    setShowTemplates(false);
    setIsDirty(true);
  };

  const handleSelectPattern = (pattern: any) => {
    const newBlocks = [...blocksRef.current, ...pattern.blocks];
    setBlocks(newBlocks);
    blocksRef.current = newBlocks; // Update ref
    setShowTemplates(false);
    setIsDirty(true);
  };

  const handleMediaSelect = (media: any) => {
    // Media selection is now handled by GutenbergBlockEditor internally
    // Just close the modal
    setShowMediaLibrary(false);
  };

  // Get mode label
  const getModeLabel = () => {
    switch (mode) {
      case 'page': return 'Page';
      case 'template': return 'Template';
      case 'pattern': return 'Pattern';
      default: return 'Post';
    }
  };

  if (!isWordPressReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-gray-600">Initializing editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-screen flex flex-col bg-white"
    >
      {/* Development Debug Bar */}
      {import.meta.env.DEV && (
        <div className="bg-gray-800 text-gray-200 text-xs px-2 py-1 flex gap-3 font-mono">
          <span className="text-blue-400">ID: {currentPostId || 'new'}</span>
          <span className="text-green-400">Mode: {mode}</span>
          <span className="text-yellow-400">Title: {postTitle ? `"${postTitle.substring(0, 20)}..."` : 'empty'}</span>
          <span className="text-purple-400">Blocks: {blocks.length}</span>
          {isDirty && <span className="text-red-400">• unsaved</span>}
        </div>
      )}
      
      {/* Editor Header */}
      <EditorHeader
        postTitle={postTitle}
        postStatus={postSettings.status}
        isSaving={isSaving}
        isDirty={isDirty}
        lastSaved={lastSaved}
        isMobile={isMobile}
        isTablet={isTablet}
        onTitleChange={(newTitle) => {
          setPostTitle(newTitle);
          setIsDirty(true);
        }}
        onBack={handleBack}
        onGoToHome={() => navigate('/admin')}
        onSave={async (publish) => { await handleSave(publish); }}
        onPublish={handlePublish}
        onPreview={handlePreview}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        onOpenDesignLibrary={() => setShowTemplates(true)}
        onOpenAIGenerator={() => setShowAIGenerator(true)}
        onToggleListView={() => setShowListView(!showListView)}
        showListView={showListView}
        viewportMode={viewportMode}
        onViewportChange={switchViewport}
        containerWidth={containerSettings.width}
        isThemePreviewMode={isThemePreviewMode}
        onToggleThemePreview={() => setIsThemePreviewMode(!isThemePreviewMode)}
        onOpenCustomizer={() => navigate('/appearance/customize')}
        isPostDataLoaded={isPostDataLoaded}
        isNewPost={isNewPost}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Canvas */}
        <div className={cn(
          "flex-1 overflow-auto bg-gray-50 transition-all duration-300",
          isThemePreviewMode && "flex items-start justify-center pt-8"
        )}>
          <div
            className={cn(
              "min-h-full",
              isThemePreviewMode && "bg-white shadow-xl"
            )}
            style={isThemePreviewMode ? {
              width: `${currentConfig.width}px`,
              maxWidth: '100%',
              transition: 'width 0.3s ease-out'
            } : undefined}
          >
            <O4OBlockEditor
              documentTitle={postTitle || ''}
              initialBlocks={blocks}
              slug={postSettings.slug || ''}
              postSettings={postSettings}
              mode={mode}
              // Disable session restoration when editing an existing post
              disableSessionRestore={Boolean(currentPostId)}
              hideHeader={true}
              onPostSettingsChange={(settings) => {
                setPostSettings(prev => ({ ...prev, ...settings }));
                postSettingsRef.current = { ...postSettingsRef.current, ...settings }; // Update ref
                setIsDirty(true);
              }}
              onTitleChange={(newTitle) => {
                setPostTitle(newTitle);
                setIsDirty(true);
              }}
              onChange={(newBlocks) => {
                setBlocks(newBlocks);
                blocksRef.current = newBlocks; // Update ref
                // Only mark as dirty if we have actual content changes, not just initialization
                // Check if this is not just an empty paragraph block (default initialization)
                const hasRealContent = newBlocks.some(block => {
                  if (block.type === 'o4o/paragraph') {
                    const text = block.content?.text || block.content || '';
                    return typeof text === 'string' && text.trim().length > 0;
                  }
                  return true; // Other block types are considered real content
                });
                
                // Only mark dirty if we have a post ID or real content
                if (currentPostId || hasRealContent) {
                  setIsDirty(true);
                }
              }}
              onSave={async () => { await handleSave(); }}
              onPublish={handlePublish}
              showListView={showListView}
              onToggleListView={() => setShowListView(!showListView)}
            />
          </div>
        </div>
      </div>
      
      {/* Media Library Modal */}
      <Dialog open={showMediaLibrary} onOpenChange={setShowMediaLibrary}>
        <DialogContent className="max-w-6xl h-[80vh] p-0">
          <MediaLibraryAdmin />
        </DialogContent>
      </Dialog>
      
      {/* Templates Modal */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-6xl h-[80vh] p-0">
          <ContentTemplates
            onSelectTemplate={handleSelectTemplate}
            onSelectPattern={handleSelectPattern}
          />
        </DialogContent>
      </Dialog>

      {/* AI Generator Modal */}
      <SimpleAIModal
        isOpen={showAIGenerator}
        mode={isNewPost ? 'new' : 'edit'}
        currentBlocks={blocks}
        onClose={() => {
          setShowAIGenerator(false);
          // Clear backup on close
          setBlocksBackup([]);
        }}
        onGenerate={(result) => {
          // Phase 1-A: Handle GenerateResult (v1/v2 compatible)
          setBlocks(result.blocks);
          blocksRef.current = result.blocks;
          setIsDirty(true);

          // Phase 1-C: newBlocksRequest 저장 및 표시
          if (result.newBlocksRequest && result.newBlocksRequest.length > 0) {
            setNewBlocksRequest(result.newBlocksRequest);
            toast.success(
              `${isNewPost ? 'AI 페이지가 성공적으로 생성되었습니다!' : 'AI 페이지 편집이 완료되었습니다!'} (${result.newBlocksRequest.length}개의 새 블록 요청 포함)`,
              { duration: 6000 }
            );
          } else {
            setNewBlocksRequest([]);
            toast.success(isNewPost ? 'AI 페이지가 성공적으로 생성되었습니다!' : 'AI 페이지 편집이 완료되었습니다!');
          }
        }}
        onBackup={() => {
          // Backup current blocks before AI generation
          setBlocksBackup([...blocks]);
        }}
        onRestore={() => {
          // Restore from backup
          if (blocksBackup.length > 0) {
            setBlocks(blocksBackup);
            blocksRef.current = blocksBackup;
            setBlocksBackup([]);
            toast.success('원본으로 복원되었습니다');
          }
        }}
      />

      {/* Phase 1-C: New Block Request Panel */}
      {newBlocksRequest.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg p-4">
          <NewBlockRequestPanel
            newBlocksRequest={newBlocksRequest}
            variant="bottom"
            onScrollToPlaceholder={(placeholderId) => {
              const element = document.querySelector(`[data-placeholder-id="${placeholderId}"]`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
                setTimeout(() => {
                  element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
                }, 2000);
              }
            }}
            onGenerateBlock={handleGenerateBlock}
          />
        </div>
      )}
    </div>
  );
};

export default StandaloneEditor;
