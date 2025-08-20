import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GutenbergBlockEditor from '@/components/editor/GutenbergBlockEditor';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

interface Block {
  id: string;
  type: string;
  content: any;
  attributes?: any;
}

interface PageData {
  id?: string;
  title: string;
  content: string;
  blocks?: Block[];
  slug?: string;
  status: 'draft' | 'published' | 'private';
  template?: string;
  parentId?: string;
  order?: number;
  meta?: {
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
  };
}

const PageFormWYSIWYG = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Fetch page data if editing
  const { data: page, isLoading } = useQuery({
    queryKey: ['page', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/pages/${id}`);
      return response.data;
    },
    enabled: isEditMode
  });

  // Initialize form with page data
  useEffect(() => {
    if (page) {
      setTitle(page.title || '');
      setContent(page.content || '');
      if (page.blocks) {
        setBlocks(page.blocks);
      } else if (page.content) {
        // Convert legacy content to blocks
        setBlocks([{ id: '1', type: 'paragraph', content: page.content, attributes: {} }]);
      }
    }
  }, [page]);

  // Create page mutation
  const createMutation = useMutation({
    mutationFn: async (data: PageData) => {
      const response = await authClient.api.post('/pages', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Page created successfully');
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      navigate(`/content/pages/${data.id}/edit`);
    },
    onError: () => {
      toast.error('Failed to create page');
    }
  });

  // Update page mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PageData }) => {
      const response = await authClient.api.put(`/pages/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Page updated successfully');
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['page', id] });
      setIsDirty(false);
    },
    onError: () => {
      toast.error('Failed to update page');
    }
  });

  // Handle blocks change
  const handleBlocksChange = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    // Convert blocks to HTML content for backward compatibility
    const htmlContent = newBlocks.map(block => {
      if (block.type === 'paragraph') return `<p>${block.content}</p>`;
      if (block.type === 'heading') {
        const level = block.attributes?.level || 2;
        return `<h${level}>${block.content}</h${level}>`;
      }
      if (block.type === 'list') {
        const items = block.attributes?.items || [];
        const listItems = items.map((item: any) => `<li>${item.content}</li>`).join('');
        return block.attributes?.type === 'ordered' ? `<ol>${listItems}</ol>` : `<ul>${listItems}</ul>`;
      }
      if (block.type === 'image' && block.attributes?.url) {
        return `<img src="${block.attributes.url}" alt="${block.attributes.alt || ''}" />`;
      }
      if (block.type === 'button' && block.attributes?.text) {
        return `<a href="${block.attributes.url || '#'}" class="button">${block.attributes.text}</a>`;
      }
      return '';
    }).join('\n');
    setContent(htmlContent);
    setIsDirty(true);
  };

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setIsDirty(true);
  };

  // Auto-save functionality
  const handleAutoSave = async () => {
    if (!isDirty) return;
    
    setIsAutoSaving(true);
    
    const pageData: PageData = {
      title,
      content,
      blocks,
      status: 'draft'
    };

    try {
      if (isEditMode && id) {
        await updateMutation.mutateAsync({ id, data: pageData });
      } else if (title || content) {
        // Only create if there's actual content
        const result = await createMutation.mutateAsync(pageData);
        // Update URL to edit mode after first save
        window.history.replaceState(null, '', `/content/pages/${result.id}/edit`);
      }
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Manual save/publish
  const handlePublish = async () => {
    const pageData: PageData = {
      title,
      content,
      blocks,
      status: 'published'
    };

    if (isEditMode && id) {
      updateMutation.mutate({ id, data: pageData });
    } else {
      createMutation.mutate(pageData);
    }
  };

  // Handle back navigation with unsaved changes warning
  const handleBack = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    navigate('/content/pages');
  };

  // View page
  const handleView = () => {
    if (id) {
      window.open(`/page/${page?.slug || id}`, '_blank');
    }
  };

  // Prevent accidental navigation
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Gutenberg-style Top Bar */}
      <div className="h-14 border-b bg-white flex items-center justify-between px-4 shadow-sm">
        {/* Left side */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-9 w-9"
            title="Back to pages"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          <span className="text-sm font-medium text-gray-700">
            {isEditMode ? 'Edit Page' : 'Add New Page'}
          </span>
          
          {isAutoSaving && (
            <span className="text-xs text-gray-500 ml-2">Saving...</span>
          )}
          
          {!isAutoSaving && !isDirty && isEditMode && (
            <span className="text-xs text-green-600 ml-2">✓ Saved</span>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {isEditMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleView}
              className="text-gray-600"
            >
              View Page
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isEditMode && id) {
                window.open(`/preview/page/${id}`, '_blank');
              } else {
                toast.info('Save the page first to preview');
              }
            }}
            disabled={!isEditMode}
            className="text-gray-600"
          >
            Preview
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAutoSave}
            disabled={!isDirty || isAutoSaving}
            className="text-gray-600"
          >
            Save draft
          </Button>
          
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={createMutation.isPending || updateMutation.isPending || !title}
            className="bg-[#007cba] hover:bg-[#006ba1] text-white px-4"
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Publishing...'
              : isEditMode ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Full Screen Editor */}
      <div className="flex-1 overflow-hidden">
        <GutenbergBlockEditor
          initialBlocks={blocks}
          title={title}
          onChange={handleBlocksChange}
          onTitleChange={handleTitleChange}
          onSave={() => handleAutoSave()}
          autoSave={true}
          showInspector={true}
          fullScreen={true}
        />
      </div>
    </div>
  );
};

export default PageFormWYSIWYG;