import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GutenbergWYSIWYGEditor from '@/components/editor/GutenbergWYSIWYGEditor';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

interface PageData {
  id?: string;
  title: string;
  content: string;
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
  const [blocks, setBlocks] = useState<any[]>([]);
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

  // Handle content change
  const handleContentChange = (newContent: string, newBlocks: any[]) => {
    setContent(newContent);
    setBlocks(newBlocks);
    setIsDirty(true);
  };

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setIsDirty(true);
  };

  // Auto-save functionality
  const handleAutoSave = async (content: string) => {
    if (!isDirty) return;
    
    setIsAutoSaving(true);
    
    const pageData: PageData = {
      title,
      content,
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
    <div className="h-screen flex flex-col bg-white">
      {/* Minimal Header - WordPress Style */}
      <div className="border-b px-4 py-2 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Pages
          </Button>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="h-4 w-4" />
            <span>{isEditMode ? 'Edit Page' : 'Add New Page'}</span>
          </div>
          
          {isAutoSaving && (
            <span className="text-sm text-gray-500">Auto-saving...</span>
          )}
          
          {!isAutoSaving && !isDirty && isEditMode && (
            <span className="text-sm text-green-600">✓ Saved</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleView}
            >
              View Page
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (id) {
                window.open(`/preview/page/${id}`, '_blank');
              }
            }}
            disabled={!isEditMode}
          >
            Preview
          </Button>
          
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Publishing...'
              : isEditMode ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* WYSIWYG Editor - Full Height */}
      <div className="flex-1 overflow-hidden">
        <GutenbergWYSIWYGEditor
          initialContent={content}
          title={title}
          onChange={handleContentChange}
          onTitleChange={handleTitleChange}
          onSave={handleAutoSave}
          autoSave={true}
          showInspector={false}
          fullScreen={false}
        />
      </div>
    </div>
  );
};

export default PageFormWYSIWYG;