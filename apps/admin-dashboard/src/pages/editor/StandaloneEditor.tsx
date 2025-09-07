import { useState, FC, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
  postId?: string | number;  // Now passed from EditorRouteWrapper
}

const StandaloneEditor: FC<StandaloneEditorProps> = ({ mode = 'post', postId: initialPostId }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [currentPostId, setCurrentPostId] = useState<string | number | undefined>(initialPostId);
  
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
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Use currentPostId state instead of prop directly
  // Simple and reliable check for new post
  const isNewPost = !currentPostId || currentPostId === 'new';
  const postId = currentPostId; // Keep postId variable for backward compatibility
  
  // Component initialized with postId and mode from props
  
  // Editor state
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
  const containerRef = useRef<HTMLDivElement>(null);
  // Component is now remounted on route changes, so complex state management is not needed
  
  // Post settings
  const [postSettings, setPostSettings] = useState({
    status: 'draft' as 'draft' | 'publish' | 'pending' | 'private',
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

  // Simplified load post data function
  const loadPostData = useCallback(async (id: string | number) => {
    const loadingToast = toast.loading(`Loading post...`);
    
    try {
      const response = await postApi.get(String(id));
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load post');
      }
      
      // Normalize nested API response - handle multiple levels of nesting
      let data: Post = response.data as Post;
      
      // Unwrap nested data structures
      while (data && typeof data === 'object' && 'data' in data && !('title' in data)) {
        data = (data as any).data;
      }
      
      // Data normalized successfully
      
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
            parsedBlocks = [{ 
              id: 'block-1', 
              type: 'core/paragraph', 
              attributes: { content: data.content }
            }];
          }
        } else if (Array.isArray(data.content)) {
          parsedBlocks = data.content;
        } else if (data.content?.blocks) {
          parsedBlocks = data.content.blocks;
        }
      }
      
      setBlocks(parsedBlocks);
      
      // Set post settings
      setPostSettings({
        status: (data.status || 'draft') as any,
        visibility: 'public' as const,
        publishDate: data.publishedAt || data.createdAt || new Date().toISOString().slice(0, 16),
        author: data.author?.name || 'Admin User',
        featuredImage: data.featuredImage,
        excerpt: data.excerpt || '',
        slug: data.slug || '',
        categories: data.categories?.map((c: any) => typeof c === 'object' ? c.id : c) || [],
        tags: data.tags?.map((t: any) => typeof t === 'object' ? t.id : t) || [],
        template: 'default',
        commentStatus: true,
        pingStatus: true,
        sticky: false,
        format: 'standard' as const
      });
      
      setIsDirty(false);
      toast.dismiss(loadingToast);
      toast.success('Post loaded');
      
    } catch (error: any) {
      // Log error in development only
      if (import.meta.env.DEV) {
        console.error('[StandaloneEditor] Load error:', error);
      }
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to load post');
      
      // Reset to empty state on error
      setPostTitle('');
      setBlocks([]);
      setIsDirty(false);
    }
  }, []);

  // Initialize editor and load data
  useEffect(() => {
    const initializeEditor = async () => {
      try {
        // Initialize WordPress editor
        await ensureWordPressLoaded();
        setIsWordPressReady(true);
        
        // Load post data if editing existing post
        if (postId && !isNewPost) {
          await loadPostData(postId);
        } else {
          // Reset states for new post
          setPostTitle('');
          setBlocks([]);
          setIsDirty(false);
        }
        
        // Editor is ready
        
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[StandaloneEditor] Init error:', error);
        }
        toast.error('Failed to initialize editor');
        setIsWordPressReady(true); // Still show editor even if init fails
      }
    };
    
    initializeEditor();
  }, [postId, isNewPost, loadPostData]);

  // Track unsaved changes
  useEffect(() => {
    if (blocks.length > 0 || postTitle) {
      setIsDirty(true);
    }
  }, [blocks, postTitle]);
  
  // Autosave functionality
  useEffect(() => {
    if (!isDirty || !postId || postId === 'new' || isSaving) {
      return;
    }
    
    const autoSaveTimer = setTimeout(async () => {
      try {
        const response = await postApi.autoSave(String(postId), {
          title: postTitle,
          content: blocks,
          excerpt: postSettings.excerpt
        });
        
        if (response.success) {
          setLastSaved(new Date());
          // Autosave success - no console log needed
        }
      } catch (error) {
        // Silent fail for autosave
      }
    }, 30000); // Autosave after 30 seconds of changes
    
    return () => clearTimeout(autoSaveTimer);
  }, [isDirty, postId, isSaving, postTitle, blocks, postSettings.excerpt]);

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
    
    // Client-side validation for empty data
    const trimmedTitle = postTitle?.trim() || '';
    const hasContent = blocks && blocks.length > 0 && blocks.some(block => {
      const content = block.content;
      if (typeof content === 'string') return content.trim().length > 0;
      if (content?.text) return content.text.trim().length > 0;
      if (content?.url) return true; // Image blocks
      return false;
    });
    
    if (!trimmedTitle && !hasContent) {
      toast.error('제목이나 내용 중 하나는 입력해야 합니다');
      return;
    }
    
    if (trimmedTitle && !trimmedTitle.length) {
      toast.error('제목에 공백만 입력할 수 없습니다');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Don't use default title - let backend handle empty titles
      
      // Prepare base data for both create and update
      const baseData: any = {
        title: postTitle || '',
        content: blocks,
        excerpt: postSettings.excerpt,
        slug: postSettings.slug || '',  // Only use existing slug, don't auto-generate
        status: publish ? 'publish' : (postSettings.status || 'draft'),
        categories: postSettings.categories,
        tags: postSettings.tags,
        featured: false,
        sticky: postSettings.sticky,
        featuredImage: postSettings.featuredImage,
        format: postSettings.format,
        allowComments: postSettings.commentStatus
      };
      
      // Debug logging available in development mode
      
      // Dev log request
      // dev save request observed (logging disabled)
      // Call appropriate API method
      const response = postId 
        ? await postApi.update({ ...baseData, id: String(postId) }) // Ensure id is string
        : await postApi.create(baseData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to save');
      }
      
      const savedData = response.data;
      // dev save response observed (logging disabled)
      
      // Invalidate posts queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts-counts'] });
      
      // If it's a new post and we get an ID back, update the URL and state
      if (!postId && savedData?.id) {
        setCurrentPostId(savedData.id);  // Update internal state
        navigate(`/editor/${mode}s/${savedData.id}`, { replace: true });
        // Don't return here - continue with the rest of the save logic
      }
      
      // Update post settings with saved data (including slug from server)
      if (savedData?.slug) {
        setPostSettings(prev => ({ ...prev, slug: savedData.slug }));
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
      // Show specific conflict/validation messages when possible
      const status = error?.response?.status;
      const errorMessage = error?.response?.data?.error?.message;
      
      if (status === 409) {
        toast.error('Slug already exists. Please choose another slug.');
        // Set slug error state to show error in sidebar
        setPostSettings(prev => ({ ...prev, slugError: true }));
      } else if (status === 400) {
        // Validation error from API
        toast.error(errorMessage || '제목이나 내용 중 하나는 입력해야 합니다');
      } else if (status === 422) {
        toast.error('Validation failed. Please check required fields.');
      } else {
        toast.error(error?.message || 'Failed to save');
      }
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
      window.open(`/preview/posts/${postId}`, '_blank');
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
      className="h-screen flex flex-col bg-white"
    >
      {/* Development Debug Bar */}
      {import.meta.env.DEV && (
        <div className="bg-gray-800 text-gray-200 text-xs px-2 py-1 flex gap-3 font-mono">
          <span className="text-blue-400">ID: {postId || 'new'}</span>
          <span className="text-green-400">Mode: {mode}</span>
          <span className="text-yellow-400">Title: {postTitle ? `"${postTitle.substring(0, 20)}..."` : 'empty'}</span>
          <span className="text-purple-400">Blocks: {blocks.length}</span>
          {isDirty && <span className="text-red-400">• unsaved</span>}
        </div>
      )}
      
      {/* Editor Header */}
      <div className={cn(
        "bg-white border-b flex items-center justify-between",
        isMobile ? "px-2 py-2" : "px-3 py-2"
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
              placeholder=""
              value={postTitle || ''}
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
          "flex-1 overflow-auto bg-gray-50"
        )}>
          <div className="min-h-full">
            <GutenbergBlockEditor
              documentTitle={postTitle || ''}
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
                // Clear slug error when slug is changed
                if (settings.slug !== undefined && postSettings.slugError) {
                  settings.slugError = false;
                }
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
