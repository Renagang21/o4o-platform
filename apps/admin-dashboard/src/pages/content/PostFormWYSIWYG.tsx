import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GutenbergBlockEditor from '@/components/editor/GutenbergBlockEditor';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import type { CreatePostDto, UpdatePostDto, PostStatus } from '@o4o/types';

interface Block {
  id: string;
  type: string;
  content: any;
  attributes?: any;
}

const PostFormWYSIWYG = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Fetch post data if editing
  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/posts/${id}`);
      return response.data;
    },
    enabled: isEditMode
  });

  // Initialize form with post data
  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setContent(post.content || '');
      if (post.blocks) {
        setBlocks(post.blocks);
      } else if (post.content) {
        // Convert legacy content to blocks
        setBlocks([{ id: '1', type: 'paragraph', content: post.content, attributes: {} }]);
      }
    }
  }, [post]);

  // Create post mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreatePostDto) => {
      const response = await authClient.api.post('/posts', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Post created successfully');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      navigate(`/posts/${data.id}/edit`);
    },
    onError: () => {
      toast.error('Failed to create post');
    }
  });

  // Update post mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePostDto }) => {
      const response = await authClient.api.put(`/posts/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Post updated successfully');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      setIsDirty(false);
    },
    onError: () => {
      toast.error('Failed to update post');
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
    
    const postData = {
      title,
      content,
      status: 'draft' as PostStatus,
      type: 'post' as const
    };

    try {
      if (isEditMode && id) {
        const updateData: UpdatePostDto = {
          ...postData,
          id
        };
        await updateMutation.mutateAsync({ id, data: updateData });
      } else if (title || content) {
        // Only create if there's actual content
        const result = await createMutation.mutateAsync(postData);
        // Update URL to edit mode after first save
        window.history.replaceState(null, '', `/posts/${result.id}/edit`);
      }
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Manual save/publish
  const handlePublish = async () => {
    const postData = {
      title,
      content,
      status: 'published' as PostStatus,
      type: 'post' as const
    };

    if (isEditMode && id) {
      const updateData: UpdatePostDto = {
        ...postData,
        id
      };
      updateMutation.mutate({ id, data: updateData });
    } else {
      createMutation.mutate(postData);
    }
  };

  // Handle back navigation with unsaved changes warning
  const handleBack = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    navigate('/posts');
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
            title="Back to posts"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          <span className="text-sm font-medium text-gray-700">
            {isEditMode ? 'Edit Post' : 'Add New Post'}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isEditMode && id) {
                window.open(`/preview/post/${id}`, '_blank');
              } else {
                toast('Save the post first to preview');
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

export default PostFormWYSIWYG;