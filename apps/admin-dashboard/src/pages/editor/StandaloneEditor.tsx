import { useState, FC, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Eye,
  MoreVertical,
  Settings2,
  X,
  Undo2,
  Redo2,
  Plus,
  List,
  Info
} from 'lucide-react';
import type { Post } from '@/types/post.types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ensureWordPressLoaded } from '@/utils/wordpress-loader';
import GutenbergBlockEditor from '@/components/editor/GutenbergBlockEditor';
import GutenbergSidebar from '@/components/editor/GutenbergSidebar';
import MediaLibrary from '@/components/media/MediaLibrary';
import ContentTemplates from '@/components/editor/ContentTemplates';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import toast from 'react-hot-toast';
import '@/styles/editor-animations.css';
import { postApi } from '@/services/api/postApi';

interface StandaloneEditorProps {
  mode?: 'post' | 'page' | 'template' | 'pattern';
  postId?: string | number;
}

const StandaloneEditor: FC<StandaloneEditorProps> = ({ mode = 'post' }) => {
  const [isMobile, setIsMobile] = useState(false);
  
  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  
  // Get postId from props or params
  const postId = params.id;
  const isNewPost = location.pathname.includes('/new');
  
  // State
  const [postTitle, setPostTitle] = useState('');
  const [blocks, setBlocks] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab] = useState<'document' | 'block'>('document');
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isWordPressReady, setIsWordPressReady] = useState(false);
  const [showListView, setShowListView] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Post settings
  const [postSettings, setPostSettings] = useState({
    status: 'draft' as 'draft' | 'publish' | 'pending' | 'private',
    visibility: 'public' as 'public' | 'private' | 'password',
    publishDate: new Date().toISOString().slice(0, 16),
    author: 'Admin User',
    featuredImage: undefined as string | undefined,
    excerpt: '',
    slug: '',
    categories: [] as string[],
    tags: [] as string[],
    template: 'default',
    commentStatus: true,
    pingStatus: true,
    sticky: false,
    format: 'standard' as 'standard' | 'aside' | 'chat' | 'gallery' | 'link' | 'image' | 'quote' | 'status' | 'video' | 'audio'
  });

  // Load post data function
  const loadPostData = useCallback(async (id: string | number) => {
    const loadingToast = toast.loading(`Loading post: ${id}`);
    
    try {
      const postId = String(id);
      const response = await postApi.get(postId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load post');
      }
      
      if (!response.data) {
        throw new Error('No post data received');
      }
      
      // Handle nested API response structure
      // API server returns: { status: 'success', data: actualPost }
      interface ApiResponseWrapper {
        status?: string;
        data?: Post;
        [key: string]: unknown;
      }
      
      const responseData = response.data as Post | ApiResponseWrapper;
      
      // Extract actual post data - handle multiple nesting scenarios
      let data: Post;
      
      // Check if response.data has a nested 'data' property
      if ('data' in responseData && typeof responseData.data === 'object' && responseData.data !== null) {
        // Nested structure: { status: 'success', data: actualPost }
        data = responseData.data;
      } else if ('title' in responseData) {
        // Direct Post object
        data = responseData as Post;
      } else {
        // Fallback - use as-is
        data = responseData as Post;
      }
      
      // Set title immediately with flushSync to ensure immediate update
      const title = data.title || '';
      
      // Debug: Store extracted title
      (window as any).__extractedTitle = title;
      (window as any).__extractedData = data;
      
      // Use flushSync to bypass React 18 automatic batching
      flushSync(() => {
        setPostTitle(title);
      });
      
      // Double-check the state update
      setTimeout(() => {
        (window as any).__finalPostTitle = title; // Use title, not postTitle (closure issue)
      }, 100);
      
      // Parse content - handle different formats
      if (data.content) {
        let parsedBlocks = [];
        
        // Try to parse content based on its type
        if (typeof data.content === 'string') {
          try {
            const parsed = JSON.parse(data.content);
            parsedBlocks = Array.isArray(parsed) ? parsed : 
                          (parsed?.blocks || [{ id: 'initial-block', type: 'core/paragraph', content: data.content }]);
          } catch {
            // Plain text content
            parsedBlocks = [{ id: 'initial-block', type: 'core/paragraph', content: data.content }];
          }
        } else if (Array.isArray(data.content)) {
          parsedBlocks = data.content;
        } else if (data.content?.blocks) {
          parsedBlocks = data.content.blocks;
        }
        
        // Also use flushSync for blocks to ensure immediate update
        flushSync(() => {
          setBlocks(parsedBlocks);
        });
      }
      
      // Set post settings
      setPostSettings(prev => ({
        ...prev,
        status: data.status || 'draft',
        excerpt: data.excerpt || '',
        slug: data.slug || '',
        categories: data.categories?.map((c: any) => c.id || c) || [],
        tags: data.tags?.map((t: any) => t.id || t) || [],
        featuredImage: data.featuredImage,
        publishDate: data.publishedAt || data.createdAt || new Date().toISOString().slice(0, 16),
        author: data.author?.name || 'Admin User'
      }));
      
      toast.dismiss(loadingToast);
      toast.success('Post loaded successfully');
      setIsDirty(false); // Mark as clean after loading
    } catch (error: any) {
      toast.dismiss(loadingToast);
      
      const errorMessage = error.response?.status === 500 
        ? 'Server error: Unable to load post. Please try again later.'
        : (error.message || 'Failed to load post data');
      
      toast.error(errorMessage);
    }
  }, []);

  // Initialize editor and load data
  useEffect(() => {
    let mounted = true;
    
    const initializeEditor = async () => {
      try {
        // Initialize WordPress editor
        await ensureWordPressLoaded();
        
        if (!mounted) return;
        
        setIsWordPressReady(true);
        
        // Load post data if editing existing post
        if (postId && !isNewPost && mounted) {
          await loadPostData(postId);
        }
        
        // Start entrance animation
        setTimeout(() => {
          if (mounted) setIsEntering(false);
        }, 500);
      } catch (error) {
        if (import.meta.env.DEV) {
          // Debug logging in development only
          const debugLog = (...args: any[]) => {
            // Use logger for debug info
          };
          debugLog('Failed to initialize editor:', error);
        }
        toast.error('Failed to initialize editor');
      }
    };
    
    initializeEditor();
    
    return () => {
      mounted = false;
    };
  }, [postId, isNewPost]);

  // Track unsaved changes
  useEffect(() => {
    if (blocks.length > 0 || postTitle) {
      setIsDirty(true);
    }
  }, [blocks, postTitle]);

  // Debug: Track postTitle changes
  useEffect(() => {
    // Store in window for debugging
    (window as any).__postTitle = postTitle;
    (window as any).__postId = postId;
    (window as any).__isNewPost = isNewPost;
  }, [postTitle, postId, isNewPost]);

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

  const handleSave = async (publish = false) => {
    // Prevent double-clicking
    if (isSaving) {
      return;
    }
    
    setIsSaving(true);
    
    // Debug: Check current state
    (window as any).__handleSaveDebug = {
      postId,
      postTitle,
      isNewPost,
      blocksCount: blocks.length,
      publish
    };
    
    try {
      const postData: any = {
        title: postTitle || 'Untitled',
        content: blocks, // postApi expects blocks directly, not wrapped in object
        excerpt: postSettings.excerpt,
        slug: postSettings.slug || (postTitle || 'untitled').toLowerCase().replace(/\s+/g, '-'),
        status: publish ? 'published' : postSettings.status,
        categories: postSettings.categories,
        tags: postSettings.tags,
        featuredImage: postSettings.featuredImage,
        format: postSettings.format,
        allowComments: postSettings.commentStatus,
        sticky: postSettings.sticky
      };
      
      // Add id for update
      if (postId) {
        postData.id = postId;
      }
      
      // Use postApi instead of fetch for proper token handling and API URL
      const response = postId 
        ? await postApi.update(postData)
        : await postApi.create(postData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to save');
      }
      
      const savedData = response.data;
      
      // If it's a new post and we get an ID back, update the URL and reload
      if (!postId && savedData?.id) {
        // Update URL
        window.history.replaceState(null, '', `/editor/posts/${savedData.id}`);
        // CRITICAL: Reload the page with the new ID to properly initialize
        // This ensures the component re-mounts with correct postId from URL
        window.location.href = `/editor/posts/${savedData.id}`;
        return; // Stop here, page will reload
      }
      
      setLastSaved(new Date());
      setIsDirty(false);
      
      if (publish) {
        setPostSettings(prev => ({ ...prev, status: 'publish' }));
        toast.success('Published successfully!');
      } else {
        toast.success('Saved as draft');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    await handleSave(true);
  };

  const handlePreview = async () => {
    // Save draft first to ensure preview has latest content
    if (isDirty) {
      toast('Saving draft for preview...', { icon: '💾' });
      await handleSave(false);
    }
    
    // Open preview in new tab
    if (postId) {
      window.open(`/post/preview/${postId}`, '_blank');
    } else {
      toast.error('Please save the post first to preview');
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
    setShowTemplates(false);
    setIsDirty(true);
  };

  const handleSelectPattern = (pattern: any) => {
    setBlocks(prev => [...prev, ...pattern.blocks]);
    setShowTemplates(false);
    setIsDirty(true);
  };

  const handleMediaSelect = (media: any[]) => {
    if (media.length > 0 && selectedBlock) {
      const updatedBlock = {
        ...selectedBlock,
        content: {
          ...selectedBlock.content,
          url: media[0].url,
          alt: media[0].alt
        }
      };
      
      setBlocks(blocks.map(block => 
        block.id === selectedBlock.id ? updatedBlock : block
      ));
      setIsDirty(true);
    }
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
      className={cn(
        "h-screen flex flex-col bg-white",
        isEntering && "editor-enter"
      )}
    >
      {/* Editor Header */}
      <div className={cn(
        "bg-white border-b flex items-center justify-between",
        isMobile ? "px-2 py-2" : "px-3 py-2",
        isEntering && "editor-header-enter"
      )}>
        <div className={cn(
          "flex items-center",
          isMobile ? "gap-1 flex-1" : "gap-2"
        )}>
          {/* Back to Admin */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={isMobile ? "h-8 w-8" : "h-9 w-9"}
                  onClick={handleBack}
                >
                  <ArrowLeft className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Back to dashboard</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* WordPress Logo - 모바일에서 숨김 */}
          {!isMobile && (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
          )}

          {/* Title Input */}
          <div className="flex-1 max-w-2xl">
            <input
              type="text"
              placeholder={isMobile ? getModeLabel() : `Add ${getModeLabel()} title`}
              value={postTitle}
              onChange={(e) => {
                setPostTitle(e.target.value);
                setIsDirty(true);
              }}
              className={cn(
                "w-full px-2 py-1 font-semibold border-0 outline-none focus:ring-0 placeholder-gray-400 text-gray-900",
                isMobile ? "text-base" : "text-xl"
              )}
            />
          </div>

          {/* Status Badge - 모바일에서 숨김 */}
          {!isMobile && (
            <Badge 
              variant={postSettings.status === 'publish' ? 'default' : 'secondary'}
              className="capitalize"
            >
              {postSettings.status}
            </Badge>
          )}
          
          {/* Saved Indicator - 모바일에서 숨김 */}
          {!isMobile && lastSaved && (
            <span className="text-sm text-gray-500">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {!isMobile && isDirty && !isSaving && (
            <span className="text-sm text-orange-500">Unsaved changes</span>
          )}
        </div>
        
        {/* Right Actions */}
        <div className={cn(
          "flex items-center",
          isMobile ? "gap-0" : "gap-1"
        )}>
          {/* Undo/Redo - 모바일에서 숨김 */}
          {!isMobile && (
            <div className="flex items-center mr-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Undo</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Redo</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* View Options - 모바일에서 숨김 */}
          {!isMobile && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setShowListView(!showListView)}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>List view</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Preview Toggle - 모바일에서 숨김 */}
          {!isMobile && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handlePreview}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Preview</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Save Draft - 모바일에서 간소화 */}
          {!isMobile ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin h-3 w-3 border-2 border-gray-500 border-t-transparent rounded-full mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-2" />
                  Save draft
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleSave(false)}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? (
                <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          )}
          
          {/* Publish/Update */}
          <Button
            size="sm"
            onClick={() => handleSave(true)}
            disabled={isSaving}
          >
            {postSettings.status === 'publish' ? 'Update' : 'Publish'}
          </Button>
          
          {/* Settings */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={isMobile ? "h-8 w-8" : "h-9 w-9"}
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  {sidebarOpen ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Settings2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{sidebarOpen ? 'Close settings' : 'Settings'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="icon" className={isMobile ? "h-8 w-8" : "h-9 w-9"}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isMobile && (
                <>
                  <DropdownMenuItem onClick={handlePreview}>
                    <Eye className="h-4 w-4 mr-2" />Preview
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => setShowTemplates(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowMediaLibrary(true)}>
                Add media
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Copy all blocks</DropdownMenuItem>
              <DropdownMenuItem>Export</DropdownMenuItem>
              {!isMobile && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Info className="h-4 w-4 mr-2" />
                    Keyboard shortcuts
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Canvas */}
        <div className={cn(
          "flex-1 overflow-auto bg-gray-50",
          isEntering && "editor-canvas-enter"
        )}>
          <div className="min-h-full">
            <GutenbergBlockEditor
              initialBlocks={blocks}
              onChange={(newBlocks) => {
                setBlocks(newBlocks);
                setIsDirty(true);
              }}
              onSave={handleSave}
              onPublish={handlePublish}
            />
          </div>
        </div>
        
        {/* Settings Sidebar */}
        {sidebarOpen && (
          <div className={cn(
            "bg-white border-l overflow-y-auto editor-transition",
            "editor-sidebar-enter",
            isMobile ? "fixed inset-0 z-50 w-full" : "w-80"
          )}>
            {/* 모바일 헤더 */}
            {isMobile && (
              <div className="flex items-center justify-between p-3 border-b">
                <h2 className="font-semibold">Settings</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <GutenbergSidebar
              activeTab={activeTab}
              postSettings={postSettings}
              blockSettings={selectedBlock}
              onPostSettingsChange={(settings: any) => {
                setPostSettings(prev => ({ ...prev, ...settings }));
                setIsDirty(true);
              }}
              onBlockSettingsChange={(settings: any) => {
                if (selectedBlock) {
                  const updated = { ...selectedBlock, ...settings };
                  setBlocks(blocks.map(block => 
                    block.id === selectedBlock.id ? updated : block
                  ));
                  setSelectedBlock(updated);
                  setIsDirty(true);
                }
              }}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}
      </div>
      
      {/* Media Library Modal */}
      <Dialog open={showMediaLibrary} onOpenChange={setShowMediaLibrary}>
        <DialogContent className="max-w-6xl h-[80vh] p-0">
          <MediaLibrary
            mode="picker"
            multiple={false}
            accept="image/*"
            onSelect={handleMediaSelect}
            onClose={() => setShowMediaLibrary(false)}
          />
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
    </div>
  );
};

export default StandaloneEditor;